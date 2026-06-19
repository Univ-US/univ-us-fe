// src/types/lmsProfessorCalendar.ts
// PLM-010 교수 캘린더 — 타입 선언 (lib/lmsProfessorCalendarApi.ts에서 분리)

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
