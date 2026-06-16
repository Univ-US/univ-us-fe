// src/lib/lmsProfessorAttendanceApi.ts
// PLM-008 교수 "출결 관리" — 강의별 학생 출석·지각·결석 조회 및 수정
// ─────────────────────────────────────────────────────────────
// ✅ BE 연동(2026-06-16): /api/lms/professor/attendance/** (PROF 가드)
//   · GET   /lectures                                   → AttendanceLecture[] (학기/강의 드롭다운 + 수강생 수)
//   · GET   /lectures/{lecId}                            → LectureAttendance  (헤더 + 요약 + 학생별 회차)
//   · PUT   /lectures/{lecId}/students/{memberId}        → 회차별 상태 저장 후 갱신된 AttendanceStudentRow
//     body = { sessions: [{ sessionId, status }] }  (date는 BE 무시 — 최소 payload로 전송)
// 본체 = STUDENT_ENROLLMENT_ATTENDANCE(회차별 STD_ENR_ATD_STS_CODE) · LECTURE · LECTURE_STUDENT_ENROLLMENT.
// 회차 날짜 = STD_ENR_ATD_REG_DATE (전용 수업일 컬럼 없음).
// ⚠️ 상태 코드(ATTD_STS): PRS 출석 · LAT 지각 · ABS 결석 (ELV 조퇴·EXC 공결 = VAL_STATUS DEL 미사용).
// ⚠️ 실패 시 가짜 데이터로 가리지 않는다 — 페이지가 "에러 상태"를 표기(describeApiError).
// ─────────────────────────────────────────────────────────────
import api from "@/lib/api";

/** 출결 상태 — 이 화면이 다루는 3종 (BE ATTD_STS는 ELV/EXC 포함 5종이나 미사용) */
export type AttendanceStatus = "PRS" | "LAT" | "ABS";

/** 출결 상태 라벨/색 (회차 태그·범례 공용) */
export const ATTENDANCE_STATUS: Record<
  AttendanceStatus,
  { label: string; dot: string; tag: string; bar: string }
> = {
  PRS: { label: "출석", dot: "bg-emerald-500", tag: "bg-emerald-50 text-emerald-700 border-emerald-200", bar: "bg-emerald-500" },
  LAT: { label: "지각", dot: "bg-amber-500", tag: "bg-amber-50 text-amber-700 border-amber-200", bar: "bg-amber-400" },
  ABS: { label: "결석", dot: "bg-red-500", tag: "bg-red-50 text-red-600 border-red-200", bar: "bg-red-400" },
};

/** 출결 위험 기준(출석률 %) — 미만이면 붉은 배경 + 위험 카운트.
 *  ⭐색상 표준(교수 LMS, 2026-06-16 확정): 정상 ≥95 · 경고 80~94 · 위험 <80 */
export const AT_RISK_THRESHOLD = 80;

/** 수업 1회차 = STUDENT_ENROLLMENT_ATTENDANCE 1행 */
export interface AttendanceSession {
  sessionId: number;
  date: string; // "YYYY-MM-DD" (수업일 = STD_ENR_ATD_REG_DATE)
  status: AttendanceStatus;
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
  year: number;
  termCode: string; // SM1/SMR/SM2/WNT
  studentCount: number;
}

/** 강의 1개의 출결 응답 */
export interface LectureAttendance {
  lecture: AttendanceLecture;
  summary: AttendanceSummary;
  students: AttendanceStudentRow[];
}

// 학기 라벨 — 간이 맵(연동해도 라벨은 고정 4종이라 로컬 유지)
const TERM_LABEL: Record<string, string> = {
  SM1: "1학기",
  SMR: "여름학기",
  SM2: "2학기",
  WNT: "겨울학기",
};
export const semesterLabel = (year: number, termCode: string) =>
  `${year}년 ${TERM_LABEL[termCode] ?? termCode}`;
/** 학기 코드 → 라벨 ("SM1" → "1학기") — 학기 드롭다운용 */
export const termLabel = (termCode: string) => TERM_LABEL[termCode] ?? termCode;

// ── 출석률·집계 헬퍼 (모달·저장 후 재계산 공용) ─────────────────
export const attendanceRateOf = (present: number, total: number) =>
  total > 0 ? Math.round((present / total) * 100) : 0;

/** 회차 배열 → 출석/지각/결석 카운트 + 출석률 (모달 저장 미리보기·재계산) */
export const tallySessions = (sessions: AttendanceSession[]) => {
  const present = sessions.filter((s) => s.status === "PRS").length;
  const late = sessions.filter((s) => s.status === "LAT").length;
  const absent = sessions.filter((s) => s.status === "ABS").length;
  const totalSessions = sessions.length;
  return { present, late, absent, totalSessions, attendanceRate: attendanceRateOf(present, totalSessions) };
};

/**
 * 학생 행들 → 요약 카드 (저장 후 클라이언트 재계산 — BE summarize와 동일 규칙이라 새 GET 없이 일관).
 * 학생별 비율(round)을 평균낸 뒤 반올림, 결석률은 잔여(100−출석−지각) 보정 → 셋 합 100%.
 */
export const summarize = (students: AttendanceStudentRow[]): AttendanceSummary => {
  const totalStudents = students.length;
  if (totalStudents === 0) {
    return { totalStudents: 0, averageAttendanceRate: 0, averageLateRate: 0, averageAbsentRate: 0 };
  }
  const mean = (sel: (s: AttendanceStudentRow) => number) =>
    students.reduce((acc, s) => acc + sel(s), 0) / totalStudents;
  const averageAttendanceRate = Math.round(mean((s) => s.attendanceRate));
  const averageLateRate = Math.round(mean((s) => attendanceRateOf(s.late, s.totalSessions)));
  const averageAbsentRate = Math.max(0, 100 - averageAttendanceRate - averageLateRate);
  return { totalStudents, averageAttendanceRate, averageLateRate, averageAbsentRate };
};

// ── API 호출 ───────────────────────────────────────────────
/** GET 학기/강의 드롭다운 — 교수 담당 강의 전체 + 수강생 수 */
export const getAttendanceLectures = async (): Promise<AttendanceLecture[]> => {
  const res = await api.get<AttendanceLecture[]>("/api/lms/professor/attendance/lectures");
  return res.data;
};

/** GET 강의 1개의 출결 (헤더 + 요약 + 학생별 회차) */
export const getLectureAttendance = async (lecId: number): Promise<LectureAttendance> => {
  const res = await api.get<LectureAttendance>(`/api/lms/professor/attendance/lectures/${lecId}`);
  return res.data;
};

/**
 * PUT 학생 회차별 출결 저장 → 갱신된 학생 행 반환.
 * BE는 sessionId·status만 사용(date 무시) → 최소 payload 전송.
 */
export const updateStudentAttendance = async (
  lecId: number,
  memberId: number,
  sessions: AttendanceSession[]
): Promise<AttendanceStudentRow> => {
  const body = { sessions: sessions.map((s) => ({ sessionId: s.sessionId, status: s.status })) };
  const res = await api.put<AttendanceStudentRow>(
    `/api/lms/professor/attendance/lectures/${lecId}/students/${memberId}`,
    body
  );
  return res.data;
};
