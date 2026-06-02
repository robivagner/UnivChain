"use client";

import { useAccount } from "wagmi";
import { useIsAdmin } from "@/lib/useIsAdmin";
import { ANVIL_ADMIN_ADDRESS } from "@/constants/local";
import { AdminEnrollmentsPanel } from "./AdminEnrollmentsPanel";
import { AdminRolesPanel } from "./AdminRolesPanel";
import { AdminAddSubjectPanel } from "./AdminAddSubjectPanel";
import { AdminOperationsPanel } from "./AdminOperationsPanel";
import {
  RoleGateConnect,
  RoleGateDenied,
  RoleGateLoading,
  RoleGateMissingDeployment,
} from "@/components/shared/RoleGate";
import { PageHeader } from "@/components/ui/PageHeader";
import { portalPageWideClass } from "@/lib/ui/portalClasses";

export function AdminDashboard() {
  const { isConnected, address } = useAccount();
  const { isAdmin, isLoading: isAdminLoading, deployment } = useIsAdmin();

  if (!isConnected) {
    return (
      <div className={portalPageWideClass}>
        <RoleGateConnect title="the admin dashboard" />
      </div>
    );
  }
  if (isAdminLoading) {
    return (
      <div className={portalPageWideClass}>
        <RoleGateLoading />
      </div>
    );
  }
  if (!deployment) {
    return (
      <div className={portalPageWideClass}>
        <RoleGateMissingDeployment />
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className={portalPageWideClass}>
        <RoleGateDenied
          title="Admin access required"
          roleLabel="ADMIN_ROLE"
          connected={address}
          hint={`Local dev admin (Anvil #0): ${ANVIL_ADMIN_ADDRESS}`}
        />
      </div>
    );
  }

  return (
    <div className={portalPageWideClass}>
      <PageHeader
        kicker="Administration"
        title="Admin dashboard"
        description="Manage enrollments, grant roles, configure fees, withdraw treasury funds, and run disciplinary or diploma revocation actions."
      />

      <div id="roles">
        <AdminRolesPanel deployment={deployment} />
      </div>

      <AdminAddSubjectPanel deployment={deployment} />

      <div id="enrollments" className="border-t border-white/10 pt-10">
        <AdminEnrollmentsPanel embedded />
      </div>

      <div id="operations" className="border-t border-white/10 pt-10">
        <AdminOperationsPanel deployment={deployment} />
      </div>
    </div>
  );
}
