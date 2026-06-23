"use client";

// SLM-004 과제 내역 — 학기별 카드(전 학기 표시) + 각 학기 테이블이 자체 서버 페이지네이션.
// /assignments/semesters?status= 로 카드 헤더(요약), 각 카드가 /assignments/semesters/{semId} 로 과제 페이지 서버 조회.
// 상태(전체/NSB/SBM/GRD)=서버 필터(요약·페이지 모두). 년도/학기=요약 카드 목록 좁힘.
// 배지(미제출 수)는 권위 카운트(store.loadSubmittableCount → /submittable/summary)에 위임 — 여기서 직접 계산 안 함.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import LmsSelectDropdown from "@/components/lms/LmsSelectDropdown";
import StudentSubmissionPreviewDialog from "@/components/lms/StudentSubmissionPreviewDialog";
import StudentFeedbackDialog from "@/components/lms/StudentFeedbackDialog";
import { describeApiError } from "@/lib/lmsApiError";
import { getCommonCodeList, getCommonCodeMap } from "@/lib/lmsCommonCode";
import { htmlToPlainText } from "@/lib/lmsSanitize";
import {
  getAssignmentSemesterSummaries,
  getSemesterAssignmentsPaged,
} from "@/lib/lmsStudentAssignmentsApi";
import type {
  StudentAssignment,
  StudentAssignmentStatus,
  AssignmentSemesterSummary,
} from "@/types/lmsStudentAssignments";
import { useLmsStudentAssignmentStore } from "@/store/lms/lmsStudentAssignmentStore";

type StatusFilter = "all" | StudentAssignmentStatus;

// 필터 버튼 순서 — 키만 하드코딩(라벨은 sbmStatusMap 런타임 매핑, "all"은 "전체" 정적)
const STATUS_FILTER_KEYS: StatusFilter[] = ["all", "NSB", "SBM", "GRD"];

const STATUS_PILL: Record<StudentAssignmentStatus, string> = {
  NSB: "bg-rose-50 text-rose-600",
  SBM: "bg-amber-50 text-amber-700",
  GRD: "bg-primary/5 text-primary",
};

const ASSIGNMENT_PAGE_SIZE = 10;

export default function StudentAssignmentsHistoryPage() {
  const router = useRouter();
  const [summaries, setSummaries] = useState<AssignmentSemesterSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0); // 제출 수정 후 각 카드 재조회

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [yearFilter, setYearFilter] = useState<number | "all">("all");
  const [termFilter, setTermFilter] = useState<string | "all">("all");
  const [unsubmittedCount, setUnsubmittedCount] = useState(0); // 헤더 "미제출 N건"(상태 무관 NSB 전체)

  const [fileTarget, setFileTarget] = useState<StudentAssignment | null>(null);
  const [feedbackTarget, setFeedbackTarget] = useState<StudentAssignment | null>(null);
  const loadSubmittableCount = useLmsStudentAssignmentStore((s) => s.loadSubmittableCount);

  // 라벨은 BE 공통코드 API로 런타임 매핑. 학기 순서/라벨은 SEM_TERM 한 번에서 둘 다 도출.
  const [termOrder, setTermOrder] = useState<string[]>([]);
  const [termMap, setTermMap] = useState<Record<string, string>>({});
  const [sbmStatusMap, setSbmStatusMap] = useState<Record<string, string>>({});
  useEffect(() => {
    void Promise.all([
      getCommonCodeList("SEM_TERM"),
      getCommonCodeMap("LEC_ASN_SBM_STATUS"),
    ]).then(([term, sbm]) => {
      setTermOrder(term.map((c) => c.codeVal));
      setTermMap(Object.fromEntries(term.map((c) => [c.codeVal, c.codeName])));
      setSbmStatusMap(sbm);
    });
  }, []);

  // 학기 요약 로드 (상태 필터 적용 — 매칭 과제 있는 학기만)
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSummaries(await getAssignmentSemesterSummaries(statusFilter));
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  // 헤더 미제출 카운트 (상태 필터 무관 — NSB 전체 합)
  const reloadUnsubmitted = useCallback(() => {
    void getAssignmentSemesterSummaries("NSB")
      .then((s) => setUnsubmittedCount(s.reduce((n, x) => n + x.assignmentCount, 0)))
      .catch(() => {});
  }, []);
  useEffect(() => {
    reloadUnsubmitted();
  }, [reloadUnsubmitted]);

  // 제출 수정/미제출 전환 후: 요약·미제출 수·각 카드·배지 갱신
  const handleSaved = useCallback(async () => {
    await load();
    reloadUnsubmitted();
    setReloadTick((t) => t + 1);
    void loadSubmittableCount();
  }, [load, reloadUnsubmitted, loadSubmittableCount]);

  const yearOptions = useMemo(
    () => [...new Set(summaries.map((s) => s.semYear))].sort((a, b) => b - a),
    [summaries],
  );
  const termOptions = termOrder;

  // 년도/학기로 표시할 학기 카드를 좁힘 (상태는 서버에서 이미 반영됨)
  const visibleSemesters = useMemo(
    () =>
      summaries.filter(
        (sem) =>
          (yearFilter === "all" || sem.semYear === yearFilter) &&
          (termFilter === "all" || sem.semTerm === termFilter),
      ),
    [summaries, yearFilter, termFilter],
  );

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-slate-800">과제 내역</h1>
          <p className="mt-1 text-sm text-slate-500">미제출 {unsubmittedCount}건</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <LmsSelectDropdown
            value={yearFilter === "all" ? "" : String(yearFilter)}
            onChange={(value) => setYearFilter(value === "" ? "all" : Number(value))}
            disabled={loading || summaries.length === 0}
            className="w-28"
            options={[
              { value: "", label: "전체 연도" },
              ...yearOptions.map((y) => ({ value: String(y), label: `${y}년` })),
            ]}
          />
          <LmsSelectDropdown
            value={termFilter === "all" ? "" : termFilter}
            onChange={(value) => setTermFilter(value === "" ? "all" : value)}
            disabled={loading || summaries.length === 0}
            className="w-32"
            options={[
              { value: "", label: "전체 학기" },
              ...termOptions.map((t) => ({ value: t, label: termMap[t] ?? t })),
            ]}
          />
        </div>
      </header>

      <div className="mb-5 flex flex-wrap items-center justify-start gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_FILTER_KEYS.map((key) => {
            const active = statusFilter === key;
            const label = key === "all" ? "전체" : sbmStatusMap[key] ?? key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setStatusFilter(key)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-primary text-white"
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
            className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
          >
            다시 시도
          </button>
        </div>
      ) : loading ? (
        <p className="py-16 text-center text-sm text-slate-400">불러오는 중...</p>
      ) : visibleSemesters.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-400">조건에 맞는 과제가 없습니다.</p>
      ) : (
        <div className="space-y-6">
          {visibleSemesters.map((sem) => (
            <SemesterAssignmentTable
              key={`${sem.semId}-${statusFilter}`}
              sem={sem}
              status={statusFilter}
              reloadTick={reloadTick}
              sbmStatusMap={sbmStatusMap}
              onViewFile={setFileTarget}
              onViewFeedback={setFeedbackTarget}
              onSubmit={(assignment) =>
                router.push(`/lms/student/assignments/submit?assignmentId=${assignment.id}`)
              }
            />
          ))}
        </div>
      )}

      {/* SLM-004-01 제출 파일 미리보기 / SLM-004-02 피드백 보기 */}
      <StudentSubmissionPreviewDialog
        open={!!fileTarget}
        assignment={fileTarget}
        onClose={() => setFileTarget(null)}
        onSaved={handleSaved}
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
    // 미제출 + 마감일 경과(overdue) → 제출 불가: 버튼 비활성('마감됨'). overdue는 BE가 서버 시각 기준으로 내려줌
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
        className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-3 text-xs font-semibold text-white hover:bg-primary/90"
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

// 학기 과제 테이블 — 헤더(요약) + 그 학기 과제를 서버 페이지네이션(자체 페이저, 페이지당 ASSIGNMENT_PAGE_SIZE건)
function SemesterAssignmentTable({
  sem,
  status,
  reloadTick,
  sbmStatusMap,
  onViewFile,
  onViewFeedback,
  onSubmit,
}: {
  sem: AssignmentSemesterSummary;
  status: StatusFilter;
  reloadTick: number;
  sbmStatusMap: Record<string, string>;
  onViewFile: (a: StudentAssignment) => void;
  onViewFeedback: (a: StudentAssignment) => void;
  onSubmit: (a: StudentAssignment) => void;
}) {
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  // 경쟁 요청 가드 (페이저 빠른 전환 시 stale 응답 무시)
  const reqIdRef = useRef(0);

  useEffect(() => {
    const reqId = ++reqIdRef.current;
    setLoading(true);
    getSemesterAssignmentsPaged({ semId: sem.semId, status, page, size: ASSIGNMENT_PAGE_SIZE })
      .then((data) => {
        if (reqId !== reqIdRef.current) return;
        setAssignments(data.content);
        setTotalPages(data.totalPages);
      })
      .catch(() => {
        /* 카드 단위 조회 실패 — 조용히 둠(상단 학기 목록은 정상) */
      })
      .finally(() => {
        if (reqId === reqIdRef.current) setLoading(false);
      });
  }, [sem.semId, status, page, reloadTick]);

  const totalPagesSafe = Math.max(1, totalPages);
  // 여러 페이지일 때만 마지막 페이지 높이를 맞춘다(빈 행). 한 페이지면 공백 없음.
  const padCount = totalPagesSafe > 1 ? ASSIGNMENT_PAGE_SIZE - assignments.length : 0;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
        <h2 className="text-base font-bold text-slate-800">{sem.semesterLabel}</h2>
        <span className="text-xs text-slate-400">{sem.assignmentCount}건</span>
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
          {loading && assignments.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-400">
                불러오는 중...
              </td>
            </tr>
          ) : (
            <>
              {assignments.map((a) => {
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
                    <td className="px-2 py-3 font-mono text-xs text-slate-600">{a.lecAsnDueDate}</td>
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
            </>
          )}
        </tbody>
      </table>

      {/* 학기 테이블 페이저 — 항상 노출, 1페이지면 ‹ › 비활성(에메랄드 학생 테마) */}
      <AssignmentPager page={page} totalPages={totalPagesSafe} onChange={setPage} />
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
        active ? "bg-primary text-white" : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}
