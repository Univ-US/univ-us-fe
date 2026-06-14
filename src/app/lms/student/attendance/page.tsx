"use client";

// SLM-005 출석 내역 — 강의별 출석·지각·결석 현황 (지각·결석 수치 클릭 시 날짜 팝오버 = SLM-005-01)
// 🧪 mock-first(§15): BE 연동 전 샘플 데이터. 색상 = 학생 에메랄드 계열(§13).
// - 학기 드롭다운('전체' 기본) → 학기별 카드(최신순) 테이블
// - 지각·결석 수치(>0) 클릭 → 해당 날짜(YYYY-MM-DD) 팝오버 / 70% 미만 출석률 강조
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
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

// 인수인계용 안내 박스의 테이블명/코드 칩 스타일(모노스페이스)
const TBL_CLS =
  "rounded bg-white px-1 py-0.5 font-mono text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200";

// 출석률 색상 — ≥85 양호 / 70~84 주의 / <70 경고(강조)
const rateColor = (rate: number) =>
  rate >= 85 ? "text-emerald-600" : rate >= 70 ? "text-orange-600" : "text-rose-600";

// 학기 테이블 페이지네이션 — 한 페이지당 과목 수(목업 클라이언트 슬라이스). BE 연동 시 §21 서버 페이지네이션 전환 대상.
const ATTENDANCE_PAGE_SIZE = 5;

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
      <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
        🧪 샘플 데이터(BE 연동 전) — 실제 출결 데이터가 아닙니다.
      </div>

      {/* 인수인계용 — 이 화면 구현에 필요한 BE 테이블·규칙(정본=CLAUDE-DB.md/§21). BE 연동 후 이 박스 삭제. */}
      <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
        <p className="mb-1.5 font-semibold text-slate-700">🗄 BE 연동 테이블 (이 화면 구현 시 필요)</p>
        <ul className="space-y-1">
          <li>
            <code className={TBL_CLS}>SEMESTERS</code> — 학기(학기별 카드·진행 중 여부)
          </li>
          <li>
            <code className={TBL_CLS}>LECTURE_STUDENT_ENROLLMENT</code> → <code className={TBL_CLS}>LECTURE</code> + <code className={TBL_CLS}>LECTURE_CODE</code> — 수강 강의·과목명(LEC_COD_NAME)·분반(LEC_SECTION)·총 강의 횟수(LEC_TOT_CLASSES)
          </li>
          <li>
            <code className={TBL_CLS}>STUDENT_ENROLLMENT_ATTENDANCE</code> — 출결 기록(STD_ENR_ATD_STS_CODE: PRS출석/LAT지각/ABS결석/ELV조퇴/EXC공결)·기록일(STD_ENR_ATD_REG_DATE)
          </li>
        </ul>

        <p className="mt-3 mb-1.5 font-semibold text-slate-700">📐 구현 규칙 · 특이사항</p>
        <ul className="space-y-1">
          <li>
            · <b>출석률 = 출석(PRS) / 전체 출결기록</b>. 표는 <b>출석·지각·결석 3분류만</b> 표시 — ⚠️ <b>조퇴(ELV)·공결(EXC)은 화면 미표시</b>라 BE 집계 시 처리 방침(출석 산입/별도 표기) 결정 필요.
          </li>
          <li>
            · <b>총 강의 = </b><code className={TBL_CLS}>LECTURE.LEC_TOT_CLASSES</code>(예정 수업 횟수). 출결 기록 건수와 다를 수 있음(미진행 회차).
          </li>
          <li>
            · <b>SLM-005-01: 지각·결석 수치(&gt;0) 클릭 → 날짜(YYYY-MM-DD) 팝오버.</b> 날짜는 <code className={TBL_CLS}>STD_ENR_ATD_REG_DATE</code>. (교시는 표기 안 함 → 교시 컬럼/LECTURE_TIME 의존 없음)
          </li>
          <li>
            · <b>년도·학기 분리 2필터</b>, 기본 둘 다 '전체'(§21). <b>페이지네이션 = 학기별 독립</b>(페이지당 <code className={TBL_CLS}>ATTENDANCE_PAGE_SIZE=5</code>건, 빈 행 패딩으로 카드 높이 고정·페이저 상시) — 수강 내역(SLM-003)과 동형, BE 연동 시 §21 서버 페이지네이션 전환 대상.
          </li>
          <li>
            · <b>수강 범위 = 신청한 전부</b>(폐강 CNCL·철회 DRP 포함 — 수강 내역과 동일 정책) · 학기 카드 최신순.
          </li>
        </ul>
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
            <SemesterAttendanceTable
              key={keyOf(sem)}
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

// 학기 출결 테이블 — 학기별 독립 클라이언트 페이지네이션(목업), 페이지당 ATTENDANCE_PAGE_SIZE건
function SemesterAttendanceTable({
  sem,
  openPop,
  setOpenPop,
}: {
  sem: SemesterAttendance;
  openPop: string | null;
  setOpenPop: (v: string | null) => void;
}) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(sem.courses.length / ATTENDANCE_PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = sem.courses.slice(
    safePage * ATTENDANCE_PAGE_SIZE,
    safePage * ATTENDANCE_PAGE_SIZE + ATTENDANCE_PAGE_SIZE
  );
  // 영역 고정 — 과목 수·페이지 무관 항상 ATTENDANCE_PAGE_SIZE행(부족분 빈 행)
  const padCount = ATTENDANCE_PAGE_SIZE - pageRows.length;
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
            <th className="w-20 px-2 py-2.5 font-medium">분반</th>
            <th className="w-24 px-2 py-2.5 font-medium">총 강의</th>
            <th className="w-24 px-2 py-2.5 font-medium">출석</th>
            <th className="w-24 px-2 py-2.5 font-medium">지각</th>
            <th className="w-24 px-2 py-2.5 font-medium">결석</th>
            <th className="w-24 px-2 py-2.5 font-medium">출석률</th>
          </tr>
        </thead>
        <tbody>
          {pageRows.map((c) => (
            <tr key={c.lecId} className="border-b border-slate-50 last:border-0">
              <td className="px-5 py-3.5">
                <span className="block truncate font-semibold text-slate-800" title={c.courseName}>
                  {c.courseName}
                </span>
              </td>
              <td className="px-2 py-3.5 text-slate-600">{c.lecSection}반</td>
              <td className="px-2 py-3.5 text-slate-600">{c.totalSessions}회</td>
              <td className="px-2 py-3.5">
                <Count dot="bg-emerald-500" value={c.present} />
              </td>
              <td className="px-2 py-3.5">
                <ClickableCount
                  dot="bg-amber-500"
                  value={c.late}
                  open={openPop === `${c.lecId}-late`}
                  onToggle={() => setOpenPop(openPop === `${c.lecId}-late` ? null : `${c.lecId}-late`)}
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
        </tbody>
      </table>

      {/* 학기 테이블 페이저 — 항상 노출, 1페이지면 ‹ › 비활성(에메랄드 학생 테마) */}
      <AttendancePager page={safePage} totalPages={totalPages} onChange={goPage} />
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
        active ? "bg-emerald-700 text-white" : "text-slate-600 hover:bg-slate-100"
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
      {/* 클릭 가능 어포던스 = 테두리 칩 + ▾ 캐럿(클릭 불가한 '출석'은 평범한 텍스트라 한눈에 구분) */}
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
                <span className="font-mono">{r.date}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </span>
  );
}
