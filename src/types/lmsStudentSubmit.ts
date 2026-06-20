export type SubmitStatus = "OPEN" | "EXTENDED" | "CLOSED";

export interface SubmitGuide {
  courseName: string;
  professor: string;
  professorLmsPrfId: number;
  lines: string[];
}

export interface SubmitDraft {
  fileName: string;
  fileSize: number;
  memo: string;
}

export interface SubmitItem {
  id: number;
  semYear: number;
  semTerm: string;
  lecId: number;
  lecSection: number | null;
  lecAsnTitle: string;
  lecAsnContent: string | null;
  lecAsnRegDate: string;
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
