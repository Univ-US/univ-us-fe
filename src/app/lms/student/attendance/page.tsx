"use client";

// SLM-005 출석 내역 — 강의별 출석·지각·결석 현황 (지각·결석 수치 클릭 시 날짜·교시 팝오버 = SLM-005-01)
// 🧪 mock-first(§15): BE 연동 전 샘플 데이터. 색상 = 학생 에메랄드 계열(§13).
// - 학기 드롭다운('전체' 기본) → 학기별 카드(최신순) 테이블
// - 지각·결석 수치(>0) 클릭 → 해당 날짜(YYYY-MM-DD)·교시 팝오버 / 70% 미만 출석률 강조
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getStudentAttendance,
  type AttendanceCourse,
  type AttendanceRecord,
  type SemesterAttendance,
} from "@/lib/lmsStudentAttendanceApi";

const TERM_LABEL: Record<string, string> = { SM1: "1학기", SMR: "여름 계절", SM2: "2학기", WNT: "겨울 계절" };
const TERM_ORDER = ["SM1", "SMR", "SM2", "WNT"];
const selectClass =
  "h-9 shrink-0 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-100";

// 출석률 색상 — ≥85 양호 / 70~84 주의 / <70 경고(강조)
const rateColor = (rate: number) =>
  rate >= 85 ? "text-emerald-600" : rate >= 70 ? "text-orange-600" : "text-rose-600";

export default function StudentAttendancePage() {
  const [semesters, setSemesters] = useState<SemesterAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // 년도·학기 분리 필터 — 기본 둘 다 '전체'(§21)
  const [yearFilter, setYearFilter] = useState<number | "all">("all");
  const [termFilter, setTermFilter] = useState<string | "all">("all");
  // 팝오버 키: `${lecId}-late` | `${lecId}-absent`
  const [openPop, setOpenPop] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    let alive = true;
    getStudentAttendance()
      .then((d) => alive && setSemesters(d))
      .catch(() => alive && setError(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => load(), [load]);

  const keyOf = (s: SemesterAttendance) => `${s.year}-${s.termCode}`;
  const yearOptions = useMemo(
    () => [...new Set(semesters.map((s) => s.year))].sort((a, b) => b - a),
    [semesters]
  );
  const termOptions = useMemo(
    () =>
      [...new Set(semesters.map((s) => s.termCode))].sort(
        (a, b) => TERM_ORDER.indexOf(a) - TERM_ORDER.indexOf(b)
      ),
    [semesters]
  );
  const visible = useMemo(
    () =>
      semesters.filter(
        (s) =>
          (yearFilter === "all" || s.year === yearFilter) &&
          (termFilter === "all" || s.termCode === termFilter)
      ),
    [semesters, yearFilter, termFilter]
  );

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      {/* 헤더 */}
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-slate-800">출석 내역</h1>
          <p className="mt-1 text-sm text-slate-500">학기별 출석·지각·결석 현황</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <select
            value={yearFilter === "all" ? "" : String(yearFilter)}
            onChange={(e) => setYearFilter(e.target.value === "" ? "all" : Number(e.target.value))}
            disabled={loading || semesters.length === 0}
            className={`${selectClass} w-28`}
          >
            <option value="">전체 년도</option>
            {yearOptions.map((y) => (
              <option key={y} value={String(y)}>
                {y}년
              </option>
            ))}
          </select>
          <select
            value={termFilter === "all" ? "" : termFilter}
            onChange={(e) => setTermFilter(e.target.value === "" ? "all" : e.target.value)}
            disabled={loading || semesters.length === 0}
            className={`${selectClass} w-32`}
          >
            <option value="">전체 학기</option>
            {termOptions.map((t) => (
              <option key={t} value={t}>
                {TERM_LABEL[t] ?? t}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* mock 단계 안내 (§15) */}
      <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
        🧪 샘플 데이터(BE 연동 전) — 실제 출결 데이터가 아닙니다.
      </div>

      {error ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">출석 내역을 불러오지 못했습니다.</p>
          <button
            type="button"
            onClick={load}
            className="mt-3 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
          >
            다시 시도
          </button>
        </div>
      ) : loading ? (
        <p className="py-16 text-center text-sm text-slate-400">불러오는 중…</p>
      ) : visible.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-400">표시할 출석 내역이 없습니다.</p>
      ) : (
        <div className="space-y-6">
          {visible.map((sem) => (
            <section
              key={keyOf(sem)}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-800">{sem.semesterLabel}</h2>
                  {sem.inProgress && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                      진행중
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400">{sem.courseCount}과목</span>
              </div>

              <table className="w-full table-fixed text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                    <th className="px-5 py-2.5 font-medium">과목명</th>
                    <th className="w-24 px-2 py-2.5 font-medium">총 강의</th>
                    <th className="w-24 px-2 py-2.5 font-medium">출석</th>
                    <th className="w-24 px-2 py-2.5 font-medium">지각</th>
                    <th className="w-24 px-2 py-2.5 font-medium">결석</th>
                    <th className="w-24 px-2 py-2.5 font-medium">출석률</th>
                  </tr>
                </thead>
                <tbody>
                  {sem.courses.map((c) => (
                    <tr key={c.lecId} className="border-b border-slate-50 last:border-0">
                      <td className="px-5 py-3.5">
                        <span className="block truncate font-semibold text-slate-800" title={c.courseName}>
                          {c.courseName}
                        </span>
                      </td>
                      <td className="px-2 py-3.5 text-slate-600">{c.totalSessions}회</td>
                      <td className="px-2 py-3.5">
                        <Count dot="bg-emerald-500" value={c.present} />
                      </td>
                      <td className="px-2 py-3.5">
                        <ClickableCount
                          dot="bg-amber-500"
                          value={c.late}
                          open={openPop === `${c.lecId}-late`}
                          onToggle={() =>
                            setOpenPop((p) => (p === `${c.lecId}-late` ? null : `${c.lecId}-late`))
                          }
                          course={c}
                          kind="late"
                        />
                      </td>
                      <td className="px-2 py-3.5">
                        <ClickableCount
                          dot="bg-rose-500"
                          value={c.absent}
                          open={openPop === `${c.lecId}-absent`}
                          onToggle={() =>
                            setOpenPop((p) =>
                              p === `${c.lecId}-absent` ? null : `${c.lecId}-absent`
                            )
                          }
                          course={c}
                          kind="absent"
                        />
                      </td>
                      <td className={`px-2 py-3.5 font-bold ${rateColor(c.attendanceRate)}`}>
                        {c.attendanceRate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* 안내 (SLM-005) */}
              <p className="flex items-center gap-1.5 border-t border-slate-100 px-5 py-3 text-xs text-slate-400">
                <span className="text-amber-500">⚠</span>
                지각·결석 수치를 클릭하면 해당 날짜(YYYY-MM-DD)·교시를 팝오버로 확인할 수 있습니다.
              </p>
            </section>
          ))}
        </div>
      )}

      {/* 팝오버 바깥 클릭 닫기 백드롭 */}
      {openPop && <div className="fixed inset-0 z-40" onClick={() => setOpenPop(null)} />}
    </div>
  );
}

// 클릭 불가(출석) 수치
function Count({ dot, value }: { dot: string; value: number }) {
  return (
    <span className="flex items-center gap-1.5 text-slate-700">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {value}
    </span>
  );
}

// 클릭 가능(지각·결석) 수치 + 팝오버(SLM-005-01)
function ClickableCount({
  dot,
  value,
  open,
  onToggle,
  course,
  kind,
}: {
  dot: string;
  value: number;
  open: boolean;
  onToggle: () => void;
  course: AttendanceCourse;
  kind: "late" | "absent";
}) {
  const records: AttendanceRecord[] = kind === "late" ? course.lateRecords : course.absentRecords;
  const label = kind === "late" ? "지각" : "결석";

  if (value === 0) {
    return (
      <span className="flex items-center gap-1.5 text-slate-400">
        <span className={`h-1.5 w-1.5 rounded-full ${dot} opacity-40`} />0
      </span>
    );
  }

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1.5 font-semibold text-slate-700 hover:text-slate-900 hover:underline"
      >
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        {value}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
          <p className="mb-2 text-xs font-semibold text-slate-700">
            {label} - {course.courseName} ({value}회)
          </p>
          <ul className="space-y-1.5">
            {records.map((r, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-slate-600">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
                <span className="font-mono">{r.date}</span>
                <span className="text-slate-400">· {r.period}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </span>
  );
}
