"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import StudentSubmissionPreviewDialog from "@/components/lms/StudentSubmissionPreviewDialog";
import StudentFeedbackDialog from "@/components/lms/StudentFeedbackDialog";
import { describeApiError } from "@/lib/lmsApiError";
import { getCommonCodeMap } from "@/lib/lmsCommonCode";
import { htmlToPlainText } from "@/lib/lmsSanitize";
import { getStudentAssignments } from "@/lib/lmsStudentAssignmentsApi";
import type {
  StudentAssignment,
  StudentAssignmentStatus,
  StudentAssignmentsResult,
  SemesterAssignments,
} from "@/types/lmsStudentAssignments";
import { useLmsStudentAssignmentStore } from "@/store/lms/lmsStudentAssignmentStore";

type StatusFilter = "all" | StudentAssignmentStatus;

// 필터 버튼 순서 — 키만 하드코딩(라벨은 sbmStatusMap 런타임 매핑, "all"은 "전체" 정적)
const STATUS_FILTER_KEYS: StatusFilter[] = ["all", "NSB", "SBM", "GRD"];

const STATUS_PILL: Record<StudentAssignmentStatus, string> = {
  NSB: "bg-rose-50 text-rose-600",
  SBM: "bg-amber-50 text-amber-700",
  GRD: "bg-emerald-50 text-emerald-700",
};

const ASSIGNMENT_PAGE_SIZE = 10;
const SEMESTER_PAGE_SIZE = 3;

const TERM_ORDER = ["SM1", "SMR", "SM2", "WNT"];
const selectClass =
  "h-9 shrink-0 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-100";

export default function StudentAssignmentsHistoryPage() {
  const router = useRouter();
  const [data, setData] = useState<StudentAssignmentsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [yearFilter, setYearFilter] = useState<number | "all">("all");
  const [termFilter, setTermFilter] = useState<string | "all">("all");
  const [semesterPage, setSemesterPage] = useState(0);

  const [fileTarget, setFileTarget] = useState<StudentAssignment | null>(null);
  const [feedbackTarget, setFeedbackTarget] = useState<StudentAssignment | null>(null);
  const setSubmittableCount = useLmsStudentAssignmentStore((s) => s.setSubmittableCount);

  // 라벨은 BE 공통코드 API로 런타임 매핑(코드→라벨 하드코딩 제거). 실패 시 {} → 코드 원본 표시.
  const [termMap, setTermMap] = useState<Record<string, string>>({});
  const [sbmStatusMap, setSbmStatusMap] = useState<Record<string, string>>({});
  useEffect(() => {
    void Promise.all([
      getCommonCodeMap("SEM_TERM"),
      getCommonCodeMap("LEC_ASN_SBM_STATUS"),
    ]).then(([term, sbm]) => {
      setTermMap(term);
      setSbmStatusMap(sbm);
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getStudentAssignments();
      setData(result);
      setSubmittableCount(
        result.semesters.reduce(
          (n, s) =>
            n + s.assignments.filter((a) => a.status === "NSB" && !a.overdue).length,
          0,
        ),
      );
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      setLoading(false);
    }
  }, [setSubmittableCount]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setSemesterPage(0);
  }, [statusFilter, yearFilter, termFilter]);

  const yearOptions = useMemo(
    () => (data ? [...new Set(data.semesters.map((s) => s.semYear))].sort((a, b) => b - a) : []),
    [data]
  );
  // 데이터 유무와 무관하게 항상 4학기 노출(달력순 고정 전체목록)
  const termOptions = TERM_ORDER;

  const visibleSemesters = useMemo(() => {
    if (!data) return [];
    return data.semesters
      .filter(
        (sem) =>
          (yearFilter === "all" || sem.semYear === yearFilter) &&
          (termFilter === "all" || sem.semTerm === termFilter)
      )
      .map((sem) => ({
        ...sem,
        assignments: sem.assignments.filter(
          (a) => statusFilter === "all" || a.status === statusFilter
        ),
      }))
      .filter((sem) => sem.assignments.length > 0);
  }, [data, statusFilter, yearFilter, termFilter]);

  const totalSemesterPages = Math.max(1, Math.ceil(visibleSemesters.length / SEMESTER_PAGE_SIZE));
  const safeSemesterPage = Math.min(semesterPage, totalSemesterPages - 1);
  const semesterStartIndex = safeSemesterPage * SEMESTER_PAGE_SIZE;
  const pagedVisibleSemesters = visibleSemesters.slice(
    semesterStartIndex,
    semesterStartIndex + SEMESTER_PAGE_SIZE
  );

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
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-slate-800">과제 내역</h1>
          <p className="mt-1 text-sm text-slate-500">미제출 {unsubmittedCount}건</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <select
            value={yearFilter === "all" ? "" : String(yearFilter)}
            onChange={(e) => setYearFilter(e.target.value === "" ? "all" : Number(e.target.value))}
            disabled={loading || !data}
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
            disabled={loading || !data}
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

      <div className="mb-5 flex flex-wrap items-center justify-start gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_FILTER_KEYS.map((key) => {
            const active = statusFilter === key;
            // "all"은 "전체" 정적, 나머지는 sbmStatusMap[code] ?? code(런타임 라벨)
            const label = key === "all" ? "전체" : sbmStatusMap[key] ?? key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setStatusFilter(key)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-emerald-700 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">과제 내역을 불러오지 못했습니다.</p>
          <p className="mt-1 text-xs text-rose-500">{error}</p>
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
      ) : visibleSemesters.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-400">조건에 맞는 과제가 없습니다.</p>
      ) : (
        <div className="space-y-4">
          <SemesterPager
            page={safeSemesterPage}
            totalPages={totalSemesterPages}
            totalItems={visibleSemesters.length}
            startIndex={semesterStartIndex}
            visibleCount={pagedVisibleSemesters.length}
            onChange={setSemesterPage}
          />

          <div className="space-y-6">
            {pagedVisibleSemesters.map((sem) => (
              <SemesterAssignmentTable
                key={`${sem.semYear}-${sem.semTerm}-${statusFilter}`}
                sem={sem}
                sbmStatusMap={sbmStatusMap}
                onViewFile={setFileTarget}
                onViewFeedback={setFeedbackTarget}
                onSubmit={(assignment) =>
                  router.push(`/lms/student/assignments/submit?assignmentId=${assignment.id}`)
                }
              />
            ))}
          </div>

          <SemesterPager
            page={safeSemesterPage}
            totalPages={totalSemesterPages}
            totalItems={visibleSemesters.length}
            startIndex={semesterStartIndex}
            visibleCount={pagedVisibleSemesters.length}
            onChange={setSemesterPage}
          />
        </div>
      )}

      {/* SLM-004-01 제출 파일 미리보기 / SLM-004-02 피드백 보기 */}
      <StudentSubmissionPreviewDialog
        open={!!fileTarget}
        assignment={fileTarget}
        onClose={() => setFileTarget(null)}
        onSaved={() => load()}
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

// 학기 과제 테이블 — 학기별 독립 클라이언트 페이지네이션, 페이지당 ASSIGNMENT_PAGE_SIZE건
function SemesterAssignmentTable({
  sem,
  sbmStatusMap,
  onViewFile,
  onViewFeedback,
  onSubmit,
}: {
  sem: SemesterAssignments;
  sbmStatusMap: Record<string, string>;
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
  // 여러 페이지일 때만 마지막 페이지 높이를 맞춘다. 한 페이지짜리 필터는 빈 행 공백을 만들지 않는다.
  const padCount = totalPages > 1 ? ASSIGNMENT_PAGE_SIZE - pageRows.length : 0;

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
          {pageRows.map((a) => {
            const contentText = a.lecAsnContent?.trim() ? htmlToPlainText(a.lecAsnContent) : "";
            return (
              <tr key={a.id} className="border-b border-slate-50 last:border-0">
                <td className="px-5 py-3">
                  <span className="block truncate text-slate-600" title={a.courseName}>
                    {a.courseName}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-400">
                    {a.lecSection != null ? `${a.lecSection}반` : "-"}
                  </span>
                </td>
                <td className="px-2 py-3">
                  <span className="block truncate font-semibold text-slate-800" title={a.lecAsnTitle}>
                    {a.lecAsnTitle}
                  </span>
                  {contentText && (
                    <span className="mt-0.5 block truncate text-xs text-slate-400" title={contentText}>
                      {contentText}
                    </span>
                  )}
                </td>
                <td className="px-2 py-3 font-mono text-xs text-slate-600">
                  {a.lecAsnDueDate}
                </td>
                <td className="px-2 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_PILL[a.status]}`}
                  >
                    {sbmStatusMap[a.status] ?? a.status}
                  </span>
                </td>
                <td className="px-2 py-3">
                  {a.status === "GRD" && a.asnSbmEvlScore != null ? (
                    <span className="font-semibold text-slate-900">
                      {a.asnSbmEvlScore} <span className="text-slate-400">/ {a.maxScore}</span>
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
            );
          })}
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
  onChange: (p: number) => void;
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
