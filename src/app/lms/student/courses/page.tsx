"use client";

// SLM-003 수강 내역 — 학기별 수강 강의 목록 + 출석률·과제 현황
// 🧪 mock-first(§15): BE 연동 전 샘플 데이터. 색상 = 학생 에메랄드 계열(§13).
// - 년도·학기 분리 필터(기본 '전체 년도'/'전체 학기', §21) → 학기별 카드(최신순) 분리 표시
// - 열 순서: 과목명 → 학점 → 교수 → 강의 시간 → 출석률(바) → 과제(제출/전체)
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  getStudentCourses,
  type CourseRow,
  type SemesterCourses,
} from "@/lib/lmsStudentCoursesApi";

const TERM_LABEL: Record<string, string> = { SM1: "1학기", SMR: "여름 계절", SM2: "2학기", WNT: "겨울 계절" };
const TERM_ORDER = ["SM1", "SMR", "SM2", "WNT"];
// 학기 테이블 페이지네이션 — 한 페이지당 과목 수(목업 클라이언트 슬라이스). BE 연동 시 §21 서버 페이지네이션 전환 대상.
const COURSE_PAGE_SIZE = 5;
const selectClass =
  "h-9 shrink-0 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-100";

// 인수인계용 안내 박스의 테이블명 칩 스타일(모노스페이스)
const TBL_CLS =
  "rounded bg-white px-1 py-0.5 font-mono text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200";

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
      <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
        🧪 샘플 데이터(BE 연동 전) — 실제 수강 데이터가 아닙니다.
      </div>

      {/* 인수인계용 — 이 화면 구현에 필요한 BE 테이블(정본=CLAUDE-DB.md). BE 연동 후 이 박스 삭제. */}
      <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
        <p className="mb-1.5 font-semibold text-slate-700">🗄 BE 연동 테이블 (이 화면 구현 시 필요)</p>
        <ul className="space-y-1">
          <li>
            <code className={TBL_CLS}>SEMESTERS</code> — 학기(년도·학기, 진행 중 여부=SEM_STR/END_DATE)
          </li>
          <li>
            <code className={TBL_CLS}>LECTURE_STUDENT_ENROLLMENT</code> — 수강 강의(LMS_PRF_ID=학생, 상태 무관 전부)
          </li>
          <li>
            <code className={TBL_CLS}>LECTURE</code> + <code className={TBL_CLS}>LECTURE_CODE</code> — 강의 정보·과목명(LEC_COD_NAME)·학점(LEC_CREDIT)·분반
          </li>
          <li>
            <code className={TBL_CLS}>LMS_PROFILE</code> → <code className={TBL_CLS}>MEMBER</code> — 담당 교수명(LECTURE.LMS_PRF_ID)
          </li>
          <li>
            <code className={TBL_CLS}>LECTURE_TIME</code> — 강의 시간(요일 DAY_CODE·시각)
          </li>
        </ul>
        <p className="mt-1.5 text-[11px] text-slate-400">
          ※ 출석률은 출석 내역(SLM-005)·과제 현황은 과제 내역(SLM-004) 화면 소관 — 이 화면 비표시.
        </p>

        <p className="mt-3 mb-1.5 font-semibold text-slate-700">📐 구현 규칙</p>
        <ul className="space-y-1">
          <li>
            · <b>페이지네이션 = 서버 사이드</b>(§21/§9-11) — 클라가 전체 받아 <code className={TBL_CLS}>slice</code> 금지, 서버에 <code className={TBL_CLS}>page</code>(0-based)·<code className={TBL_CLS}>size</code> 전달해 1페이지만 수신. ⚠️ 단 <b>학기-중첩-과목 구조</b>라 학기별 분리 조회 등 BE 설계 재검토 필요(현 목업은 학기별 클라 slice).
          </li>
          <li>
            · <b>학기 테이블 = 페이지당 5건 고정</b>(<code className={TBL_CLS}>COURSE_PAGE_SIZE=5</code>) — 과목 수·페이지 무관 항상 5행(부족분 빈 행 패딩 → 카드 높이 고정), 페이저 상시 노출(1페이지면 ‹ › 비활성).
          </li>
          <li>
            · <b>년도·학기 분리 2필터</b>, 기본 둘 다 ‘전체 년도’/‘전체 학기’(§21). 필터는 학기 카드 자체를 거름(테이블 페이지네이션과 독립).
          </li>
          <li>
            · <b>수강 범위 = 신청한 전부</b> — 학생의 <code className={TBL_CLS}>LECTURE_STUDENT_ENROLLMENT</code> 전체 표시(상태 필터 없음: 이수 CMP·수강중 ENR·철회 DRP·미이수 FAL). <b>폐강(CNCL) 강의도 포함</b>(폐강은 강의 상태일 뿐 수강 신청 이력은 남음). 철회(DRP)는 ‘철회’로 구분.
          </li>
          <li>
            · <b>표시 컬럼</b> = 과목명·<b>분반</b>(LEC_SECTION)·학점(LEC_CREDIT)·교수·강의 시간. (출석률·과제 컬럼은 제거 — 각 전용 화면 소관)
          </li>
          <li>
            · <b>학기 카드 = 최신순</b>(년도·학기 desc) 정렬. 코드값은 서버가 반환, 라벨(1학기 등)은 FE가 공통코드로 매핑.
          </li>
        </ul>
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
  // 학기 테이블별 독립 페이지네이션(목업 클라이언트 슬라이스) — 카드마다 자체 page 상태
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(sem.courses.length / COURSE_PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = sem.courses.slice(
    safePage * COURSE_PAGE_SIZE,
    safePage * COURSE_PAGE_SIZE + COURSE_PAGE_SIZE
  );
  // 테이블 높이 고정 — 과목 수·현재 페이지와 무관하게 항상 COURSE_PAGE_SIZE행(부족분은 빈 행으로 채움)
  const padCount = COURSE_PAGE_SIZE - pageRows.length;

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
            <th className="w-20 px-2 py-2.5 font-medium">분반</th>
            <th className="w-16 px-2 py-2.5 font-medium">학점</th>
            <th className="w-28 px-2 py-2.5 font-medium">교수</th>
            <th className="w-44 px-2 py-2.5 font-medium">강의 시간</th>
          </tr>
        </thead>
        <tbody>
          {pageRows.map((c) => (
            <CourseTableRow key={c.lecId} c={c} />
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

      {/* 학기 테이블 페이저 (과목이 한 페이지를 넘을 때만 노출) */}
      <CoursePager page={safePage} totalPages={totalPages} onChange={setPage} />
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
      {/* 분반(N반) — §21, 값 없으면 '-' */}
      <td className="px-2 py-3 text-slate-600">
        {c.lecSection != null ? `${c.lecSection}반` : "-"}
      </td>
      <td className="px-2 py-3 text-slate-600">{c.credit}</td>
      <td className="px-2 py-3 text-slate-600">{c.professor}</td>
      <td className="px-2 py-3 text-xs text-slate-500">{c.schedule}</td>
    </tr>
  );
}

// 학기 테이블 페이저 — 항상 노출(카드 높이 고정), 1페이지면 ‹ › 비활성. 에메랄드 학생 테마
function CoursePager({
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
