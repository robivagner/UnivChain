export type VerificationStatus = "valid" | "revoked" | "not_found" | "error";

export type VerificationReport = {
  status: VerificationStatus;
  errorMessage?: string;
  studentAddress?: `0x${string}`;
  tokenId?: bigint;
  degreeTitle?: string;
  major?: string;
  finalAverageDisplay?: string;
  totalCredits?: bigint;
  documentHash?: `0x${string}`;
  metadataURI?: string;
  /** True when canonical credential hash matches on-chain documentHash. */
  metadataHashMatch?: boolean;
  /** True when EIP-712 proof verifies against credential.issuer. */
  signatureValid?: boolean;
  /** True when credential.issuer matches on-chain diploma.issuer. */
  issuerMatchesCredential?: boolean;
  issueTimestamp?: Date;
  revoked?: boolean;
  facultyName?: string;
  issuerAddress?: `0x${string}`;
  certificationAddress?: `0x${string}`;
};
