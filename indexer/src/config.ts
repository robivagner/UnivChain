import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { IndexerConfig } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.resolve(__dirname, "../config.json");

export function loadConfig(): IndexerConfig {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(
      `Missing ${CONFIG_PATH}. Run: make sync-frontend (after make deploy)`
    );
  }
  const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8")) as IndexerConfig;
  for (const key of [
    "chainId",
    "rpcUrl",
    "deployBlock",
    "universityCore",
    "studentRegistry",
    "gradebook",
    "feeManager",
  ] as const) {
    if (raw[key] === undefined || raw[key] === "") {
      throw new Error(`Indexer config missing field: ${key}`);
    }
  }
  return raw;
}
