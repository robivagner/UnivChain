"use client";

import { useState } from "react";
import { getAddress, isAddress } from "viem";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { UniversityCoreABI } from "@/abi/UniversityCore";
import { useIsProfessor } from "@/lib/useIsProfessor";
import { useProfessorSubjects } from "@/lib/useProfessorSubjects";
import { useLiveContractReads } from "@/lib/useLiveContractReads";
import { formInputClassName } from "@/lib/formInputClassName";
import { formatTxError } from "@/lib/wallet/formatTxError";
import { runContractTx } from "@/lib/wallet/runContractTx";
import { TxErrorAlert } from "@/components/shared/TxErrorAlert";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  btnAccentClass,
  btnSecondaryClass,
  btnSuccessClass,
  formInputMonoClassName,
  messageBoxClass,
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

export function ProfessorPanel() {
  const { address, isConnected } = useAccount();
  const { isProfessor, isLoading: roleLoading, deployment } = useIsProfessor();
  const { subjects, isLoading: subjectsLoading } = useProfessorSubjects();
  const publicClient = usePublicClient();

  const [subjectName, setSubjectName] = useState("");
  const [subjectCredits, setSubjectCredits] = useState("6");
  const [gradeStudent, setGradeStudent] = useState("");
  const [gradeSubjectId, setGradeSubjectId] = useState("");
  const [gradeValue, setGradeValue] = useState("8");
  const [activitySubjectId, setActivitySubjectId] = useState("");
  const [activityActive, setActivityActive] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const readsEnabled = Boolean(deployment && isProfessor);
  const { invalidate } = useLiveContractReads(readsEnabled);
  const { writeContractAsync, isPending, reset } = useWriteContract();

  const invalidateReads = async () => {
    await invalidate();
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

  const handleAddSubject = async () => {
    if (!subjectName.trim()) {
      alert("Enter a subject name.");
      return;
    }
    const credits = Number(subjectCredits);
    if (!Number.isInteger(credits) || credits < 1 || credits > 30) {
      alert("Credits must be an integer between 1 and 30.");
      return;
    }

    reset();
    setMessage(null);
    setLocalError(null);
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
      setMessage("Subject created and assigned to your wallet.");
    } catch (e) {
      setLocalError(formatTxError(e));
    }
  };

  const handlePostGrade = async () => {
    if (!isAddress(gradeStudent)) {
      alert("Enter a valid student address.");
      return;
    }
    const subjectId = BigInt(gradeSubjectId || "0");
    const grade = Number(gradeValue);
    if (subjectId <= 0n) {
      alert("Enter a valid subject ID.");
      return;
    }
    if (!Number.isInteger(grade) || grade < 1 || grade > 10) {
      alert("Grade must be an integer from 1 to 10.");
      return;
    }

    reset();
    setMessage(null);
    setLocalError(null);
    try {
      await runContractTx({
        publicClient,
        invalidate: invalidateReads,
        write: () =>
          writeContractAsync({
            address: deployment.universityCore,
            abi: UniversityCoreABI,
            functionName: "postGrade",
            args: [getAddress(gradeStudent), subjectId, grade],
          }),
      });
      setMessage("Grade posted on-chain.");
    } catch (e) {
      setLocalError(formatTxError(e));
    }
  };

  const handleSetActivity = async () => {
    const subjectId = BigInt(activitySubjectId || "0");
    if (subjectId <= 0n) {
      alert("Enter a valid subject ID.");
      return;
    }

    reset();
    setMessage(null);
    setLocalError(null);
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
      setMessage(`Subject #${subjectId} is now ${activityActive ? "active" : "inactive"}.`);
    } catch (e) {
      setLocalError(formatTxError(e));
    }
  };

  return (
    <div className={portalPageClass}>
      <PageHeader
        kicker="Faculty workspace"
        title="Professor portal"
        description="Create subjects assigned to your wallet, post grades for enrolled students (1–10), and activate or deactivate your courses."
      />

      <section className={portalCardClass}>
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

      <section className={`${portalCardClass} flex flex-col gap-3`}>
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

      <section className={`${portalCardClass} flex flex-col gap-3`}>
        <h2 className={portalSectionTitleClass}>Post grade</h2>
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

      <section className={`${portalCardClass} flex flex-col gap-3`}>
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

      {message && <p className={messageBoxClass}>{message}</p>}
      {localError && <TxErrorAlert message={localError} />}
    </div>
  );
}
