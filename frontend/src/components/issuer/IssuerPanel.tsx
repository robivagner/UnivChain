"use client";

import { useState } from "react";
import { getAddress, isAddress } from "viem";
import { useAccount, useChainId, usePublicClient, useSignTypedData, useWriteContract } from "wagmi";
import { StudentRegistryABI } from "@/abi/StudentRegistry";
import { UniversityCoreABI } from "@/abi/UniversityCore";
import { useIsIssuer } from "@/lib/useIsIssuer";
import { useGraduationEligibility } from "@/lib/issuer/useGraduationEligibility";
import {
  buildCredentialDraft,
  downloadCredentialJson,
  formatCredentialJson,
  isoTimestamp,
} from "@/lib/diploma/credential";
import { buildSignableFields, DIPLOMA_EIP712_TYPES, getEip712Domain } from "@/lib/diploma/eip712";
import { ZERO_BYTES32 } from "@/lib/diploma/types";
import { useLiveContractReads } from "@/lib/useLiveContractReads";
import { formInputClassName } from "@/lib/formInputClassName";
import { formatTxError } from "@/lib/wallet/formatTxError";
import { runContractTx } from "@/lib/wallet/runContractTx";
import { TxErrorAlert } from "@/components/shared/TxErrorAlert";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  alertSuccessClass,
  btnSuccessClass,
  formInputMonoClassName,
  portalCardClass,
  portalPageClass,
  portalSectionTitleClass,
} from "@/lib/ui/portalClasses";
import {
  RoleGateConnect,
  RoleGateDenied,
  RoleGateLoading,
  RoleGateMissingDeployment,
} from "@/components/shared/RoleGate";
import type { UnivChainDiplomaCredential } from "@/lib/diploma/types";

async function fetchStudentIdHash(
  publicClient: NonNullable<ReturnType<typeof usePublicClient>>,
  studentRegistry: `0x${string}`,
  student: `0x${string}`
): Promise<`0x${string}` | null> {
  const tokenId = await publicClient.readContract({
    address: studentRegistry,
    abi: StudentRegistryABI,
    functionName: "getStudentTokenId",
    args: [student],
  });
  if (tokenId === 0n) return null;

  const [studentIdHash] = await publicClient.readContract({
    address: studentRegistry,
    abi: StudentRegistryABI,
    functionName: "getStudentMetadata",
    args: [tokenId],
  });
  return studentIdHash === ZERO_BYTES32 ? null : studentIdHash;
}

export function IssuerPanel() {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const { isIssuer, isLoading: roleLoading, deployment } = useIsIssuer();
  const publicClient = usePublicClient();

  const [studentInput, setStudentInput] = useState("");
  const [degreeTitle, setDegreeTitle] = useState("Bachelor of Science");
  const [major, setMajor] = useState("Computer Science");
  const [metadataUri, setMetadataUri] = useState("");
  const [preparedCredential, setPreparedCredential] = useState<UnivChainDiplomaCredential | null>(
    null
  );
  const [message, setMessage] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const { eligibility, isLoading: eligibilityLoading } = useGraduationEligibility(studentInput);
  const { invalidate } = useLiveContractReads(Boolean(isIssuer));
  const { writeContractAsync, isPending, reset } = useWriteContract();
  const { signTypedDataAsync, isPending: isSigning } = useSignTypedData();

  if (!isConnected) return <RoleGateConnect title="the diploma issuer portal" />;
  if (roleLoading) return <RoleGateLoading />;
  if (!deployment) return <RoleGateMissingDeployment />;
  if (!isIssuer) {
    return (
      <RoleGateDenied
        title="Diploma issuer access required"
        roleLabel="DIPLOMA_ISSUER_ROLE"
        connected={address}
        hint="An admin must grant your wallet the diploma issuer role from the admin dashboard."
      />
    );
  }

  const handleSignAndPrepare = async () => {
    if (!publicClient || !address || chainId === undefined || !isAddress(studentInput)) {
      alert("Connect wallet and enter a valid student address.");
      return;
    }
    if (!degreeTitle.trim() || !major.trim()) {
      alert("Enter degree title and major.");
      return;
    }

    reset();
    setMessage(null);
    setLocalError(null);
    setPreparedCredential(null);

    try {
      const student = getAddress(studentInput);
      const issuer = getAddress(address);

      const [facultyName, studentIdHash] = await Promise.all([
        publicClient.readContract({
          address: deployment.universityCore,
          abi: UniversityCoreABI,
          functionName: "getFacultyName",
        }),
        fetchStudentIdHash(publicClient, deployment.studentRegistry, student),
      ]);

      const validFrom = isoTimestamp();
      const signable = buildSignableFields({
        issuer,
        student,
        degreeTitle: degreeTitle.trim(),
        major: major.trim(),
        facultyName,
        validFrom,
        chainId,
        certificationContract: deployment.certification,
        studentIdHash,
      });

      const proofValue = await signTypedDataAsync({
        domain: getEip712Domain(deployment, chainId),
        types: DIPLOMA_EIP712_TYPES,
        primaryType: "DiplomaCredential",
        message: signable,
      });

      const credential = buildCredentialDraft({
        issuer,
        student,
        degreeTitle: degreeTitle.trim(),
        major: major.trim(),
        facultyName,
        validFrom,
        chainId,
        certificationContract: deployment.certification,
        studentIdHash,
        proofValue,
      });

      setPreparedCredential(credential);
      setMessage(
        "Credential signed. Download the JSON, pin it to IPFS, paste the URI below, then mint on-chain."
      );
    } catch (e) {
      setLocalError(formatTxError(e));
    }
  };

  const handleMint = async () => {
    if (!publicClient || !preparedCredential || !isAddress(studentInput)) {
      alert("Sign and prepare the credential first.");
      return;
    }
    if (!metadataUri.trim()) {
      alert("Pin the credential JSON and enter its metadata URI (ipfs://… or https://…).");
      return;
    }

    reset();
    setLocalError(null);

    try {
      const student = getAddress(studentInput);
      await runContractTx({
        publicClient,
        invalidate,
        write: () =>
          writeContractAsync({
            address: deployment.universityCore,
            abi: UniversityCoreABI,
            functionName: "graduateStudentAndIssueDiploma",
            args: [student, preparedCredential.evidence.documentHash, metadataUri.trim()],
          }),
      });
      setMessage(`Diploma issued for ${student}. Enrollment closed; signed credential anchored on-chain.`);
      setPreparedCredential(null);
      setMetadataUri("");
    } catch (e) {
      setLocalError(formatTxError(e));
    }
  };

  return (
    <div className={portalPageClass}>
      <PageHeader
        kicker="Graduation workspace"
        title="Diploma issuer portal"
        description="Sign an EIP-712 diploma credential, pin the JSON to IPFS, then mint the on-chain soulbound diploma."
      />

      <section className={`${portalCardClass} flex flex-col gap-3`}>
        <h2 className={portalSectionTitleClass}>Student eligibility</h2>
        <input
          className={formInputMonoClassName}
          placeholder="Student wallet 0x…"
          value={studentInput}
          onChange={(e) => {
            setStudentInput(e.target.value);
            setPreparedCredential(null);
          }}
        />
        {eligibilityLoading && isAddress(studentInput) && (
          <p className="text-sm text-uc-muted">Loading on-chain eligibility…</p>
        )}
        {eligibility && (
          <ul className="text-sm space-y-1 text-uc-muted">
            <li>Enrolled: {eligibility.enrolled ? "yes" : "no"}</li>
            <li>Already graduated: {eligibility.graduated ? "yes" : "no"}</li>
            <li>Expelled: {eligibility.expelled ? "yes" : "no"}</li>
            <li>Has diploma: {eligibility.hasDiploma ? "yes" : "no"}</li>
            <li>
              Credits: {eligibility.credits.toString()} / {eligibility.creditsRequired.toString()}{" "}
              {eligibility.creditsOk ? "✓" : "✗"}
            </li>
            <li>
              Weighted average: {eligibility.averageDisplay} (min {eligibility.minAverageDisplay}){" "}
              {eligibility.averageOk ? "✓" : "✗"}
            </li>
            <li className={eligibility.eligible ? "text-emerald-300 font-medium" : "text-amber-300"}>
              {eligibility.eligible ? "Eligible to graduate" : "Not eligible yet"}
            </li>
          </ul>
        )}
      </section>

      <section className={`${portalCardClass} flex flex-col gap-3`}>
        <h2 className={portalSectionTitleClass}>1. Sign credential</h2>
        <input
          className={formInputClassName}
          placeholder="Degree title"
          value={degreeTitle}
          onChange={(e) => setDegreeTitle(e.target.value)}
        />
        <input
          className={formInputClassName}
          placeholder="Major / program"
          value={major}
          onChange={(e) => setMajor(e.target.value)}
        />
        <p className="text-xs text-uc-muted">
          Matriculation hash from StudentRegistry is included automatically when available (links
          wallet to university ID without exposing the matriculation number).
        </p>
        <button
          type="button"
          onClick={handleSignAndPrepare}
          disabled={isSigning || eligibility?.eligible === false}
          className={btnSuccessClass}
        >
          {isSigning ? "Awaiting signature…" : "Sign credential (EIP-712)"}
        </button>
      </section>

      {preparedCredential && (
        <section className={`${portalCardClass} flex flex-col gap-3`}>
          <h2 className={portalSectionTitleClass}>2. Pin & mint</h2>
          <p className="text-xs font-mono text-uc-muted break-all">
            documentHash: {preparedCredential.evidence.documentHash}
          </p>
          <textarea
            className={`${formInputClassName} min-h-40 font-mono text-xs`}
            readOnly
            value={formatCredentialJson(preparedCredential)}
          />
          <button
            type="button"
            onClick={() => downloadCredentialJson(preparedCredential)}
            className={btnSuccessClass}
          >
            Download credential.json
          </button>
          <input
            className={formInputClassName}
            placeholder="Metadata URI after pinning (ipfs://…)"
            value={metadataUri}
            onChange={(e) => setMetadataUri(e.target.value)}
          />
          <button
            type="button"
            onClick={handleMint}
            disabled={isPending}
            className={btnSuccessClass}
          >
            {isPending ? "Minting…" : "Graduate & mint on-chain"}
          </button>
        </section>
      )}

      {message && <p className={alertSuccessClass}>{message}</p>}
      {localError && <TxErrorAlert message={localError} />}
    </div>
  );
}
