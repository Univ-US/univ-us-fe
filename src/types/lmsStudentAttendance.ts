// src/types/lmsStudentAttendance.ts
// SLM-005 출석 내역 — 로그인 학생의 수강 강의별 출석·지각·결석 현황

/** 지각·결석 1건의 상세(팝오버 표시용) */
export interface AttendanceRecord {
  stdEnrAtdRegDate: string; // "YYYY-MM-DD"
}

/** 강의 1행의 출결 현황 */
export interface AttendanceCourse {
  lecId: number;
  courseName: string;
  lecSection: number;
  lecTotClasses: number;
  present: number;
  late: number;
  absent: number;
  attendanceRate: number;
  lateRecords: AttendanceRecord[];
  absentRecords: AttendanceRecord[];
}

/** 한 학기 단위 카드 */
export interface SemesterAttendance {
  semYear: number;
  semTerm: string;
  semesterLabel: string;
  inProgress: boolean;
  courseCount: number;
  courses: AttendanceCourse[];
}
