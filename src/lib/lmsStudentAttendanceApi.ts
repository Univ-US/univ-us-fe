// src/lib/lmsStudentAttendanceApi.ts
// SLM-005 출석 내역 — 로그인 학생의 수강 강의별 출석·지각·결석 현황
import api from "@/lib/api";
import type { SemesterAttendance } from "@/types/lmsStudentAttendance";

export type { AttendanceRecord, AttendanceCourse, SemesterAttendance } from "@/types/lmsStudentAttendance";

/** GET /api/lms/student/attendance — 학기별 출결 현황 */
export const getStudentAttendance = async (): Promise<SemesterAttendance[]> => {
  const res = await api.get<SemesterAttendance[]>("/api/lms/student/attendance");
  return res.data;
};
