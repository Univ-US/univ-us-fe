"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { getStudentCourses } from "@/lib/lmsStudentCoursesApi";
import type { CourseRow, SemesterCourses } from "@/types/lmsStudentCourses";

const TERM_LABEL: Record<string, string> = {
  SM1: "1학기",
  SMR: "여름 계절",
  SM2: "2학기",
  WNT: "겨울 계절",
};
const TERM_ORDER = ["SM1", "SMR", "SM2", "WNT"];
const SEMESTER_PAGE_SIZE = 3;
const COURSE_PAGE_SIZE = 5;
const selectClass =
  "h-9 shrink-0 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-100";

export default function StudentCoursesPage() {
  const [semesters, setSemesters] = useState<SemesterCourses[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [yearFilter, setYearFilter] = useState<number | "all">("all");
  const [termFilter, setTermFilter] = useState<string | "all">("all");
  const [semesterPage, setSemesterPage] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await getStudentCourses();
      setSemesters(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setSemesterPage(0);
  }, [yearFilter, termFilter]);

  const yearOptions = useMemo(
    () => [...new Set(semesters.map((s) => s.semYear))].sort((a, b) => b - a),
    [semesters],
  );

  const termOptions = useMemo(
    () =>
      [...new Set(semesters.map((s) => s.semTerm))].sort(
        (a, b) => TERM_ORDER.indexOf(a) - TERM_ORDER.indexOf(b),
      ),
    [semesters],
  );

  const visible = useMemo(
    () =>
      semesters.filter(
        (s) =>
          (yearFilter === "all" || s.semYear === yearFilter) &&
          (termFilter === "all" || s.semTerm === termFilter),
      ),
    [semesters, yearFilter, termFilter],
  );

  const totalSemesterPages = Math.max(1, Math.ceil(visible.length / SEMESTER_PAGE_SIZE));
  const safeSemesterPage = Math.min(semesterPage, totalSemesterPages - 1);
  const semesterStartIndex = safeSemesterPage * SEMESTER_PAGE_SIZE;
  const pagedVisible = visible.slice(
    semesterStartIndex,
    semesterStartIndex + SEMESTER_PAGE_SIZE,
  );

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-slate-800">수강 내역</h1>
          <p className="mt-1 text-sm text-slate-500">학기별 수강 강의와 시간표를 확인하세요.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <select
            value={yearFilter === "all" ? "" : String(yearFilter)}
            onChange={(e) => setYearFilter(e.target.value === "" ? "all" : Number(e.target.value))}
            disabled={loading || semesters.length === 0}
            className={`${selectClass} w-28`}
          >
            <option value="">전체 연도</option>
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

      {error ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">수강 내역을 불러오지 못했습니다.</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-3 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
          >
            다시 시도
          </button>
        </div>
      ) : loading ? (
        <p className="py-16 text-center text-sm text-slate-400">불러오는 중...</p>
      ) : visible.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-400">표시할 수강 내역이 없습니다.</p>
      ) : (
        <div className="space-y-4">
          <SemesterPager
            page={safeSemesterPage}
            totalPages={totalSemesterPages}
            totalItems={visible.length}
            startIndex={semesterStartIndex}
            visibleCount={pagedVisible.length}
            onChange={setSemesterPage}
          />

          <div className="space-y-6">
            {pagedVisible.map((sem) => (
              <SemesterCard key={`${sem.semYear}-${sem.semTerm}`} sem={sem} />
            ))}
          </div>

          <SemesterPager
            page={safeSemesterPage}
            totalPages={totalSemesterPages}
            totalItems={visible.length}
            startIndex={semesterStartIndex}
            visibleCount={pagedVisible.length}
            onChange={setSemesterPage}
          />
        </div>
      )}
    </div>
  );
}

function SemesterPager({
  page,
  totalPages,
  totalItems,
  startIndex,
  visibleCount,
  onChange,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  visibleCount: number;
  onChange: (page: number) => void;
}) {
  const rangeStart = startIndex + 1;
  const rangeEnd = startIndex + visibleCount;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-medium text-slate-500">
        총 {totalItems}개 학기 중 {rangeStart}-{rangeEnd} 표시
      </p>
      <div className="flex items-center justify-center gap-1">
        <PageBtn disabled={page === 0} onClick={() => onChange(page - 1)}>
          이전
        </PageBtn>
        {Array.from({ length: totalPages }).map((_, i) => (
          <PageBtn key={i} active={i === page} onClick={() => onChange(i)}>
            {i + 1}
          </PageBtn>
        ))}
        <PageBtn disabled={page === totalPages - 1} onClick={() => onChange(page + 1)}>
          다음
        </PageBtn>
      </div>
    </div>
  );
}

function SemesterCard({ sem }: { sem: SemesterCourses }) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(sem.courses.length / COURSE_PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = sem.courses.slice(
    safePage * COURSE_PAGE_SIZE,
    safePage * COURSE_PAGE_SIZE + COURSE_PAGE_SIZE,
  );
  const padCount = COURSE_PAGE_SIZE - pageRows.length;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="truncate text-base font-bold text-slate-800">{sem.semesterLabel}</h2>
          {sem.inProgress && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
              진행중
            </span>
          )}
        </div>
        <span className="shrink-0 text-xs text-slate-400">
          {sem.courseCount}과목 · 총 {sem.totalCredits}학점
        </span>
      </div>

      <table className="w-full table-fixed text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
            <th className="px-5 py-2.5 font-medium">과목명</th>
            <th className="w-20 px-2 py-2.5 font-medium">분반</th>
            <th className="w-16 px-2 py-2.5 font-medium">학점</th>
            <th className="w-28 px-2 py-2.5 font-medium">교수</th>
            <th className="w-48 px-2 py-2.5 font-medium">강의 시간</th>
          </tr>
        </thead>
        <tbody>
          {pageRows.map((course) => (
            <CourseTableRow key={course.lecId} course={course} />
          ))}
          {Array.from({ length: padCount }).map((_, i) => (
            <tr key={`pad-${i}`} aria-hidden className="border-b border-slate-50 last:border-0">
              <td colSpan={5} className="px-5 py-3">
                <span className="block h-5" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <CoursePager page={safePage} totalPages={totalPages} onChange={setPage} />
    </section>
  );
}

function CourseTableRow({ course }: { course: CourseRow }) {
  return (
    <tr className="border-b border-slate-50 last:border-0">
      <td className="px-5 py-3">
        <p className="truncate font-semibold text-slate-800" title={course.courseName}>
          {course.courseName}
        </p>
      </td>
      <td className="px-2 py-3 text-slate-600">
        {course.lecSection != null ? `${course.lecSection}반` : "-"}
      </td>
      <td className="px-2 py-3 text-slate-600">{course.lecCredit}</td>
      <td className="px-2 py-3 text-slate-600">{course.professor}</td>
      <td className="px-2 py-3 text-xs text-slate-500">{course.schedule}</td>
    </tr>
  );
}

function CoursePager({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-1 border-t border-slate-100 px-5 py-2.5">
      <PageBtn disabled={page === 0} onClick={() => onChange(page - 1)}>
        이전
      </PageBtn>
      {Array.from({ length: totalPages }).map((_, i) => (
        <PageBtn key={i} active={i === page} onClick={() => onChange(i)}>
          {i + 1}
        </PageBtn>
      ))}
      <PageBtn disabled={page === totalPages - 1} onClick={() => onChange(page + 1)}>
        다음
      </PageBtn>
    </div>
  );
}

function PageBtn({
  children,
  active = false,
  disabled = false,
  onClick,
}: {
  children: ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex h-7 min-w-7 items-center justify-center rounded-md px-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? "bg-emerald-700 text-white" : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}
