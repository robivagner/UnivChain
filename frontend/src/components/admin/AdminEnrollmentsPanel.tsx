"use client";

import { useState } from "react";
import { getAddress, isAddress } from "viem";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { UniversityCoreABI } from "@/abi/UniversityCore";
import { useIsAdmin } from "@/lib/useIsAdmin";
import { hashStudentMatriculation } from "@/lib/matriculation";
import { usePendingEnrollmentRequests } from "@/lib/enrollment/usePendingEnrollmentRequests";
import { ANVIL_ADMIN_ADDRESS } from "@/constants/local";
import { PendingEnrollmentRow } from "./PendingEnrollmentRow";
import { formInputClassName } from "@/lib/formInputClassName";

export function AdminEnrollmentsPanel() {
  const { isConnected, address } = useAccount();
  const { isAdmin, isLoading: isAdminLoading } = useIsAdmin();
  const publicClient = usePublicClient();

  const { data: pending = [], isLoading, isFetching, error, deployment, refreshAfterAction } =
    usePendingEnrollmentRequests(isAdmin);

  const [manualAddress, setManualAddress] = useState("");
  const [manualMatriculation, setManualMatriculation] = useState("");
  const { writeContractAsync, isPending: isManualPending, error: manualError, reset } =
    useWriteContract();

  if (!isConnected) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">
        Connect your wallet to manage enrollments.
      </div>
    );
  }

  if (isAdminLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">
        Checking admin role…
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        <p className="font-semibold mb-2">Admin access required</p>
        <p className="mb-2">
          Connected account does not have <span className="font-mono">ADMIN_ROLE</span> on
          UniversityCore.
        </p>
        <p className="font-mono text-xs break-all">Connected: {address}</p>
        <p className="text-xs mt-2">Local dev admin (Anvil #0): {ANVIL_ADMIN_ADDRESS}</p>
      </div>
    );
  }

  if (!deployment) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        This network is not configured. Use Anvil chain <span className="font-mono">31337</span> and
        run <span className="font-mono">make local</span>.
      </div>
    );
  }

  const handleManualAccept = async () => {
    if (!publicClient || !isAddress(manualAddress) || !manualMatriculation.trim()) {
      alert("Enter a valid student address and matriculation number.");
      return;
    }

    reset();
    try {
      const hash = await writeContractAsync({
        address: deployment.universityCore,
        abi: UniversityCoreABI,
        functionName: "acceptEnrollment",
        args: [getAddress(manualAddress), hashStudentMatriculation(manualMatriculation)],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setManualAddress("");
      setManualMatriculation("");
      await refreshAfterAction(getAddress(manualAddress));
    } catch {
      // manualError
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-2xl mx-auto">
      <section>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Enrollment requests</h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          Pending requests come from the UnivChain indexer (SQLite + incremental event scan), reconciled
          with on-chain fee and enrollment state. Run <span className="font-mono">make indexer-dev</span>{" "}
          alongside the frontend. After accept or reject, the row disappears immediately and the
          indexer syncs on demand (no need to wait for the 15s poll).
        </p>
        {isFetching && !isLoading && (
          <p className="text-xs text-blue-600 mt-2">Refreshing…</p>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">
          Pending ({pending.length})
        </h2>

        {isLoading && (
          <p className="text-sm text-slate-500 py-8 text-center">Loading pending requests…</p>
        )}

        {error && (
          <p className="text-sm text-red-600 py-4">
            {error instanceof Error ? error.message : "Failed to load pending requests"}
          </p>
        )}

        {!isLoading && !error && pending.length === 0 && (
          <p className="text-sm text-slate-500 py-8 text-center rounded-xl border border-dashed border-slate-300 bg-white">
            No pending enrollment requests. Students appear here after they call{" "}
            <span className="font-mono">requestEnrollment</span>.
          </p>
        )}

        {!isLoading && pending.length > 0 && (
          <ul className="flex flex-col gap-3">
            {pending.map((req) => (
              <PendingEnrollmentRow
                key={req.student}
                request={req}
                deployment={deployment}
                onSettled={refreshAfterAction}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-800 mb-2">Manual accept</h2>
        <p className="text-xs text-slate-500 mb-4">
          Fallback if a student paid but does not appear in the list (e.g. very old events). Prefer
          the queue above.
        </p>
        <div className="flex flex-col gap-3">
          <input
            className={`${formInputClassName} font-mono`}
            placeholder="Student address 0x…"
            value={manualAddress}
            onChange={(e) => setManualAddress(e.target.value)}
          />
          <input
            className={formInputClassName}
            placeholder="Matriculation number"
            value={manualMatriculation}
            onChange={(e) => setManualMatriculation(e.target.value)}
          />
          <button
            type="button"
            onClick={handleManualAccept}
            disabled={isManualPending}
            className="py-2 rounded-lg text-sm font-semibold text-white bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400"
          >
            {isManualPending ? "Processing…" : "Accept manually"}
          </button>
          {manualError && (
            <p className="text-[10px] font-mono text-red-600 break-words">{manualError.message}</p>
          )}
        </div>
      </section>
    </div>
  );
}
