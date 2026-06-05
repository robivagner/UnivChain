import type { VerificationReport } from "@/lib/verification/types";
import {
  alertDangerClass,
  alertSuccessClass,
  alertWarningClass,
  portalCardClass,
} from "@/lib/ui/portalClasses";

const ZERO_HASH = "0x0000000000000000000000000000000000000000000000000000000000000000";

type Props = {
  report: VerificationReport;
};

export function VerificationReportCard({ report }: Props) {
  const statusLabel = {
    valid: "Valid",
    revoked: "Revoked",
    not_found: "Not found",
    error: "Error",
  }[report.status];

  const statusClass = {
    valid: alertSuccessClass,
    revoked: alertWarningClass,
    not_found: `${portalCardClass} text-uc-muted`,
    error: alertDangerClass,
  }[report.status];

  return (
    <div className={`${statusClass} text-sm`}>
      <p className="font-bold mb-2">Status: {statusLabel}</p>
      {report.errorMessage && (
        <p className="font-mono text-xs mb-2 break-all">{report.errorMessage}</p>
      )}
      {report.status !== "not_found" && report.status !== "error" && (
        <ul className="space-y-1 text-uc-text">
          {report.facultyName && <li>Faculty: {report.facultyName}</li>}
          {report.degreeTitle && <li>Degree: {report.degreeTitle}</li>}
          {report.major && <li>Major: {report.major}</li>}
          {report.finalAverageDisplay && <li>GPA: {report.finalAverageDisplay}</li>}
          {report.totalCredits !== undefined && <li>ECTS: {report.totalCredits.toString()}</li>}
          {report.tokenId !== undefined && <li>Token ID: {report.tokenId.toString()}</li>}
          {report.signatureValid !== undefined && (
            <li>EIP-712 signature: {report.signatureValid ? "valid ✓" : "invalid ✗"}</li>
          )}
          {report.issuerMatchesCredential === false && (
            <li className="text-amber-300">Credential issuer ≠ on-chain diploma issuer</li>
          )}
          {report.issuerAddress && (
            <li className="font-mono text-xs break-all text-uc-muted">
              On-chain issuer: {report.issuerAddress}
            </li>
          )}
          {report.documentHash && report.documentHash !== ZERO_HASH && (
            <li className="font-mono text-xs break-all text-uc-muted">
              JSON hash: {report.documentHash}
              {report.metadataHashMatch === true && " ✓ matches fetched JSON"}
              {report.metadataHashMatch === false && " ✗ does not match fetched JSON"}
            </li>
          )}
          {report.metadataURI && (
            <li className="font-mono text-xs break-all text-uc-muted">
              Metadata: {report.metadataURI}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
