"use client";

import { useState } from "react";
import { getAddress, isAddress } from "viem";
import { usePublicClient, useChainId } from "wagmi";
import { requireDeployment } from "@/lib/contracts";
import { verifyDiplomaByStudent, verifyDiplomaByTokenId } from "@/lib/verification/verifyDiploma";
import type { VerificationReport } from "@/lib/verification/types";

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

  const statusColor = {
    valid: "text-green-700 bg-green-50 border-green-200",
    revoked: "text-amber-700 bg-amber-50 border-amber-200",
    not_found: "text-slate-600 bg-slate-50 border-slate-200",
    error: "text-red-700 bg-red-50 border-red-200",
  }[report?.status ?? "error"];

  return (
    <div className="w-full max-w-lg flex flex-col gap-4">
      <p className="text-sm text-slate-500 text-center">
        Read-only verification — no wallet required (RPC only).
      </p>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-600">
          Student address (optional if you have a token ID)
        </label>
        <input
          className="border border-slate-300 p-2 rounded text-sm font-mono"
          placeholder="0x..."
          value={studentAddr}
          onChange={(e) => setStudentAddr(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-600">Diploma token ID</label>
        <input
          className="border border-slate-300 p-2 rounded text-sm font-mono"
          placeholder="1"
          value={tokenIdInput}
          onChange={(e) => setTokenIdInput(e.target.value)}
        />
      </div>

      <button
        type="button"
        onClick={handleVerify}
        disabled={loading}
        className="py-2 rounded font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400"
      >
        {loading ? "Verifying..." : "Verify diploma"}
      </button>

      {report && (
        <div className={`p-4 rounded-lg border text-sm ${statusColor}`}>
          <p className="font-bold mb-2">Status: {statusLabel}</p>
          {report.errorMessage && <p className="font-mono text-xs mb-2">{report.errorMessage}</p>}
          {report.status !== "not_found" && report.status !== "error" && (
            <ul className="space-y-1 text-slate-800">
              {report.facultyName && <li>Faculty: {report.facultyName}</li>}
              {report.degreeTitle && <li>Degree: {report.degreeTitle}</li>}
              {report.major && <li>Major: {report.major}</li>}
              {report.finalAverageDisplay && <li>GPA: {report.finalAverageDisplay}</li>}
              {report.totalCredits !== undefined && <li>ECTS: {report.totalCredits.toString()}</li>}
              {report.tokenId !== undefined && <li>Token ID: {report.tokenId.toString()}</li>}
              {report.documentHash && (
                <li className="font-mono text-xs break-all">Document hash: {report.documentHash}</li>
              )}
              {report.metadataURI && (
                <li className="font-mono text-xs break-all">Metadata: {report.metadataURI}</li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
