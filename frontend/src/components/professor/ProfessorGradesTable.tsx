"use client";

import { useState } from "react";
import type { ProfessorGradeRow } from "@/lib/professor/useProfessorGrades";
import { gradeTone } from "@/lib/student/studentProfileUtils";
import { formInputClassName } from "@/lib/formInputClassName";
import { useNotifications } from "@/lib/notifications/NotificationProvider";
import {
  btnAccentClass,
  btnGhostClass,
  btnSecondaryClass,
} from "@/lib/ui/portalClasses";

type Props = {
  rows: ProfessorGradeRow[];
  isLoading: boolean;
  error?: string;
  txPending: boolean;
  onUpdateGrade: (row: ProfessorGradeRow, newGrade: number) => Promise<void>;
};

function formatStudent(address: `0x${string}`): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function ProfessorGradesTable({ rows, isLoading, error, txPending, onUpdateGrade }: Props) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draftGrade, setDraftGrade] = useState("");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const { notifyError } = useNotifications();

  const rowKey = (row: ProfessorGradeRow) => `${row.student}-${row.subjectId}`;

  const startEdit = (row: ProfessorGradeRow) => {
    setEditingKey(rowKey(row));
    setDraftGrade(String(row.grade));
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setDraftGrade("");
  };

  const saveEdit = async (row: ProfessorGradeRow) => {
    const grade = Number(draftGrade);
    if (!Number.isInteger(grade) || grade < 1 || grade > 10) {
      notifyError("Grade must be an integer from 1 to 10.");
      return;
    }

    const key = rowKey(row);
    setSavingKey(key);
    try {
      await onUpdateGrade(row, grade);
      cancelEdit();
    } finally {
      setSavingKey(null);
    }
  };

  if (isLoading) {
    return <p className="text-sm text-uc-muted">Loading student grades…</p>;
  }

  if (error) {
    return <p className="text-sm text-red-300">Could not load grades: {error}</p>;
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-uc-muted">
        No grades posted yet for your subjects. Use the form below to post a first grade, or wait
        until students complete your courses.
      </p>
    );
  }

  return (
    <div className="portal-table-wrap">
      <table className="portal-table">
        <thead>
          <tr>
            <th>Student</th>
            <th>Subject</th>
            <th>ECTS</th>
            <th>Grade</th>
            <th className="hidden md:table-cell">Graded on</th>
            <th className="hidden sm:table-cell">Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const key = rowKey(row);
            const isEditing = editingKey === key;
            const isSaving = savingKey === key;

            return (
              <tr key={key}>
                <td>
                  <p className="font-mono text-xs text-uc-text break-all">{formatStudent(row.student)}</p>
                  <p className="font-mono text-[10px] text-uc-muted break-all hidden lg:block">
                    {row.student}
                  </p>
                </td>
                <td>
                  <p className="font-medium text-uc-text">{row.subjectName}</p>
                  <p className="text-xs text-uc-muted font-mono">ID #{row.subjectId.toString()}</p>
                </td>
                <td className="text-uc-muted">{row.credits}</td>
                <td>
                  {isEditing ? (
                    <input
                      className={`${formInputClassName} !w-16 !py-1 !px-2 text-center`}
                      type="number"
                      min={1}
                      max={10}
                      value={draftGrade}
                      onChange={(e) => setDraftGrade(e.target.value)}
                      disabled={isSaving || txPending}
                      autoFocus
                    />
                  ) : (
                    <span
                      className={`inline-flex min-w-[2rem] justify-center rounded border px-2 py-0.5 text-xs font-semibold ${gradeTone(row.grade)}`}
                    >
                      {row.grade}
                    </span>
                  )}
                </td>
                <td className="text-uc-muted hidden md:table-cell">
                  {row.gradedAt
                    ? row.gradedAt.toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "—"}
                </td>
                <td className="hidden sm:table-cell">
                  <span
                    className={`text-xs ${row.subjectActive ? "text-emerald-300" : "text-uc-muted"}`}
                  >
                    {row.subjectActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="text-right whitespace-nowrap">
                  {isEditing ? (
                    <div className="flex gap-1 justify-end">
                      <button
                        type="button"
                        onClick={() => void saveEdit(row)}
                        disabled={isSaving || txPending}
                        className={`${btnAccentClass} !px-3 !py-1 text-xs`}
                      >
                        {isSaving ? "…" : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        disabled={isSaving || txPending}
                        className={`${btnGhostClass} !px-3 !py-1 text-xs`}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEdit(row)}
                      disabled={txPending || editingKey !== null}
                      className={`${btnSecondaryClass} !px-3 !py-1 text-xs`}
                    >
                      Change grade
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
