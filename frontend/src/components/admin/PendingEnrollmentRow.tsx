"use client";

import { useState } from "react";
import { usePublicClient, useWriteContract } from "wagmi";
import { UniversityCoreABI } from "@/abi/UniversityCore";
import { hashStudentMatriculation } from "@/lib/matriculation";
import type { UnivChainDeployment } from "@/constants/contracts";
import type { PendingEnrollmentRequest } from "@/lib/enrollment/types";
import { formInputClassName } from "@/lib/formInputClassName";

type Props = {
  request: PendingEnrollmentRequest;
  deployment: UnivChainDeployment;
  onSettled: (student: `0x${string}`) => Promise<void>;
};

export function PendingEnrollmentRow({ request, deployment, onSettled }: Props) {
  const publicClient = usePublicClient();
  const [matriculation, setMatriculation] = useState("");
  const { writeContractAsync, isPending, error, reset } = useWriteContract();

  const handleAccept = async () => {
    if (!publicClient) return;
    if (!matriculation.trim()) {
      alert("Enter a matriculation number for this student.");
      return;
    }

    reset();
    try {
      const hash = await writeContractAsync({
        address: deployment.universityCore,
        abi: UniversityCoreABI,
        functionName: "acceptEnrollment",
        args: [request.student, hashStudentMatriculation(matriculation)],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setMatriculation("");
      await onSettled(request.student);
    } catch {
      // surfaced via error
    }
  };

  const handleReject = async () => {
    if (!publicClient) return;
    if (!confirm(`Reject enrollment for ${request.student}? The fee will be refunded.`)) return;

    reset();
    try {
      const hash = await writeContractAsync({
        address: deployment.universityCore,
        abi: UniversityCoreABI,
        functionName: "rejectEnrollment",
        args: [request.student],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      await onSettled(request.student);
    } catch {
      // surfaced via error
    }
  };

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide">Student wallet</p>
          <p className="font-mono text-sm break-all text-slate-800">{request.student}</p>
        </div>
        {request.requestedAtBlock !== undefined && (
          <span className="text-[10px] text-slate-400 font-mono">block {request.requestedAtBlock.toString()}</span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-600">Matriculation number</label>
        <input
          className={formInputClassName}
          placeholder="e.g. RO-2026-001"
          value={matriculation}
          onChange={(e) => setMatriculation(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleAccept}
          disabled={isPending}
          className="flex-1 min-w-[120px] py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400"
        >
          {isPending ? "Processing…" : "Accept"}
        </button>
        <button
          type="button"
          onClick={handleReject}
          disabled={isPending}
          className="py-2 px-4 rounded-lg text-sm font-semibold text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 disabled:opacity-50"
        >
          Reject
        </button>
      </div>

      {error && (
        <p className="text-[10px] font-mono text-red-600 break-words">{error.message}</p>
      )}
    </li>
  );
}
