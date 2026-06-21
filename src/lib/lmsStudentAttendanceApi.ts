// src/lib/lmsStudentAttendanceApi.ts
// SLM-005 출석 내역 — 로그인 학생의 수강 강의별 출석·지각·결석 현황
import api from "@/lib/api";
import type {
  SemesterAttendance,
  AttendanceCourse,
  AttendanceSemesterSummary,
  PageResponse,
} from "@/types/lmsStudentAttendance";

export type {
  AttendanceRecord,
  AttendanceCourse,
  SemesterAttendance,
  AttendanceSemesterSummary,
  PageResponse,
} from "@/types/lmsStudentAttendance";

/** GET /api/lms/student/attendance — 학기별 출결 현황 (대시보드 합성용, 미페이징) */
export const getStudentAttendance = async (): Promise<SemesterAttendance[]> => {
  const res = await api.get<SemesterAttendance[]>("/api/lms/student/attendance");
  return res.data;
};

/** GET /attendance/semesters — 전 학기 요약 (카드 헤더. 과목은 학기별 페이지 조회) */
export const getAttendanceSemesterSummaries = async (): Promise<AttendanceSemesterSummary[]> => {
  const res = await api.get<AttendanceSemesterSummary[]>("/api/lms/student/attendance/semesters");
  return res.data;
};

/** GET /attendance/semesters/{semId} — 한 학기 과목별 출결 1페이지 (서버 페이지네이션). page 0-based */
export const getSemesterAttendancePaged = async (params: {
  semId: number;
  page: number;
  size: number;
}): Promise<PageResponse<AttendanceCourse>> => {
  const res = await api.get<PageResponse<AttendanceCourse>>(
    `/api/lms/student/attendance/semesters/${params.semId}`,
    { params: { page: String(params.page), size: String(params.size) } },
  );
  return { ...res.data, content: res.data.content ?? [] };
};
