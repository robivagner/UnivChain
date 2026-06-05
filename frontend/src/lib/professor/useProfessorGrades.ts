"use client";

import { useQuery } from "@tanstack/react-query";
import { getAddress } from "viem";
import { useAccount } from "wagmi";
import { getDeployment } from "@/lib/contracts";
import { triggerIndexerSync } from "@/lib/indexer/triggerIndexerSync";

export type ProfessorGradeRow = {
  student: `0x${string}`;
  subjectId: bigint;
  subjectName: string;
  credits: number;
  grade: number;
  gradedAt: Date | null;
  subjectActive: boolean;
};

type ApiResponse = {
  grades: Array<{
    student: string;
    subjectId: number;
    subjectName: string;
    credits: number;
    grade: number;
    gradedAt: number | null;
    subjectActive: boolean;
  }>;
};

async function fetchProfessorGradesFromIndexer(
  professor: `0x${string}`
): Promise<ProfessorGradeRow[]> {
  const res = await fetch(
    `/api/professor/grades?professor=${encodeURIComponent(professor)}`,
    { cache: "no-store" }
  );
  const body = (await res.json()) as ApiResponse & { error?: string; hint?: string };

  if (!res.ok) {
    const parts = [body.error, body.hint].filter(Boolean).join(" — ");
    throw new Error(parts || `Request failed (${res.status})`);
  }

  return body.grades.map((row) => ({
    student: getAddress(row.student),
    subjectId: BigInt(row.subjectId),
    subjectName: row.subjectName,
    credits: row.credits,
    grade: row.grade,
    gradedAt: row.gradedAt != null ? new Date(row.gradedAt * 1000) : null,
    subjectActive: row.subjectActive,
  }));
}

export function useProfessorGrades(enabled: boolean) {
  const { address, chainId } = useAccount();
  const deployment = chainId !== undefined ? getDeployment(chainId) : undefined;
  const professor = address ? getAddress(address) : undefined;

  const queryKey = ["professor-grades", chainId, deployment?.gradebook, professor] as const;

  const { data: rows = [], isLoading, error, refetch } = useQuery({
    queryKey,
    enabled: Boolean(enabled && professor && deployment?.gradebook),
    staleTime: 2_000,
    refetchInterval: 15_000,
    queryFn: () => fetchProfessorGradesFromIndexer(professor!),
  });

  const refreshAfterGradeChange = async () => {
    try {
      await triggerIndexerSync();
    } catch {
      // ignore — periodic refetch will catch up
    }
    await refetch();
  };

  return {
    rows,
    isLoading,
    error: error instanceof Error ? error.message : undefined,
    refetch,
    refreshAfterGradeChange,
  };
}
