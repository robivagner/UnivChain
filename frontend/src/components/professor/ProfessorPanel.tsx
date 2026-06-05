"use client";

import { useState } from "react";
import { getAddress, isAddress } from "viem";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { UniversityCoreABI } from "@/abi/UniversityCore";
import { useIsProfessor } from "@/lib/useIsProfessor";
import { useProfessorSubjects } from "@/lib/useProfessorSubjects";
import { useProfessorGrades, type ProfessorGradeRow } from "@/lib/professor/useProfessorGrades";
import { useLiveContractReads } from "@/lib/useLiveContractReads";
import { formInputClassName } from "@/lib/formInputClassName";
import { formatTxError } from "@/lib/wallet/formatTxError";
import { runContractTx } from "@/lib/wallet/runContractTx";
import { useNotifications } from "@/lib/notifications/NotificationProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProfessorGradesTable } from "@/components/professor/ProfessorGradesTable";
import {
  btnAccentClass,
  btnSecondaryClass,
  btnSuccessClass,
  formInputMonoClassName,
  portalCardClass,
  portalPageClass,
  portalSectionTitleClass,
  portalStatTileClass,
} from "@/lib/ui/portalClasses";
import {
  RoleGateConnect,
  RoleGateDenied,
  RoleGateLoading,
  RoleGateMissingDeployment,
} from "@/components/shared/RoleGate";
import {
  PortalSectionNav,
  PortalSectionNavMobile,
} from "@/components/layout/PortalSectionNav";
import { usePortalSectionNavigation } from "@/lib/navigation/usePortalSectionNavigation";
import { PORTAL_SECTION_ANCHOR_CLASS } from "@/lib/navigation/portalSectionNav";

const PROFESSOR_SECTIONS = [
  { id: "grades", label: "Grades" },
  { id: "subjects", label: "Subjects" },
  { id: "add-subject", label: "Add subject" },
  { id: "post-grade", label: "Post grade" },
  { id: "activity", label: "Activity" },
] as const;

type ProfessorSection = (typeof PROFESSOR_SECTIONS)[number]["id"];

export function ProfessorPanel() {
  const { address, isConnected } = useAccount();
  const { isProfessor, isLoading: roleLoading, deployment } = useIsProfessor();
  const readsEnabled = Boolean(deployment && isProfessor);
  const { subjects, isLoading: subjectsLoading, refreshFromIndexer: refreshSubjects } =
    useProfessorSubjects(readsEnabled);
  const publicClient = usePublicClient();

  const [subjectName, setSubjectName] = useState("");
  const [subjectCredits, setSubjectCredits] = useState("6");
  const [gradeStudent, setGradeStudent] = useState("");
  const [gradeSubjectId, setGradeSubjectId] = useState("");
  const [gradeValue, setGradeValue] = useState("8");
  const [activitySubjectId, setActivitySubjectId] = useState("");
  const [activityActive, setActivityActive] = useState(true);

  const { notifyError, notifySuccess } = useNotifications();
  const { invalidate } = useLiveContractReads(readsEnabled);
  const { writeContractAsync, isPending, reset } = useWriteContract();

  const {
    rows: gradeRows,
    isLoading: gradesLoading,
    error: gradesError,
    refreshAfterGradeChange,
  } = useProfessorGrades(readsEnabled);

  const { activeSection, jumpToSection } = usePortalSectionNavigation<ProfessorSection>(
    PROFESSOR_SECTIONS,
    "grades",
    readsEnabled
  );

  const invalidateReads = async () => {
    await invalidate();
    await Promise.all([refreshAfterGradeChange(), refreshSubjects()]);
  };

  if (!isConnected) return <RoleGateConnect title="the professor portal" />;
  if (roleLoading) return <RoleGateLoading />;
  if (!deployment) return <RoleGateMissingDeployment />;
  if (!isProfessor) {
    return (
      <RoleGateDenied
        title="Professor access required"
        roleLabel="PROFESSOR_ROLE"
        connected={address}
        hint="An admin must grant your wallet the professor role from the admin dashboard."
      />
    );
  }

  const submitGrade = async (student: `0x${string}`, subjectId: bigint, grade: number) => {
    reset();
    await runContractTx({
      publicClient,
      invalidate: invalidateReads,
      write: () =>
        writeContractAsync({
          address: deployment.universityCore,
          abi: UniversityCoreABI,
          functionName: "postGrade",
          args: [student, subjectId, grade],
        }),
    });
  };

  const handleAddSubject = async () => {
    if (!subjectName.trim()) {
      notifyError("Enter a subject name.");
      return;
    }
    const credits = Number(subjectCredits);
    if (!Number.isInteger(credits) || credits < 1 || credits > 30) {
      notifyError("Credits must be an integer between 1 and 30.");
      return;
    }

    reset();
    try {
      await runContractTx({
        publicClient,
        invalidate: invalidateReads,
        write: () =>
          writeContractAsync({
            address: deployment.universityCore,
            abi: UniversityCoreABI,
            functionName: "addSubject",
            args: [subjectName.trim(), credits],
          }),
      });
      setSubjectName("");
      notifySuccess("Subject created and assigned to your wallet.");
    } catch (e) {
      notifyError(formatTxError(e), "Transaction failed");
    }
  };

  const handlePostGrade = async () => {
    if (!isAddress(gradeStudent)) {
      notifyError("Enter a valid student address.");
      return;
    }
    const subjectId = BigInt(gradeSubjectId || "0");
    const grade = Number(gradeValue);
    if (subjectId <= 0n) {
      notifyError("Enter a valid subject ID.");
      return;
    }
    if (!Number.isInteger(grade) || grade < 1 || grade > 10) {
      notifyError("Grade must be an integer from 1 to 10.");
      return;
    }

    try {
      await submitGrade(getAddress(gradeStudent), subjectId, grade);
      notifySuccess("Grade posted on-chain.");
    } catch (e) {
      notifyError(formatTxError(e), "Transaction failed");
    }
  };

  const handleUpdateGrade = async (row: ProfessorGradeRow, newGrade: number) => {
    if (!Number.isInteger(newGrade) || newGrade < 1 || newGrade > 10) {
      notifyError("Grade must be an integer from 1 to 10.");
      return;
    }
    if (newGrade === row.grade) {
      notifyError("Enter a different grade to update.");
      return;
    }

    try {
      await submitGrade(row.student, row.subjectId, newGrade);
      notifySuccess(`Grade updated to ${newGrade} for ${row.subjectName}.`);
    } catch (e) {
      notifyError(formatTxError(e), "Transaction failed");
    }
  };

  const handleSetActivity = async () => {
    const subjectId = BigInt(activitySubjectId || "0");
    if (subjectId <= 0n) {
      notifyError("Enter a valid subject ID.");
      return;
    }

    reset();
    try {
      await runContractTx({
        publicClient,
        invalidate: invalidateReads,
        write: () =>
          writeContractAsync({
            address: deployment.universityCore,
            abi: UniversityCoreABI,
            functionName: "setSubjectActivity",
            args: [subjectId, activityActive],
          }),
      });
      notifySuccess(`Subject #${subjectId} is now ${activityActive ? "active" : "inactive"}.`);
    } catch (e) {
      notifyError(formatTxError(e), "Transaction failed");
    }
  };

  return (
    <>
      <PortalSectionNav
        sections={PROFESSOR_SECTIONS}
        active={activeSection}
        onSelect={(id) => jumpToSection(id as ProfessorSection)}
        ariaLabel="Professor sections"
      />

      <div className={portalPageClass}>
        <PageHeader
          kicker="Faculty workspace"
          title="Professor portal"
          description="Manage your subjects, review all student grades in one table, and update marks when students retake a course."
        />

        <PortalSectionNavMobile
          sections={PROFESSOR_SECTIONS}
          active={activeSection}
          onSelect={(id) => jumpToSection(id as ProfessorSection)}
          ariaLabel="Professor sections"
        />

        <section id="grades" className={`${portalCardClass} ${PORTAL_SECTION_ANCHOR_CLASS}`}>
        <h2 className={portalSectionTitleClass}>Student grades</h2>
        <p className="text-xs text-uc-muted mb-4">
          All grades posted for your subjects. Use &ldquo;Change grade&rdquo; to update a mark after a
          retake or correction.
        </p>
        <ProfessorGradesTable
          rows={gradeRows}
          isLoading={gradesLoading}
          error={gradesError}
          txPending={isPending}
          onUpdateGrade={handleUpdateGrade}
        />
      </section>

      <section id="subjects" className={`${portalCardClass} ${PORTAL_SECTION_ANCHOR_CLASS} border-t border-white/10 pt-10`}>
        <h2 className={portalSectionTitleClass}>Your subjects</h2>
        {subjectsLoading && <p className="text-sm text-uc-muted">Loading subjects…</p>}
        {!subjectsLoading && subjects.length === 0 && (
          <p className="text-sm text-uc-muted">No subjects yet. Add one below.</p>
        )}
        {subjects.length > 0 && (
          <ul className="flex flex-col gap-2 text-sm">
            {subjects.map((s) => (
              <li
                key={s.subjectId.toString()}
                className={`${portalStatTileClass} flex flex-wrap items-center justify-between gap-2`}
              >
                <span className="font-medium text-uc-text">
                  #{s.subjectId.toString()} — {s.name}
                </span>
                <span className="text-xs text-uc-muted">
                  {s.credits} ECTS · {s.isActive ? "active" : "inactive"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        id="add-subject"
        className={`${portalCardClass} ${PORTAL_SECTION_ANCHOR_CLASS} flex flex-col gap-3 border-t border-white/10 pt-10`}
      >
        <h2 className={portalSectionTitleClass}>Add subject</h2>
        <input
          className={formInputClassName}
          placeholder="Subject name (e.g. Blockchain Systems)"
          value={subjectName}
          onChange={(e) => setSubjectName(e.target.value)}
        />
        <input
          className={formInputClassName}
          placeholder="Credits (ECTS)"
          type="number"
          min={1}
          max={30}
          value={subjectCredits}
          onChange={(e) => setSubjectCredits(e.target.value)}
        />
        <button
          type="button"
          onClick={handleAddSubject}
          disabled={isPending}
          className={btnAccentClass}
        >
          {isPending ? "Processing…" : "Add subject"}
        </button>
      </section>

      <section
        id="post-grade"
        className={`${portalCardClass} ${PORTAL_SECTION_ANCHOR_CLASS} flex flex-col gap-3 border-t border-white/10 pt-10`}
      >
        <h2 className={portalSectionTitleClass}>Post new grade</h2>
        <input
          className={formInputMonoClassName}
          placeholder="Student address 0x…"
          value={gradeStudent}
          onChange={(e) => setGradeStudent(e.target.value)}
        />
        <input
          className={formInputClassName}
          placeholder="Subject ID"
          type="number"
          min={1}
          value={gradeSubjectId}
          onChange={(e) => setGradeSubjectId(e.target.value)}
        />
        <input
          className={formInputClassName}
          placeholder="Grade (1–10)"
          type="number"
          min={1}
          max={10}
          value={gradeValue}
          onChange={(e) => setGradeValue(e.target.value)}
        />
        <button
          type="button"
          onClick={handlePostGrade}
          disabled={isPending}
          className={btnSuccessClass}
        >
          {isPending ? "Processing…" : "Post grade"}
        </button>
      </section>

      <section
        id="activity"
        className={`${portalCardClass} ${PORTAL_SECTION_ANCHOR_CLASS} flex flex-col gap-3 border-t border-white/10 pt-10`}
      >
        <h2 className={portalSectionTitleClass}>Subject activity</h2>
        <input
          className={formInputClassName}
          placeholder="Subject ID"
          type="number"
          min={1}
          value={activitySubjectId}
          onChange={(e) => setActivitySubjectId(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm text-uc-text">
          <input
            type="checkbox"
            checked={activityActive}
            onChange={(e) => setActivityActive(e.target.checked)}
            className="rounded border-white/20 bg-transparent accent-uc-gold"
          />
          Subject is active
        </label>
        <button type="button" onClick={handleSetActivity} disabled={isPending} className={btnSecondaryClass}>
          {isPending ? "Processing…" : "Update activity"}
        </button>
      </section>
      </div>
    </>
  );
}
