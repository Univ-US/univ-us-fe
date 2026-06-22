"use client";

// SLM-005 출석 내역 — 학기별 카드(전 학기 표시) + 각 학기 테이블이 자체 서버 페이지네이션.
// /attendance/semesters 로 카드 헤더(요약), 각 카드가 /attendance/semesters/{semId} 로 과목 출결 페이지 서버 조회.
// 지각·결석 수치(>0) 클릭 → 해당 날짜 팝오버(SLM-005-01). 년도/학기=요약 카드 목록 좁힘.
// ⚠️ 대시보드는 별 엔드포인트(getStudentAttendance 전체) 사용.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { describeApiError } from "@/lib/lmsApiError";
import { getCommonCodeList } from "@/lib/lmsCommonCode";
import {
  getAttendanceSemesterSummaries,
  getSemesterAttendancePaged,
} from "@/lib/lmsStudentAttendanceApi";
import type {
  AttendanceCourse,
  AttendanceRecord,
  AttendanceSemesterSummary,
} from "@/types/lmsStudentAttendance";

const selectClass =
  "h-9 shrink-0 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:bg-slate-100";

// 출석률 색상 — ≥95 정상 / 80~94 경고 / <80 위험(강조)
const rateColor = (rate: number) =>
  rate >= 95 ? "text-primary" : rate >= 80 ? "text-orange-600" : "text-rose-600";

// 학기 테이블 페이지네이션 — 한 페이지당 과목 수.
const ATTENDANCE_PAGE_SIZE = 5;

export default function StudentAttendancePage() {
  const [summaries, setSummaries] = useState<AttendanceSemesterSummary[]>([]);
  const [termMap, setTermMap] = useState<Record<string, string>>({});
  const [termOrder, setTermOrder] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 년도·학기 분리 필터 — 기본 둘 다 '전체'
  const [yearFilter, setYearFilter] = useState<number | "all">("all");
  const [termFilter, setTermFilter] = useState<string | "all">("all");
  // 팝오버 키: `${lecId}-late` | `${lecId}-absent`
  const [openPop, setOpenPop] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    let alive = true;
    getAttendanceSemesterSummaries()
      .then((d) => alive && setSummaries(d))
      .catch((err) => alive && setError(describeApiError(err)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => load(), [load]);

  useEffect(() => {
    void getCommonCodeList("SEM_TERM").then((list) => {
      setTermOrder(list.map((c) => c.codeVal));
      setTermMap(Object.fromEntries(list.map((c) => [c.codeVal, c.codeName])));
    });
  }, []);

  useEffect(() => {
    setOpenPop(null);
  }, [yearFilter, termFilter]);

  const yearOptions = useMemo(
    () => [...new Set(summaries.map((s) => s.semYear))].sort((a, b) => b - a),
    [summaries],
  );
  const termOptions = termOrder;
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
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-slate-800">출석 내역</h1>
          <p className="mt-1 text-sm text-slate-500">학기별 출석·지각·결석 현황</p>
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
          <p className="text-sm text-slate-500">출석 내역을 불러오지 못했습니다.</p>
          <p className="mt-1 text-sm text-rose-500">{error}</p>
          <button
            type="button"
            onClick={() => {
              load();
            }}
            className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
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
            <SemesterAttendanceTable
              key={sem.semId}
              sem={sem}
              openPop={openPop}
              setOpenPop={setOpenPop}
            />
          ))}
        </div>
      )}

      {/* 팝오버 바깥 클릭 닫기 백드롭 */}
      {openPop && <div className="fixed inset-0 z-40" onClick={() => setOpenPop(null)} />}
    </div>
  );
}

// 학기 출결 테이블 — 헤더(요약) + 그 학기 과목 출결을 서버 페이지네이션(자체 페이저, 페이지당 ATTENDANCE_PAGE_SIZE건)
function SemesterAttendanceTable({
  sem,
  openPop,
  setOpenPop,
}: {
  sem: AttendanceSemesterSummary;
  openPop: string | null;
  setOpenPop: (v: string | null) => void;
}) {
  const [courses, setCourses] = useState<AttendanceCourse[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  // 경쟁 요청 가드 (페이저 빠른 전환 시 stale 응답 무시)
  const reqIdRef = useRef(0);

  useEffect(() => {
    const reqId = ++reqIdRef.current;
    setLoading(true);
    getSemesterAttendancePaged({ semId: sem.semId, page, size: ATTENDANCE_PAGE_SIZE })
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

  const totalPagesSafe = Math.max(1, totalPages);
  // 여러 페이지일 때만 마지막 페이지 높이를 맞춘다.
  const padCount = totalPagesSafe > 1 ? ATTENDANCE_PAGE_SIZE - courses.length : 0;
  // 페이지 이동 시 열린 팝오버 닫기
  const goPage = (p: number) => {
    setOpenPop(null);
    setPage(p);
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-slate-800">{sem.semesterLabel}</h2>
          {sem.inProgress && (
            <span className="rounded-full bg-primary/5 px-2 py-0.5 text-xs font-semibold text-primary">
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
            <th className="w-20 px-2 py-2.5 font-medium">분반</th>
            <th className="w-24 px-2 py-2.5 font-medium">총 강의</th>
            <th className="w-24 px-2 py-2.5 font-medium">출석</th>
            <th className="w-24 px-2 py-2.5 font-medium">지각</th>
            <th className="w-24 px-2 py-2.5 font-medium">결석</th>
            <th className="w-24 px-2 py-2.5 font-medium">출석률</th>
          </tr>
        </thead>
        <tbody>
          {loading && courses.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-5 py-8 text-center text-sm text-slate-400">
                불러오는 중…
              </td>
            </tr>
          ) : (
            <>
              {courses.map((c) => (
                <tr key={c.lecId} className="border-b border-slate-50 last:border-0">
                  <td className="px-5 py-3.5">
                    <span className="block truncate font-semibold text-slate-800" title={c.courseName}>
                      {c.courseName}
                    </span>
                  </td>
                  <td className="px-2 py-3.5 text-slate-600">{c.lecSection}반</td>
                  <td className="px-2 py-3.5 text-slate-600">{c.lecTotClasses}회</td>
                  <td className="px-2 py-3.5">
                    <Count dot="bg-primary" value={c.present} />
                  </td>
                  <td className="px-2 py-3.5">
                    <ClickableCount
                      dot="bg-amber-500"
                      value={c.late}
                      open={openPop === `${c.lecId}-late`}
                      onToggle={() =>
                        setOpenPop(openPop === `${c.lecId}-late` ? null : `${c.lecId}-late`)
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
                        setOpenPop(openPop === `${c.lecId}-absent` ? null : `${c.lecId}-absent`)
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
              {Array.from({ length: padCount }).map((_, i) => (
                <tr key={`pad-${i}`} aria-hidden className="border-b border-slate-50 last:border-0">
                  <td colSpan={7} className="px-5 py-3.5">
                    <span className="block h-6" />
                  </td>
                </tr>
              ))}
            </>
          )}
        </tbody>
      </table>

      {/* 학기 테이블 페이저 — 항상 노출, 1페이지면 ‹ › 비활성(에메랄드 학생 테마) */}
      <AttendancePager page={page} totalPages={totalPagesSafe} onChange={goPage} />
    </section>
  );
}

function AttendancePager({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
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
        active ? "bg-primary text-white" : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
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
      {/* 클릭 가능 어포던스 = 테두리 칩 + ▾ 캐럿 */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        title={`${label} 날짜 보기`}
        className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-sm font-semibold transition-colors ${
          open
            ? "border-slate-300 bg-slate-100 text-slate-900"
            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
        }`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        {value}
        <span className={`text-[10px] text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
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
                <span className="font-mono">{r.stdEnrAtdRegDate}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </span>
  );
}
