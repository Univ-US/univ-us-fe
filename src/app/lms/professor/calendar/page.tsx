"use client";

// PLM-010 교수 캘린더 — 담당 강의 일정 + 과제 마감 자동 연동 월별 캘린더
// ✅ BE 실연동: GET /api/lms/professor/calendar?from=&to= (lmsProfessorCalendarApi.getProfessorCalendar). 그리드=교수 전용 ProfessorCalendar(학생과 소유경계 분리).
// 색상 = 교수 슬레이트 계열(§13). 월 이동 시 해당 월 범위로 재조회.
import { useCallback, useEffect, useState } from "react";
import ProfessorCalendar, { type CalendarTheme } from "@/components/lms/ProfessorCalendar";
import { getProfessorCalendar } from "@/lib/lmsProfessorCalendarApi";
import type { CalendarEvent } from "@/types/lmsProfessorCalendar";

// 교수 = 슬레이트(강의) + 앰버(과제 마감) — §13 교수 화면 teal/green 금지(설계서 green은 슬레이트/앰버로 치환, PLM-005 선례)
const THEME: CalendarTheme = {
  lectureDot: "bg-slate-600",
  lectureChip: "bg-slate-100 text-slate-700",
  assignmentDot: "bg-amber-500",
  assignmentChip: "bg-amber-50 text-amber-700",
  today: "bg-slate-800",
  navFocus: "focus:ring-slate-500",
};

const pad = (n: number) => String(n).padStart(2, "0");

export default function ProfessorCalendarPage() {
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
    getProfessorCalendar({ from, to })
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
          담당 강의 일정과 과제 마감일이 자동 연동된 월별 캘린더입니다.
        </p>
      </header>

      {error ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">캘린더를 불러오지 못했습니다.</p>
          <button
            type="button"
            onClick={load}
            className="mt-3 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            다시 시도
          </button>
        </div>
      ) : (
        <ProfessorCalendar
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
