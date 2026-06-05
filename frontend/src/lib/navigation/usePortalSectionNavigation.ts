"use client";

import { useCallback, useEffect, useState } from "react";
import {
  isPortalSectionId,
  scrollToPortalSection,
  sectionIdFromHash,
  type PortalNavSection,
} from "./portalSectionNav";

export function usePortalSectionNavigation<T extends string>(
  sections: readonly PortalNavSection[],
  defaultSection: T,
  enabled = true
) {
  const [activeSection, setActiveSection] = useState<T | null>(defaultSection);

  const jumpToSection = useCallback((section: T) => {
    scrollToPortalSection(section);
    setActiveSection(section);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const hashSection = sectionIdFromHash<T>(sections, window.location.hash);
    const initial = hashSection ?? defaultSection;
    requestAnimationFrame(() => scrollToPortalSection(initial));
    setActiveSection(initial);
  }, [defaultSection, enabled, sections]);

  useEffect(() => {
    if (!enabled) return;

    const onHashChange = () => {
      const hashSection = sectionIdFromHash<T>(sections, window.location.hash);
      if (hashSection) {
        setActiveSection(hashSection);
        scrollToPortalSection(hashSection);
      }
    };

    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [enabled, sections]);

  useEffect(() => {
    if (!enabled) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        const top = visible[0]?.target.id;
        if (top && isPortalSectionId<T>(sections, top)) {
          setActiveSection(top);
        }
      },
      { rootMargin: "-25% 0px -55% 0px", threshold: 0 }
    );

    for (const section of sections) {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [enabled, sections]);

  return { activeSection, jumpToSection };
}
