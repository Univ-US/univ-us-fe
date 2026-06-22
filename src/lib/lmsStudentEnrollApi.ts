import api from "@/lib/api";
import type { EnrollLectureRow, EnrollSummary, EnrollSubmitResult } from "@/types/lmsStudentEnroll";

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

/** POST /api/lms/student/enroll — 장바구니 일괄 신청 (정원/충돌 최종 검증은 서버 책임) */
export const submitEnrollment = async (lecIds: number[]): Promise<EnrollSubmitResult> => {
  const res = await api.post<EnrollSubmitResult>("/api/lms/student/enroll", { lecIds });
  return res.data;
};

/** DELETE /api/lms/student/enroll/{lecId} — 신청 취소 */
export const cancelEnrollment = async (lecId: number): Promise<void> => {
  await api.delete(`/api/lms/student/enroll/${lecId}`);
};
