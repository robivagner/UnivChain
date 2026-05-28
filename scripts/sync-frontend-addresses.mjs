#!/usr/bin/env node
/**
 * Sync contract addresses from Foundry broadcast JSON into the frontend constants file.
 * Usage:
 *   node scripts/sync-frontend-addresses.mjs
 *   node scripts/sync-frontend-addresses.mjs --print FeeManager
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CHAIN_ID = 31337;
const DEPLOY_BROADCAST = path.join(
  ROOT,
  "blockchain/broadcast/DeployUniversity.s.sol",
  String(CHAIN_ID),
  "run-latest.json"
);
const SETUP_BROADCAST = path.join(
  ROOT,
  "blockchain/broadcast/SetupAnvilDev.s.sol",
  String(CHAIN_ID),
  "run-latest.json"
);
const FRONTEND_CONSTANTS = path.join(ROOT, "frontend/src/constants/contracts.ts");
const INDEXER_CONFIG = path.join(ROOT, "indexer/config.json");
const DEFAULT_RPC_URL = process.env.ANVIL_RPC ?? "http://127.0.0.1:8545";

const require = createRequire(path.join(ROOT, "frontend/package.json"));
const { getAddress } = require("viem");

const CONTRACT_MAP = {
  UniversityCore: "universityCore",
  StudentRegistry: "studentRegistry",
  Gradebook: "gradebook",
  Certification: "certification",
  FeeManager: "feeManager",
  MockERC20: "enrollmentToken",
};

function readCreateAddress(broadcastPath, contractName) {
  if (!fs.existsSync(broadcastPath)) return undefined;
  const data = JSON.parse(fs.readFileSync(broadcastPath, "utf8"));
  for (const tx of data.transactions ?? []) {
    if (
      tx.transactionType === "CREATE" &&
      tx.contractName === contractName &&
      tx.contractAddress
    ) {
      return getAddress(tx.contractAddress);
    }
  }
  return undefined;
}

function parseBlockNumber(value) {
  if (value == null) return undefined;
  const block =
    typeof value === "string"
      ? parseInt(value, value.startsWith("0x") ? 16 : 10)
      : Number(value);
  if (!Number.isFinite(block) || block < 0) {
    throw new Error(`Invalid block number: ${value}`);
  }
  return block;
}

function receiptByHash(data) {
  const map = new Map();
  for (const receipt of data.receipts ?? []) {
    if (receipt.transactionHash) {
      map.set(receipt.transactionHash.toLowerCase(), receipt);
    }
  }
  return map;
}

/** Foundry puts blockNumber on receipts[], not on transactions[]. */
function readDeployBlock(broadcastPath, contractName = "UniversityCore") {
  if (!fs.existsSync(broadcastPath)) return undefined;
  const data = JSON.parse(fs.readFileSync(broadcastPath, "utf8"));
  const receipts = receiptByHash(data);

  for (const tx of data.transactions ?? []) {
    if (tx.transactionType !== "CREATE" || tx.contractName !== contractName) {
      continue;
    }

    const fromTx = parseBlockNumber(tx.blockNumber);
    if (fromTx !== undefined) return fromTx;

    const receipt = tx.hash ? receipts.get(tx.hash.toLowerCase()) : undefined;
    const fromReceipt = parseBlockNumber(receipt?.blockNumber);
    if (fromReceipt !== undefined) return fromReceipt;
  }

  return undefined;
}

function readDeploymentsFromBroadcast() {
  if (!fs.existsSync(DEPLOY_BROADCAST)) {
    throw new Error(
      `Broadcast file not found: ${DEPLOY_BROADCAST}\nRun: make deploy (with Anvil running)`
    );
  }

  const data = JSON.parse(fs.readFileSync(DEPLOY_BROADCAST, "utf8"));
  const found = {};

  for (const tx of data.transactions ?? []) {
    if (tx.transactionType !== "CREATE" || !tx.contractName || !tx.contractAddress) {
      continue;
    }
    const key = CONTRACT_MAP[tx.contractName];
    if (key && key !== "enrollmentToken" && !found[key]) {
      found[key] = getAddress(tx.contractAddress);
    }
  }

  for (const key of Object.values(CONTRACT_MAP)) {
    if (key === "enrollmentToken") continue;
    if (!found[key]) {
      throw new Error(`Missing deployment for ${key} in ${DEPLOY_BROADCAST}`);
    }
  }

  found.enrollmentToken = readCreateAddress(SETUP_BROADCAST, "MockERC20");
  const deployBlock = readDeployBlock(DEPLOY_BROADCAST, "UniversityCore");
  if (deployBlock === undefined) {
    throw new Error(`Missing deploy block for UniversityCore in ${DEPLOY_BROADCAST}`);
  }
  found.deployBlock = deployBlock;
  return found;
}

function buildDeploymentBlock(deployments) {
  const enrollmentLine = deployments.enrollmentToken
    ? `    enrollmentToken: "${deployments.enrollmentToken}",\n`
    : "";
  return `  [ANVIL_CHAIN_ID]: {
    universityCore: "${deployments.universityCore}",
    studentRegistry: "${deployments.studentRegistry}",
    gradebook: "${deployments.gradebook}",
    certification: "${deployments.certification}",
    feeManager: "${deployments.feeManager}",
    deployBlock: ${deployments.deployBlock},
${enrollmentLine}  }`;
}

function writeIndexerConfig(deployments) {
  const config = {
    chainId: CHAIN_ID,
    rpcUrl: DEFAULT_RPC_URL,
    deployBlock: deployments.deployBlock,
    universityCore: deployments.universityCore,
    studentRegistry: deployments.studentRegistry,
    feeManager: deployments.feeManager,
  };
  fs.mkdirSync(path.dirname(INDEXER_CONFIG), { recursive: true });
  fs.writeFileSync(INDEXER_CONFIG, `${JSON.stringify(config, null, 2)}\n`);
}

function updateFrontendConstants(deployments) {
  /** @returns {boolean} true if the file was modified */
  let content = fs.readFileSync(FRONTEND_CONSTANTS, "utf8");
  const block = buildDeploymentBlock(deployments);

  const pattern = /  \[(?:ANVIL_CHAIN_ID|31337)\]: \{[\s\S]*?\r?\n  \},?/;
  if (!pattern.test(content)) {
    throw new Error(
      "Could not find DEPLOYMENTS[ANVIL_CHAIN_ID] block in frontend/src/constants/contracts.ts"
    );
  }
  const replaced = content.replace(pattern, block);
  if (replaced !== content) {
    fs.writeFileSync(FRONTEND_CONSTANTS, replaced);
    return true;
  }
  return false;
}

function main() {
  const printArg = process.argv.indexOf("--print");
  const deployments = readDeploymentsFromBroadcast();

  if (printArg !== -1) {
    const name = process.argv[printArg + 1];
    const key = CONTRACT_MAP[name];
    if (!key || !deployments[key]) {
      console.error(`Unknown or missing contract: ${name}`);
      process.exit(1);
    }
    console.log(deployments[key]);
    return;
  }

  const changed = updateFrontendConstants(deployments);
  if (changed) {
    console.log(`Updated ${FRONTEND_CONSTANTS}`);
  } else {
    console.log(`Frontend addresses already up to date (${FRONTEND_CONSTANTS})`);
  }
  writeIndexerConfig(deployments);
  console.log(`Wrote ${INDEXER_CONFIG}`);
  if (!deployments.enrollmentToken) {
    console.warn("No enrollmentToken — run: make setup-dev");
  }
  console.log(deployments);
}

main();
