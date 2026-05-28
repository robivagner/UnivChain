import { openDatabase } from "./db.js";
import { triggerSync } from "./sync-runner.js";

const db = openDatabase();
triggerSync(db)
  .then(() => {
    console.log("[indexer] One-shot sync complete");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
