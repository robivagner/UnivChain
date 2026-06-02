import { keccak256, stringToBytes } from "viem";
import {
  DIPLOMA_CREDENTIAL_VERSION,
  ZERO_BYTES32,
  type DiplomaSignableFields,
  type UnivChainDiplomaCredential,
} from "./types";

export function isUnivChainDiplomaCredential(value: unknown): value is UnivChainDiplomaCredential {
  if (!value || typeof value !== "object") return false;
  const c = value as UnivChainDiplomaCredential;
  return (
    c.version === DIPLOMA_CREDENTIAL_VERSION &&
    typeof c.issuer === "string" &&
    typeof c.student === "string" &&
    typeof c.degreeTitle === "string" &&
    typeof c.major === "string" &&
    typeof c.proof?.proofValue === "string"
  );
}

/** Deterministic JSON (2-space indent) — always use before hashing or pinning. */
export function formatCredentialJson(credential: UnivChainDiplomaCredential): string {
  return JSON.stringify(credential, null, 2);
}

/**
 * Hash of the credential bytes with `evidence.documentHash` zeroed.
 * Matches the value stored on-chain and in `evidence.documentHash` after finalize.
 */
export function computeDocumentHash(credential: UnivChainDiplomaCredential): `0x${string}` {
  const forHash: UnivChainDiplomaCredential = {
    ...credential,
    evidence: {
      ...credential.evidence,
      documentHash: ZERO_BYTES32,
    },
  };
  return keccak256(stringToBytes(formatCredentialJson(forHash)));
}

export function buildCredentialDraft(input: {
  issuer: `0x${string}`;
  student: `0x${string}`;
  degreeTitle: string;
  major: string;
  facultyName: string;
  validFrom: string;
  chainId: number;
  certificationContract: `0x${string}`;
  studentIdHash?: `0x${string}` | null;
  proofValue: `0x${string}`;
}): UnivChainDiplomaCredential {
  const base: UnivChainDiplomaCredential = {
    version: DIPLOMA_CREDENTIAL_VERSION,
    issuer: input.issuer,
    student: input.student,
    degreeTitle: input.degreeTitle,
    major: input.major,
    facultyName: input.facultyName,
    validFrom: input.validFrom,
    ...(input.studentIdHash && input.studentIdHash !== ZERO_BYTES32
      ? { studentIdHash: input.studentIdHash }
      : {}),
    evidence: {
      chainId: input.chainId,
      certificationContract: input.certificationContract,
      documentHash: ZERO_BYTES32,
    },
    proof: {
      type: "Eip712Signature2021",
      proofValue: input.proofValue,
    },
  };

  const documentHash = computeDocumentHash(base);
  return {
    ...base,
    evidence: {
      ...base.evidence,
      documentHash,
    },
  };
}

export function credentialToSignableFields(
  credential: UnivChainDiplomaCredential
): DiplomaSignableFields {
  return {
    version: credential.version,
    issuer: credential.issuer,
    student: credential.student,
    degreeTitle: credential.degreeTitle,
    major: credential.major,
    facultyName: credential.facultyName,
    validFrom: credential.validFrom,
    chainId: BigInt(credential.evidence.chainId),
    certificationContract: credential.evidence.certificationContract,
    studentIdHash: credential.studentIdHash ?? ZERO_BYTES32,
  };
}

export function downloadCredentialJson(credential: UnivChainDiplomaCredential, filename?: string) {
  const blob = new Blob([formatCredentialJson(credential)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename ?? `univchain-diploma-${credential.student.slice(2, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function isoTimestamp(date = new Date()): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}
