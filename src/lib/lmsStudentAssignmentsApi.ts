import api from "@/lib/api";
import type {
  SubmissionFile,
  StudentAssignment,
  StudentAssignmentsResult,
  AssignmentSemesterSummary,
  PageResponse,
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
  AssignmentSemesterSummary,
  PageResponse,
  UpdateStudentAssignmentSubmissionInput,
} from "@/types/lmsStudentAssignments";

export { formatFileSize } from "@/lib/lmsProfessorUploadApi";

/** GET /assignments — 전체 과제 내역 (대시보드 합성용, 미페이징) */
export const getStudentAssignments = async (): Promise<StudentAssignmentsResult> => {
  const res = await api.get<StudentAssignmentsResult>("/api/lms/student/assignments");
  return res.data;
};

/** GET /assignments/semesters — 학기별 과제 요약 (카드 헤더. status='all'이면 전체) */
export const getAssignmentSemesterSummaries = async (
  status: string,
): Promise<AssignmentSemesterSummary[]> => {
  const res = await api.get<AssignmentSemesterSummary[]>("/api/lms/student/assignments/semesters", {
    params: status && status !== "all" ? { status } : {},
  });
  return res.data;
};

/** GET /assignments/semesters/{semId} — 한 학기 과제 1페이지 (상태 필터, 서버 페이지네이션). page 0-based */
export const getSemesterAssignmentsPaged = async (params: {
  semId: number;
  status: string;
  page: number;
  size: number;
}): Promise<PageResponse<StudentAssignment>> => {
  const query: Record<string, string> = {
    page: String(params.page),
    size: String(params.size),
  };
  if (params.status && params.status !== "all") query.status = params.status;
  const res = await api.get<PageResponse<StudentAssignment>>(
    `/api/lms/student/assignments/semesters/${params.semId}`,
    { params: query },
  );
  return { ...res.data, content: res.data.content ?? [] };
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
