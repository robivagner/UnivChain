export type IndexerConfig = {
  chainId: number;
  rpcUrl: string;
  deployBlock: number;
  universityCore: `0x${string}`;
  studentRegistry: `0x${string}`;
  feeManager: `0x${string}`;
};

export type EnrollmentStatus = "pending" | "accepted" | "rejected";

export type PendingEnrollmentDto = {
  student: `0x${string}`;
  requestedAtBlock: number | null;
};
