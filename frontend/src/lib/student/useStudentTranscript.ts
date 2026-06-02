"use client";

import { useQuery } from "@tanstack/react-query";
import type { PublicClient } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { GradebookABI } from "@/abi/Gradebook";
import { getDeployment } from "@/lib/contracts";

export type TranscriptRow = {
  subjectId: bigint;
  subjectName: string;
  credits: number;
  grade: number;
  gradedAt: Date | null;
  professor: `0x${string}`;
};

async function fetchTranscript(
  publicClient: PublicClient,
  gradebook: `0x${string}`,
  student: `0x${string}`
): Promise<TranscriptRow[]> {
  const counter = await publicClient.readContract({
    address: gradebook,
    abi: GradebookABI,
    functionName: "s_tokenIdCounter",
  });

  if (counter <= 1n) return [];

  const rows: TranscriptRow[] = [];

  for (let subjectId = 1n; subjectId < counter; subjectId++) {
    const [grade, timestamp, professor] = await publicClient.readContract({
      address: gradebook,
      abi: GradebookABI,
      functionName: "getStudentGradeRecordOfSubject",
      args: [student, subjectId],
    });

    if (grade === 0) continue;

    const [name, credits] = await publicClient.readContract({
      address: gradebook,
      abi: GradebookABI,
      functionName: "getSubjectMetadata",
      args: [subjectId],
    });

    rows.push({
      subjectId,
      subjectName: name,
      credits: Number(credits),
      grade: Number(grade),
      gradedAt: timestamp > 0n ? new Date(Number(timestamp) * 1000) : null,
      professor,
    });
  }

  return rows.sort((a, b) => Number(a.subjectId - b.subjectId));
}

export function useStudentTranscript() {
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient();
  const deployment = chainId !== undefined ? getDeployment(chainId) : undefined;
  const gradebook = deployment?.gradebook;

  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ["student-transcript", chainId, address, gradebook],
    enabled: Boolean(publicClient && gradebook && address),
    staleTime: 5_000,
    queryFn: () => fetchTranscript(publicClient!, gradebook!, address!),
  });

  return {
    rows,
    isLoading,
    error: error instanceof Error ? error.message : undefined,
  };
}
