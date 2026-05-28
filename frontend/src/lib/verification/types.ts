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
  issueTimestamp?: Date;
  revoked?: boolean;
  facultyName?: string;
  issuerCoreAddress?: `0x${string}`;
  certificationAddress?: `0x${string}`;
};
