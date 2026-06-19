export type SubmitStatus = "OPEN" | "EXTENDED" | "CLOSED";

export interface SubmitGuide {
  courseName: string;
  professor: string;
  lines: string[];
}

export interface SubmitDraft {
  fileName: string;
  fileSize: number;
  memo: string;
}

export interface SubmitItem {
  id: number;
  lecAsnTitle: string;
  courseName: string;
  dueLabel: string;
  status: SubmitStatus;
  dDay: string | null;
  note?: string | null;
  badge?: string | null;
  dotColor: string;
  guide: SubmitGuide;
  draft?: SubmitDraft;
}

export interface SubmitAssignmentInput {
  file: File;
  memo?: string;
}
