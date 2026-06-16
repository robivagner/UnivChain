"use client";

import { useEffect, useState } from "react";
import { formatUnits, getAddress, isAddress } from "viem";
import { useAccount, useChainId, usePublicClient, useSignTypedData, useWriteContract } from "wagmi";
import { CertificationABI } from "@/abi/Certification";
import { GradebookABI } from "@/abi/Gradebook";
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
import { useNotifications } from "@/lib/notifications/NotificationProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import {
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

type MintedDiplomaSnapshot = {
  tokenId: bigint;
  totalCredits: bigint;
  finalAverage: bigint;
  issueTimestamp: bigint;
  issuer: `0x${string}`;
  credentialAttached: boolean;
};

async function fetchStudentIdHash(
  publicClient: NonNullable<ReturnType<typeof usePublicClient>>,
  studentRegistry: `0x${string}`,
  student: `0x${string}`
): Promise<`0x${string}` | null> {
  const studentId = await publicClient.readContract({
    address: studentRegistry,
    abi: StudentRegistryABI,
    functionName: "getStudentId",
    args: [student],
  });
  if (studentId === 0n) return null;

  const [studentIdHash] = await publicClient.readContract({
    address: studentRegistry,
    abi: StudentRegistryABI,
    functionName: "getStudentMetadata",
    args: [studentId],
  });
  return studentIdHash === ZERO_BYTES32 ? null : studentIdHash;
}

async function fetchMintedDiplomaSnapshot(
  publicClient: NonNullable<ReturnType<typeof usePublicClient>>,
  certification: `0x${string}`,
  gradebook: `0x${string}`,
  student: `0x${string}`
): Promise<MintedDiplomaSnapshot | null> {
  const tokenId = await publicClient.readContract({
    address: certification,
    abi: CertificationABI,
    functionName: "getDiplomaIdForStudent",
    args: [student],
  });
  if (tokenId === 0n) return null;

  const [diploma, totalCredits, finalAverage] = await Promise.all([
    publicClient.readContract({
      address: certification,
      abi: CertificationABI,
      functionName: "getDiploma",
      args: [tokenId],
    }),
    publicClient.readContract({
      address: gradebook,
      abi: GradebookABI,
      functionName: "getStudentCredits",
      args: [student],
    }),
    publicClient.readContract({
      address: gradebook,
      abi: GradebookABI,
      functionName: "getWeightedAverage",
      args: [student],
    }),
  ]);

  return {
    tokenId,
    totalCredits,
    finalAverage,
    issueTimestamp: diploma.issueTimestamp,
    issuer: diploma.issuer,
    credentialAttached: diploma.metadataURI.length > 0,
  };
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
  const [mintedSnapshot, setMintedSnapshot] = useState<MintedDiplomaSnapshot | null>(null);
  const [preparedCredential, setPreparedCredential] = useState<UnivChainDiplomaCredential | null>(
    null
  );

  const { notifyError, notifySuccess } = useNotifications();
  const { eligibility, isLoading: eligibilityLoading } = useGraduationEligibility(studentInput);
  const { invalidate } = useLiveContractReads(Boolean(isIssuer));
  const { writeContractAsync, isPending, reset } = useWriteContract();
  const { signTypedDataAsync, isPending: isSigning } = useSignTypedData();

  useEffect(() => {
    if (!publicClient || !deployment || !isAddress(studentInput)) {
      setMintedSnapshot(null);
      return;
    }

    let cancelled = false;
    void fetchMintedDiplomaSnapshot(
      publicClient,
      deployment.certification,
      deployment.gradebook,
      getAddress(studentInput)
    ).then((snapshot) => {
      if (!cancelled) {
        setMintedSnapshot(snapshot);
        if (snapshot?.credentialAttached) {
          setPreparedCredential(null);
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [deployment, publicClient, studentInput, eligibility?.hasDiploma]);

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

  const pendingCredential =
    mintedSnapshot !== null && !mintedSnapshot.credentialAttached;

  const handleGraduateAndMint = async () => {
    if (!publicClient || !isAddress(studentInput)) {
      notifyError("Enter a valid student address.");
      return;
    }
    if (eligibility?.eligible === false) {
      notifyError("Student is not eligible to graduate (check credits, average, and debt).");
      return;
    }

    reset();
    setPreparedCredential(null);

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
            args: [student],
          }),
      });

      const snapshot = await fetchMintedDiplomaSnapshot(
        publicClient,
        deployment.certification,
        deployment.gradebook,
        student
      );
      setMintedSnapshot(snapshot);
      notifySuccess(`Diploma minted for ${student}. Sign the credential using on-chain credits and GPA.`);
    } catch (e) {
      notifyError(formatTxError(e), "Transaction failed");
    }
  };

  const handleSignCredential = async () => {
    if (!publicClient || !address || chainId === undefined || !isAddress(studentInput)) {
      notifyError("Connect wallet and enter a valid student address.");
      return;
    }
    if (!degreeTitle.trim() || !major.trim()) {
      notifyError("Enter degree title and major.");
      return;
    }
    if (!mintedSnapshot || mintedSnapshot.credentialAttached) {
      notifyError("Mint the diploma first (or load a student with a pending credential).");
      return;
    }

    reset();
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

      const validFrom = isoTimestamp(new Date(Number(mintedSnapshot.issueTimestamp) * 1000));
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
        totalCredits: mintedSnapshot.totalCredits,
        finalAverage: mintedSnapshot.finalAverage,
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
        totalCredits: mintedSnapshot.totalCredits,
        finalAverage: mintedSnapshot.finalAverage,
        proofValue,
      });

      setPreparedCredential(credential);
      notifySuccess("Credential signed with on-chain credits and GPA — pin the JSON, then attach.");
    } catch (e) {
      notifyError(formatTxError(e), "Signing failed");
    }
  };

  const handleAttachCredential = async () => {
    if (!publicClient || !preparedCredential || !isAddress(studentInput)) {
      notifyError("Sign the credential first.");
      return;
    }
    if (!metadataUri.trim()) {
      notifyError("Pin the credential JSON and enter its metadata URI (ipfs://… or https://…).");
      return;
    }

    reset();

    try {
      const student = getAddress(studentInput);
      await runContractTx({
        publicClient,
        invalidate,
        write: () =>
          writeContractAsync({
            address: deployment.universityCore,
            abi: UniversityCoreABI,
            functionName: "attachDiplomaCredential",
            args: [student, preparedCredential.evidence.documentHash, metadataUri.trim()],
          }),
      });
      notifySuccess(`Credential attached for ${student}.`);
      setPreparedCredential(null);
      setMetadataUri("");
      const snapshot = await fetchMintedDiplomaSnapshot(
        publicClient,
        deployment.certification,
        deployment.gradebook,
        student
      );
      setMintedSnapshot(snapshot);
    } catch (e) {
      notifyError(formatTxError(e), "Transaction failed");
    }
  };

  return (
    <div className={portalPageClass}>
      <PageHeader
        kicker="Graduation workspace"
        title="Diploma issuer portal"
        description="Mint the on-chain diploma first, then sign the JSON with the credits and GPA recorded at mint, pin it, and attach the metadata URI."
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
            <li>
              University debt:{" "}
              {eligibility.hasOutstandingDebt
                ? `${formatUnits(eligibility.studentDebtOwed, 6)} tokens owed`
                : "cleared"}{" "}
              {eligibility.studentDebtOk ? "✓" : "✗"}
            </li>
            <li className={eligibility.eligible ? "text-emerald-300 font-medium" : "text-amber-300"}>
              {eligibility.eligible ? "Eligible to graduate" : "Not eligible yet"}
            </li>
          </ul>
        )}
        {mintedSnapshot && (
          <p className="text-xs text-uc-muted">
            Diploma token #{mintedSnapshot.tokenId.toString()}
            {mintedSnapshot.credentialAttached ? " · credential attached" : " · credential pending"}
          </p>
        )}
      </section>

      <section className={`${portalCardClass} flex flex-col gap-3`}>
        <h2 className={portalSectionTitleClass}>1. Graduate & mint on-chain</h2>
        <p className="text-xs text-uc-muted">
          Validates graduation policy from Gradebook, mints the soulbound diploma, and marks the
          student as graduated.
        </p>
        <button
          type="button"
          onClick={handleGraduateAndMint}
          disabled={isPending || eligibility?.eligible === false || pendingCredential}
          className={btnSuccessClass}
        >
          {isPending ? "Minting…" : pendingCredential ? "Already minted — sign below" : "Graduate & mint"}
        </button>
      </section>

      {pendingCredential && (
        <section className={`${portalCardClass} flex flex-col gap-3`}>
          <h2 className={portalSectionTitleClass}>2. Sign credential (EIP-712)</h2>
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
          <button
            type="button"
            onClick={handleSignCredential}
            disabled={isSigning || preparedCredential !== null}
            className={btnSuccessClass}
          >
            {isSigning
              ? "Awaiting signature…"
              : preparedCredential
                ? "Credential signed"
                : "Sign credential"}
          </button>
        </section>
      )}

      {preparedCredential && pendingCredential && (
        <section className={`${portalCardClass} flex flex-col gap-3`}>
          <h2 className={portalSectionTitleClass}>3. Pin & attach credential</h2>
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
            onClick={handleAttachCredential}
            disabled={isPending}
            className={btnSuccessClass}
          >
            {isPending ? "Attaching…" : "Attach credential on-chain"}
          </button>
        </section>
      )}
    </div>
  );
}
