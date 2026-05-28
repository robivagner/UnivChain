"use client";

import { useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useBlockNumber } from "wagmi";

/**
 * Refetches wagmi contract reads when the chain head advances and after writes.
 * Use on panels that display balances or enrollment state.
 */
export function useLiveContractReads(enabled = true) {
  const queryClient = useQueryClient();
  const { data: blockNumber } = useBlockNumber({
    watch: enabled,
    query: { enabled },
  });

  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries();
  }, [queryClient]);

  useEffect(() => {
    if (!enabled || blockNumber === undefined) return;
    void invalidate();
  }, [blockNumber, enabled, invalidate]);

  return { invalidate, blockNumber };
}
