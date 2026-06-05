import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { EnrollmentStatus, IndexerConfig } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../data");

export type EnrollmentRow = {
  student: string;
  requested_at_block: number;
  status: EnrollmentStatus;
  updated_at: number;
};

export type StudentGradeRow = {
  student: string;
  subject_id: number;
  grade: number;
  graded_at_block: number;
  graded_at_timestamp: number;
  professor: string;
  updated_at: number;
  subject_name: string;
  credits: number;
  subject_active: number;
};

export type SubjectRow = {
  subject_id: number;
  name: string;
  credits: number;
  professor: string;
  is_active: number;
  updated_at: number;
};

export function openDatabase(): Database.Database {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new Database(path.join(DATA_DIR, "univchain.db"));
  db.pragma("journal_mode = WAL");
  migrate(db);
  return db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS indexer_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS enrollment_requests (
      student TEXT PRIMARY KEY,
      requested_at_block INTEGER NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_enrollment_status
      ON enrollment_requests (status);

    CREATE TABLE IF NOT EXISTS subjects (
      subject_id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      credits INTEGER NOT NULL,
      professor TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_subjects_professor
      ON subjects (professor);

    CREATE TABLE IF NOT EXISTS student_grades (
      student TEXT NOT NULL,
      subject_id INTEGER NOT NULL,
      grade INTEGER NOT NULL,
      graded_at_block INTEGER NOT NULL,
      graded_at_timestamp INTEGER NOT NULL,
      professor TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (student, subject_id),
      FOREIGN KEY (subject_id) REFERENCES subjects (subject_id)
    );

    CREATE INDEX IF NOT EXISTS idx_student_grades_professor
      ON student_grades (professor);
  `);
}

export function getState(db: Database.Database, key: string): string | undefined {
  const row = db.prepare("SELECT value FROM indexer_state WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row?.value;
}

export function setState(db: Database.Database, key: string, value: string) {
  db.prepare(
    `INSERT INTO indexer_state (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(key, value);
}

export function resetIndexerData(db: Database.Database) {
  db.exec("DELETE FROM enrollment_requests");
  db.exec("DELETE FROM student_grades");
  db.exec("DELETE FROM subjects");
  db.prepare(
    "DELETE FROM indexer_state WHERE key IN ('last_scanned_block', 'gradebook_last_scanned_block', 'indexed_core', 'indexed_gradebook')"
  ).run();
}

export function ensureCoreAddress(db: Database.Database, config: IndexerConfig) {
  const indexedCore = getState(db, "indexed_core");
  const indexedGradebook = getState(db, "indexed_gradebook");
  const currentCore = config.universityCore.toLowerCase();
  const currentGradebook = config.gradebook.toLowerCase();

  if (
    (indexedCore && indexedCore !== currentCore) ||
    (indexedGradebook && indexedGradebook !== currentGradebook)
  ) {
    console.log("[indexer] Deployment address changed — resetting indexed data");
    resetIndexerData(db);
  }

  setState(db, "indexed_core", currentCore);
  setState(db, "indexed_gradebook", currentGradebook);
}

export function getLastScannedBlock(db: Database.Database, deployBlock: number): number {
  const raw = getState(db, "last_scanned_block");
  if (raw === undefined) return deployBlock - 1;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < deployBlock - 1) return deployBlock - 1;
  return parsed;
}

export function setLastScannedBlock(db: Database.Database, block: number) {
  setState(db, "last_scanned_block", String(block));
}

/** Separate cursor for Gradebook events so historical subjects/grades backfill after indexer upgrades. */
export function getLastGradebookScannedBlock(db: Database.Database, deployBlock: number): number {
  const raw = getState(db, "gradebook_last_scanned_block");
  if (raw === undefined) return deployBlock - 1;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < deployBlock - 1) return deployBlock - 1;
  return parsed;
}

export function setLastGradebookScannedBlock(db: Database.Database, block: number) {
  setState(db, "gradebook_last_scanned_block", String(block));
}

export function upsertEnrollmentRequest(
  db: Database.Database,
  student: string,
  requestedAtBlock: number,
  status: EnrollmentStatus
) {
  const now = Date.now();
  const existing = db
    .prepare("SELECT requested_at_block, status FROM enrollment_requests WHERE student = ?")
    .get(student) as { requested_at_block: number; status: EnrollmentStatus } | undefined;

  if (existing) {
    const block = Math.max(existing.requested_at_block, requestedAtBlock);
    db.prepare(
      `UPDATE enrollment_requests
       SET requested_at_block = ?, status = ?, updated_at = ?
       WHERE student = ?`
    ).run(block, status, now, student);
    return;
  }

  db.prepare(
    `INSERT INTO enrollment_requests (student, requested_at_block, status, updated_at)
     VALUES (?, ?, ?, ?)`
  ).run(student, requestedAtBlock, status, now);
}

export function markEnrollmentStatus(
  db: Database.Database,
  student: string,
  status: EnrollmentStatus
) {
  const now = Date.now();
  const existing = db
    .prepare("SELECT requested_at_block FROM enrollment_requests WHERE student = ?")
    .get(student) as { requested_at_block: number } | undefined;

  if (existing) {
    db.prepare(
      `UPDATE enrollment_requests SET status = ?, updated_at = ? WHERE student = ?`
    ).run(status, now, student);
    return;
  }

  db.prepare(
    `INSERT INTO enrollment_requests (student, requested_at_block, status, updated_at)
     VALUES (?, ?, ?, ?)`
  ).run(student, 0, status, now);
}

export function listPendingEnrollments(db: Database.Database): EnrollmentRow[] {
  return db
    .prepare(
      `SELECT student, requested_at_block, status, updated_at
       FROM enrollment_requests
       WHERE status = 'pending'
       ORDER BY requested_at_block DESC`
    )
    .all() as EnrollmentRow[];
}

export function listPendingStudents(db: Database.Database): string[] {
  return listPendingEnrollments(db).map((r) => r.student);
}

export function upsertSubject(
  db: Database.Database,
  subjectId: number,
  name: string,
  credits: number,
  professor: string,
  isActive: boolean
) {
  const now = Date.now();
  db.prepare(
    `INSERT INTO subjects (subject_id, name, credits, professor, is_active, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(subject_id) DO UPDATE SET
       name = excluded.name,
       credits = excluded.credits,
       professor = excluded.professor,
       is_active = excluded.is_active,
       updated_at = excluded.updated_at`
  ).run(subjectId, name, credits, professor.toLowerCase(), isActive ? 1 : 0, now);
}

export function setSubjectActive(db: Database.Database, subjectId: number, isActive: boolean) {
  const now = Date.now();
  db.prepare(
    `UPDATE subjects SET is_active = ?, updated_at = ? WHERE subject_id = ?`
  ).run(isActive ? 1 : 0, now, subjectId);
}

export function upsertStudentGrade(
  db: Database.Database,
  student: string,
  subjectId: number,
  grade: number,
  gradedAtBlock: number,
  gradedAtTimestamp: number,
  professor: string
) {
  const now = Date.now();
  db.prepare(
    `INSERT INTO student_grades (
       student, subject_id, grade, graded_at_block, graded_at_timestamp, professor, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(student, subject_id) DO UPDATE SET
       grade = excluded.grade,
       graded_at_block = excluded.graded_at_block,
       graded_at_timestamp = excluded.graded_at_timestamp,
       professor = excluded.professor,
       updated_at = excluded.updated_at`
  ).run(
    student.toLowerCase(),
    subjectId,
    grade,
    gradedAtBlock,
    gradedAtTimestamp,
    professor.toLowerCase(),
    now
  );
}

export function listProfessorGrades(db: Database.Database, professor: string): StudentGradeRow[] {
  return db
    .prepare(
      `SELECT
         g.student,
         g.subject_id,
         g.grade,
         g.graded_at_block,
         g.graded_at_timestamp,
         g.professor,
         g.updated_at,
         s.name AS subject_name,
         s.credits,
         s.is_active AS subject_active
       FROM student_grades g
       INNER JOIN subjects s ON s.subject_id = g.subject_id
       WHERE g.professor = ?
       ORDER BY g.subject_id ASC, g.student ASC`
    )
    .all(professor.toLowerCase()) as StudentGradeRow[];
}

export function listProfessorSubjects(db: Database.Database, professor: string): SubjectRow[] {
  return db
    .prepare(
      `SELECT subject_id, name, credits, professor, is_active, updated_at
       FROM subjects
       WHERE professor = ?
       ORDER BY subject_id ASC`
    )
    .all(professor.toLowerCase()) as SubjectRow[];
}

export function listStudentTranscript(db: Database.Database, student: string): StudentGradeRow[] {
  return db
    .prepare(
      `SELECT
         g.student,
         g.subject_id,
         g.grade,
         g.graded_at_block,
         g.graded_at_timestamp,
         g.professor,
         g.updated_at,
         s.name AS subject_name,
         s.credits,
         s.is_active AS subject_active
       FROM student_grades g
       INNER JOIN subjects s ON s.subject_id = g.subject_id
       WHERE g.student = ?
       ORDER BY g.subject_id ASC`
    )
    .all(student.toLowerCase()) as StudentGradeRow[];
}
