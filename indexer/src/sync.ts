import type { Database } from "better-sqlite3";
import { createPublicClient, getAddress, http } from "viem";
import { defineChain } from "viem";
import { GradebookABI, StudentRegistryABI, UniversityCoreABI } from "./abi.js";
import {
  ensureCoreAddress,
  getLastScannedBlock,
  getLastGradebookScannedBlock,
  listPendingStudents,
  markEnrollmentStatus,
  setLastScannedBlock,
  setLastGradebookScannedBlock,
  setSubjectActive,
  upsertEnrollmentRequest,
  upsertStudentGrade,
  upsertSubject,
} from "./db.js";
import { loadConfig } from "./config.js";
import { isStillPendingOnChain } from "./reconcile.js";
import type { IndexerConfig } from "./types.js";

const LOG_CHUNK_SIZE = 2_000n;

const enrollmentRequestedEvent = UniversityCoreABI[0];
const enrollmentRejectedEvent = UniversityCoreABI[1];
const studentEnrolledEvent = StudentRegistryABI[0];
const subjectAddedEvent = GradebookABI[0];
const gradePostedEvent = GradebookABI[1];
const subjectActivityChangedEvent = GradebookABI[2];

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

async function syncSubjectMetadata(
  db: Database,
  client: IndexerClient,
  config: IndexerConfig,
  subjectId: bigint
) {
  const [name, credits, professor, isActive] = await client.readContract({
    address: config.gradebook,
    abi: GradebookABI,
    functionName: "getSubjectMetadata",
    args: [subjectId],
  });

  upsertSubject(
    db,
    Number(subjectId),
    name,
    Number(credits),
    getAddress(professor),
    isActive
  );
}

async function indexGradePosted(
  db: Database,
  client: IndexerClient,
  config: IndexerConfig,
  student: `0x${string}`,
  subjectId: bigint,
  blockNumber: number
) {
  await syncSubjectMetadata(db, client, config, subjectId);

  const [grade, timestamp, professor] = await client.readContract({
    address: config.gradebook,
    abi: GradebookABI,
    functionName: "getStudentGradeRecordOfSubject",
    args: [student, subjectId],
  });

  upsertStudentGrade(
    db,
    getAddress(student).toLowerCase(),
    Number(subjectId),
    Number(grade),
    blockNumber,
    Number(timestamp),
    getAddress(professor)
  );
}

export async function runSync(db: Database): Promise<void> {
  const config = loadConfig();
  ensureCoreAddress(db, config);
  const client = createClient(config);

  const latest = await client.getBlockNumber();
  const deployFrom = BigInt(config.deployBlock);

  let enrollFrom = BigInt(getLastScannedBlock(db, config.deployBlock) + 1);
  if (enrollFrom < deployFrom) enrollFrom = deployFrom;

  if (enrollFrom <= latest) {
    await scanBlockRange(client, enrollFrom, latest, async (chunkFrom, chunkTo) => {
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

    await scanBlockRange(client, enrollFrom, latest, async (chunkFrom, chunkTo) => {
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

    await scanBlockRange(client, enrollFrom, latest, async (chunkFrom, chunkTo) => {
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

  let gradeFrom = BigInt(getLastGradebookScannedBlock(db, config.deployBlock) + 1);
  if (gradeFrom < deployFrom) gradeFrom = deployFrom;

  if (gradeFrom <= latest) {
    const isBackfill = gradeFrom === deployFrom;
    if (isBackfill) {
      console.log(`[indexer] Scanning Gradebook events from block ${deployFrom} to ${latest}…`);
    }

    await scanBlockRange(client, gradeFrom, latest, async (chunkFrom, chunkTo) => {
      const subjectLogs = await client.getLogs({
        address: config.gradebook,
        event: subjectAddedEvent,
        fromBlock: chunkFrom,
        toBlock: chunkTo,
      });

      for (const log of subjectLogs) {
        const subjectId = log.args.subjectId;
        if (subjectId === undefined) continue;
        await syncSubjectMetadata(db, client, config, subjectId);
      }
    });

    await scanBlockRange(client, gradeFrom, latest, async (chunkFrom, chunkTo) => {
      const activityLogs = await client.getLogs({
        address: config.gradebook,
        event: subjectActivityChangedEvent,
        fromBlock: chunkFrom,
        toBlock: chunkTo,
      });

      for (const log of activityLogs) {
        const subjectId = log.args.subjectId;
        const isActive = log.args.isActive;
        if (subjectId === undefined || isActive === undefined) continue;
        setSubjectActive(db, Number(subjectId), isActive);
      }
    });

    await scanBlockRange(client, gradeFrom, latest, async (chunkFrom, chunkTo) => {
      const gradeLogs = await client.getLogs({
        address: config.gradebook,
        event: gradePostedEvent,
        fromBlock: chunkFrom,
        toBlock: chunkTo,
      });

      for (const log of gradeLogs) {
        const student = log.args.student;
        const subjectId = log.args.subjectId;
        if (!student || subjectId === undefined) continue;

        await indexGradePosted(
          db,
          client,
          config,
          getAddress(student),
          subjectId,
          Number(log.blockNumber ?? 0)
        );
      }
    });

    setLastGradebookScannedBlock(db, Number(latest));

    if (isBackfill) {
      console.log("[indexer] Gradebook backfill complete");
    }
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
