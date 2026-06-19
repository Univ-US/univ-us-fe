// src/lib/lmsStudentCalendarApi.ts
// SLM-010 학생 캘린더 — 수강 강의 일정 + 과제 마감 통합 조회 (학생 전용, 자족)
// ─────────────────────────────────────────────────────────────
// ✅ BE 실연동 — GET /api/lms/student/calendar?from=&to=
// 응답 = CalendarEvent[] — BE가 from~to로 주간 강의(LECTURE_TIME) 날짜 전개(학기 SEM_STR/END 경계)+과제 마감(LEC_ASN_DUE_DATE) 합성.
//   강의=과목명+분반+시작~종료시각 / 과제=과제명+마감시각(분반·종료 null).
// ⚠️ 교수 캘린더(lmsProfessorCalendarApi.ts)와 동일 CalendarEvent 계약이되 '내 강의=수강(status!='DRP')' 술어만 다름 — 소유경계 분리로 자족 복제.
// ─────────────────────────────────────────────────────────────
import api from "@/lib/api";
import type { CalendarEvent, CalendarParams } from "@/types/lmsStudentCalendar";

/** 학생 캘린더(SLM-010) — 수강 강의의 강의일정 + 과제마감. BE 실연동. */
export const getStudentCalendar = async (p: CalendarParams): Promise<CalendarEvent[]> => {
  const res = await api.get<CalendarEvent[]>("/api/lms/student/calendar", {
    params: { from: p.from, to: p.to },
  });
  return res.data;
};
