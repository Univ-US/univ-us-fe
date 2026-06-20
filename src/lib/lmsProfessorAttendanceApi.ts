// src/lib/lmsProfessorAttendanceApi.ts
// PLM-008 교수 "출결 관리" — 강의별 학생 출석·지각·결석 조회 및 수정
// ─────────────────────────────────────────────────────────────
// BE 연동: /api/lms/professor/attendance/** (PROF 가드)
//   · GET   /lectures                                   → AttendanceLecture[] (학기/강의 드롭다운 + 수강생 수)
//   · GET   /lectures/{lecId}                            → LectureAttendance  (헤더 + 요약 + 학생별 회차)
//   · PUT   /lectures/{lecId}/students/{memberId}        → 회차별 상태 저장 후 갱신된 AttendanceStudentRow
//     body = { sessions: [{ sessionId, stdEnrAtdStsCode }] }  (stdEnrAtdRegDate는 BE 무시 — 최소 payload로 전송)
// 본체 = STUDENT_ENROLLMENT_ATTENDANCE(회차별 STD_ENR_ATD_STS_CODE) · LECTURE · LECTURE_STUDENT_ENROLLMENT.
// 회차 날짜 = STD_ENR_ATD_REG_DATE (전용 수업일 컬럼 없음).
// 상태 코드(ATTD_STS): PRS 출석 · LAT 지각 · ABS 결석 (ELV 조퇴·EXC 공결 = VAL_STATUS DEL 미사용).
// 실패 시 가짜 데이터로 가리지 않는다 — 페이지가 "에러 상태"를 표기(describeApiError).
// ─────────────────────────────────────────────────────────────
import api from "@/lib/api";
import type {
  AttendanceStatus,
  AttendanceSession,
  AttendanceStudentRow,
  AttendanceSummary,
  AttendanceLecture,
  LectureAttendance,
} from "@/types/lmsProfessorAttendance";
// 타입 선언은 @/types/lmsProfessorAttendance로 이동 — 기존 소비처 호환 위해 재노출
export type {
  AttendanceStatus,
  AttendanceSession,
  AttendanceStudentRow,
  AttendanceSummary,
  AttendanceLecture,
  LectureAttendance,
} from "@/types/lmsProfessorAttendance";

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
 *  색상 표준(교수 LMS): 정상 ≥95 · 경고 80~94 · 위험 <80 */
export const AT_RISK_THRESHOLD = 80;

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
  const present = sessions.filter((s) => s.stdEnrAtdStsCode === "PRS").length;
  const late = sessions.filter((s) => s.stdEnrAtdStsCode === "LAT").length;
  const absent = sessions.filter((s) => s.stdEnrAtdStsCode === "ABS").length;
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
 * BE는 sessionId·stdEnrAtdStsCode만 사용(stdEnrAtdRegDate 무시) → 최소 payload 전송.
 */
export const updateStudentAttendance = async (
  lecId: number,
  memberId: number,
  sessions: AttendanceSession[]
): Promise<AttendanceStudentRow> => {
  const body = { sessions: sessions.map((s) => ({ sessionId: s.sessionId, stdEnrAtdStsCode: s.stdEnrAtdStsCode })) };
  const res = await api.put<AttendanceStudentRow>(
    `/api/lms/professor/attendance/lectures/${lecId}/students/${memberId}`,
    body
  );
  return res.data;
};
