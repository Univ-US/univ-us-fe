"use client";

// SLM-004 과제 내역 — 강의별 과제 제출 현황(미제출·제출·채점완료) + 점수·피드백
// 🧪 mock-first(§15): BE 연동 전 샘플 데이터. 색상 = 학생 에메랄드 계열(§13).
// - 상태 필터(전체/미제출/제출/채점완료) + 과목 드롭다운 / 학기별 섹션 분리
// - 미제출 → '제출하러 가기'(SLM-007 이동; 단 마감 경과 overdue 시 비활성 '마감됨') / 제출 → '수정'(SLM-004-01 편집 모달: 메모·첨부·업로드) / 채점완료 → '피드백'(SLM-004-02)
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import StudentSubmissionPreviewDialog from "@/components/lms/StudentSubmissionPreviewDialog";
import StudentFeedbackDialog from "@/components/lms/StudentFeedbackDialog";
import {
  getStudentAssignments,
  STUDENT_ASSIGNMENT_STATUS_LABEL,
  type StudentAssignment,
  type StudentAssignmentStatus,
  type StudentAssignmentsResult,
  type SemesterAssignments,
} from "@/lib/lmsStudentAssignmentsApi";

type StatusFilter = "all" | StudentAssignmentStatus;

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "NSB", label: "미제출" },
  { key: "SBM", label: "제출" },
  { key: "GRD", label: "채점완료" },
];

const STATUS_PILL: Record<StudentAssignmentStatus, string> = {
  NSB: "bg-rose-50 text-rose-600",
  SBM: "bg-amber-50 text-amber-700",
  GRD: "bg-emerald-50 text-emerald-700",
};

// 학기 테이블 페이지네이션 — 한 페이지당 과제 수(목업 클라이언트 슬라이스). BE 연동 시 §21 서버 페이지네이션 전환 대상.
const ASSIGNMENT_PAGE_SIZE = 10;

// 년도·학기 분리 필터(§21) — SLM-003 수강 내역·SLM-005 출석 내역과 동일
const TERM_LABEL: Record<string, string> = { SM1: "1학기", SMR: "여름 계절", SM2: "2학기", WNT: "겨울 계절" };
const TERM_ORDER = ["SM1", "SMR", "SM2", "WNT"];
const selectClass =
  "h-9 shrink-0 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-100";

// 인수인계용 안내 박스의 테이블명/코드 칩 스타일(모노스페이스)
const TBL_CLS =
  "rounded bg-white px-1 py-0.5 font-mono text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200";

export default function StudentAssignmentsHistoryPage() {
  const router = useRouter();
  const [data, setData] = useState<StudentAssignmentsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  // 년도·학기 분리 필터 — 기본 둘 다 '전체'(§21)
  const [yearFilter, setYearFilter] = useState<number | "all">("all");
  const [termFilter, setTermFilter] = useState<string | "all">("all");

  // 모달 대상(파일 보기 / 피드백 보기) — 제출은 모달이 아니라 SLM-007 페이지로 이동
  const [fileTarget, setFileTarget] = useState<StudentAssignment | null>(null);
  const [feedbackTarget, setFeedbackTarget] = useState<StudentAssignment | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    let alive = true;
    getStudentAssignments()
      .then((d) => alive && setData(d))
      .catch(() => alive && setError(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => load(), [load]);

  // 년도·학기 드롭다운 옵션(학기 목록에서 유도, §21)
  const yearOptions = useMemo(
    () => (data ? [...new Set(data.semesters.map((s) => s.year))].sort((a, b) => b - a) : []),
    [data]
  );
  const termOptions = useMemo(
    () =>
      data
        ? [...new Set(data.semesters.map((s) => s.termCode))].sort(
            (a, b) => TERM_ORDER.indexOf(a) - TERM_ORDER.indexOf(b)
          )
        : [],
    [data]
  );

  // 년도/학기로 학기 섹션을 거르고, 상태 필터로 학기 내 과제를 거른 뒤 빈 학기 제거
  const visibleSemesters = useMemo(() => {
    if (!data) return [];
    return data.semesters
      .filter(
        (sem) =>
          (yearFilter === "all" || sem.year === yearFilter) &&
          (termFilter === "all" || sem.termCode === termFilter)
      )
      .map((sem) => ({
        ...sem,
        assignments: sem.assignments.filter(
          (a) => statusFilter === "all" || a.status === statusFilter
        ),
      }))
      .filter((sem) => sem.assignments.length > 0);
  }, [data, statusFilter, yearFilter, termFilter]);

  // 미제출 총건수 — assignments의 status로 직접 계산(BE 집계 불필요). 필터 무관·사이드바 배지와 동일 의미.
  const unsubmittedCount = useMemo(
    () =>
      data
        ? data.semesters.reduce(
            (n, s) => n + s.assignments.filter((a) => a.status === "NSB").length,
            0
          )
        : 0,
    [data]
  );

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      {/* 헤더 */}
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-slate-800">과제 내역</h1>
          {/* 부제 = 미제출 총건수(필터 무관, 사이드바 배지와 동일 의미) — FE가 status로 계산(BE 집계 불필요) */}
          <p className="mt-1 text-sm text-slate-500">미제출 {unsubmittedCount}건</p>
        </div>
        {/* 년도·학기 드롭다운 — 헤더 오른쪽 끝(§21) */}
        <div className="flex shrink-0 items-center gap-2">
          <select
            value={yearFilter === "all" ? "" : String(yearFilter)}
            onChange={(e) => setYearFilter(e.target.value === "" ? "all" : Number(e.target.value))}
            disabled={loading || !data}
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
            disabled={loading || !data}
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
        🧪 샘플 데이터(BE 연동 전) — 실제 과제 데이터가 아닙니다.
      </div>

      {/* 인수인계용 — 이 화면 구현에 필요한 BE 테이블·규칙(정본=CLAUDE-DB.md/§21). BE 연동 후 이 박스 삭제. */}
      <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
        <p className="mb-1.5 font-semibold text-slate-700">🗄 BE 연동 테이블 (이 화면 구현 시 필요)</p>
        <ul className="space-y-1">
          <li>
            <code className={TBL_CLS}>SEMESTERS</code> — 학기(학기별 섹션 분리)
          </li>
          <li>
            <code className={TBL_CLS}>LECTURE_STUDENT_ENROLLMENT</code> → <code className={TBL_CLS}>LECTURE</code> + <code className={TBL_CLS}>LECTURE_CODE</code> — 수강 강의 범위·과목명(LEC_COD_NAME)·분반(LEC_SECTION)
          </li>
          <li>
            <code className={TBL_CLS}>LECTURE_ASSIGNMENT</code> — 과제명(LEC_ASN_TITLE)·내용(LEC_ASN_CONTENT)·마감일(LEC_ASN_DUE_DATE)
          </li>
          <li>
            <code className={TBL_CLS}>LECTURE_ASSIGNMENT_SUBMISSION</code> — 제출 상태(LEC_ASN_SBM_STATUS: NSB/SBM/GRD)·제출일시·메모
          </li>
          <li>
            <code className={TBL_CLS}>ASSIGNMENT_SUBMISSION_ATTACHMENT</code> — 제출 첨부(수정·다운로드·소프트삭제 ATT_VAL_STATUS=DEL)
          </li>
          <li>
            <code className={TBL_CLS}>ASSIGNMENT_SUBMISSION_EVALUATION</code> — 점수(ASN_SBM_EVL_SCORE)·피드백(ASN_SBM_EVL_FEEDBACK)
          </li>
          <li>
            <code className={TBL_CLS}>LMS_PROFILE</code> → <code className={TBL_CLS}>MEMBER</code> — 피드백 모달의 교수명
          </li>
        </ul>

        <p className="mt-3 mb-1.5 font-semibold text-slate-700">📐 구현 규칙 · 특이사항</p>
        <ul className="space-y-1">
          <li>
            · <b>페이지네이션 = 서버 사이드</b>(§21/§9-11) — 클라 <code className={TBL_CLS}>slice</code> 금지. ⚠️ 학기-중첩-과제 구조라 학기별 분리 조회 등 BE 설계 재검토(현 목업은 클라 slice).
          </li>
          <li>
            · <b>학기 테이블 = 페이지당 10건 고정</b>(<code className={TBL_CLS}>ASSIGNMENT_PAGE_SIZE=10</code>, 빈 행 패딩·페이저 상시). 상태 필터(미제출/제출/채점완료)=주 필터 + 년도/학기 분리 필터(기본 '전체').
          </li>
          <li>
            · <b>점수 = 채점완료(GRD)만 표기</b>, 제출(SBM)·미제출(NSB)은 <code className={TBL_CLS}>-</code>(DB에 점수 없음). 제출 판정 = status≠NSB.
          </li>
          <li>
            · <b>부제 '미제출 N건'</b> = FE가 status로 계산(BE 집계 불필요, 사이드바 배지와 동일 의미).
          </li>
          <li>
            · <b>'제출하러 가기' = SLM-007 과제 제출 페이지로 이동</b>(모달 아님).
          </li>
          <li>
            · <b>&apos;수정&apos; 모달(SLM-004-01) = 제출 메모 편집 + 기존 첨부 삭제(✕) + 새 파일 업로드 + 다운로드</b>. BE: 수정/재제출 = <code className={TBL_CLS}>LECTURE_ASSIGNMENT_SUBMISSION</code> UPDATE(메모·제출일시) + <code className={TBL_CLS}>ASSIGNMENT_SUBMISSION_ATTACHMENT</code> 추가/소프트삭제(ATT_VAL_STATUS=DEL). <b>마감 전까지만 수정</b>(서버 시각 기준) · 첨부 다운로드 인증(blob).
          </li>
          <li>
            · <b>피드백(SLM-004-02) = 점수 + 교수 피드백만</b>. 평가 항목/루브릭은 <b>미구현</b>(BE도 rubric 안 내려도 됨).
          </li>
          <li>
            · <b>미제출 + 마감일 경과(overdue) → &apos;제출하러 가기&apos; 비활성(&apos;마감됨&apos;)</b>. BE가 <b>서버 시각 기준</b> overdue 판정(<code className={TBL_CLS}>LEC_ASN_DUE_DATE</code> &lt; now, 또는 <code className={TBL_CLS}>LEC_ASN_VAL_STATUS</code> CLS/NOP) — 클라 시계 비신뢰.
          </li>
          <li>
            · 마감일 = 날짜만 표기(색상 강조 없음) · 학기 카드 최신순.
          </li>
        </ul>
      </div>

      {/* 툴바: 상태 필터 칩 — 좌측 원위치(년도/학기는 헤더 오른쪽으로 이동됨) */}
      <div className="mb-5 flex flex-wrap items-center justify-start gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_FILTERS.map((f) => {
            const active = statusFilter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setStatusFilter(f.key)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-emerald-700 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">과제 내역을 불러오지 못했습니다.</p>
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
      ) : visibleSemesters.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-400">조건에 맞는 과제가 없습니다.</p>
      ) : (
        <div className="space-y-6">
          {visibleSemesters.map((sem) => (
            // 상태 필터 변경 시 key가 바뀌어 페이지가 1로 리셋됨(년도/학기는 학기 섹션 자체를 거름)
            <SemesterAssignmentTable
              key={`${sem.year}-${sem.termCode}-${statusFilter}`}
              sem={sem}
              onViewFile={setFileTarget}
              onViewFeedback={setFeedbackTarget}
              // 미제출 '제출하러 가기' = 모달이 아니라 SLM-007 과제 제출 페이지로 이동
              onSubmit={() => router.push("/lms/student/assignments/submit")}
            />
          ))}
        </div>
      )}

      {/* SLM-004-01 제출 파일 미리보기 / SLM-004-02 피드백 보기 */}
      <StudentSubmissionPreviewDialog
        open={!!fileTarget}
        assignment={fileTarget}
        onClose={() => setFileTarget(null)}
      />
      <StudentFeedbackDialog
        open={!!feedbackTarget}
        assignment={feedbackTarget}
        onClose={() => setFeedbackTarget(null)}
      />
    </div>
  );
}

function RowAction({
  assignment,
  onViewFile,
  onViewFeedback,
  onSubmit,
}: {
  assignment: StudentAssignment;
  onViewFile: () => void;
  onViewFeedback: () => void;
  onSubmit: () => void;
}) {
  if (assignment.status === "NSB") {
    // 미제출 + 마감일 경과(overdue) → 제출 불가: 버튼 비활성('마감됨'). overdue는 BE가 서버 시각 기준으로 내려줌(클라 시계 비신뢰)
    if (assignment.overdue) {
      return (
        <button
          type="button"
          disabled
          title="제출 마감일이 지나 제출할 수 없습니다."
          className="inline-flex h-8 cursor-not-allowed items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-100 px-3 text-xs font-semibold text-slate-400"
        >
          🔒 마감됨
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={onSubmit}
        className="inline-flex h-8 items-center justify-center rounded-lg bg-emerald-700 px-3 text-xs font-semibold text-white hover:bg-emerald-800"
      >
        제출하러 가기 →
      </button>
    );
  }
  if (assignment.status === "SBM") {
    return (
      <button
        type="button"
        onClick={onViewFile}
        className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
      >
        ✏ 수정
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onViewFeedback}
      className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
    >
      💬 피드백
    </button>
  );
}

// 학기 과제 테이블 — 학기별 독립 클라이언트 페이지네이션(목업), 페이지당 ASSIGNMENT_PAGE_SIZE건
function SemesterAssignmentTable({
  sem,
  onViewFile,
  onViewFeedback,
  onSubmit,
}: {
  sem: SemesterAssignments;
  onViewFile: (a: StudentAssignment) => void;
  onViewFeedback: (a: StudentAssignment) => void;
  onSubmit: (a: StudentAssignment) => void;
}) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(sem.assignments.length / ASSIGNMENT_PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = sem.assignments.slice(
    safePage * ASSIGNMENT_PAGE_SIZE,
    safePage * ASSIGNMENT_PAGE_SIZE + ASSIGNMENT_PAGE_SIZE
  );
  // 영역 고정 — 과제 수·현재 페이지와 무관하게 항상 ASSIGNMENT_PAGE_SIZE행(부족분은 빈 행으로 채움)
  const padCount = ASSIGNMENT_PAGE_SIZE - pageRows.length;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
        <h2 className="text-base font-bold text-slate-800">{sem.semesterLabel}</h2>
        <span className="text-xs text-slate-400">{sem.assignments.length}건</span>
      </div>

      <table className="w-full table-fixed text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
            <th className="w-32 px-5 py-2.5 font-medium">과목</th>
            <th className="px-2 py-2.5 font-medium">과제명</th>
            <th className="w-28 px-2 py-2.5 font-medium">마감일</th>
            <th className="w-24 px-2 py-2.5 font-medium">상태</th>
            <th className="w-24 px-2 py-2.5 font-medium">점수</th>
            <th className="w-32 px-2 py-2.5 text-right font-medium">&nbsp;</th>
          </tr>
        </thead>
        <tbody>
          {pageRows.map((a) => (
            <tr key={a.id} className="border-b border-slate-50 last:border-0">
              <td className="px-5 py-3">
                <span className="block truncate text-slate-600" title={a.courseName}>
                  {a.courseName}
                </span>
                {/* 분반(N반) — §21, 값 없으면 '-' */}
                <span className="mt-0.5 block text-xs text-slate-400">
                  {a.lecSection != null ? `${a.lecSection}반` : "-"}
                </span>
              </td>
              <td className="px-2 py-3">
                <span className="block truncate font-semibold text-slate-800" title={a.title}>
                  {a.title}
                </span>
                {/* 과제 내용(LEC_ASN_CONTENT) 하단 표기 */}
                {a.content && (
                  <span className="mt-0.5 block truncate text-xs text-slate-400" title={a.content}>
                    {a.content}
                  </span>
                )}
              </td>
              <td className="px-2 py-3 font-mono text-xs text-slate-600">
                {a.dueDate}
              </td>
              <td className="px-2 py-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_PILL[a.status]}`}
                >
                  {STUDENT_ASSIGNMENT_STATUS_LABEL[a.status]}
                </span>
              </td>
              <td className="px-2 py-3">
                {/* 점수는 채점완료(GRD)일 때만 표기 — 제출(SBM)은 DB에 점수 없음 → 미제출과 동일하게 '-' */}
                {a.status === "GRD" && a.score != null ? (
                  <span className="font-semibold text-slate-900">
                    {a.score} <span className="text-slate-400">/ {a.maxScore}</span>
                  </span>
                ) : (
                  <span className="text-slate-300">-</span>
                )}
              </td>
              <td className="px-2 py-3 text-right">
                <RowAction
                  assignment={a}
                  onViewFile={() => onViewFile(a)}
                  onViewFeedback={() => onViewFeedback(a)}
                  onSubmit={() => onSubmit(a)}
                />
              </td>
            </tr>
          ))}
          {Array.from({ length: padCount }).map((_, i) => (
            <tr key={`pad-${i}`} aria-hidden className="border-b border-slate-50 last:border-0">
              <td colSpan={6} className="px-5 py-3">
                <span className="block h-8" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 학기 테이블 페이저 — 항상 노출, 1페이지면 ‹ › 비활성(에메랄드 학생 테마) */}
      <AssignmentPager page={safePage} totalPages={totalPages} onChange={setPage} />
    </section>
  );
}

function AssignmentPager({
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
