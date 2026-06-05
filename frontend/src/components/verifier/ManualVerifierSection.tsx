"use client";

import { useEffect, useRef, useState } from "react";
import { getAddress, isAddress } from "viem";
import { usePublicClient, useChainId } from "wagmi";
import { requireDeployment } from "@/lib/contracts";
import { resolveMetadataUrl } from "@/lib/diploma/metadata";
import {
  computeCredentialPreview,
  fetchOnChainDiplomaAnchor,
  verifyDiplomaManual,
  type OnChainDiplomaAnchor,
} from "@/lib/verification/verifyDiplomaManual";
import type { ManualVerificationReport } from "@/lib/verification/types";
import type { UnivChainDiplomaCredential } from "@/lib/diploma/types";
import { useNotifications } from "@/lib/notifications/NotificationProvider";
import { ManualVerificationReportCard } from "@/components/verifier/ManualVerificationReportCard";
import {
  btnAccentClass,
  btnGhostClass,
  btnSecondaryClass,
  btnSuccessClass,
  formInputClassName,
  formInputMonoClassName,
  formLabelClass,
  portalCardClass,
  portalSectionTitleClass,
  portalStatTileClass,
} from "@/lib/ui/portalClasses";

const COMPUTED_HASH_HELP =
  "Hash of the pasted JSON, calculated with evidence.documentHash set to zero. It should match the documentHash inside the JSON and the one stored on-chain.";

const DOCUMENT_HASH_HELP =
  "When a diploma is issued, the system creates a fingerprint of the credential file. The documentHash field is temporarily set to zero, then the whole JSON is hashed. That fingerprint is written into the file and recorded on the blockchain.";

function HelpHint({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div className="relative inline-flex shrink-0" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/20 bg-white/5 text-[10px] font-bold leading-none text-uc-muted hover:border-uc-cyan/40 hover:text-uc-cyan"
        aria-label="Help"
        aria-expanded={open}
      >
        ?
      </button>
      {open && (
        <div
          role="tooltip"
          className="absolute left-0 top-full z-20 mt-1.5 w-64 rounded-lg border border-white/15 bg-[var(--uc-bg-elevated)] p-3 text-xs font-normal normal-case tracking-normal text-uc-muted shadow-xl"
        >
          {text}
        </div>
      )}
    </div>
  );
}

function DataRow({
  label,
  value,
  labelHelp,
}: {
  label: string;
  value: string;
  labelHelp?: string;
}) {
  return (
    <div className={portalStatTileClass}>
      <div className="mb-1 flex items-center gap-1.5">
        <p className="text-[10px] uppercase tracking-wider text-uc-muted">{label}</p>
        {labelHelp && <HelpHint text={labelHelp} />}
      </div>
      <p className="font-mono text-xs break-all text-uc-text">{value}</p>
    </div>
  );
}

export function ManualVerifierSection() {
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { notifyError } = useNotifications();

  const [tokenIdInput, setTokenIdInput] = useState("");
  const [studentAddr, setStudentAddr] = useState("");
  const [anchor, setAnchor] = useState<OnChainDiplomaAnchor | null>(null);
  const [fetchLoading, setFetchLoading] = useState(false);

  const [rawJson, setRawJson] = useState("");
  const [previewCredential, setPreviewCredential] = useState<UnivChainDiplomaCredential | null>(
    null
  );
  const [computedHash, setComputedHash] = useState<`0x${string}` | null>(null);
  const [computeError, setComputeError] = useState<string | null>(null);

  const [report, setReport] = useState<ManualVerificationReport | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);

  const metadataHref = anchor?.metadataURI
    ? resolveMetadataUrl(anchor.metadataURI)
    : null;

  const resolveLookup = () => {
    if (tokenIdInput.trim()) {
      if (!/^\d+$/.test(tokenIdInput.trim()) || BigInt(tokenIdInput.trim()) <= 0n) {
        notifyError("Enter a valid diploma token ID (positive integer).");
        return null;
      }
      const studentAddress = isAddress(studentAddr) ? getAddress(studentAddr) : undefined;
      return { tokenId: BigInt(tokenIdInput.trim()), studentAddress };
    }
    if (isAddress(studentAddr)) {
      return { studentAddress: getAddress(studentAddr) };
    }
    notifyError("Enter a student address or a diploma token ID.");
    return null;
  };

  const handleFetchOnChain = async () => {
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

    const lookup = resolveLookup();
    if (!lookup) return;

    setFetchLoading(true);
    setAnchor(null);
    setReport(null);

    try {
      const result = await fetchOnChainDiplomaAnchor(publicClient, deployment, lookup);
      if (!result) {
        notifyError("No diploma found on-chain for that address or token ID.");
        return;
      }
      setAnchor(result);
    } finally {
      setFetchLoading(false);
    }
  };

  const handleCompute = () => {
    setComputeError(null);
    setPreviewCredential(null);
    setComputedHash(null);
    setReport(null);

    const preview = computeCredentialPreview(rawJson);
    if (!preview.ok) {
      setComputeError(preview.error);
      notifyError(preview.error);
      return;
    }

    setPreviewCredential(preview.credential);
    setComputedHash(preview.computedDocumentHash);
  };

  const handleVerify = async () => {
    if (!publicClient) {
      notifyError("RPC client unavailable.");
      return;
    }

    if (!anchor) {
      notifyError("Fetch the on-chain record first (step 1).");
      return;
    }

    const preview = computeCredentialPreview(rawJson);
    if (!preview.ok) {
      notifyError("Compute values from JSON first (step 2).");
      return;
    }

    let deployment;
    try {
      deployment = requireDeployment(chainId);
    } catch (e) {
      notifyError(e instanceof Error ? e.message : "Network not configured.");
      return;
    }

    setVerifyLoading(true);
    setReport(null);

    try {
      const result = await verifyDiplomaManual(publicClient, deployment, {
        rawJson,
        anchor,
      });
      setReport(result);
    } finally {
      setVerifyLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <p className="text-sm text-uc-muted">
        Walk through verification step by step: read what the chain stores, inspect the JSON you
        fetched, then confirm they match and the issuer signature is valid.
      </p>

      {/* Step 1 */}
      <section className="flex flex-col gap-4">
        <h3 className={portalSectionTitleClass}>1. Fetch on-chain record</h3>
        <p className="text-xs text-uc-muted">
          Look up the diploma by student wallet or token ID. This returns the metadata URI (where
          the JSON lives), the hash stored on-chain, and the issuer wallet.
        </p>

        <div className="flex flex-col gap-1">
          <label className={formLabelClass}>Student address</label>
          <input
            className={formInputMonoClassName}
            placeholder="0x…"
            value={studentAddr}
            onChange={(e) => setStudentAddr(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className={formLabelClass}>Diploma token ID (optional if student is set)</label>
          <input
            className={formInputMonoClassName}
            placeholder="1"
            value={tokenIdInput}
            onChange={(e) => setTokenIdInput(e.target.value)}
          />
        </div>

        <button
          type="button"
          onClick={handleFetchOnChain}
          disabled={fetchLoading}
          className={btnAccentClass}
        >
          {fetchLoading ? "Fetching…" : "Fetch on-chain"}
        </button>

        {anchor && (
          <div className={`${portalCardClass} flex flex-col gap-3`}>
            <p className="text-xs text-uc-muted">
              Status:{" "}
              <span className={anchor.valid ? "text-emerald-300" : "text-amber-300"}>
                {anchor.valid ? "Valid (not revoked)" : anchor.revoked ? "Revoked" : "Invalid"}
              </span>
            </p>
            <DataRow label="Metadata URI" value={anchor.metadataURI} />
            {metadataHref && (
              <a
                href={metadataHref}
                target="_blank"
                rel="noreferrer"
                className={`${btnGhostClass} !w-auto text-center text-xs`}
              >
                Open credential JSON in browser
              </a>
            )}
            <DataRow label="documentHash (on-chain)" value={anchor.documentHash} />
            <DataRow label="Issuer (on-chain)" value={anchor.issuer} />
          </div>
        )}
      </section>

      {/* Step 2 */}
      <section className="flex flex-col gap-4 border-t border-white/10 pt-6">
        <h3 className={portalSectionTitleClass}>2. Paste JSON and compute</h3>
        <p className="text-xs text-uc-muted flex flex-wrap items-center gap-1.5">
          <span>
            Copy the JSON from the metadata URI above into the box. Press{" "}
            <strong className="text-uc-text font-medium">Compute</strong> to parse it and derive the
            document hash.
          </span>
          <HelpHint text={DOCUMENT_HASH_HELP} />
        </p>

        <textarea
          className={`${formInputClassName} min-h-[200px] font-mono text-xs leading-relaxed`}
          placeholder="Paste credential JSON from the metadata URI…"
          value={rawJson}
          onChange={(e) => {
            setRawJson(e.target.value);
            setPreviewCredential(null);
            setComputedHash(null);
            setComputeError(null);
            setReport(null);
          }}
          spellCheck={false}
        />

        <button type="button" onClick={handleCompute} className={btnSecondaryClass}>
          Compute from JSON
        </button>

        {computeError && <p className="text-sm text-red-300">{computeError}</p>}

        {previewCredential && computedHash && (
          <div className={`${portalCardClass} flex flex-col gap-3`}>
            <p className="text-xs font-medium text-uc-text">Values read from your pasted JSON</p>
            <DataRow label="Issuer (JSON)" value={previewCredential.issuer} />
            <DataRow label="Student (JSON)" value={previewCredential.student} />
            <DataRow
              label="Computed canonical hash"
              value={computedHash}
              labelHelp={COMPUTED_HASH_HELP}
            />
            <DataRow label="proof.proofValue (signature)" value={previewCredential.proof.proofValue} />
            {anchor && (
              <p className="text-xs text-uc-muted pt-1 border-t border-white/10">
                Compare <span className="font-mono">Computed canonical hash</span> with{" "}
                <span className="font-mono">documentHash (on-chain)</span> above — they should match
                if this is the authentic file.
              </p>
            )}
          </div>
        )}
      </section>

      {/* Step 3 */}
      <section className="flex flex-col gap-4 border-t border-white/10 pt-6">
        <h3 className={portalSectionTitleClass}>3. Verify</h3>
        <p className="text-xs text-uc-muted">
          Confirms the EIP-712 signature matches the issuer, the hash matches on-chain, and the
          diploma is not revoked.
        </p>

        <button
          type="button"
          onClick={handleVerify}
          disabled={verifyLoading || !anchor || !previewCredential}
          className={btnSuccessClass}
        >
          {verifyLoading ? "Verifying…" : "Verify"}
        </button>

        {report && <ManualVerificationReportCard report={report} />}
      </section>
    </div>
  );
}
