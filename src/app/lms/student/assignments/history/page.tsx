"use client";

// SLM-004 과제 내역 — 강의별 과제 제출 현황(미제출·제출·채점완료) + 점수·피드백
// 🧪 mock-first(§15): BE 연동 전 샘플 데이터. 색상 = 학생 에메랄드 계열(§13).
// - 상태 필터(전체/미제출/제출/채점완료) + 과목 드롭다운 / 학기별 섹션 분리
// - 미제출 → '제출하러 가기'(SLM-007 연결 예정) / 제출 → '파일 보기'(SLM-004-01) / 채점완료 → '피드백'(SLM-004-02)
// - 마감 임박(미제출) 날짜는 빨간색 강조
import { useCallback, useEffect, useMemo, useState } from "react";
import StudentSubmissionPreviewDialog from "@/components/lms/StudentSubmissionPreviewDialog";
import StudentFeedbackDialog from "@/components/lms/StudentFeedbackDialog";
import { LECTURE_NAME_MAX, truncateLectureName } from "@/lib/lmsLectureName"; // 드롭다운 강의명 20자(§21)
import {
  getStudentAssignments,
  STUDENT_ASSIGNMENT_STATUS_LABEL,
  type StudentAssignment,
  type StudentAssignmentStatus,
  type StudentAssignmentsResult,
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

export default function StudentAssignmentsHistoryPage() {
  const [data, setData] = useState<StudentAssignmentsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [courseFilter, setCourseFilter] = useState("all");

  // 모달 대상(파일 보기 / 피드백 보기)
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

  // 과목 드롭다운 옵션(전 과제에서 유도)
  const courseOptions = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    data.semesters.forEach((s) => s.assignments.forEach((a) => set.add(a.courseName)));
    return [...set];
  }, [data]);

  // 상태/과목 필터 적용 후 빈 학기 제거
  const visibleSemesters = useMemo(() => {
    if (!data) return [];
    return data.semesters
      .map((sem) => ({
        ...sem,
        assignments: sem.assignments.filter(
          (a) =>
            (statusFilter === "all" || a.status === statusFilter) &&
            (courseFilter === "all" || a.courseName === courseFilter)
        ),
      }))
      .filter((sem) => sem.assignments.length > 0);
  }, [data, statusFilter, courseFilter]);

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      {/* 헤더 */}
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-slate-800">과제 내역</h1>
          <p className="mt-1 text-sm text-slate-500">전체 {data?.totalCount ?? 0}건</p>
        </div>
        {data && (
          <div className="flex shrink-0 items-center gap-3 text-xs font-semibold">
            <span className="flex items-center gap-1 text-rose-600">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> 미제출 {data.counts.unsubmitted}건
            </span>
            <span className="flex items-center gap-1 text-amber-600">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> 제출 {data.counts.submitted}건
            </span>
            <span className="flex items-center gap-1 text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> 채점완료 {data.counts.graded}건
            </span>
          </div>
        )}
      </header>

      {/* mock 단계 안내 (§15) */}
      <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
        🧪 샘플 데이터(BE 연동 전) — 실제 과제 데이터가 아닙니다.
      </div>

      {/* 툴바: 상태 필터 칩 + 과목 드롭다운 */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
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
        <select
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
          disabled={loading || !data}
          className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-100"
        >
          <option value="all">전체 과목</option>
          {courseOptions.map((c) => (
            <option key={c} value={c} title={c.length > LECTURE_NAME_MAX ? c : undefined}>
              {truncateLectureName(c)}
            </option>
          ))}
        </select>
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
            <section
              key={`${sem.year}-${sem.termCode}`}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
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
                  {sem.assignments.map((a) => (
                    <tr key={a.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-5 py-3">
                        <span className="block truncate text-slate-600" title={a.courseName}>
                          {a.courseName}
                        </span>
                      </td>
                      <td className="px-2 py-3">
                        <span className="block truncate font-semibold text-slate-800" title={a.title}>
                          {a.title}
                        </span>
                      </td>
                      <td
                        className={`px-2 py-3 font-mono text-xs ${
                          a.status === "NSB" && a.urgent ? "font-bold text-rose-600" : "text-slate-600"
                        }`}
                      >
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
                        {a.status === "GRD" && a.score != null ? (
                          <span className="font-semibold text-slate-900">
                            {a.score} <span className="text-slate-400">/ {a.maxScore}</span>
                          </span>
                        ) : a.status === "SBM" ? (
                          <span className="text-xs text-slate-400">채점 중</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-2 py-3 text-right">
                        <RowAction
                          assignment={a}
                          onViewFile={() => setFileTarget(a)}
                          onViewFeedback={() => setFeedbackTarget(a)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
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
}: {
  assignment: StudentAssignment;
  onViewFile: () => void;
  onViewFeedback: () => void;
}) {
  if (assignment.status === "NSB") {
    return (
      <button
        type="button"
        onClick={() =>
          window.alert("과제 제출 화면(SLM-007)은 준비 중입니다. (BE 연동 전)")
        }
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
        👁 파일 보기
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
