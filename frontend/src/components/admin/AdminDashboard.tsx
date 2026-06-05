"use client";

import { useAccount } from "wagmi";
import { useIsAdmin } from "@/lib/useIsAdmin";
import { ANVIL_ADMIN_ADDRESS } from "@/constants/local";
import { AdminEnrollmentsPanel } from "./AdminEnrollmentsPanel";
import { AdminRolesPanel } from "./AdminRolesPanel";
import { AdminAddSubjectPanel } from "./AdminAddSubjectPanel";
import { AdminOperationsPanel } from "./AdminOperationsPanel";
import {
  ADMIN_SECTIONS,
  AdminSectionNav,
  AdminSectionNavMobile,
  type AdminSection,
} from "./AdminSectionNav";
import {
  RoleGateConnect,
  RoleGateDenied,
  RoleGateLoading,
  RoleGateMissingDeployment,
} from "@/components/shared/RoleGate";
import { PageHeader } from "@/components/ui/PageHeader";
import { usePortalSectionNavigation } from "@/lib/navigation/usePortalSectionNavigation";
import { PORTAL_SECTION_ANCHOR_CLASS } from "@/lib/navigation/portalSectionNav";
import { portalPageWideClass } from "@/lib/ui/portalClasses";

export function AdminDashboard() {
  const { isConnected, address } = useAccount();
  const { isAdmin, isLoading: isAdminLoading, deployment } = useIsAdmin();
  const readsEnabled = Boolean(deployment && isAdmin);
  const { activeSection, jumpToSection } = usePortalSectionNavigation<AdminSection>(
    ADMIN_SECTIONS,
    "roles",
    readsEnabled
  );

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
    <>
      <AdminSectionNav active={activeSection} onSelect={jumpToSection} />

      <div className={portalPageWideClass}>
        <PageHeader
          kicker="Administration"
          title="Admin dashboard"
          description="Manage enrollments, grant roles, configure fees, withdraw treasury funds, and run disciplinary or diploma revocation actions."
        />

        <AdminSectionNavMobile active={activeSection} onSelect={jumpToSection} />

        <div id="roles" className={PORTAL_SECTION_ANCHOR_CLASS}>
          <AdminRolesPanel deployment={deployment} />
        </div>

        <div id="subjects" className={`${PORTAL_SECTION_ANCHOR_CLASS} border-t border-white/10 pt-10`}>
          <AdminAddSubjectPanel deployment={deployment} />
        </div>

        <div id="enrollments" className={`${PORTAL_SECTION_ANCHOR_CLASS} border-t border-white/10 pt-10`}>
          <AdminEnrollmentsPanel embedded />
        </div>

        <div id="operations" className={`${PORTAL_SECTION_ANCHOR_CLASS} border-t border-white/10 pt-10`}>
          <AdminOperationsPanel deployment={deployment} />
        </div>
      </div>
    </>
  );
}
