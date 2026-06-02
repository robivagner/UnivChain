"use client";

import type { TranscriptRow } from "@/lib/student/useStudentTranscript";
import { gradeTone } from "@/lib/student/studentProfileUtils";
import {
  portalStatLabelClass,
  portalStatTileClass,
} from "@/lib/ui/portalClasses";

type Props = {
  rows: TranscriptRow[];
  isLoading: boolean;
  error?: string;
};

function formatProfessor(address: `0x${string}`): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function StudentTranscriptSection({ rows, isLoading, error }: Props) {
  if (isLoading) {
    return <p className="text-sm text-uc-muted">Loading grades…</p>;
  }

  if (error) {
    return (
      <p className="text-sm text-red-300">
        Could not load transcript from chain: {error}
      </p>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-uc-muted">
        No grades recorded yet. Once a professor posts grades for your wallet, they will appear
        here on-chain.
      </p>
    );
  }

  const totalCredits = rows.reduce((sum, row) => sum + row.credits, 0);
  const average =
    totalCredits > 0
      ? (rows.reduce((sum, row) => sum + row.grade * row.credits, 0) / totalCredits).toFixed(2)
      : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className={portalStatTileClass}>
          <p className={portalStatLabelClass}>Subjects graded</p>
          <p className="text-lg font-semibold text-uc-text">{rows.length}</p>
        </div>
        <div className={portalStatTileClass}>
          <p className={portalStatLabelClass}>Transcript credits</p>
          <p className="text-lg font-semibold text-uc-text">{totalCredits} ECTS</p>
        </div>
        {average && (
          <div className={`${portalStatTileClass} col-span-2 sm:col-span-1`}>
            <p className={portalStatLabelClass}>Simple average</p>
            <p className="text-lg font-semibold text-uc-text">{average}</p>
          </div>
        )}
      </div>

      <div className="portal-table-wrap">
        <table className="portal-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Grade</th>
              <th>ECTS</th>
              <th className="hidden sm:table-cell">Professor</th>
              <th className="hidden md:table-cell">Graded on</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.subjectId.toString()}>
                <td>
                  <p className="font-medium text-uc-text">{row.subjectName}</p>
                  <p className="text-xs text-uc-muted font-mono">ID #{row.subjectId.toString()}</p>
                </td>
                <td>
                  <span
                    className={`inline-flex min-w-[2rem] justify-center rounded border px-2 py-0.5 text-xs font-semibold ${gradeTone(row.grade)}`}
                  >
                    {row.grade}
                  </span>
                </td>
                <td className="text-uc-muted">{row.credits}</td>
                <td className="font-mono text-xs text-uc-muted hidden sm:table-cell">
                  {formatProfessor(row.professor)}
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
