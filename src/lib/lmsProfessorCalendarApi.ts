// src/lib/lmsProfessorCalendarApi.ts
// PLM-010 교수 캘린더 — 담당 강의 일정 + 과제 마감 통합 조회 (교수 전용)
// ─────────────────────────────────────────────────────────────
// ✅ BE 실연동 — GET /api/lms/professor/calendar?from=&to=
// 응답 = CalendarEvent[] — BE가 from~to로 주간 강의(LECTURE_TIME) 날짜 전개(학기 SEM_STR/END 경계)+과제 마감(LEC_ASN_DUE_DATE) 합성.
//   강의=과목명+분반+시작~종료시각 / 과제=과제명+마감시각(분반·종료 null).
// ⚠️ 학생 캘린더(SLM-010)는 소유경계 분리로 별도 자족 파일(lmsStudentCalendarApi.ts) — 동일 CalendarEvent 계약, '내 강의=수강' 술어만 다름.
// ─────────────────────────────────────────────────────────────
import api from "@/lib/api";
import type { CalendarEvent, CalendarParams } from "@/types/lmsProfessorCalendar";

/** 교수 캘린더(PLM-010) — 담당 강의의 강의일정 + 과제마감. BE 실연동. */
export const getProfessorCalendar = async (p: CalendarParams): Promise<CalendarEvent[]> => {
  const res = await api.get<CalendarEvent[]>("/api/lms/professor/calendar", {
    params: { from: p.from, to: p.to },
  });
  return res.data;
};
