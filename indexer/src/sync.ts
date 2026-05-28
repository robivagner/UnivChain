import type { Database } from "better-sqlite3";
import { createPublicClient, getAddress, http } from "viem";
import { defineChain } from "viem";
import { StudentRegistryABI, UniversityCoreABI } from "./abi.js";
import {
  ensureCoreAddress,
  getLastScannedBlock,
  listPendingStudents,
  markEnrollmentStatus,
  setLastScannedBlock,
  upsertEnrollmentRequest,
} from "./db.js";
import { loadConfig } from "./config.js";
import { isStillPendingOnChain } from "./reconcile.js";
import type { IndexerConfig } from "./types.js";

const LOG_CHUNK_SIZE = 2_000n;

const enrollmentRequestedEvent = UniversityCoreABI[0];
const enrollmentRejectedEvent = UniversityCoreABI[1];
const studentEnrolledEvent = StudentRegistryABI[0];

function createClient(config: IndexerConfig) {
  const chain = defineChain({
    id: config.chainId,
    name: `UnivChain-${config.chainId}`,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [config.rpcUrl] } },
  });
  return createPublicClient({ chain, transport: http(config.rpcUrl) });
}

type IndexerClient = ReturnType<typeof createClient>;

async function scanBlockRange(
  client: IndexerClient,
  fromBlock: bigint,
  toBlock: bigint,
  scan: (from: bigint, to: bigint) => Promise<void>
) {
  let start = fromBlock;
  while (start <= toBlock) {
    const end =
      start + LOG_CHUNK_SIZE - 1n > toBlock ? toBlock : start + LOG_CHUNK_SIZE - 1n;
    await scan(start, end);
    start = end + 1n;
  }
}

export async function runSync(db: Database): Promise<void> {
  const config = loadConfig();
  ensureCoreAddress(db, config);
  const client = createClient(config);

  const latest = await client.getBlockNumber();
  let from = BigInt(getLastScannedBlock(db, config.deployBlock) + 1);
  const deployFrom = BigInt(config.deployBlock);

  if (from < deployFrom) from = deployFrom;

  if (from <= latest) {
    await scanBlockRange(client, from, latest, async (chunkFrom, chunkTo) => {
      const requestedLogs = await client.getLogs({
        address: config.universityCore,
        event: enrollmentRequestedEvent,
        fromBlock: chunkFrom,
        toBlock: chunkTo,
      });

      for (const log of requestedLogs) {
        const student = log.args.student;
        if (!student) continue;
        upsertEnrollmentRequest(
          db,
          getAddress(student).toLowerCase(),
          Number(log.blockNumber ?? 0),
          "pending"
        );
      }
    });

    await scanBlockRange(client, from, latest, async (chunkFrom, chunkTo) => {
      const rejectedLogs = await client.getLogs({
        address: config.universityCore,
        event: enrollmentRejectedEvent,
        fromBlock: chunkFrom,
        toBlock: chunkTo,
      });

      for (const log of rejectedLogs) {
        const student = log.args.student;
        if (!student) continue;
        markEnrollmentStatus(db, getAddress(student).toLowerCase(), "rejected");
      }
    });

    await scanBlockRange(client, from, latest, async (chunkFrom, chunkTo) => {
      const enrolledLogs = await client.getLogs({
        address: config.studentRegistry,
        event: studentEnrolledEvent,
        fromBlock: chunkFrom,
        toBlock: chunkTo,
      });

      for (const log of enrolledLogs) {
        const student = log.args.student;
        if (!student) continue;
        markEnrollmentStatus(db, getAddress(student).toLowerCase(), "accepted");
      }
    });

    setLastScannedBlock(db, Number(latest));
  }

  await reconcilePending(db, client, config);
}

async function reconcilePending(
  db: Database,
  client: IndexerClient,
  config: IndexerConfig
): Promise<void> {
  const pendingStudents = listPendingStudents(db);

  await Promise.all(
    pendingStudents.map(async (student) => {
      const checksummed = getAddress(student);
      const stillPending = await isStillPendingOnChain(client, config, checksummed);
      if (!stillPending) {
        const isEnrolled = await client.readContract({
          address: config.studentRegistry,
          abi: StudentRegistryABI,
          functionName: "isStudentEnrolled",
          args: [checksummed],
        });
        markEnrollmentStatus(db, student, isEnrolled ? "accepted" : "rejected");
      }
    })
  );
}
