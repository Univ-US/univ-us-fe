// src/lib/lmsStudentCalendarApi.ts
// SLM-010 학생 캘린더 — 수강 강의 일정 + 과제 마감 통합 조회 (학생 전용, 자족)
// ─────────────────────────────────────────────────────────────
// ✅ BE 실연동 — GET /api/lms/student/calendar?from=&to=
// 응답 = CalendarEvent[] — BE가 from~to로 주간 강의(LECTURE_TIME) 날짜 전개(학기 SEM_STR/END 경계)+과제 마감(LEC_ASN_DUE_DATE) 합성.
//   강의=과목명+분반+시작~종료시각 / 과제=과제명+마감시각(분반·종료 null).
// ⚠️ 교수 캘린더(lmsProfessorCalendarApi.ts)와 동일 CalendarEvent 계약이되 '내 강의=수강(status!='DRP')' 술어만 다름 — 소유경계 분리로 자족 복제.
// ─────────────────────────────────────────────────────────────
import api from "@/lib/api";

export type CalendarEventType = "LECTURE" | "ASSIGNMENT";

/** 캘린더 이벤트 1건 (강의 일정 또는 과제 마감) */
export interface CalendarEvent {
  date: string; // "YYYY-MM-DD"
  type: CalendarEventType;
  title: string; // 강의=과목명 / 과제=과제명
  time: string | null; // "HH:mm" — 강의=시작 시각 / 과제=마감 시각
  endTime?: string | null; // "HH:mm" — 강의 종료 시각(강의 일정만; 과제=null). BE=LECTURE_TIME.LEC_TIM_END_TIME
  lecId: number; // 과목 식별(향후 클릭 연동용)
  lecSection?: number | null; // 분반 — 강의 일정만 "N반" 표시(과제 마감은 없음/null). BE=LECTURE.LEC_SECTION
}

export interface CalendarParams {
  from: string; // "YYYY-MM-DD" (포함)
  to: string; // "YYYY-MM-DD" (포함)
}

/** 학생 캘린더(SLM-010) — 수강 강의의 강의일정 + 과제마감. BE 실연동. */
export const getStudentCalendar = async (p: CalendarParams): Promise<CalendarEvent[]> => {
  const res = await api.get<CalendarEvent[]>("/api/lms/student/calendar", {
    params: { from: p.from, to: p.to },
  });
  return res.data;
};
