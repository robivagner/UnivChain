"use client";

import { useCallback, useEffect, useState } from "react";
import { AutomaticVerifierSection } from "@/components/verifier/AutomaticVerifierSection";
import { ManualVerifierSection } from "@/components/verifier/ManualVerifierSection";
import {
  PortalSectionNav,
  PortalSectionNavMobile,
} from "@/components/layout/PortalSectionNav";
import { PageHeader } from "@/components/ui/PageHeader";
import { sectionIdFromHash } from "@/lib/navigation/portalSectionNav";
import { portalCardClass } from "@/lib/ui/portalClasses";

const VERIFY_SECTIONS = [
  { id: "manual", label: "Manual" },
  { id: "automatic", label: "Automatic" },
] as const;

type VerifySection = (typeof VERIFY_SECTIONS)[number]["id"];

export function VerifyPortal() {
  const [activeSection, setActiveSection] = useState<VerifySection>("manual");

  const selectSection = useCallback((section: VerifySection) => {
    setActiveSection(section);
    window.history.replaceState(null, "", `#${section}`);
  }, []);

  useEffect(() => {
    const hashSection = sectionIdFromHash<VerifySection>(VERIFY_SECTIONS, window.location.hash);
    if (hashSection) {
      setActiveSection(hashSection);
    }
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      const hashSection = sectionIdFromHash<VerifySection>(VERIFY_SECTIONS, window.location.hash);
      if (hashSection) {
        setActiveSection(hashSection);
      }
    };

    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return (
    <>
      <PortalSectionNav
        sections={VERIFY_SECTIONS}
        active={activeSection}
        onSelect={(id) => selectSection(id as VerifySection)}
        ariaLabel="Verification modes"
      />

      <div className="max-w-2xl mx-auto w-full px-4 py-10 flex flex-col gap-8 portal-fade-up">
        <PageHeader
          kicker="Public verification"
          title="Diploma verification"
          description="Verify diplomas automatically via RPC and IPFS, or paste a credential JSON and check the signature and hash yourself."
          align="center"
        />

        <PortalSectionNavMobile
          sections={VERIFY_SECTIONS}
          active={activeSection}
          onSelect={(id) => selectSection(id as VerifySection)}
          ariaLabel="Verification modes"
        />

        <section className={portalCardClass}>
          {activeSection === "manual" ? (
            <ManualVerifierSection />
          ) : (
            <AutomaticVerifierSection />
          )}
        </section>
      </div>
    </>
  );
}
