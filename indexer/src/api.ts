import type { Server } from "node:http";
import http from "node:http";
import type { Database } from "better-sqlite3";
import { getAddress } from "viem";
import { listPendingEnrollments, listProfessorGrades, listProfessorSubjects, listStudentTranscript } from "./db.js";
import type {
  PendingEnrollmentDto,
  ProfessorGradeDto,
  ProfessorSubjectDto,
  StudentTranscriptDto,
} from "./types.js";

const DEFAULT_PORT = Number(process.env.INDEXER_PORT ?? 8787);

export function startApiServer(db: Database, onSync: () => Promise<void>): Server {
  const server = http.createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url ?? "/", `http://localhost:${DEFAULT_PORT}`);

    try {
      if (req.method === "GET" && url.pathname === "/health") {
        json(res, 200, { ok: true });
        return;
      }

      if (req.method === "POST" && url.pathname === "/api/sync") {
        await onSync();
        json(res, 200, { ok: true, syncedAt: Date.now() });
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/pending-enrollments") {
        const rows = listPendingEnrollments(db);
        const pending: PendingEnrollmentDto[] = rows.map((row) => ({
          student: getAddress(row.student),
          requestedAtBlock: row.requested_at_block > 0 ? row.requested_at_block : null,
        }));
        json(res, 200, { pending, syncedAt: Date.now() });
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/professor/grades") {
        const professorParam = url.searchParams.get("professor");
        if (!professorParam) {
          json(res, 400, { error: "Missing query parameter: professor" });
          return;
        }

        let professor: `0x${string}`;
        try {
          professor = getAddress(professorParam);
        } catch {
          json(res, 400, { error: "Invalid professor address" });
          return;
        }

        const rows = listProfessorGrades(db, professor);
        const grades: ProfessorGradeDto[] = rows.map((row) => ({
          student: getAddress(row.student),
          subjectId: row.subject_id,
          subjectName: row.subject_name,
          credits: row.credits,
          grade: row.grade,
          gradedAt: row.graded_at_timestamp > 0 ? row.graded_at_timestamp : null,
          subjectActive: row.subject_active === 1,
        }));
        json(res, 200, { grades, syncedAt: Date.now() });
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/professor/subjects") {
        const professorParam = url.searchParams.get("professor");
        if (!professorParam) {
          json(res, 400, { error: "Missing query parameter: professor" });
          return;
        }

        let professor: `0x${string}`;
        try {
          professor = getAddress(professorParam);
        } catch {
          json(res, 400, { error: "Invalid professor address" });
          return;
        }

        const rows = listProfessorSubjects(db, professor);
        const subjects: ProfessorSubjectDto[] = rows.map((row) => ({
          subjectId: row.subject_id,
          name: row.name,
          credits: row.credits,
          professor: getAddress(row.professor),
          isActive: row.is_active === 1,
        }));
        json(res, 200, { subjects, syncedAt: Date.now() });
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/student/transcript") {
        const studentParam = url.searchParams.get("student");
        if (!studentParam) {
          json(res, 400, { error: "Missing query parameter: student" });
          return;
        }

        let student: `0x${string}`;
        try {
          student = getAddress(studentParam);
        } catch {
          json(res, 400, { error: "Invalid student address" });
          return;
        }

        const rows = listStudentTranscript(db, student);
        const transcript: StudentTranscriptDto[] = rows.map((row) => ({
          subjectId: row.subject_id,
          subjectName: row.subject_name,
          credits: row.credits,
          grade: row.grade,
          gradedAt: row.graded_at_timestamp > 0 ? row.graded_at_timestamp : null,
          professor: getAddress(row.professor),
        }));
        json(res, 200, { transcript, syncedAt: Date.now() });
        return;
      }

      json(res, 404, { error: "Not found" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal error";
      json(res, 500, { error: message });
    }
  });

  server.listen(DEFAULT_PORT, () => {
    console.log(`[indexer] API http://127.0.0.1:${DEFAULT_PORT}`);
  });

  return server;
}

function json(res: import("node:http").ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}
