"use client";

// SLM-010 학생 캘린더 — 수강 강의 일정 + 과제 마감 자동 연동 월별 캘린더
// BE 실연동: GET /api/lms/student/calendar?from=&to= (lmsStudentCalendarApi.getStudentCalendar). 그리드=학생 전용 StudentCalendar(교수와 소유경계 분리).
// 색상 = 학생 에메랄드 계열(§13). 월 이동 시 해당 월 범위로 재조회.
import { useCallback, useEffect, useState } from "react";
import StudentCalendar, { type CalendarTheme } from "@/components/lms/StudentCalendar";
import { getStudentCalendar } from "@/lib/lmsStudentCalendarApi";
import type { CalendarEvent } from "@/types/lmsStudentCalendar";

// 학생 = 에메랄드(강의) + 오렌지(과제 마감) — 설계서 SLM-010 그대로
const THEME: CalendarTheme = {
  lectureDot: "bg-emerald-600",
  lectureChip: "bg-emerald-50 text-emerald-700",
  assignmentDot: "bg-orange-500",
  assignmentChip: "bg-orange-50 text-orange-700",
  today: "bg-emerald-700",
  navFocus: "focus:ring-emerald-500",
};

const pad = (n: number) => String(n).padStart(2, "0");

export default function StudentCalendarPage() {
  const now = new Date();
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    const from = `${view.year}-${pad(view.month)}-01`;
    const lastDay = new Date(view.year, view.month, 0).getDate();
    const to = `${view.year}-${pad(view.month)}-${pad(lastDay)}`;
    let alive = true;
    getStudentCalendar({ from, to })
      .then((d) => alive && setEvents(d))
      .catch(() => alive && setError(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [view]);

  useEffect(() => load(), [load]);

  // 월 이동 (연도 넘어감 처리)
  const move = (delta: number) =>
    setView((p) => {
      const m = p.month - 1 + delta;
      return { year: p.year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 + 1 };
    });

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <header className="mb-4">
        <h1 className="text-xl font-bold text-slate-800">캘린더</h1>
        <p className="mt-1 text-sm text-slate-500">
          과제 마감일과 강의 일정이 자동 연동된 월별 캘린더입니다.
        </p>
      </header>

      {error ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">캘린더를 불러오지 못했습니다.</p>
          <button
            type="button"
            onClick={load}
            className="mt-3 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
          >
            다시 시도
          </button>
        </div>
      ) : (
        <StudentCalendar
          year={view.year}
          month={view.month}
          events={events}
          theme={THEME}
          loading={loading}
          onPrev={() => move(-1)}
          onNext={() => move(1)}
        />
      )}
    </div>
  );
}
