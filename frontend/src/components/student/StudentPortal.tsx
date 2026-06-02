"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount, useChainId, useReadContract } from "wagmi";
import { CertificationABI } from "@/abi/Certification";
import { useStudentProfile } from "@/lib/student/useStudentProfile";
import { useStudentTranscript } from "@/lib/student/useStudentTranscript";
import { StudentEnrollmentPanel } from "@/components/StudentEnrollmentPanel";
import { StudentAcademicSummary } from "@/components/student/StudentAcademicSummary";
import { StudentTranscriptSection } from "@/components/student/StudentTranscriptSection";
import { RoleGateConnect } from "@/components/shared/RoleGate";
import { PageHeader } from "@/components/ui/PageHeader";
import { IPFS_GATEWAY } from "@/constants/contracts";
import { fetchDiplomaCredential } from "@/lib/diploma/metadata";
import { getDeployment } from "@/lib/contracts";
import {
  badgeDangerClass,
  badgeNeutralClass,
  badgeSuccessClass,
  badgeWarningClass,
  portalCardClass,
  portalCardSuccessClass,
  portalLinkClass,
  portalPageClass,
  portalSectionTitleClass,
} from "@/lib/ui/portalClasses";

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={ok ? badgeSuccessClass : badgeNeutralClass}>{label}</span>
  );
}

export function StudentPortal() {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const deployment = chainId !== undefined ? getDeployment(chainId) : undefined;
  const profile = useStudentProfile();
  const { rows, isLoading: transcriptLoading, error: transcriptError } = useStudentTranscript();
  const [diplomaCredential, setDiplomaCredential] = useState<Awaited<
    ReturnType<typeof fetchDiplomaCredential>
  > | null>(null);

  const { data: diplomaRecord } = useReadContract({
    address: deployment?.certification,
    abi: CertificationABI,
    functionName: "getDiploma",
    args: profile.diplomaTokenId !== undefined ? [profile.diplomaTokenId] : undefined,
    query: { enabled: Boolean(deployment?.certification && profile.diplomaTokenId) },
  });

  useEffect(() => {
    if (!diplomaRecord?.metadataURI) {
      setDiplomaCredential(null);
      return;
    }
    void fetchDiplomaCredential(diplomaRecord.metadataURI).then(setDiplomaCredential);
  }, [diplomaRecord?.metadataURI]);

  if (!isConnected) {
    return (
      <RoleGateConnect title="the student portal" />
    );
  }

  const showEnrollment = !profile.hasStudentRecord && !profile.hasPaidFee;
  const showPending = !profile.hasStudentRecord && profile.hasPaidFee;

  return (
    <div className={portalPageClass}>
      <PageHeader
        kicker="Student workspace"
        title="Student portal"
        description="Track enrollment, view your transcript, and access your diploma credential."
      />

      {showEnrollment && <StudentEnrollmentPanel />}

      {showPending && (
        <section className={portalCardClass}>
          <h2 className={portalSectionTitleClass}>Enrollment pending</h2>
          <p className="text-sm text-uc-muted">
            Your registration fee was received. An administrator will review your application.
          </p>
        </section>
      )}

      {profile.hasStudentRecord && (
        <>
          <section className={portalCardClass}>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <StatusBadge ok={profile.isEnrolled} label={profile.isEnrolled ? "Enrolled" : "Not enrolled"} />
              {profile.isExpelled && <span className={badgeDangerClass}>Expelled</span>}
              {profile.hasGraduated && <span className={badgeSuccessClass}>Graduated</span>}
              {profile.graduationEligible && (
                <span className={badgeWarningClass}>Eligible for graduation</span>
              )}
            </div>
            <StudentAcademicSummary profile={profile} />
          </section>

          <StudentTranscriptSection
            rows={rows}
            isLoading={transcriptLoading}
            error={transcriptError}
          />
        </>
      )}

      {profile.hasDiploma && (
        <section className={portalCardSuccessClass}>
          <h2 className={portalSectionTitleClass}>Diploma</h2>
          <div className="text-sm text-uc-muted flex flex-col gap-2">
            {profile.diplomaTokenId !== undefined && (
              <p>
                Diploma token ID:{" "}
                <span className="font-mono text-emerald-300">
                  {profile.diplomaTokenId.toString()}
                </span>
              </p>
            )}
            <p>
              Valid on-chain:{" "}
              <span className={profile.hasValidDiploma ? "text-emerald-300" : "text-amber-300"}>
                {profile.hasValidDiploma ? "yes" : "no (revoked or invalid)"}
              </span>
            </p>
            {diplomaRecord && (
              <>
                {diplomaCredential && (
                  <p className="text-uc-text">
                    {diplomaCredential.degreeTitle} — {diplomaCredential.major}
                  </p>
                )}
                <p>
                  Final average: {(Number(diplomaRecord.finalAverage) / 100).toFixed(2)} ·{" "}
                  {diplomaRecord.totalCredits.toString()} credits
                </p>
                {diplomaRecord.metadataURI && (
                  <a
                    href={
                      diplomaRecord.metadataURI.startsWith("ipfs://")
                        ? `${IPFS_GATEWAY}${diplomaRecord.metadataURI.slice(7)}`
                        : diplomaRecord.metadataURI
                    }
                    target="_blank"
                    rel="noreferrer"
                    className={`${portalLinkClass} text-xs break-all`}
                  >
                    View credential JSON
                  </a>
                )}
              </>
            )}
            <Link href="/verify" className={`${portalLinkClass} text-sm`}>
              Open public verifier →
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
