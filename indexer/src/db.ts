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
  db.prepare("DELETE FROM indexer_state WHERE key IN ('last_scanned_block', 'indexed_core')").run();
}

export function ensureCoreAddress(db: Database.Database, config: IndexerConfig) {
  const indexed = getState(db, "indexed_core");
  const current = config.universityCore.toLowerCase();
  if (indexed && indexed !== current) {
    console.log("[indexer] UniversityCore address changed — resetting indexed data");
    resetIndexerData(db);
  }
  setState(db, "indexed_core", current);
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
