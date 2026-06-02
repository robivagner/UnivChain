"use client";

import { useState } from "react";
import { getAddress, isAddress } from "viem";
import { usePublicClient, useChainId } from "wagmi";
import { requireDeployment } from "@/lib/contracts";
import { verifyDiplomaByStudent, verifyDiplomaByTokenId } from "@/lib/verification/verifyDiploma";
import type { VerificationReport } from "@/lib/verification/types";
import {
  alertDangerClass,
  alertSuccessClass,
  alertWarningClass,
  btnSuccessClass,
  formInputMonoClassName,
  formLabelClass,
  messageBoxClass,
  portalCardClass,
} from "@/lib/ui/portalClasses";

export function VerifierPanel() {
  const chainId = useChainId();
  const publicClient = usePublicClient();

  const [studentAddr, setStudentAddr] = useState("");
  const [tokenIdInput, setTokenIdInput] = useState("");
  const [report, setReport] = useState<VerificationReport | null>(null);
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!publicClient) {
      alert("RPC client unavailable.");
      return;
    }

    let deployment;
    try {
      deployment = requireDeployment(chainId);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Network not configured.");
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
        const result = await verifyDiplomaByStudent(publicClient, deployment, getAddress(studentAddr));
        setReport(result);
      } else {
        alert("Enter a valid student address or a diploma token ID.");
      }
    } finally {
      setLoading(false);
    }
  };

  const statusLabel = {
    valid: "Valid",
    revoked: "Revoked",
    not_found: "Not found",
    error: "Error",
  }[report?.status ?? "error"];

  const statusClass = {
    valid: alertSuccessClass,
    revoked: alertWarningClass,
    not_found: `${portalCardClass} text-uc-muted`,
    error: alertDangerClass,
  }[report?.status ?? "error"];

  return (
    <div className="w-full flex flex-col gap-5">
      <p className="text-sm text-uc-muted text-center">
        Enter a student wallet or diploma token ID to verify credentials on-chain.
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
        {loading ? "Verifying..." : "Verify diploma"}
      </button>

      {report && (
        <div className={`${statusClass} text-sm`}>
          <p className="font-bold mb-2">Status: {statusLabel}</p>
          {report.errorMessage && (
            <p className="font-mono text-xs mb-2 break-all">{report.errorMessage}</p>
          )}
          {report.status !== "not_found" && report.status !== "error" && (
            <ul className="space-y-1 text-uc-text">
              {report.facultyName && <li>Faculty: {report.facultyName}</li>}
              {report.degreeTitle && <li>Degree: {report.degreeTitle}</li>}
              {report.major && <li>Major: {report.major}</li>}
              {report.finalAverageDisplay && <li>GPA: {report.finalAverageDisplay}</li>}
              {report.totalCredits !== undefined && <li>ECTS: {report.totalCredits.toString()}</li>}
              {report.tokenId !== undefined && <li>Token ID: {report.tokenId.toString()}</li>}
              {report.signatureValid !== undefined && (
                <li>
                  EIP-712 signature: {report.signatureValid ? "valid ✓" : "invalid ✗"}
                </li>
              )}
              {report.issuerMatchesCredential === false && (
                <li className="text-amber-300">Credential issuer ≠ on-chain diploma issuer</li>
              )}
              {report.issuerAddress && (
                <li className="font-mono text-xs break-all text-uc-muted">
                  On-chain issuer: {report.issuerAddress}
                </li>
              )}
              {report.documentHash &&
                report.documentHash !==
                  "0x0000000000000000000000000000000000000000000000000000000000000000" && (
                <li className="font-mono text-xs break-all text-uc-muted">
                  JSON hash: {report.documentHash}
                  {report.metadataHashMatch === true && " ✓ matches fetched JSON"}
                  {report.metadataHashMatch === false && " ✗ does not match fetched JSON"}
                </li>
              )}
              {report.metadataURI && (
                <li className="font-mono text-xs break-all text-uc-muted">
                  Metadata: {report.metadataURI}
                </li>
              )}
            </ul>
          )}
        </div>
      )}

      {!report && !loading && (
        <p className={`${messageBoxClass} text-center text-xs`}>
          Results appear here after verification completes.
        </p>
      )}
    </div>
  );
}
