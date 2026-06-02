export type ParsedStudentMetadata = {
  studentIdHash: `0x${string}`;
  registrationTimestamp: bigint;
  graduationTimestamp: bigint;
  hasGraduated: boolean;
  isExpelled: boolean;
};

export function parseStudentMetadata(
  data:
    | readonly [`0x${string}`, bigint, bigint, boolean, boolean]
    | undefined
): ParsedStudentMetadata | undefined {
  if (!data) return undefined;
  const [studentIdHash, registrationTimestamp, graduationTimestamp, hasGraduated, isExpelled] = data;
  return {
    studentIdHash,
    registrationTimestamp,
    graduationTimestamp,
    hasGraduated,
    isExpelled,
  };
}

export function formatOnChainDate(timestamp: bigint): string | null {
  if (timestamp <= 0n) return null;
  return new Date(Number(timestamp) * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function shortenHash(hash: string, head = 10, tail = 8): string {
  if (hash.length <= head + tail + 3) return hash;
  return `${hash.slice(0, head)}…${hash.slice(-tail)}`;
}

export function gradeTone(grade: number): string {
  if (grade >= 9) return "text-emerald-300 bg-emerald-500/15 border-emerald-400/30";
  if (grade >= 7) return "text-cyan-300 bg-cyan-500/15 border-cyan-400/30";
  if (grade >= 5) return "text-amber-300 bg-amber-500/15 border-amber-400/30";
  return "text-red-300 bg-red-500/15 border-red-400/30";
}
