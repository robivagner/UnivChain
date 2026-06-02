import { VerifierPanel } from "@/components/verifier/VerifierPanel";
import { PageHeader } from "@/components/ui/PageHeader";
import { portalCardClass } from "@/lib/ui/portalClasses";

export default function VerifyPage() {
  return (
    <div className="max-w-xl mx-auto px-4 py-10 flex flex-col items-center gap-8 portal-fade-up">
      <PageHeader
        kicker="Public verification"
        title="Diploma verification"
        description="Read-only on-chain check — no wallet required. Query diploma records directly via RPC."
        align="center"
      />
      <div className={`${portalCardClass} w-full`}>
        <VerifierPanel />
      </div>
    </div>
  );
}
