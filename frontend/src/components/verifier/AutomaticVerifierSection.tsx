"use client";

import { useState } from "react";
import { getAddress, isAddress } from "viem";
import { usePublicClient, useChainId } from "wagmi";
import { requireDeployment } from "@/lib/contracts";
import { verifyDiplomaByStudent, verifyDiplomaByTokenId } from "@/lib/verification/verifyDiploma";
import type { VerificationReport } from "@/lib/verification/types";
import { useNotifications } from "@/lib/notifications/NotificationProvider";
import { VerificationReportCard } from "@/components/verifier/VerificationReportCard";
import {
  btnSuccessClass,
  formInputMonoClassName,
  formLabelClass,
  messageBoxClass,
} from "@/lib/ui/portalClasses";

export function AutomaticVerifierSection() {
  const chainId = useChainId();
  const publicClient = usePublicClient();

  const [studentAddr, setStudentAddr] = useState("");
  const [tokenIdInput, setTokenIdInput] = useState("");
  const [report, setReport] = useState<VerificationReport | null>(null);
  const [loading, setLoading] = useState(false);

  const { notifyError } = useNotifications();

  const handleVerify = async () => {
    if (!publicClient) {
      notifyError("RPC client unavailable.");
      return;
    }

    let deployment;
    try {
      deployment = requireDeployment(chainId);
    } catch (e) {
      notifyError(e instanceof Error ? e.message : "Network not configured.");
      return;
    }

    setLoading(true);
    setReport(null);

    try {
      if (tokenIdInput.trim()) {
        const tokenId = BigInt(tokenIdInput.trim());
        const student = isAddress(studentAddr) ? getAddress(studentAddr) : undefined;
        const result = await verifyDiplomaByTokenId(publicClient, deployment, tokenId, student);
        setReport(result);
      } else if (isAddress(studentAddr)) {
        const result = await verifyDiplomaByStudent(
          publicClient,
          deployment,
          getAddress(studentAddr)
        );
        setReport(result);
      } else {
        notifyError("Enter a valid student address or a diploma token ID.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-uc-muted">
        The app looks up the diploma on-chain, fetches the credential JSON from IPFS (or HTTPS),
        and runs the full cryptographic checks automatically.
      </p>

      <div className="flex flex-col gap-1">
        <label className={formLabelClass}>Student address (optional if you have a token ID)</label>
        <input
          className={formInputMonoClassName}
          placeholder="0x..."
          value={studentAddr}
          onChange={(e) => setStudentAddr(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className={formLabelClass}>Diploma token ID</label>
        <input
          className={formInputMonoClassName}
          placeholder="1"
          value={tokenIdInput}
          onChange={(e) => setTokenIdInput(e.target.value)}
        />
      </div>

      <button type="button" onClick={handleVerify} disabled={loading} className={btnSuccessClass}>
        {loading ? "Verifying…" : "Verify automatically"}
      </button>

      {report && <VerificationReportCard report={report} />}

      {!report && !loading && (
        <p className={`${messageBoxClass} text-center text-xs`}>
          Results appear here after verification completes.
        </p>
      )}
    </div>
  );
}
