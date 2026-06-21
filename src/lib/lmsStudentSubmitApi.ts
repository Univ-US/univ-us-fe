import api from "@/lib/api";
import type {
  SubmitItem,
  SubmitAssignmentInput,
  PageResponse,
  SubmittableSummary,
} from "@/types/lmsStudentSubmit";

/** GET 제출 가능 과제 요약 — 전역 미제출 수(배지) + 연도 드롭다운 소스 */
export const getSubmittableSummary = async (): Promise<SubmittableSummary> => {
  const res = await api.get<SubmittableSummary>(
    "/api/lms/student/assignments/submittable/summary",
  );
  return res.data;
};

/** GET 제출 가능 과제 1페이지 (서버 페이지네이션). page 0-based. focusAssignmentId=딥링크 대상 */
export const getSubmittableAssignments = async (params: {
  year?: number;
  term?: string;
  page: number;
  size: number;
  focusAssignmentId?: number;
}): Promise<PageResponse<SubmitItem>> => {
  const query: Record<string, string> = {
    page: String(params.page),
    size: String(params.size),
  };
  if (params.year != null) query.year = String(params.year);
  if (params.term) query.term = params.term;
  if (params.focusAssignmentId != null) query.focusAssignmentId = String(params.focusAssignmentId);
  const res = await api.get<PageResponse<SubmitItem>>(
    "/api/lms/student/assignments/submittable",
    { params: query },
  );
  return { ...res.data, content: res.data.content ?? [] };
};

export const submitStudentAssignment = async (
  assignmentId: number,
  input: SubmitAssignmentInput,
): Promise<void> => {
  const formData = new FormData();
  if (input.file) {
    formData.append("file", input.file);
  }
  formData.append("memo", input.memo ?? "");

  await api.post(`/api/lms/student/assignments/${assignmentId}/submit`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
