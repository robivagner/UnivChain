"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useChainId } from "wagmi";
import { getAddress } from "viem";
import { getDeployment } from "@/lib/contracts";
import { useLiveContractReads } from "@/lib/useLiveContractReads";
import { triggerIndexerSync } from "./triggerIndexerSync";
import type { PendingEnrollmentRequest } from "./types";

type ApiResponse = {
  pending: Array<{ student: string; requestedAtBlock: number | null }>;
};

async function fetchPendingFromIndexer(): Promise<PendingEnrollmentRequest[]> {
  const res = await fetch("/api/admin/pending-enrollments", { cache: "no-store" });
  const body = (await res.json()) as ApiResponse & { error?: string; hint?: string };

  if (!res.ok) {
    const parts = [body.error, body.hint].filter(Boolean).join(" — ");
    throw new Error(parts || `Request failed (${res.status})`);
  }

  return body.pending.map((row) => ({
    student: row.student as `0x${string}`,
    requestedAtBlock:
      row.requestedAtBlock != null ? BigInt(row.requestedAtBlock) : undefined,
  }));
}

export function usePendingEnrollmentRequests(enabled = true) {
  const chainId = useChainId();
  const deployment = chainId !== undefined ? getDeployment(chainId) : undefined;
  const queryClient = useQueryClient();

  const queryEnabled = Boolean(enabled && deployment);

  const queryKey = ["pendingEnrollments", chainId, deployment?.universityCore] as const;

  useLiveContractReads(queryEnabled);

  const query = useQuery({
    queryKey,
    enabled: queryEnabled,
    queryFn: fetchPendingFromIndexer,
    staleTime: 2_000,
    refetchInterval: 15_000,
  });

  const removePendingOptimistic = useCallback(
    (student: `0x${string}`) => {
      const normalized = getAddress(student).toLowerCase();
      queryClient.setQueryData<PendingEnrollmentRequest[]>(queryKey, (current) =>
        (current ?? []).filter((row) => getAddress(row.student).toLowerCase() !== normalized)
      );
    },
    [queryClient, queryKey]
  );

  /** After accept/reject: update UI immediately, refetch, sync indexer in background. */
  const refreshAfterAction = useCallback(
    async (student: `0x${string}`) => {
      removePendingOptimistic(student);
      await queryClient.invalidateQueries({ queryKey });
      void triggerIndexerSync().then(() => {
        void queryClient.invalidateQueries({ queryKey });
      });
    },
    [queryClient, queryKey, removePendingOptimistic]
  );

  const refresh = useCallback(async () => {
    try {
      await triggerIndexerSync();
    } catch {
      // ignore
    }
    await queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  return { ...query, deployment, refresh, refreshAfterAction, chainId };
}
