"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { describeApiError } from "@/lib/lmsApiError";
import {
  getStudentDashboard,
  type DashboardSemesterOption,
  type GetStudentDashboardParams,
  type LectureTime,
  type StudentAssignmentStatus,
  type StudentDashboard,
} from "@/lib/lmsStudentDashboardApi";

const attendanceColor = (rate: number) =>
  rate >= 95 ? "text-emerald-600" : rate >= 80 ? "text-amber-600" : "text-rose-600";

const DAY_LABEL: Record<string, string> = {
  MON: "월",
  TUE: "화",
  WED: "수",
  THU: "목",
  FRI: "금",
  SAT: "토",
  SUN: "일",
  월: "월",
  화: "화",
  수: "수",
  목: "목",
  금: "금",
  토: "토",
  일: "일",
};
const formatLectureTime = (t: LectureTime) => `${DAY_LABEL[t.dayCode] ?? t.dayCode} ${t.start}~${t.end}`;

const STATUS_BADGE: Record<StudentAssignmentStatus, { label: string; cls: string; dot: string }> = {
  NSB: { label: "미제출", cls: "text-rose-600", dot: "bg-rose-500" },
  SBM: { label: "제출", cls: "text-amber-600", dot: "bg-amber-500" },
  GRD: { label: "채점완료", cls: "text-emerald-600", dot: "bg-emerald-500" },
};

const TERM_LABEL: Record<string, string> = {
  SM1: "1학기",
  SMR: "여름 계절",
  SM2: "2학기",
  WNT: "겨울 계절",
};
const TERM_ORDER = ["SM1", "SMR", "SM2", "WNT"];
const selectClass =
  "h-9 shrink-0 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-100";

const uniqueYears = (semesters: DashboardSemesterOption[]) =>
  [...new Set(semesters.map((semester) => semester.year))].sort((a, b) => b - a);

const termsForYear = (semesters: DashboardSemesterOption[], year: number | null) =>
  semesters
    .filter((semester) => year == null || semester.year === year)
    .map((semester) => semester.termCode)
    .filter((term, index, arr) => arr.indexOf(term) === index)
    .sort((a, b) => TERM_ORDER.indexOf(a) - TERM_ORDER.indexOf(b));

export default function StudentDashboardPage() {
  const [data, setData] = useState<StudentDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selYear, setSelYear] = useState<number | null>(null);
  const [selTerm, setSelTerm] = useState<string | null>(null);
  const [selectedLecId, setSelectedLecId] = useState<number | null>(null);

  const load = useCallback(
    async (params?: GetStudentDashboardParams, preferredLecId?: number | null) => {
      setLoading(true);
      setError(null);
      try {
        const dashboard = await getStudentDashboard(params);
        setData(dashboard);
        setSelYear(dashboard.year);
        setSelTerm(dashboard.termCode);
        setSelectedLecId((prev) => {
          const keep = preferredLecId ?? prev;
          return dashboard.courses.some((course) => course.lecId === keep)
            ? keep
            : dashboard.courses[0]?.lecId ?? null;
        });
      } catch (err) {
        setError(describeApiError(err));
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void load();
  }, [load]);

  const yearOptions = useMemo(() => uniqueYears(data?.availableSemesters ?? []), [data]);
  const termOptions = useMemo(
    () => termsForYear(data?.availableSemesters ?? [], selYear),
    [data, selYear]
  );

  const selectedCourse = data?.courses.find((course) => course.lecId === selectedLecId) ?? null;
  const courseAssignments = (data?.assignments ?? []).filter((assignment) => assignment.lecId === selectedLecId);
  const courseUnsubmitted = courseAssignments.filter((assignment) => assignment.status === "NSB").length;
  const courseGraded = courseAssignments.filter((assignment) => assignment.status === "GRD").length;

  const handleYearChange = (nextYear: number) => {
    const nextTerms = termsForYear(data?.availableSemesters ?? [], nextYear);
    const nextTerm = selTerm && nextTerms.includes(selTerm) ? selTerm : nextTerms[0] ?? null;
    setSelYear(nextYear);
    setSelTerm(nextTerm);
    void load({ year: nextYear, termCode: nextTerm }, selectedLecId);
  };

  const handleTermChange = (nextTerm: string) => {
    setSelTerm(nextTerm);
    void load({ year: selYear, termCode: nextTerm }, selectedLecId);
  };

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-slate-800">대시보드</h1>
          <p className="mt-1 text-sm text-slate-500">안녕하세요, {data?.studentName ?? "학생"}님</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <select
            value={selYear ?? ""}
            onChange={(e) => handleYearChange(Number(e.target.value))}
            disabled={loading || yearOptions.length === 0}
            className={`${selectClass} w-28`}
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}년
              </option>
            ))}
          </select>
          <select
            value={selTerm ?? ""}
            onChange={(e) => handleTermChange(e.target.value)}
            disabled={loading || termOptions.length === 0}
            className={`${selectClass} w-32`}
          >
            {termOptions.map((term) => (
              <option key={term} value={term}>
                {TERM_LABEL[term] ?? term}
              </option>
            ))}
          </select>
        </div>
      </header>

      {error ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">{error}</p>
          <button
            type="button"
            onClick={() => void load({ year: selYear, termCode: selTerm }, selectedLecId)}
            className="mt-3 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
          >
            다시 시도
          </button>
        </div>
      ) : loading || !data ? (
        <p className="py-16 text-center text-sm text-slate-400">불러오는 중...</p>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard value={data.stats.courseCount} unit="과목" label="수강 과목" />
            <StatCard value={data.stats.totalCredits} unit="학점" label="전체 학점" />
            <StatCard
              value={data.stats.avgAttendance}
              unit="%"
              label="평균 출석률"
              valueColor={attendanceColor(data.stats.avgAttendance)}
            />
            <StatCard value={courseUnsubmitted} unit="건" label="미제출 과제" accent />
            <StatCard value={courseGraded} unit="건" label="채점 완료" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-800">수강 중인 강의</h2>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                  {data.semesterLabel}
                </span>
              </div>
              {data.courses.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-400">수강 중인 강의가 없습니다.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.courses.map((course) => {
                    const active = course.lecId === selectedLecId;
                    return (
                      <li key={course.lecId}>
                        <button
                          type="button"
                          onClick={() => setSelectedLecId(course.lecId)}
                          aria-pressed={active}
                          className={`flex w-full items-center gap-3 px-2 py-3 text-left transition-colors ${
                            active ? "bg-emerald-50" : "hover:bg-slate-50"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-800">{course.courseName}</p>
                            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">
                                {course.credit}학점
                              </span>
                              <span className="truncate">{course.professor} 교수</span>
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {course.times.length > 0
                                ? course.times.map(formatLectureTime).join(" · ")
                                : "강의 시간이 등록되지 않았습니다."}
                            </p>
                          </div>
                          <span className={`shrink-0 text-sm font-bold ${attendanceColor(course.attendanceRate)}`}>
                            {course.attendanceRate}%
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-base font-bold text-slate-800">과제 현황</h2>
                {selectedCourse && (
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                    총 {courseAssignments.length}건
                  </span>
                )}
              </div>
              {courseAssignments.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-400">선택한 과목의 과제가 없습니다.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {courseAssignments.map((assignment) => {
                    const badge = STATUS_BADGE[assignment.status];
                    return (
                      <li key={assignment.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-800">{assignment.title}</p>
                          <p className="mt-0.5 text-xs text-slate-500">마감 {assignment.due}</p>
                        </div>
                        <span className={`flex shrink-0 items-center gap-1.5 text-xs font-semibold ${badge.cls}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                          {badge.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  value,
  unit,
  label,
  accent = false,
  valueColor,
}: {
  value: number;
  unit: string;
  label: string;
  accent?: boolean;
  valueColor?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className={`mb-3 h-2 w-10 rounded-full ${accent ? "bg-rose-100" : "bg-emerald-100"}`} />
      <p className="leading-none">
        <span className={`text-2xl font-bold ${valueColor ?? "text-slate-900"}`}>{value}</span>
        <span className="ml-0.5 text-xs text-slate-400">{unit}</span>
      </p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  );
}
