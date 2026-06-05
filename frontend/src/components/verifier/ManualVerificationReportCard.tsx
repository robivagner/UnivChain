import type { ManualVerificationReport } from "@/lib/verification/types";
import { alertDangerClass, alertSuccessClass, alertWarningClass } from "@/lib/ui/portalClasses";

function CheckRow({ ok, label }: { ok: boolean | undefined; label: string }) {
  if (ok === undefined) return null;
  return (
    <li className={ok ? "text-emerald-300" : "text-red-300"}>
      {ok ? "✓" : "✗"} {label}
    </li>
  );
}

type Props = {
  report: ManualVerificationReport;
};

export function ManualVerificationReportCard({ report }: Props) {
  if (!report.parseOk) {
    return (
      <div className={`${alertDangerClass} text-sm`}>
        <p className="font-bold mb-1">Could not parse credential</p>
        <p className="text-xs">{report.parseError}</p>
      </div>
    );
  }

  const cryptoOk =
    report.signatureValid === true &&
    report.internalHashMatch === true &&
    report.onChainHashMatch === true &&
    report.issuerMatchesChain === true &&
    report.chainStatus === "valid";

  return (
    <div className={cryptoOk ? alertSuccessClass : alertWarningClass}>
      <p className="font-bold mb-2 text-sm">
        {cryptoOk ? "Verification passed" : "Verification failed or incomplete"}
      </p>
      <ul className="space-y-1 text-sm">
        <CheckRow ok={report.internalHashMatch} label="Computed hash matches hash inside JSON" />
        <CheckRow ok={report.onChainHashMatch} label="Computed hash matches on-chain documentHash" />
        <CheckRow
          ok={report.signatureValid}
          label="EIP-712 signature valid for issuer in JSON"
        />
        <CheckRow ok={report.issuerMatchesChain} label="JSON issuer matches on-chain issuer" />
        <CheckRow ok={report.chainStatus === "valid"} label="Diploma valid on-chain (not revoked)" />
      </ul>
    </div>
  );
}
