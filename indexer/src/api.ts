import type { Server } from "node:http";
import http from "node:http";
import type { Database } from "better-sqlite3";
import { getAddress } from "viem";
import { listPendingEnrollments } from "./db.js";
import type { PendingEnrollmentDto } from "./types.js";

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
