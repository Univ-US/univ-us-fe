import api from "@/lib/api";
import type {
  SubmissionFile,
  StudentAssignmentsResult,
  UpdateStudentAssignmentSubmissionInput,
} from "@/types/lmsStudentAssignments";

// 타입은 @/types/lmsStudentAssignments로 분리 — 기존 소비처 호환용 re-export
export type {
  StudentAssignmentStatus,
  SubmissionFile,
  AssignmentFeedback,
  StudentAssignment,
  SemesterAssignments,
  StudentAssignmentsResult,
  UpdateStudentAssignmentSubmissionInput,
} from "@/types/lmsStudentAssignments";

export { formatFileSize } from "@/lib/lmsProfessorUploadApi";

export const getStudentAssignments = async (): Promise<StudentAssignmentsResult> => {
  const res = await api.get<StudentAssignmentsResult>("/api/lms/student/assignments");
  return res.data;
};

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
