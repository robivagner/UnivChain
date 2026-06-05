export type PortalNavSection = {
  id: string;
  label: string;
};

export const PORTAL_SECTION_ANCHOR_CLASS = "scroll-mt-24";

export function isPortalSectionId<T extends string>(
  sections: readonly PortalNavSection[],
  value: string
): value is T {
  return sections.some((section) => section.id === value);
}

export function sectionIdFromHash<T extends string>(
  sections: readonly PortalNavSection[],
  hash: string
): T | null {
  const id = hash.replace(/^#/, "");
  return isPortalSectionId<T>(sections, id) ? id : null;
}

export function scrollToPortalSection(sectionId: string) {
  const el = document.getElementById(sectionId);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  window.history.replaceState(null, "", `#${sectionId}`);
}
