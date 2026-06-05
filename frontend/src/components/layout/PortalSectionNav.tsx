"use client";

import { useState } from "react";
import type { PortalNavSection } from "@/lib/navigation/portalSectionNav";

type Props = {
  sections: readonly PortalNavSection[];
  active: string | null;
  onSelect: (sectionId: string) => void;
  ariaLabel: string;
};

export function PortalSectionNav({ sections, active, onSelect, ariaLabel }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <nav
      aria-label={ariaLabel}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className={`fixed left-[1.25cm] top-1/2 z-30 hidden sm:flex -translate-y-1/2 flex-col gap-0.5 rounded-xl border border-white/10 bg-[rgba(10,15,28,0.92)] backdrop-blur-md py-2.5 overflow-hidden shadow-lg shadow-black/30 transition-[width] duration-200 ease-out ${
        expanded ? "w-44" : "w-10"
      }`}
    >
      {sections.map((section) => {
        const isActive = active === section.id;
        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onSelect(section.id)}
            title={section.label}
            aria-label={`Jump to ${section.label}`}
            aria-current={isActive ? "true" : undefined}
            className={`flex w-full items-center py-2.5 text-sm transition-[padding,gap,color] duration-200 ease-out ${
              expanded ? "justify-start gap-3 px-3" : "justify-center gap-0 px-0"
            } ${isActive ? "text-uc-cyan" : "text-uc-muted hover:text-uc-text"}`}
          >
            <span
              className={`shrink-0 rounded-full transition-[width,height,background-color,box-shadow] duration-200 ease-out ${
                isActive
                  ? "h-2.5 w-2.5 bg-uc-cyan shadow-[0_0_10px_rgba(56,189,248,0.45)]"
                  : "h-2 w-2 bg-white/35"
              } ${expanded && !isActive ? "bg-white/50" : ""}`}
              aria-hidden
            />
            <span
              className={`pointer-events-none overflow-hidden whitespace-nowrap transition-[max-width,opacity] ease-out ${
                expanded
                  ? "max-w-[9rem] opacity-100 duration-200 delay-75"
                  : "max-w-0 opacity-0 duration-150 delay-0"
              }`}
            >
              {section.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

export function PortalSectionNavMobile({ sections, active, onSelect, ariaLabel }: Props) {
  return (
    <nav
      aria-label={ariaLabel}
      className="flex sm:hidden flex-wrap gap-2 p-1.5 rounded-xl bg-black/25 border border-white/10"
    >
      {sections.map((section) => {
        const isActive = active === section.id;
        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onSelect(section.id)}
            aria-current={isActive ? "true" : undefined}
            className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
              isActive
                ? "bg-uc-cyan/15 text-uc-cyan border border-uc-cyan/30"
                : "text-uc-muted border border-transparent hover:text-uc-text hover:bg-white/5"
            }`}
          >
            {section.label}
          </button>
        );
      })}
    </nav>
  );
}
