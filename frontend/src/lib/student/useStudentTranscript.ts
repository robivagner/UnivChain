"use client";

import { useQuery } from "@tanstack/react-query";
import { getAddress } from "viem";
import { useAccount, useChainId } from "wagmi";
import { getDeployment } from "@/lib/contracts";

export type TranscriptRow = {
  subjectId: bigint;
  subjectName: string;
  credits: number;
  grade: number;
  gradedAt: Date | null;
  professor: `0x${string}`;
};

type ApiResponse = {
  transcript: Array<{
    subjectId: number;
    subjectName: string;
    credits: number;
    grade: number;
    gradedAt: number | null;
    professor: string;
  }>;
};

async function fetchTranscriptFromIndexer(student: `0x${string}`): Promise<TranscriptRow[]> {
  const res = await fetch(
    `/api/student/transcript?student=${encodeURIComponent(student)}`,
    { cache: "no-store" }
  );
  const body = (await res.json()) as ApiResponse & { error?: string; hint?: string };

  if (!res.ok) {
    const parts = [body.error, body.hint].filter(Boolean).join(" — ");
    throw new Error(parts || `Request failed (${res.status})`);
  }

  return body.transcript.map((row) => ({
    subjectId: BigInt(row.subjectId),
    subjectName: row.subjectName,
    credits: row.credits,
    grade: row.grade,
    gradedAt: row.gradedAt != null ? new Date(row.gradedAt * 1000) : null,
    professor: getAddress(row.professor),
  }));
}

export function useStudentTranscript(enabled = true) {
  const { address, chainId } = useAccount();
  const deployment = chainId !== undefined ? getDeployment(chainId) : undefined;
  const student = address ? getAddress(address) : undefined;

  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ["student-transcript", chainId, deployment?.gradebook, student],
    enabled: Boolean(enabled && student && deployment?.gradebook),
    staleTime: 2_000,
    refetchInterval: 15_000,
    queryFn: () => fetchTranscriptFromIndexer(student!),
  });

  return {
    rows,
    isLoading,
    error: error instanceof Error ? error.message : undefined,
  };
}
