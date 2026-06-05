"use client";

import {
  PortalSectionNav,
  PortalSectionNavMobile,
} from "@/components/layout/PortalSectionNav";
import { scrollToPortalSection } from "@/lib/navigation/portalSectionNav";

export const ADMIN_SECTIONS = [
  { id: "roles", label: "Roles" },
  { id: "subjects", label: "Subjects" },
  { id: "enrollments", label: "Enrollments" },
  { id: "operations", label: "Operations" },
] as const;

export type AdminSection = (typeof ADMIN_SECTIONS)[number]["id"];

export { scrollToPortalSection as scrollToAdminSection };

export function isAdminSection(value: string): value is AdminSection {
  return ADMIN_SECTIONS.some((section) => section.id === value);
}

export function sectionFromHash(hash: string): AdminSection | null {
  const id = hash.replace(/^#/, "");
  return isAdminSection(id) ? id : null;
}

type Props = {
  active: AdminSection | null;
  onSelect: (section: AdminSection) => void;
};

export function AdminSectionNav({ active, onSelect }: Props) {
  return (
    <PortalSectionNav
      sections={ADMIN_SECTIONS}
      active={active}
      onSelect={(id) => onSelect(id as AdminSection)}
      ariaLabel="Admin sections"
    />
  );
}

export function AdminSectionNavMobile({ active, onSelect }: Props) {
  return (
    <PortalSectionNavMobile
      sections={ADMIN_SECTIONS}
      active={active}
      onSelect={(id) => onSelect(id as AdminSection)}
      ariaLabel="Admin sections"
    />
  );
}
