import type { PublicClient } from "viem";
import { CertificationABI } from "@/abi/Certification";
import type { UnivChainDeployment } from "@/constants/contracts";
import { computeDocumentHash } from "@/lib/diploma/credential";
import { parseCredentialJson, verifyCredentialProof } from "@/lib/diploma/verifyCredential";
import { ZERO_BYTES32, type UnivChainDiplomaCredential } from "@/lib/diploma/types";
import type { ManualVerificationReport } from "./types";

export type OnChainDiplomaAnchor = {
  tokenId: bigint;
  valid: boolean;
  revoked: boolean;
  documentHash: `0x${string}`;
  issuer: `0x${string}`;
  metadataURI: string;
  studentAddress?: `0x${string}`;
};

export type CredentialPreview =
  | { ok: true; credential: UnivChainDiplomaCredential; computedDocumentHash: `0x${string}` }
  | { ok: false; error: string };

export type ManualVerifyInput = {
  rawJson: string;
  anchor: OnChainDiplomaAnchor | null;
};

export async function fetchOnChainDiplomaAnchor(
  client: PublicClient,
  deployment: UnivChainDeployment,
  lookup: { tokenId?: bigint; studentAddress?: `0x${string}` }
): Promise<OnChainDiplomaAnchor | null> {
  let tokenId = lookup.tokenId;

  if (tokenId === undefined && lookup.studentAddress) {
    const resolved = await client.readContract({
      address: deployment.certification,
      abi: CertificationABI,
      functionName: "getDiplomaIdForStudent",
      args: [lookup.studentAddress],
    });
    if (resolved === 0n) return null;
    tokenId = resolved;
  }

  if (tokenId === undefined) return null;

  const [valid, diploma] = await Promise.all([
    client.readContract({
      address: deployment.certification,
      abi: CertificationABI,
      functionName: "isDiplomaValid",
      args: [tokenId],
    }),
    client.readContract({
      address: deployment.certification,
      abi: CertificationABI,
      functionName: "getDiploma",
      args: [tokenId],
    }),
  ]);

  return {
    tokenId,
    valid,
    revoked: diploma.revoked,
    documentHash: diploma.documentHash,
    issuer: diploma.issuer,
    metadataURI: diploma.metadataURI,
    studentAddress: lookup.studentAddress,
  };
}

export function computeCredentialPreview(rawJson: string): CredentialPreview {
  const trimmed = rawJson.trim();
  if (!trimmed) {
    return { ok: false, error: "Paste the credential JSON first." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false, error: "Invalid JSON syntax." };
  }

  const credential = parseCredentialJson(parsed);
  if (!credential) {
    return { ok: false, error: "Not a valid univchain-diploma-1 credential." };
  }

  return {
    ok: true,
    credential,
    computedDocumentHash: computeDocumentHash(credential),
  };
}

export async function verifyDiplomaManual(
  client: PublicClient,
  deployment: UnivChainDeployment,
  input: ManualVerifyInput
): Promise<ManualVerificationReport> {
  const preview = computeCredentialPreview(input.rawJson);
  if (!preview.ok) {
    return {
      parseOk: false,
      parseError: preview.error,
      chainStatus: input.anchor ? (input.anchor.valid ? "valid" : input.anchor.revoked ? "revoked" : "not_found") : "skipped",
    };
  }

  const { credential, computedDocumentHash } = preview;
  const credentialDocumentHash = credential.evidence.documentHash;
  const internalHashMatch =
    credentialDocumentHash !== ZERO_BYTES32 && computedDocumentHash === credentialDocumentHash;

  const anchor = input.anchor;
  const hasChainLookup = anchor !== null;
  const chainStatus: ManualVerificationReport["chainStatus"] = !anchor
    ? "skipped"
    : anchor.valid
      ? "valid"
      : anchor.revoked
        ? "revoked"
        : "not_found";

  const onChainDocumentHash = anchor?.documentHash;
  const onChainIssuer = anchor?.issuer;

  const proof = await verifyCredentialProof(client, deployment, credential, {
    onChainIssuer,
    onChainDocumentHash,
    expectedStudent: anchor?.studentAddress ?? credential.student,
  });

  const onChainHashMatch =
    onChainDocumentHash !== undefined &&
    onChainDocumentHash !== ZERO_BYTES32 &&
    computedDocumentHash === onChainDocumentHash;

  return {
    parseOk: true,
    computedDocumentHash,
    credentialDocumentHash,
    internalHashMatch,
    signatureValid: proof.signatureValid,
    proofValue: credential.proof.proofValue,
    issuerMatchesChain: hasChainLookup
      ? onChainIssuer !== undefined
        ? proof.issuerMatchesChain
        : false
      : undefined,
    onChainHashMatch: hasChainLookup
      ? onChainDocumentHash !== undefined
        ? onChainHashMatch
        : false
      : undefined,
    onChainDocumentHash,
    onChainIssuer,
    chainStatus,
    tokenId: anchor?.tokenId,
    metadataURI: anchor?.metadataURI,
    degreeTitle: credential.degreeTitle,
    major: credential.major,
    facultyName: credential.facultyName,
    studentAddress: credential.student,
    issuerInCredential: credential.issuer,
  };
}
