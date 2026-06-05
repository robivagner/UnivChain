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
import { AdminTxProvider, useAdminTx } from "./AdminTxContext";
import { formInputClassName } from "@/lib/formInputClassName";
import { formatTxError } from "@/lib/wallet/formatTxError";
import { runContractTx } from "@/lib/wallet/runContractTx";
import { useNotifications } from "@/lib/notifications/NotificationProvider";
import {
  btnSecondaryClass,
  formInputMonoClassName,
  portalCardClass,
  portalSectionTitleClass,
} from "@/lib/ui/portalClasses";
import {
  RoleGateConnect,
  RoleGateDenied,
  RoleGateLoading,
  RoleGateMissingDeployment,
} from "@/components/shared/RoleGate";

type Props = {
  /** When true, rendered inside AdminDashboard (no outer role gate). */
  embedded?: boolean;
};

export function AdminEnrollmentsPanel({ embedded = false }: Props) {
  return (
    <AdminTxProvider>
      <AdminEnrollmentsPanelContent embedded={embedded} />
    </AdminTxProvider>
  );
}

function AdminEnrollmentsPanelContent({ embedded = false }: Props) {
  const { isConnected, address } = useAccount();
  const { isAdmin, isLoading: isAdminLoading } = useIsAdmin();
  const publicClient = usePublicClient();

  const { data: pending = [], isLoading, isFetching, error, deployment, refreshAfterAction } =
    usePendingEnrollmentRequests(isAdmin);

  const [manualAddress, setManualAddress] = useState("");
  const [manualMatriculation, setManualMatriculation] = useState("");
  const { notifyError, notifySuccess } = useNotifications();
  const { txBusy, runAdminTx } = useAdminTx();
  const { writeContractAsync, isPending: isManualPending, reset } = useWriteContract();

  if (!embedded) {
    if (!isConnected) return <RoleGateConnect title="enrollment management" />;
    if (isAdminLoading) return <RoleGateLoading />;
    if (!isAdmin) {
      return (
        <RoleGateDenied
          title="Admin access required"
          roleLabel="ADMIN_ROLE"
          connected={address}
          hint={`Local dev admin (Anvil #0): ${ANVIL_ADMIN_ADDRESS}`}
        />
      );
    }
    if (!deployment) return <RoleGateMissingDeployment />;
  }

  if (!deployment) return null;

  const handleManualAccept = () => {
    if (!publicClient || !isAddress(manualAddress) || !manualMatriculation.trim()) {
      notifyError("Enter a valid student address and matriculation number.");
      return;
    }

    void runAdminTx(async () => {
      reset();
      try {
        const student = getAddress(manualAddress);
        await runContractTx({
          publicClient,
          write: () =>
            writeContractAsync({
              address: deployment.universityCore,
              abi: UniversityCoreABI,
              functionName: "acceptEnrollment",
              args: [student, hashStudentMatriculation(manualMatriculation)],
            }),
        });
        setManualAddress("");
        setManualMatriculation("");
        notifySuccess(`Enrollment accepted for ${student}.`);
        await refreshAfterAction(student);
      } catch (e) {
        notifyError(formatTxError(e), "Transaction failed");
      }
    });
  };

  const manualBusy = txBusy || isManualPending;

  return (
    <div className={`flex flex-col gap-8 ${embedded ? "" : "max-w-2xl mx-auto"}`}>
      <section>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3">
          <h3 className={portalSectionTitleClass}>Pending ({pending.length})</h3>
          {isFetching && !isLoading && (
            <p className="text-xs text-uc-cyan">Refreshing…</p>
          )}
        </div>
        {isLoading && (
          <p className="text-sm text-uc-muted py-8 text-center">Loading pending requests…</p>
        )}

        {error && (
          <p className="text-sm text-red-300 py-4">
            {error instanceof Error ? error.message : "Failed to load pending requests"}
          </p>
        )}

        {!isLoading && !error && pending.length === 0 && (
          <p className="text-sm text-uc-muted py-8 text-center rounded-xl border border-dashed border-white/15 portal-card">
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

      <section className={portalCardClass}>
        <h3 className={portalSectionTitleClass}>Manual accept</h3>
        <p className="text-xs text-uc-muted mb-4">
          Fallback if a student paid but does not appear in the list. Prefer the queue above.
        </p>
        <div className="flex flex-col gap-3">
          <input
            className={formInputMonoClassName}
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
            disabled={manualBusy}
            className={btnSecondaryClass}
          >
            {manualBusy ? "Processing…" : "Accept manually"}
          </button>
        </div>
      </section>
    </div>
  );
}
