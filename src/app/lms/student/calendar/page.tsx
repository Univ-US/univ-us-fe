"use client";

// SLM-010 학생 캘린더 — 수강 강의 일정 + 과제 마감 자동 연동 월별 캘린더
// 🧪 mock-first(§15): BE 연동 전 샘플 데이터. 그리드는 공용 컴포넌트(LmsCalendar) — 교수 화면과 공유.
// 색상 = 학생 에메랄드 계열(§13). 월 이동 시 해당 월 범위로 재조회.
import { useCallback, useEffect, useState } from "react";
import LmsCalendar, { type CalendarTheme } from "@/components/lms/LmsCalendar";
import { getStudentCalendar, type CalendarEvent } from "@/lib/lmsCalendarApi";

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

      {/* mock 단계 안내 (§15 — BE 연동 전) */}
      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
        🧪 샘플 데이터(BE 연동 전) — 실제 강의·과제 데이터가 아닙니다.
      </div>

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
        <LmsCalendar
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
