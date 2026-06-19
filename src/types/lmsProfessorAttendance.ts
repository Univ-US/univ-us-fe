// src/types/lmsProfessorAttendance.ts
// PLM-008 교수 "출결 관리" 타입 선언 (lmsProfessorAttendanceApi.ts에서 분리)

/** 출결 상태 — 이 화면이 다루는 3종 (BE ATTD_STS는 ELV/EXC 포함 5종이나 미사용) */
export type AttendanceStatus = "PRS" | "LAT" | "ABS";

/** 수업 1회차 = STUDENT_ENROLLMENT_ATTENDANCE 1행 */
export interface AttendanceSession {
  sessionId: number;
  stdEnrAtdRegDate: string; // "YYYY-MM-DD" (수업일 = STD_ENR_ATD_REG_DATE)
  stdEnrAtdStsCode: AttendanceStatus; // STD_ENR_ATD_STS_CODE (PRS/LAT/ABS)
}

/** 학생 1명의 출결 현황(목록 1행 + 수정 모달용 회차) */
export interface AttendanceStudentRow {
  enrollmentId: number;
  memberId: number;
  studentName: string;
  studentNo: string;
  imageUrl: string | null; // 프로필 이미지(없으면 null → 이니셜)
  totalSessions: number;
  present: number;
  late: number;
  absent: number;
  attendanceRate: number; // = round(present / totalSessions * 100)
  sessions: AttendanceSession[];
}

/** 강의 출결 요약(통계 카드) — 평균 출석률 + 평균 지각률 + 평균 결석률 = 100% (학생별 비율의 평균) */
export interface AttendanceSummary {
  totalStudents: number;
  averageAttendanceRate: number;
  averageLateRate: number;
  averageAbsentRate: number; // = 100 − 출석 − 지각 (잔여 보정)
}

/** 학기/강의 드롭다운 항목 */
export interface AttendanceLecture {
  lecId: number;
  lecName: string;
  lecSection: number;
  semYear: number; // SEM_YEAR
  semTerm: string; // SM1/SMR/SM2/WNT (SEM_TERM)
  studentCount: number;
}

/** 강의 1개의 출결 응답 */
export interface LectureAttendance {
  lecture: AttendanceLecture;
  summary: AttendanceSummary;
  students: AttendanceStudentRow[];
}
