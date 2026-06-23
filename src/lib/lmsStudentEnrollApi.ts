import api from "@/lib/api";
import type { EnrollLectureRow, EnrollSummary, EnrollSubmitAccepted } from "@/types/lmsStudentEnroll";

/** GET /api/lms/student/enroll/summary — 신청 가능 학점 한도 등 */
export const getEnrollSummary = async (): Promise<EnrollSummary> => {
  const res = await api.get<EnrollSummary>("/api/lms/student/enroll/summary");
  return res.data;
};

/** GET /api/lms/student/enroll/lectures — 개설 강좌 전체(검색/필터는 화면에서 처리) */
export const getOpenLectures = async (): Promise<EnrollLectureRow[]> => {
  const res = await api.get<EnrollLectureRow[]>("/api/lms/student/enroll/lectures");
  return res.data;
};

/**
 * POST /api/lms/student/enroll — 장바구니 일괄 신청 접수.
 * 202 Accepted + {requestId, message}만 즉시 반환되고, 실제 성공/실패는
 * STOMP `/user/queue/lms/enroll-result` 로 비동기 푸시됨(정원 동시성 제어를 큐로 처리).
 * 큐가 꽉 차면 503.
 */
export const submitEnrollment = async (lecIds: number[]): Promise<EnrollSubmitAccepted> => {
  const res = await api.post<EnrollSubmitAccepted>("/api/lms/student/enroll", { lecIds });
  return res.data;
};

/** DELETE /api/lms/student/enroll/{lecId} — 신청 취소 */
export const cancelEnrollment = async (lecId: number): Promise<void> => {
  await api.delete(`/api/lms/student/enroll/${lecId}`);
};
