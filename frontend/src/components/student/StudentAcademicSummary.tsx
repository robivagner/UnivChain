"use client";

import type { useStudentProfile } from "@/lib/student/useStudentProfile";
import { formatOnChainDate } from "@/lib/student/studentProfileUtils";
import {
  portalCardClass,
  portalStatLabelClass,
  portalStatTileClass,
  portalStatValueClass,
} from "@/lib/ui/portalClasses";

type Profile = ReturnType<typeof useStudentProfile>;

function ProgressRow({
  label,
  value,
  target,
  ok,
}: {
  label: string;
  value: string;
  target: string;
  ok?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <span className="text-uc-muted">{label}</span>
      <span
        className={
          ok === true
            ? "text-emerald-300 font-medium"
            : ok === false
              ? "text-amber-300 font-medium"
              : "text-uc-text font-medium"
        }
      >
        {value}
        <span className="text-uc-muted font-normal"> / {target}</span>
        {ok === true && " ✓"}
        {ok === false && " ✗"}
      </span>
    </div>
  );
}

export function StudentAcademicSummary({ profile }: { profile: Profile }) {
  const creditsProgress =
    profile.creditsRequired > 0n
      ? Math.min(100, Number((profile.credits * 100n) / profile.creditsRequired))
      : 0;

  return (
    <div className="flex flex-col gap-4">
      {profile.facultyName && (
        <p className="text-sm text-uc-muted">
          Faculty: <span className="font-medium text-uc-text">{profile.facultyName}</span>
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className={portalStatTileClass}>
          <p className={portalStatLabelClass}>Credits earned</p>
          <p className={portalStatValueClass}>{profile.credits.toString()}</p>
          <p className="text-xs text-uc-muted mt-1">
            {profile.creditsRequired.toString()} required for graduation
          </p>
          <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                profile.creditsOk ? "bg-emerald-400" : "bg-uc-violet"
              }`}
              style={{ width: `${creditsProgress}%` }}
            />
          </div>
        </div>

        <div className={portalStatTileClass}>
          <p className={portalStatLabelClass}>Weighted average</p>
          <p className={portalStatValueClass}>{profile.averageDisplay ?? "—"}</p>
          <p className="text-xs text-uc-muted mt-1">
            Minimum {profile.minAverageDisplay ?? "—"} for diploma
          </p>
        </div>
      </div>

      {!profile.hasGraduated && !profile.isExpelled && (
        <div className={`${portalCardClass} flex flex-col gap-2 !p-4`}>
          <p className="portal-section-title">Graduation requirements</p>
          <ProgressRow
            label="Credits"
            value={profile.credits.toString()}
            target={profile.creditsRequired.toString()}
            ok={profile.creditsOk}
          />
          <ProgressRow
            label="Weighted average"
            value={profile.averageDisplay ?? "—"}
            target={profile.minAverageDisplay ?? "—"}
            ok={profile.averageOk}
          />
          <ProgressRow
            label="University debt"
            value={profile.hasOutstandingDebt ? "Outstanding" : "Cleared"}
            target="Cleared"
            ok={profile.studentDebtOk}
          />
          <p
            className={`text-sm font-medium ${
              profile.graduationEligible ? "text-emerald-300" : "text-amber-300"
            }`}
          >
            {profile.graduationEligible
              ? "You meet the on-chain requirements for graduation."
              : "You do not yet meet all graduation requirements."}
          </p>
        </div>
      )}

      {profile.studentMetadata && (
        <div className={`${portalCardClass} flex flex-col gap-2 text-sm text-uc-muted !p-4`}>
          <p className="portal-section-title">On-chain student record</p>
          {formatOnChainDate(profile.studentMetadata.registrationTimestamp) && (
            <p>
              Enrolled on:{" "}
              <span className="font-medium text-uc-text">
                {formatOnChainDate(profile.studentMetadata.registrationTimestamp)}
              </span>
            </p>
          )}
          {profile.studentMetadata.hasGraduated &&
            formatOnChainDate(profile.studentMetadata.graduationTimestamp) && (
              <p>
                Graduated on:{" "}
                <span className="font-medium text-uc-text">
                  {formatOnChainDate(profile.studentMetadata.graduationTimestamp)}
                </span>
              </p>
            )}
          <p className="font-mono text-xs break-all text-uc-muted/80">
            Matriculation hash: {profile.studentMetadata.studentIdHash}
          </p>
        </div>
      )}
    </div>
  );
}
