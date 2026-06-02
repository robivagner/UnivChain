"use client";

import { useState } from "react";
import { usePublicClient, useWriteContract } from "wagmi";
import { UniversityCoreABI } from "@/abi/UniversityCore";
import { hashStudentMatriculation } from "@/lib/matriculation";
import { formatTxError } from "@/lib/wallet/formatTxError";
import { runContractTx } from "@/lib/wallet/runContractTx";
import { TxErrorAlert } from "@/components/shared/TxErrorAlert";
import type { UnivChainDeployment } from "@/constants/contracts";
import type { PendingEnrollmentRequest } from "@/lib/enrollment/types";
import { formInputClassName, formLabelClass } from "@/lib/formInputClassName";
import { useAdminTx } from "./AdminTxContext";
import {
  btnAccentClass,
  btnGhostClass,
  portalCardClass,
} from "@/lib/ui/portalClasses";

type Props = {
  request: PendingEnrollmentRequest;
  deployment: UnivChainDeployment;
  onSettled: (student: `0x${string}`) => Promise<void>;
};

export function PendingEnrollmentRow({ request, deployment, onSettled }: Props) {
  const publicClient = usePublicClient();
  const { txBusy, runAdminTx } = useAdminTx();
  const [matriculation, setMatriculation] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const { writeContractAsync, isPending, reset } = useWriteContract();

  const busy = txBusy || isPending;

  const handleAccept = () => {
    if (!publicClient) return;
    if (!matriculation.trim()) {
      alert("Enter a matriculation number for this student.");
      return;
    }

    void runAdminTx(async () => {
      reset();
      setLocalError(null);
      try {
        await runContractTx({
          publicClient,
          write: () =>
            writeContractAsync({
              address: deployment.universityCore,
              abi: UniversityCoreABI,
              functionName: "acceptEnrollment",
              args: [request.student, hashStudentMatriculation(matriculation)],
            }),
        });
        setMatriculation("");
        await onSettled(request.student);
      } catch (e) {
        setLocalError(formatTxError(e));
      }
    });
  };

  const handleReject = () => {
    if (!publicClient) return;
    if (!confirm(`Reject enrollment for ${request.student}? The fee will be refunded.`)) return;

    void runAdminTx(async () => {
      reset();
      setLocalError(null);
      try {
        await runContractTx({
          publicClient,
          write: () =>
            writeContractAsync({
              address: deployment.universityCore,
              abi: UniversityCoreABI,
              functionName: "rejectEnrollment",
              args: [request.student],
            }),
        });
        await onSettled(request.student);
      } catch (e) {
        setLocalError(formatTxError(e));
      }
    });
  };

  return (
    <li className={`${portalCardClass} flex flex-col gap-3`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="portal-section-title">Student wallet</p>
          <p className="font-mono text-sm break-all text-uc-text">{request.student}</p>
        </div>
        {request.requestedAtBlock !== undefined && (
          <span className="text-[10px] text-uc-muted font-mono">
            block {request.requestedAtBlock.toString()}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className={formLabelClass}>Matriculation number</label>
        <input
          className={formInputClassName}
          placeholder="e.g. RO-2026-001"
          value={matriculation}
          onChange={(e) => setMatriculation(e.target.value)}
          disabled={busy}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleAccept}
          disabled={busy}
          className={`${btnAccentClass} flex-1 min-w-[120px]`}
        >
          {busy ? "Processing…" : "Accept"}
        </button>
        <button
          type="button"
          onClick={handleReject}
          disabled={busy}
          className={`${btnGhostClass} !px-4`}
        >
          Reject
        </button>
      </div>

      {localError && <TxErrorAlert message={localError} />}
    </li>
  );
}
