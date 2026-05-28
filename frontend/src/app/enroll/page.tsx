import { PortalShell } from "@/components/layout/PortalShell";
import { StudentEnrollmentPanel } from "@/components/StudentEnrollmentPanel";

export default function EnrollPage() {
  return (
    <PortalShell>
      <div className="px-4 py-10 flex flex-col items-center gap-6">
        <div className="text-center max-w-lg">
          <h1 className="text-2xl font-bold text-slate-900">Request enrollment</h1>
          <p className="text-slate-500 text-sm mt-1">
            Pay the registration fee, then an administrator accepts your wallet with a matriculation
            number.
          </p>
        </div>
        <StudentEnrollmentPanel />
      </div>
    </PortalShell>
  );
}
