"use client";

// SLM-002 학생 대시보드 — 출석률 요약 통계 + 수강 중인 강의 + 최근 과제 현황
// 🧪 mock-first(§15): BE 연동 전 샘플 데이터. 색상 = 학생 에메랄드 계열(§13).
// - 통계 5종(수강 과목·전체 학점·평균 출석률·미제출·채점 완료)
// - 수강 중인 강의(학점·교수·시간·출석률) + 최근 과제 현황(상태 배지)
import { useCallback, useEffect, useState } from "react";
import {
  getStudentDashboard,
  type StudentAssignmentStatus,
  type StudentDashboard,
} from "@/lib/lmsStudentDashboardApi";

// 출석률 색상 — ≥85 양호(에메랄드) / 70~84 주의(앰버) / <70 경고(로즈)
const attendanceColor = (rate: number) =>
  rate >= 85 ? "text-emerald-600" : rate >= 70 ? "text-amber-600" : "text-rose-600";

// 수강 강의 점 색상 — 과목 순서별 팔레트(시각 구분용)
const DOT_PALETTE = ["bg-emerald-500", "bg-blue-500", "bg-orange-500", "bg-purple-500", "bg-teal-500"];

// 과제 상태 배지
const STATUS_BADGE: Record<StudentAssignmentStatus, { label: string; cls: string; dot: string }> = {
  NSB: { label: "미제출", cls: "text-rose-600", dot: "bg-rose-500" },
  SBM: { label: "제출", cls: "text-amber-600", dot: "bg-amber-500" },
  GRD: { label: "채점완료", cls: "text-emerald-600", dot: "bg-emerald-500" },
};

// 학기 드롭다운(§21 년도/학기 분리)
const TERM_LABEL: Record<string, string> = { SM1: "1학기", SMR: "여름 계절", SM2: "2학기", WNT: "겨울 계절" };
const TERM_OPTIONS = ["SM1", "SMR", "SM2", "WNT"];
const selectClass =
  "h-9 shrink-0 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-100";

export default function StudentDashboardPage() {
  const [data, setData] = useState<StudentDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // 년도·학기 분리 드롭다운 (데코 — 기본값=현재 학기, 실제 전환은 BE 연동 후)
  const [selYear, setSelYear] = useState<number | null>(null);
  const [selTerm, setSelTerm] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    let alive = true;
    getStudentDashboard()
      .then((d) => {
        if (!alive) return;
        setData(d);
        setSelYear(d.year);
        setSelTerm(d.termCode);
      })
      .catch(() => alive && setError(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => load(), [load]);

  // 년도 옵션 — 현재 학기 기준 최근 3개년 (데코)
  const yearOptions = data ? [data.year, data.year - 1, data.year - 2] : [];

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      {/* 헤더 */}
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-slate-800">대시보드</h1>
          {/* 부제 스코프 중복 금지(§21): 학기는 우측 드롭다운이 표시 → 인사말만 */}
          <p className="mt-1 text-sm text-slate-500">안녕하세요, {data?.studentName ?? "학생"}님</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/* 년도·학기 분리(§21) — 데코, 실제 학기 전환은 BE 연동 후 */}
          <select
            value={selYear ?? ""}
            onChange={(e) => setSelYear(Number(e.target.value))}
            disabled={loading || !data}
            className={`${selectClass} w-28`}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}년
              </option>
            ))}
          </select>
          <select
            value={selTerm ?? ""}
            onChange={(e) => setSelTerm(e.target.value)}
            disabled={loading || !data}
            className={`${selectClass} w-32`}
          >
            {TERM_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {TERM_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* mock 단계 안내 (§15) */}
      <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
        🧪 샘플 데이터(BE 연동 전) — 실제 수강·과제 데이터가 아닙니다.
      </div>

      {error ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">대시보드를 불러오지 못했습니다.</p>
          <button
            type="button"
            onClick={load}
            className="mt-3 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
          >
            다시 시도
          </button>
        </div>
      ) : loading || !data ? (
        <p className="py-16 text-center text-sm text-slate-400">불러오는 중…</p>
      ) : (
        <>
          {/* 통계 카드 5종 */}
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard icon="📖" value={data.stats.courseCount} unit="과목" label="수강 과목" />
            <StatCard icon="📋" value={data.stats.totalCredits} unit="학점" label="전체 학점" />
            <StatCard
              icon="％"
              value={data.stats.avgAttendance}
              unit="%"
              label="평균 출석률"
              tag={{ text: "양호", cls: "bg-emerald-50 text-emerald-600" }}
            />
            <StatCard
              icon="⚠️"
              value={data.stats.unsubmittedCount}
              unit="건"
              label="미제출 과제"
              accent
              tag={{ text: "제출 필요", cls: "bg-rose-50 text-rose-600" }}
            />
            <StatCard icon="✅" value={data.stats.gradedCount} unit="건" label="채점 완료" />
          </div>

          {/* 2열: 수강 중인 강의 / 최근 과제 현황 */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* 수강 중인 강의 */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-800">수강 중인 강의</h2>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                  {data.courses.length}과목
                </span>
              </div>
              <ul className="divide-y divide-slate-100">
                {data.courses.map((c, i) => (
                  <li key={c.lecId} className="flex items-center gap-3 py-3">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${DOT_PALETTE[i % DOT_PALETTE.length]}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">{c.courseName}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">
                          {c.credit}학점
                        </span>
                        <span className="truncate">
                          {c.professor} 교수 · {c.schedule}
                        </span>
                      </p>
                    </div>
                    <span className={`shrink-0 text-sm font-bold ${attendanceColor(c.attendanceRate)}`}>
                      {c.attendanceRate}%
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {/* 최근 과제 현황 */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="mb-3 text-base font-bold text-slate-800">최근 과제 현황</h2>
              <ul className="divide-y divide-slate-100">
                {data.recentAssignments.map((a) => {
                  const badge = STATUS_BADGE[a.status];
                  return (
                    <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">{a.title}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {a.courseName} · 마감 {a.due}
                        </p>
                      </div>
                      <span className={`flex shrink-0 items-center gap-1.5 text-xs font-semibold ${badge.cls}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                        {badge.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon,
  value,
  unit,
  label,
  tag,
  accent = false,
}: {
  icon: string;
  value: number;
  unit: string;
  label: string;
  tag?: { text: string; cls: string };
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-start justify-between">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-lg text-base ${
            accent ? "bg-rose-50" : "bg-emerald-50"
          }`}
        >
          {icon}
        </span>
        {tag && (
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tag.cls}`}>
            {tag.text}
          </span>
        )}
      </div>
      <p className="leading-none">
        <span className="text-2xl font-bold text-slate-900">{value}</span>
        <span className="ml-0.5 text-xs text-slate-400">{unit}</span>
      </p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  );
}
