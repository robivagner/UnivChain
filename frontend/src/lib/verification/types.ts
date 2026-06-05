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
  proofValue?: `0x${string}`;
  /** True when credential.issuer matches on-chain diploma.issuer. */
  issuerMatchesCredential?: boolean;
  issueTimestamp?: Date;
  revoked?: boolean;
  facultyName?: string;
  issuerAddress?: `0x${string}`;
  certificationAddress?: `0x${string}`;
};

export type ManualChainStatus = "valid" | "revoked" | "not_found" | "skipped";

export type ManualVerificationReport = {
  parseOk: boolean;
  parseError?: string;
  computedDocumentHash?: `0x${string}`;
  /** Hash embedded in the JSON (`evidence.documentHash`). */
  credentialDocumentHash?: `0x${string}`;
  /** Computed hash matches `evidence.documentHash` in the pasted file. */
  internalHashMatch?: boolean;
  signatureValid?: boolean;
  /** EIP-712 signature bytes from `proof.proofValue` in the pasted JSON. */
  proofValue?: `0x${string}`;
  /** True when credential.issuer matches on-chain diploma issuer (if chain lookup). */
  issuerMatchesChain?: boolean;
  /** Computed hash matches on-chain documentHash (if chain lookup). */
  onChainHashMatch?: boolean;
  onChainDocumentHash?: `0x${string}`;
  onChainIssuer?: `0x${string}`;
  chainStatus: ManualChainStatus;
  tokenId?: bigint;
  metadataURI?: string;
  degreeTitle?: string;
  major?: string;
  facultyName?: string;
  studentAddress?: `0x${string}`;
  issuerInCredential?: `0x${string}`;
  errorMessage?: string;
};
