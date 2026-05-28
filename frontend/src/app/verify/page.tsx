import { PortalShell } from "@/components/layout/PortalShell";
import { VerifierPanel } from "@/components/verifier/VerifierPanel";

export default function VerifyPage() {
  return (
    <PortalShell>
      <div className="px-4 py-10 flex flex-col items-center gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Diploma verification</h1>
          <p className="text-slate-500 text-sm mt-1">On-chain read — no wallet required</p>
        </div>
        <VerifierPanel />
      </div>
    </PortalShell>
  );
}
