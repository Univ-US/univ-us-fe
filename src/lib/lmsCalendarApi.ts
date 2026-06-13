// src/lib/lmsCalendarApi.ts
// PLM-010 / SLM-010 LMS 캘린더 — 강의 일정 + 과제 마감 통합 조회 (교수·학생 공용)
// ─────────────────────────────────────────────────────────────
// 🧪 mock-first 단계(§15): BE 연동 전이라 명시적 샘플 데이터로 동작. 화면 상단 앰버 배너 표기.
// BE는 공통 구현 예정 — 두 역할의 캘린더는 구조가 동일하고 '내 강의 집합'만 다름
//   (교수=담당 LECTURE.LMS_PRF_ID / 학생=수강 LECTURE_STUDENT_ENROLLMENT, status != 'DRP').
//   · GET /api/lms/professor/calendar?from=&to=   (담당 강의의 강의일정 + 과제마감)
//   · GET /api/lms/student/calendar?from=&to=     (수강 강의의 강의일정 + 과제마감)
//   응답 = CalendarEvent[] — BE가 from~to 범위로 주간 반복 강의(LECTURE_TIME)를 날짜 전개하고
//   (학기 SEM_STR/END_DATE 경계 적용) 과제 마감(LEC_ASN_DUE_DATE)을 합쳐서 내려준다.
// ⚠️ 연동 시 mock 블록 제거 + axios 실호출(아래 시그니처 유지) + describeApiError 에러 표기.
// ─────────────────────────────────────────────────────────────

export type CalendarEventType = "LECTURE" | "ASSIGNMENT";

/** 캘린더 이벤트 1건 (강의 일정 또는 과제 마감) */
export interface CalendarEvent {
  date: string; // "YYYY-MM-DD"
  type: CalendarEventType;
  title: string; // 과목명(강의) / 과제 제목
  time: string | null; // "HH:mm" — 강의=시작 시각 / 과제 마감=null(설계서 미표시)
  lecId: number; // 과목 식별(향후 클릭 연동용)
}

export interface CalendarParams {
  from: string; // "YYYY-MM-DD" (포함)
  to: string; // "YYYY-MM-DD" (포함)
}

// ── mock 데이터 (설계서 PLM-010 / SLM-010 기준) ─────────────────
// 주간 강의 시간표 템플릿(요일 반복) + 과제 마감(고정일). dow: 0=일 … 6=토.
// BE 연동 시 이 블록과 buildEvents/delay 전부 삭제.
type WeeklySlot = { dow: number; title: string; time: string; lecId: number };
type DeadlineSlot = { date: string; title: string; lecId: number };

// 교수(이민준, 컴퓨터공학과) — 월 데이터구조 / 화 SW공학 / 수 데이터구조 / 목 SW공학·알고리즘특강
const PROF_WEEKLY: WeeklySlot[] = [
  { dow: 1, title: "데이터구조", time: "10:00", lecId: 1 },
  { dow: 2, title: "SW공학", time: "13:00", lecId: 2 },
  { dow: 3, title: "데이터구조", time: "10:00", lecId: 1 },
  { dow: 4, title: "SW공학", time: "14:00", lecId: 2 },
  { dow: 4, title: "알고리즘특강", time: "16:00", lecId: 3 },
];
const PROF_DEADLINES: DeadlineSlot[] = [
  { date: "2026-05-25", title: "알고리즘 과제", lecId: 3 },
  { date: "2026-05-28", title: "UML 과제", lecId: 2 },
];

// 학생(김하연, 컴퓨터공학과) — 월·수 데이터구조·DB / 목 운영체제 / 금 웹프로그래밍
const STU_WEEKLY: WeeklySlot[] = [
  { dow: 1, title: "데이터구조", time: "10:00", lecId: 1 },
  { dow: 1, title: "DB", time: "12:00", lecId: 4 },
  { dow: 3, title: "데이터구조", time: "10:00", lecId: 1 },
  { dow: 3, title: "DB", time: "12:00", lecId: 4 },
  { dow: 4, title: "운영체제", time: "13:00", lecId: 5 },
  { dow: 5, title: "웹프로그래밍", time: "15:00", lecId: 6 },
];
const STU_DEADLINES: DeadlineSlot[] = [
  { date: "2026-05-23", title: "SW공학 과제", lecId: 2 },
  { date: "2026-05-25", title: "알고리즘", lecId: 3 },
  { date: "2026-05-28", title: "UML", lecId: 2 },
  { date: "2026-05-30", title: "ERD", lecId: 4 },
];

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** 주간 시간표를 from~to 범위로 날짜 전개 + 범위 내 과제 마감을 합친다 (BE 전개 로직의 mock) */
function buildEvents(
  weekly: WeeklySlot[],
  deadlines: DeadlineSlot[],
  from: string,
  to: string
): CalendarEvent[] {
  const out: CalendarEvent[] = [];
  const end = new Date(`${to}T00:00:00`);
  for (let d = new Date(`${from}T00:00:00`); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = ymd(d);
    const dow = d.getDay();
    for (const w of weekly) {
      if (w.dow === dow) {
        out.push({ date: dateStr, type: "LECTURE", title: w.title, time: w.time, lecId: w.lecId });
      }
    }
  }
  for (const dl of deadlines) {
    if (dl.date >= from && dl.date <= to) {
      out.push({ date: dl.date, type: "ASSIGNMENT", title: dl.title, time: null, lecId: dl.lecId });
    }
  }
  return out;
}

const delay = <T,>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), 200));

// ── API 호출 (현재 mock — BE 연동 시 axios 실호출로 교체, 시그니처 유지) ──
/** 교수 캘린더 — 담당 강의의 강의일정 + 과제마감 */
export const getProfessorCalendar = (p: CalendarParams): Promise<CalendarEvent[]> =>
  delay(buildEvents(PROF_WEEKLY, PROF_DEADLINES, p.from, p.to));

/** 학생 캘린더 — 수강 강의의 강의일정 + 과제마감 */
export const getStudentCalendar = (p: CalendarParams): Promise<CalendarEvent[]> =>
  delay(buildEvents(STU_WEEKLY, STU_DEADLINES, p.from, p.to));
