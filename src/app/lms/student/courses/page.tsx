"use client";

// SLM-003 수강 내역 — 학기별 카드(전 학기 표시) + 각 학기 테이블이 자체 서버 페이지네이션.
// /courses/semesters 로 카드 헤더(요약) 렌더, 각 카드가 /courses/semesters/{semId} 로 과목 페이지를 서버 조회.
// 년도/학기 필터 = 요약 카드 목록을 좁힘(필터). ⚠️ 대시보드는 별 엔드포인트(getStudentCourses 전체) 사용.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getSemesterSummaries, getSemesterCoursesPaged } from "@/lib/lmsStudentCoursesApi";
import { getCommonCodeList } from "@/lib/lmsCommonCode";
import type { CourseRow, SemesterSummary } from "@/types/lmsStudentCourses";

const COURSE_PAGE_SIZE = 5;
const selectClass =
  "h-9 shrink-0 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-100";

export default function StudentCoursesPage() {
  const [summaries, setSummaries] = useState<SemesterSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [yearFilter, setYearFilter] = useState<number | "all">("all");
  const [termFilter, setTermFilter] = useState<string | "all">("all");
  const [termMap, setTermMap] = useState<Record<string, string>>({});
  const [termOrder, setTermOrder] = useState<string[]>([]);
  const [enrMap, setEnrMap] = useState<Record<string, string>>({});
  const [valMap, setValMap] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setSummaries(await getSemesterSummaries());
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
    void getCommonCodeList("SEM_TERM").then((list) => {
      setTermOrder(list.map((c) => c.codeVal));
      setTermMap(Object.fromEntries(list.map((c) => [c.codeVal, c.codeName])));
    });
    void getCommonCodeList("ENR_STS").then((list) =>
      setEnrMap(Object.fromEntries(list.map((c) => [c.codeVal, c.codeName]))),
    );
    void getCommonCodeList("LEC_VAL_STATUS").then((list) =>
      setValMap(Object.fromEntries(list.map((c) => [c.codeVal, c.codeName]))),
    );
  }, []);

  const yearOptions = useMemo(
    () => [...new Set(summaries.map((s) => s.semYear))].sort((a, b) => b - a),
    [summaries],
  );
  const termOptions = termOrder;

  // 년도/학기로 표시할 학기 카드를 좁힘 (전체/전체면 전 학기 표시)
  const visible = useMemo(
    () =>
      summaries.filter(
        (s) =>
          (yearFilter === "all" || s.semYear === yearFilter) &&
          (termFilter === "all" || s.semTerm === termFilter),
      ),
    [summaries, yearFilter, termFilter],
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
            disabled={loading || summaries.length === 0}
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
            disabled={loading || summaries.length === 0}
            className={`${selectClass} w-32`}
          >
            <option value="">전체 학기</option>
            {termOptions.map((t) => (
              <option key={t} value={t}>
                {termMap[t] ?? t}
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
        <div className="space-y-6">
          {visible.map((sem) => (
            <SemesterCard key={sem.semId} sem={sem} enrMap={enrMap} valMap={valMap} />
          ))}
        </div>
      )}
    </div>
  );
}

// 수강 상태(ENR_STS) / 강의 상태(LEC_VAL_STATUS) 배지 색 — 드랍·실패·폐강은 rose로 강조
const ENR_BADGE: Record<string, string> = {
  ENR: "bg-emerald-50 text-emerald-700",
  CMP: "bg-slate-100 text-slate-600",
  DRP: "bg-rose-50 text-rose-600",
  FAL: "bg-rose-50 text-rose-600",
};
const VAL_BADGE: Record<string, string> = {
  OPEN: "bg-sky-50 text-sky-700",
  PROG: "bg-emerald-50 text-emerald-700",
  CLSD: "bg-slate-100 text-slate-500",
  CNCL: "bg-rose-50 text-rose-600",
};

// 학기 카드 — 헤더(요약) + 그 학기 과목을 5건 단위 서버 페이지네이션(자체 페이저)
function SemesterCard({
  sem,
  enrMap,
  valMap,
}: {
  sem: SemesterSummary;
  enrMap: Record<string, string>;
  valMap: Record<string, string>;
}) {
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  // 경쟁 요청 가드 (페이저 빠른 전환 시 stale 응답 무시)
  const reqIdRef = useRef(0);

  useEffect(() => {
    const reqId = ++reqIdRef.current;
    setLoading(true);
    getSemesterCoursesPaged({ semId: sem.semId, page, size: COURSE_PAGE_SIZE })
      .then((data) => {
        if (reqId !== reqIdRef.current) return;
        setCourses(data.content);
        setTotalPages(data.totalPages);
      })
      .catch(() => {
        /* 카드 단위 조회 실패 — 조용히 둠(상단 학기 목록은 정상) */
      })
      .finally(() => {
        if (reqId === reqIdRef.current) setLoading(false);
      });
  }, [sem.semId, page]);

  const multiPage = totalPages > 1;
  // 다중 페이지일 때만 빈 행으로 높이 고정(페이지 이동 시 표 높이 안정)
  const padCount = multiPage ? COURSE_PAGE_SIZE - courses.length : 0;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="truncate text-base font-bold text-slate-800">{sem.semesterLabel}</h2>
          {sem.inProgress ? (
            <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
              진행중
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
              마감
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
            <th className="w-24 px-2 py-2.5 font-medium">수강 상태</th>
            <th className="w-24 px-2 py-2.5 font-medium">강의 상태</th>
            <th className="w-20 px-2 py-2.5 font-medium">분반</th>
            <th className="w-16 px-2 py-2.5 font-medium">학점</th>
            <th className="w-28 px-2 py-2.5 font-medium">교수</th>
            <th className="w-48 px-2 py-2.5 font-medium">강의 시간</th>
          </tr>
        </thead>
        <tbody>
          {loading && courses.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-5 py-8 text-center text-sm text-slate-400">
                불러오는 중...
              </td>
            </tr>
          ) : (
            <>
              {courses.map((course) => (
                <CourseTableRow key={course.lecId} course={course} enrMap={enrMap} valMap={valMap} />
              ))}
              {Array.from({ length: padCount }).map((_, i) => (
                <tr key={`pad-${i}`} aria-hidden className="border-b border-slate-50 last:border-0">
                  <td colSpan={7} className="px-5 py-3">
                    <span className="block h-5" />
                  </td>
                </tr>
              ))}
            </>
          )}
        </tbody>
      </table>

      {multiPage && <CoursePager page={page} totalPages={totalPages} onChange={setPage} />}
    </section>
  );
}

function CourseTableRow({
  course,
  enrMap,
  valMap,
}: {
  course: CourseRow;
  enrMap: Record<string, string>;
  valMap: Record<string, string>;
}) {
  return (
    <tr className="border-b border-slate-50 last:border-0">
      <td className="px-5 py-3">
        <p className="truncate font-semibold text-slate-800" title={course.courseName}>
          {course.courseName}
        </p>
      </td>
      <td className="px-2 py-3">
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            ENR_BADGE[course.lecStdEnrStatus] ?? "bg-slate-100 text-slate-500"
          }`}
        >
          {enrMap[course.lecStdEnrStatus] ?? course.lecStdEnrStatus ?? "-"}
        </span>
      </td>
      <td className="px-2 py-3">
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            VAL_BADGE[course.lecValStatus] ?? "bg-slate-100 text-slate-500"
          }`}
        >
          {valMap[course.lecValStatus] ?? course.lecValStatus ?? "-"}
        </span>
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
        ‹
      </PageBtn>
      {Array.from({ length: totalPages }).map((_, i) => (
        <PageBtn key={i} active={i === page} onClick={() => onChange(i)}>
          {i + 1}
        </PageBtn>
      ))}
      <PageBtn disabled={page === totalPages - 1} onClick={() => onChange(page + 1)}>
        ›
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
