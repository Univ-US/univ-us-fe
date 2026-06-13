"use client";

// SLM-003 수강 내역 — 학기별 수강 강의 목록 + 출석률·과제 현황
// 🧪 mock-first(§15): BE 연동 전 샘플 데이터. 색상 = 학생 에메랄드 계열(§13).
// - 년도·학기 분리 필터(기본 '전체 년도'/'전체 학기', §21) → 학기별 카드(최신순) 분리 표시
// - 열 순서: 과목명 → 학점 → 교수 → 강의 시간 → 출석률(바) → 과제(제출/전체)
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getStudentCourses,
  type CourseRow,
  type SemesterCourses,
} from "@/lib/lmsStudentCoursesApi";

const TERM_LABEL: Record<string, string> = { SM1: "1학기", SMR: "여름 계절", SM2: "2학기", WNT: "겨울 계절" };
const TERM_ORDER = ["SM1", "SMR", "SM2", "WNT"];
const selectClass =
  "h-9 shrink-0 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-100";

// 출석률 바 색상 — ≥85 양호 / 70~84 주의 / <70 경고
const attBarColor = (rate: number) =>
  rate >= 85 ? "bg-emerald-600" : rate >= 70 ? "bg-orange-500" : "bg-rose-500";
const attTextColor = (rate: number) =>
  rate >= 85 ? "text-emerald-600" : rate >= 70 ? "text-orange-600" : "text-rose-600";

// 과제 제출 배지 색상 — 전부 제출 = 에메랄드 / 절반 미만 = 로즈 / 그 외 = 앰버
const assignmentBadge = (done: number, total: number) => {
  if (total === 0 || done >= total) return "bg-emerald-50 text-emerald-700";
  if (done / total < 0.5) return "bg-rose-50 text-rose-600";
  return "bg-amber-50 text-amber-700";
};

export default function StudentCoursesPage() {
  const [semesters, setSemesters] = useState<SemesterCourses[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // 년도·학기 분리 필터 — 기본 둘 다 '전체'(§21)
  const [yearFilter, setYearFilter] = useState<number | "all">("all");
  const [termFilter, setTermFilter] = useState<string | "all">("all");

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    let alive = true;
    getStudentCourses()
      .then((d) => alive && setSemesters(d))
      .catch(() => alive && setError(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => load(), [load]);

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

  // 년도 AND 학기 필터 (각각 '전체' 가능)
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
          <h1 className="text-2xl font-bold text-slate-800">수강 내역</h1>
          <p className="mt-1 text-sm text-slate-500">학기별 수강 강의 · 출석·과제 현황</p>
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
        🧪 샘플 데이터(BE 연동 전) — 실제 수강 데이터가 아닙니다.
      </div>

      {error ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">수강 내역을 불러오지 못했습니다.</p>
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
        <p className="py-16 text-center text-sm text-slate-400">표시할 수강 내역이 없습니다.</p>
      ) : (
        <div className="space-y-6">
          {visible.map((sem) => (
            <SemesterCard key={`${sem.year}-${sem.termCode}`} sem={sem} />
          ))}
        </div>
      )}
    </div>
  );
}

function SemesterCard({ sem }: { sem: SemesterCourses }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* 학기 헤더 */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-slate-800">{sem.semesterLabel}</h2>
          {sem.inProgress && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
              진행중
            </span>
          )}
        </div>
        <span className="text-xs text-slate-400">
          {sem.courseCount}과목 · 총 {sem.totalCredits}학점
        </span>
      </div>

      {/* 강의 테이블 */}
      <table className="w-full table-fixed text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
            <th className="px-5 py-2.5 font-medium">과목명</th>
            <th className="w-16 px-2 py-2.5 font-medium">학점</th>
            <th className="w-24 px-2 py-2.5 font-medium">교수</th>
            <th className="w-44 px-2 py-2.5 font-medium">강의 시간</th>
            <th className="w-40 px-2 py-2.5 font-medium">출석률</th>
            <th className="w-20 px-2 py-2.5 text-center font-medium">과제</th>
          </tr>
        </thead>
        <tbody>
          {sem.courses.map((c) => (
            <CourseTableRow key={c.lecId} c={c} />
          ))}
        </tbody>
      </table>
    </section>
  );
}

function CourseTableRow({ c }: { c: CourseRow }) {
  return (
    <tr className="border-b border-slate-50 last:border-0">
      <td className="px-5 py-3">
        <p className="truncate font-semibold text-slate-800" title={c.courseName}>
          {c.courseName}
        </p>
      </td>
      <td className="px-2 py-3 text-slate-600">{c.credit}</td>
      <td className="px-2 py-3 text-slate-600">{c.professor}</td>
      <td className="px-2 py-3 text-xs text-slate-500">{c.schedule}</td>
      <td className="px-2 py-3">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${attBarColor(c.attendanceRate)}`}
              style={{ width: `${c.attendanceRate}%` }}
            />
          </div>
          <span className={`text-xs font-bold ${attTextColor(c.attendanceRate)}`}>
            {c.attendanceRate}%
          </span>
        </div>
      </td>
      <td className="px-2 py-3 text-center">
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${assignmentBadge(
            c.submittedCount,
            c.totalAssignments
          )}`}
        >
          {c.submittedCount}/{c.totalAssignments}
        </span>
      </td>
    </tr>
  );
}
