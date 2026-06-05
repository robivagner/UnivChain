"use client";

import { useQuery } from "@tanstack/react-query";
import { getAddress } from "viem";
import { useAccount, useChainId } from "wagmi";
import { getDeployment } from "@/lib/contracts";
import { triggerIndexerSync } from "@/lib/indexer/triggerIndexerSync";

export type ProfessorSubject = {
  subjectId: bigint;
  name: string;
  credits: number;
  professor: `0x${string}`;
  isActive: boolean;
};

type ApiResponse = {
  subjects: Array<{
    subjectId: number;
    name: string;
    credits: number;
    professor: string;
    isActive: boolean;
  }>;
};

async function fetchProfessorSubjects(professor: `0x${string}`): Promise<ProfessorSubject[]> {
  const res = await fetch(
    `/api/professor/subjects?professor=${encodeURIComponent(professor)}`,
    { cache: "no-store" }
  );
  const body = (await res.json()) as ApiResponse & { error?: string; hint?: string };

  if (!res.ok) {
    const parts = [body.error, body.hint].filter(Boolean).join(" — ");
    throw new Error(parts || `Request failed (${res.status})`);
  }

  return body.subjects.map((row) => ({
    subjectId: BigInt(row.subjectId),
    name: row.name,
    credits: row.credits,
    professor: getAddress(row.professor),
    isActive: row.isActive,
  }));
}

export function useProfessorSubjects(enabled = true) {
  const { address, chainId } = useAccount();
  const deployment = chainId !== undefined ? getDeployment(chainId) : undefined;
  const professor = address ? getAddress(address) : undefined;

  const queryKey = ["professor-subjects", chainId, deployment?.gradebook, professor] as const;

  const { data: subjects = [], isLoading, error, refetch } = useQuery({
    queryKey,
    enabled: Boolean(enabled && professor && deployment?.gradebook),
    staleTime: 2_000,
    refetchInterval: 15_000,
    queryFn: () => fetchProfessorSubjects(professor!),
  });

  const refreshFromIndexer = async () => {
    try {
      await triggerIndexerSync();
    } catch {
      // ignore — periodic refetch will catch up
    }
    await refetch();
  };

  return {
    subjects,
    isLoading,
    error: error instanceof Error ? error.message : undefined,
    refetch,
    refreshFromIndexer,
    deployment,
    gradebook: deployment?.gradebook,
  };
}
