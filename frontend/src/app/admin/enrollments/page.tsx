import { PortalShell } from "@/components/layout/PortalShell";
import { AdminEnrollmentsPanel } from "@/components/admin/AdminEnrollmentsPanel";

export default function AdminEnrollmentsPage() {
  return (
    <PortalShell>
      <div className="px-4 py-10">
        <AdminEnrollmentsPanel />
      </div>
    </PortalShell>
  );
}
