import api from "@/lib/api";

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
  title: string;
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

export const getSubmittableAssignments = async (): Promise<SubmitItem[]> => {
  const res = await api.get<SubmitItem[]>("/api/lms/student/assignments/submittable");
  return res.data;
};

export const submitStudentAssignment = async (
  assignmentId: number,
  input: SubmitAssignmentInput,
): Promise<void> => {
  const formData = new FormData();
  formData.append("file", input.file);
  formData.append("memo", input.memo ?? "");

  await api.post(`/api/lms/student/assignments/${assignmentId}/submit`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
