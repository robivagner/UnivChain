export type IndexerConfig = {
  chainId: number;
  rpcUrl: string;
  deployBlock: number;
  universityCore: `0x${string}`;
  studentRegistry: `0x${string}`;
  gradebook: `0x${string}`;
  feeManager: `0x${string}`;
};

export type EnrollmentStatus = "pending" | "accepted" | "rejected";

export type PendingEnrollmentDto = {
  student: `0x${string}`;
  requestedAtBlock: number | null;
};

export type ProfessorGradeDto = {
  student: `0x${string}`;
  subjectId: number;
  subjectName: string;
  credits: number;
  grade: number;
  gradedAt: number | null;
  subjectActive: boolean;
};

export type ProfessorSubjectDto = {
  subjectId: number;
  name: string;
  credits: number;
  professor: `0x${string}`;
  isActive: boolean;
};

export type StudentTranscriptDto = {
  subjectId: number;
  subjectName: string;
  credits: number;
  grade: number;
  gradedAt: number | null;
  professor: `0x${string}`;
};
