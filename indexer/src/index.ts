import { openDatabase } from "./db.js";
import { startApiServer } from "./api.js";
import { triggerSync } from "./sync-runner.js";

const SYNC_INTERVAL_MS = Number(process.env.INDEXER_SYNC_INTERVAL_MS ?? 15_000);

async function main() {
  const db = openDatabase();
  startApiServer(db, () => triggerSync(db));

  console.log(`[indexer] Sync interval ${SYNC_INTERVAL_MS}ms`);
  await triggerSync(db);
  setInterval(() => void triggerSync(db), SYNC_INTERVAL_MS);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
