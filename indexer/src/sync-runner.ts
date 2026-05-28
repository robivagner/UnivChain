import type { Database } from "better-sqlite3";
import { runSync } from "./sync.js";

let syncInProgress = false;
let syncQueued = false;

/** Run sync immediately; coalesce concurrent triggers into one follow-up run. */
export async function triggerSync(db: Database): Promise<void> {
  if (syncInProgress) {
    syncQueued = true;
    return waitForIdle();
  }

  syncInProgress = true;
  try {
    await runSync(db);
    while (syncQueued) {
      syncQueued = false;
      await runSync(db);
    }
  } finally {
    syncInProgress = false;
  }
}

function waitForIdle(): Promise<void> {
  return new Promise((resolve) => {
    const tick = () => {
      if (!syncInProgress) {
        resolve();
        return;
      }
      setTimeout(tick, 50);
    };
    tick();
  });
}
