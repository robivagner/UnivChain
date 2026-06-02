export const DIPLOMA_CREDENTIAL_VERSION = "univchain-diploma-1" as const;

export const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as const;

export type DiplomaProof = {
  type: "Eip712Signature2021";
  proofValue: `0x${string}`;
};

export type DiplomaEvidence = {
  chainId: number;
  certificationContract: `0x${string}`;
  documentHash: `0x${string}`;
};

/** Variant B — EIP-712 signed UnivChain diploma JSON (pinned at metadataURI). */
export type UnivChainDiplomaCredential = {
  version: typeof DIPLOMA_CREDENTIAL_VERSION;
  issuer: `0x${string}`;
  student: `0x${string}`;
  degreeTitle: string;
  major: string;
  facultyName: string;
  validFrom: string;
  /** keccak256(matriculation id) from StudentRegistry — links wallet to university ID without exposing it. */
  studentIdHash?: `0x${string}`;
  evidence: DiplomaEvidence;
  proof: DiplomaProof;
};

export type DiplomaSignableFields = {
  version: string;
  issuer: `0x${string}`;
  student: `0x${string}`;
  degreeTitle: string;
  major: string;
  facultyName: string;
  validFrom: string;
  chainId: bigint;
  certificationContract: `0x${string}`;
  studentIdHash: `0x${string}`;
};
