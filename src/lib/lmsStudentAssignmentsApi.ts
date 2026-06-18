import api from "@/lib/api";

export type StudentAssignmentStatus = "NSB" | "SBM" | "GRD";

export const STUDENT_ASSIGNMENT_STATUS_LABEL: Record<StudentAssignmentStatus, string> = {
  NSB: "미제출",
  SBM: "제출",
  GRD: "채점완료",
};

export interface SubmissionFile {
  fileName: string;
  fileSize: number;
  fileUrl?: string | null;
  contentType?: string | null;
}

export interface AssignmentFeedback {
  asnSbmEvlScore: number;
  maxScore: number;
  courseName: string;
  professor: string;
  asnSbmEvlFeedback: string;
}

export interface StudentAssignment {
  id: number;
  submissionId?: number | null;
  lecId?: number | null;
  courseName: string;
  lecSection?: number | null;
  lecAsnTitle: string;
  lecAsnContent?: string | null;
  lecAsnDueDate: string;
  status: StudentAssignmentStatus;
  overdue?: boolean;
  asnSbmEvlScore: number | null;
  maxScore: number;
  lecAsnSbmRegDate?: string | null;
  lecAsnSbmMemo?: string | null;
  file?: SubmissionFile | null;
  feedback?: AssignmentFeedback | null;
}

export interface SemesterAssignments {
  semYear: number;
  semTerm: string;
  semesterLabel: string;
  assignments: StudentAssignment[];
}

export interface StudentAssignmentsResult {
  semesters: SemesterAssignments[];
}

export { formatFileSize } from "@/lib/lmsProfessorUploadApi";

export const getStudentAssignments = async (): Promise<StudentAssignmentsResult> => {
  const res = await api.get<StudentAssignmentsResult>("/api/lms/student/assignments");
  return res.data;
};

export interface UpdateStudentAssignmentSubmissionInput {
  submissionId: number;
  memo?: string;
  file?: File | null;
  removeExistingFile?: boolean;
}

export const updateStudentAssignmentSubmission = async (
  input: UpdateStudentAssignmentSubmissionInput,
): Promise<void> => {
  const formData = new FormData();
  formData.append("memo", input.memo ?? "");
  formData.append("removeExistingFile", String(input.removeExistingFile ?? false));
  if (input.file) {
    formData.append("file", input.file);
  }

  await api.put(`/api/lms/student/assignments/submissions/${input.submissionId}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const downloadStudentAssignmentFile = async (file: SubmissionFile): Promise<void> => {
  if (!file.fileUrl) {
    throw new Error("다운로드 경로가 없습니다.");
  }
  const res = await api.get(file.fileUrl, { responseType: "blob" });
  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
