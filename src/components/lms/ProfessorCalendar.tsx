"use client";

// ProfessorCalendar — PLM-010 교수 월별 캘린더 그리드 (학생 StudentCalendar와 소유경계 분리)
// - 강의 일정 + 과제 마감 이벤트를 날짜 셀에 표시. 색상만 역할 theme로 주입(슬레이트).
// - 한 셀의 정렬: 강의(빠른 시간순) 먼저 → 과제 마감 아래 (설계서 규칙)
// - 인접 월 날짜는 회색 비활성 + 이벤트 미표시 / 일요일 빨강·토요일 파랑 / 오늘 강조
// - 월 이동은 부모가 onPrev/onNext로 처리(데이터 재조회) — 그리드는 표시 전용
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/types/lmsProfessorCalendar";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// 캘린더 칩 이름(과목명/과제명) 길이 제한 — 좁은 셀 전용(lmsLectureName 20자보다 짧게).
// 초과 시 … 표기, 전체명은 칩 호버(title)로 노출. CSS truncate는 폭 기준 추가 안전망.
const CALENDAR_NAME_MAX = 10;
const truncateName = (name: string) =>
  name.length > CALENDAR_NAME_MAX ? `${name.slice(0, CALENDAR_NAME_MAX)}…` : name;

/** 역할별 색상 — 교수=슬레이트(§13 네이비 계열) */
export interface CalendarTheme {
  lectureDot: string; // 범례 점(강의)
  lectureChip: string; // 강의 일정 칩
  assignmentDot: string; // 범례 점(과제 마감)
  assignmentChip: string; // 과제 마감 칩
  today: string; // 오늘 날짜 강조 원
  navFocus: string; // 이전/다음 버튼 포커스 링
}

interface Props {
  year: number;
  month: number; // 1~12
  events: CalendarEvent[];
  theme: CalendarTheme;
  loading?: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export default function ProfessorCalendar({ year, month, events, theme, loading, onPrev, onNext }: Props) {
  // 그리드 셀 42칸: 해당 월 1일이 속한 주의 일요일부터 6주
  const gridStart = new Date(year, month - 1, 1 - new Date(year, month - 1, 1).getDay());
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });

  // 날짜별 이벤트 그룹 + 정렬(강의[시간 asc] → 과제 마감)
  const byDate = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const arr = byDate.get(e.date) ?? [];
    arr.push(e);
    byDate.set(e.date, arr);
  }
  for (const arr of byDate.values()) {
    arr.sort((a, b) => {
      if (a.type !== b.type) return a.type === "LECTURE" ? -1 : 1;
      return (a.time ?? "").localeCompare(b.time ?? "");
    });
  }

  const todayStr = ymd(new Date());
  const navBtn = cn(
    "flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2",
    theme.navFocus
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* 상단: 월 네비 + 범례 */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button type="button" onClick={onPrev} aria-label="이전 달" className={navBtn}>
            ‹
          </button>
          <span className="min-w-[110px] text-center text-lg font-bold text-slate-800">
            {year}년 {month}월
          </span>
          <button type="button" onClick={onNext} aria-label="다음 달" className={navBtn}>
            ›
          </button>
          {loading && <span className="ml-2 text-xs text-slate-400">불러오는 중…</span>}
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <i className={cn("h-2.5 w-2.5 rounded-sm", theme.lectureDot)} />강의 일정
          </span>
          <span className="flex items-center gap-1.5">
            <i className={cn("h-2.5 w-2.5 rounded-sm", theme.assignmentDot)} />과제 마감
          </span>
        </div>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 border-t border-slate-200 text-center text-xs font-medium">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={cn(
              "py-2",
              i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-slate-500"
            )}
          >
            {w}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7">
        {cells.map((d, i) => {
          const inMonth = d.getMonth() === month - 1;
          const dow = d.getDay();
          const dateStr = ymd(d);
          const isToday = dateStr === todayStr;
          const dayEvents = inMonth ? byDate.get(dateStr) ?? [] : [];
          return (
            <div
              key={i}
              className="min-h-[92px] border-b border-r border-slate-100 p-1.5 [&:nth-child(7n)]:border-r-0"
            >
              <span
                className={cn(
                  "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                  !inMonth
                    ? "text-slate-300"
                    : isToday
                      ? cn("font-bold text-white", theme.today)
                      : dow === 0
                        ? "text-red-500"
                        : dow === 6
                          ? "text-blue-500"
                          : "text-slate-600"
                )}
              >
                {d.getDate()}
              </span>

              {dayEvents.length > 0 && (
                <div className="mt-1 space-y-1">
                  {dayEvents.map((e, j) => {
                    const sec = e.lecSection != null ? ` ${e.lecSection}반` : "";
                    const nameLine = `${truncateName(e.title)}${sec}`; // 윗줄: 과목명(길이 제한) + 분반
                    // 아랫줄: 강의=시작~종료 / 과제=마감시각(시각 없으면 "마감")
                    const timeLine =
                      e.type === "LECTURE"
                        ? e.time
                          ? `${e.time}${e.endTime ? `~${e.endTime}` : ""}`
                          : ""
                        : e.time != null
                          ? e.time
                          : "마감";
                    return (
                      <div
                        key={j}
                        title={`${e.title}${sec}${timeLine ? ` ${timeLine}` : ""}`.trim()}
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[11px] leading-tight",
                          e.type === "LECTURE" ? theme.lectureChip : theme.assignmentChip
                        )}
                      >
                        <div className="truncate font-medium">{nameLine}</div>
                        {timeLine && (
                          <div className="truncate text-[10px] opacity-70">{timeLine}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
