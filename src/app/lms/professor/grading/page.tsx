"use client";

// PLM-004 — 교수 "채점 현황" (미채점/채점 과제 목록 + 점수·피드백 채점)
// - 상단: 학기 드롭다운(기본 '전체', SEM_TERM 라벨) + 미채점 배너(안내만)
//   · '전체'는 overview omit이 '최신 학기'만 주므로 학기별로 불러 합산(mergeGradingOverviews)
// - 미채점 과제 목록(마감일 순) → '채점하기' → 목록 바로 아래에 채점 상세(미채점 학생만)
// - 채점 과제 목록(채점완료)   → '채점 보기' → 목록 바로 아래에 채점 상세(채점완료 학생만)
// - 채점 상세(목록의 child 느낌으로 회색 배경): 학생별 제출일시·파일(보기)·점수·피드백
//   · 미채점 행 = 입력 가능 + '저장' · 채점완료 행 = 입력 잠금 + '완료' + '수정'(클릭 시 편집)
//   · 미제출 학생(submissionId=null) = 회색 행
// - '보기' → PLM-004-01 제출 파일 미리보기 모달(인증 다운로드)
// ⚠️ BE 공식 명세 연동(2026-06-10). 실패 시 가짜 데이터로 가리지 않고 describeApiError로 에러 표기.
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import SubmissionPreviewDialog from "@/components/lms/SubmissionPreviewDialog";
import {
  getGradingOverview,
  getGradingDetail,
  saveGrade,
  getCommonCodeMap,
  getSemesters,
  mergeGradingOverviews,
  gradingSemesterLabel,
  type GradingOverview,
  type GradingDetail,
  type Submission,
  type Semester,
} from "@/lib/lmsProfessorGradingApi";
import { describeApiError } from "@/lib/lmsApiError";
import { useLmsGradingStore } from "@/store/lms/lmsGradingStore";

type DetailKind = "ungraded" | "graded";

export default function ProfessorGradingPage() {
  const [overview, setOverview] = useState<GradingOverview | null>(null);
  const [termMap, setTermMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 학기 드롭다운 — 기본 '전체'. 특정 학기 선택 시 그 semesterId로 overview 조회.
  // ⚠️ overview는 semesterId 생략 시 '최신 학기'만 주므로, '전체'는 학기별로 불러 합산(mergeGradingOverviews).
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [selectedSemId, setSelectedSemId] = useState<number | "all">("all");

  const [detail, setDetail] = useState<GradingDetail | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedKind, setSelectedKind] = useState<DetailKind | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // 식별 키는 memberId (미제출 행은 submissionId=null이라 키로 못 씀)
  // 선택 시점 스냅샷(보여줄 제출 행 memberId) — 저장으로 graded가 바뀌어도 행이 사라지지 않게 고정
  const [visibleIds, setVisibleIds] = useState<Set<number>>(new Set());
  // 채점완료 행은 기본 잠금(읽기전용). '수정' 클릭한 행만 편집 가능.
  const [editingIds, setEditingIds] = useState<Set<number>>(new Set());
  // 저장 진행 중인 행(중복 클릭 방지)
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());
  const [saveError, setSaveError] = useState<string | null>(null);
  // 원본 점수/피드백 스냅샷(memberId 기준) — 변경 여부(dirty) 판정 + '취소' 되돌리기용.
  // 상세 로드 시 채움, 저장 성공 시 저장값으로 갱신(=다시 not-dirty).
  const [originals, setOriginals] = useState<
    Record<number, { score: number | null; feedback: string }>
  >({});

  // 과제 목록 페이지네이션 — overview가 전체를 한 번에 주므로 클라이언트 슬라이싱. 미채점·채점 독립.
  const [ungradedPage, setUngradedPage] = useState(0); // 0-based
  const [gradedPage, setGradedPage] = useState(0);

  // 미리보기 모달
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSub, setPreviewSub] = useState<Submission | null>(null);

  // 채점 상세 섹션(선택한 목록 아래에 나타남) — 스크롤 이동용
  const detailRef = useRef<HTMLElement | null>(null);

  // 사이드바 '채점 현황' 배지 동기화 — 배지는 '항상 전체' 기준이라 '전체' 볼 때만 갱신
  const setUngradedCount = useLmsGradingStore((s) => s.setUngradedCount);

  // 선택 학기(또는 '전체')로 개요 로드. 상세 닫기 + 페이지 0 + 배지 동기화.
  const loadOverviewFor = useCallback(
    async (sel: number | "all", sems: Semester[]) => {
      setLoading(true);
      setError(null);
      // 학기가 바뀌면 다른 학기의 상세가 열려 있을 수 있으니 닫는다.
      setSelectedKind(null);
      setSelectedId(null);
      setDetail(null);
      try {
        // '전체' = 학기별 overview 합산(omit이면 '최신 학기'만 옴). 특정 학기 = 단건.
        const ov =
          sel === "all"
            ? mergeGradingOverviews(
                await Promise.all(sems.map((s) => getGradingOverview(s.semId)))
              )
            : await getGradingOverview(sel);
        setOverview(ov);
        // 사이드바 배지는 '항상 전체' 기준 → '전체' 볼 때만 갱신(특정 학기 선택 땐 배지 안 건드림)
        if (sel === "all") setUngradedCount(ov.totalUngraded);
        setUngradedPage(0);
        setGradedPage(0);
      } catch (err) {
        setError(describeApiError(err));
        setOverview(null);
      } finally {
        setLoading(false);
      }
    },
    [setUngradedCount]
  );

  // 최초: 학기 목록 + 라벨(SEM_TERM) 로드 → 기본 '전체'로 개요 로드.
  const init = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sems, term] = await Promise.all([getSemesters(), getCommonCodeMap("SEM_TERM")]);
      setSemesters(sems);
      setTermMap(term);
      await loadOverviewFor("all", sems);
    } catch (err) {
      setError(describeApiError(err));
      setOverview(null);
      setLoading(false);
    }
  }, [loadOverviewFor]);

  useEffect(() => {
    init();
  }, [init]);

  // 드롭다운 변경 → 선택 갱신 + 재조회
  const handleSemesterChange = (sel: number | "all") => {
    setSelectedSemId(sel);
    loadOverviewFor(sel, semesters);
  };

  // 상단 에러 재시도 — 학기 목록을 못 받았으면 처음부터, 받았으면 현재 선택 재조회
  const retryTop = () => {
    if (semesters.length === 0) init();
    else loadOverviewFor(selectedSemId, semesters);
  };

  const selectAssignment = useCallback(async (assignmentId: number, kind: DetailKind) => {
    setSelectedId(assignmentId);
    setSelectedKind(kind);
    setEditingIds(new Set()); // 새 선택은 모두 잠금 상태로 시작
    setSaveError(null);
    setDetailError(null);
    setDetail(null);
    setDetailLoading(true);
    try {
      const d = await getGradingDetail(assignmentId);
      setDetail(d);
      // 원본값 스냅샷(변경 여부 판정·취소용)
      setOriginals(
        Object.fromEntries(d.submissions.map((s) => [s.memberId, { score: s.score, feedback: s.feedback }]))
      );
      // 미채점 뷰 = 미채점 학생만 / 채점 뷰 = 채점완료 학생만 (선택 시점 기준 스냅샷, memberId)
      const ids = d.submissions
        .filter((s) => (kind === "graded" ? s.graded : !s.graded))
        .map((s) => s.memberId);
      setVisibleIds(new Set(ids));
    } catch (err) {
      setDetailError(describeApiError(err));
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // 새 과제를 선택하면 상세 섹션으로 스크롤(로딩 박스도 ref가 달려 있어 즉시 이동)
  useEffect(() => {
    if (selectedId != null) {
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedId, selectedKind]);

  // 인라인 편집: 점수/피드백 (memberId로 행 매칭)
  const updateSubmission = (memberId: number, patch: Partial<Submission>) => {
    setDetail((d) =>
      d
        ? {
            ...d,
            submissions: d.submissions.map((s) =>
              s.memberId === memberId ? { ...s, ...patch } : s
            ),
          }
        : d
    );
  };

  // '수정' 클릭 → 해당 행 편집 가능
  const startEdit = (memberId: number) => {
    setEditingIds((prev) => new Set(prev).add(memberId));
  };

  // 저장 → BE 응답(갱신된 submission)으로 행 갱신 + 카운트 동기화 + 편집모드 해제(다시 잠금)
  const handleSave = async (sub: Submission) => {
    if (!detail || sub.submissionId == null) return; // 미제출은 채점 대상 아님
    setSavingIds((prev) => new Set(prev).add(sub.memberId));
    setSaveError(null);
    try {
      const updated = await saveGrade(detail.assignmentId, sub.submissionId, {
        score: sub.score,
        feedback: sub.feedback,
      });
      updateSubmission(sub.memberId, {
        submissionId: updated.submissionId,
        score: updated.score,
        feedback: updated.feedback,
        graded: updated.graded,
      });
      // 저장값을 새 원본으로 → 변경 없음(not-dirty) 상태가 되어 저장 다시 비활성
      setOriginals((prev) => ({
        ...prev,
        [sub.memberId]: { score: updated.score, feedback: updated.feedback },
      }));
      // 채점완료/미채점 카운트 동기화 (graded 전이 기준)
      const wasGraded = sub.graded;
      if (!wasGraded && updated.graded) {
        setDetail((d) =>
          d
            ? { ...d, gradedCount: d.gradedCount + 1, ungradedCount: Math.max(0, d.ungradedCount - 1) }
            : d
        );
      } else if (wasGraded && !updated.graded) {
        setDetail((d) =>
          d
            ? { ...d, gradedCount: Math.max(0, d.gradedCount - 1), ungradedCount: d.ungradedCount + 1 }
            : d
        );
      }
      setEditingIds((prev) => {
        const next = new Set(prev);
        next.delete(sub.memberId);
        return next;
      });
    } catch (err) {
      setSaveError(describeApiError(err));
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(sub.memberId);
        return next;
      });
    }
  };

  // '취소' → 점수/피드백을 원본으로 되돌리고, 채점완료 행이면 편집모드 해제(다시 잠금)
  const handleCancel = (sub: Submission) => {
    const orig = originals[sub.memberId];
    if (orig) updateSubmission(sub.memberId, { score: orig.score, feedback: orig.feedback });
    setEditingIds((prev) => {
      const next = new Set(prev);
      next.delete(sub.memberId);
      return next;
    });
    setSaveError(null);
  };

  const openPreview = (sub: Submission) => {
    setPreviewSub(sub);
    setPreviewOpen(true);
  };

  const retryDetail = () => {
    if (selectedId != null && selectedKind != null) selectAssignment(selectedId, selectedKind);
  };

  // '전체' 선택이면 "전체"(합산이라 단일 year/termCode 없음), 특정 학기면 응답 기준 라벨
  const semesterLabel =
    selectedSemId === "all"
      ? "전체"
      : overview
        ? gradingSemesterLabel(overview, termMap)
        : "—";

  // 과제 목록 페이지 슬라이스 (클라이언트). totalUngraded/byCourse는 전체 기준이라 영향 없음.
  const ungradedAll = overview?.assignments ?? [];
  const gradedAll = overview?.gradedAssignments ?? [];
  const ungradedTotalPages = Math.max(1, Math.ceil(ungradedAll.length / ASSIGNMENTS_PAGE_SIZE));
  const gradedTotalPages = Math.max(1, Math.ceil(gradedAll.length / ASSIGNMENTS_PAGE_SIZE));
  const ungradedSlice = ungradedAll.slice(
    ungradedPage * ASSIGNMENTS_PAGE_SIZE,
    ungradedPage * ASSIGNMENTS_PAGE_SIZE + ASSIGNMENTS_PAGE_SIZE
  );
  const gradedSlice = gradedAll.slice(
    gradedPage * ASSIGNMENTS_PAGE_SIZE,
    gradedPage * ASSIGNMENTS_PAGE_SIZE + ASSIGNMENTS_PAGE_SIZE
  );

  // 채점 상세 — 선택한 목록(미채점/채점) 바로 아래에 렌더. 로딩/에러/스냅샷(visibleIds) 처리.
  const renderDetailSection = () => (
    <section
      ref={detailRef}
      className="mb-6 rounded-2xl border border-slate-200 bg-slate-100 shadow-sm"
    >
      {detailLoading ? (
        <div className="px-5 py-10 text-center text-sm text-slate-400">채점 상세를 불러오는 중…</div>
      ) : detailError ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm font-medium text-red-600">{detailError}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={retryDetail}>
            다시 시도
          </Button>
        </div>
      ) : detail ? (
        renderDetailBody(detail)
      ) : null}
    </section>
  );

  const renderDetailBody = (d: GradingDetail) => {
    const visibleSubs = d.submissions.filter((s) => visibleIds.has(s.memberId));
    return (
      <>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-800">
              {d.courseName} — {d.title}
            </h2>
            <p className="text-xs text-slate-400">
              {d.maxScore}점 만점 · 마감 {d.dueDate}
            </p>
          </div>
          {/* 헤더 배지: 미채점 뷰=미채점만 / 채점 뷰=채점완료만 */}
          <div className="flex gap-2">
            {selectedKind === "graded" ? (
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                채점완료 {d.gradedCount}
              </span>
            ) : (
              <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-600">
                미채점 {d.ungradedCount}
              </span>
            )}
          </div>
        </div>

        {saveError && (
          <p className="mx-5 mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{saveError}</p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-400">
                <th className="px-5 py-3 font-medium">학생</th>
                <th className="px-5 py-3 font-medium">제출일시</th>
                <th className="px-5 py-3 font-medium">파일</th>
                <th className="px-5 py-3 font-medium">점수 / {d.maxScore}</th>
                <th className="px-5 py-3 font-medium">피드백</th>
                <th className="px-5 py-3 font-medium text-right">저장</th>
              </tr>
            </thead>
            <tbody>
              {visibleSubs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                    {selectedKind === "graded" ? "채점 완료된 학생이 없습니다." : "미채점 학생이 없습니다."}
                  </td>
                </tr>
              ) : (
                visibleSubs.map((s) => {
                  // 제출 판정은 submissionId 기준(BE 지시). file 의존 금지 — 채점완료인데 file=null이면
                  // 미제출로 오판하던 버그(2026-06-10). 채점여부는 graded/score로 판단(status는 채점해도 'SBM' 유지).
                  const submitted = s.submissionId != null && s.submissionStatus !== "NSB";
                  const isEditing = editingIds.has(s.memberId);
                  const editable = !s.graded || isEditing; // 미채점=항상 편집 / 채점완료=수정 클릭 시만
                  const saving = savingIds.has(s.memberId);
                  // 원본 대비 점수/피드백 변경 여부 — 변경 없으면 저장 비활성, 취소도 불필요
                  const orig = originals[s.memberId];
                  const dirty = orig
                    ? s.score !== orig.score || s.feedback !== orig.feedback
                    : false;
                  return (
                    <tr
                      key={s.memberId}
                      className={`border-b border-slate-200/70 last:border-0 ${
                        !submitted ? "bg-slate-200/40 text-slate-400" : ""
                      }`}
                    >
                      {/* 학생 */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white ${
                              submitted ? "bg-slate-700" : "bg-slate-300"
                            }`}
                          >
                            {s.studentName.trim()[0] ?? "?"}
                          </div>
                          <div>
                            <p className={submitted ? "font-medium text-slate-900" : "font-medium"}>
                              {s.studentName}
                            </p>
                            <p className="text-xs text-slate-400">{s.studentNo}</p>
                          </div>
                        </div>
                      </td>

                      {!submitted ? (
                        <td colSpan={5} className="px-5 py-3">
                          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-500">
                            미제출
                          </span>
                        </td>
                      ) : (
                        <>
                          {/* 제출일시 */}
                          <td className="px-5 py-3 text-slate-500">{s.submittedAt ?? "-"}</td>
                          {/* 파일 — 제출했어도 파일이 없을 수 있음(파일 없으면 '—') */}
                          <td className="px-5 py-3">
                            {s.file ? (
                              <Button variant="outline" size="sm" onClick={() => openPreview(s)}>
                                👁 보기
                              </Button>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          {/* 점수 */}
                          <td className="px-5 py-3">
                            <input
                              type="number"
                              min={0}
                              max={d.maxScore}
                              value={s.score ?? ""}
                              disabled={!editable || saving}
                              onChange={(e) =>
                                updateSubmission(s.memberId, {
                                  score: e.target.value === "" ? null : Number(e.target.value),
                                })
                              }
                              placeholder="–"
                              className="w-16 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-center text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-500/30 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                            />
                          </td>
                          {/* 피드백 (최대 200자) */}
                          <td className="px-5 py-3">
                            <input
                              value={s.feedback}
                              disabled={!editable || saving}
                              maxLength={200}
                              onChange={(e) =>
                                updateSubmission(s.memberId, { feedback: e.target.value })
                              }
                              placeholder="피드백 입력…"
                              className="w-full min-w-[180px] rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-500/30 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                            />
                          </td>
                          {/* 저장 / (완료 + 수정) */}
                          <td className="px-5 py-3 text-right">
                            {editable ? (
                              <div className="flex items-center justify-end gap-2">
                                {/* 취소: 원본으로 되돌림. 변경 없고 편집모드도 아니면 불필요 → 비활성 */}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCancel(s)}
                                  disabled={saving || (!dirty && !isEditing)}
                                >
                                  취소
                                </Button>
                                {/* 저장: 변경 없으면 비활성 */}
                                <Button
                                  size="sm"
                                  onClick={() => handleSave(s)}
                                  disabled={saving || !dirty}
                                  className="bg-slate-800 text-white hover:bg-slate-700"
                                >
                                  {saving ? "저장 중…" : "저장"}
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-2">
                                <span className="inline-flex h-8 items-center gap-1 rounded-md border border-emerald-300 px-3 text-sm font-medium text-emerald-700">
                                  ✓ 완료
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => startEdit(s.memberId)}
                                >
                                  수정
                                </Button>
                              </div>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-5xl">
        {/* 헤더 */}
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">채점 현황</h1>
            <p className="text-sm text-slate-500">
              {semesterLabel} · 미채점 {overview?.totalUngraded ?? 0}건
            </p>
          </div>
          {/* 학기 필터 — 기본 '전체'. 선택 시 semesterId로 재조회('전체'는 학기별 합산) */}
          <select
            className={selectClass}
            value={selectedSemId === "all" ? "all" : String(selectedSemId)}
            onChange={(e) =>
              handleSemesterChange(e.target.value === "all" ? "all" : Number(e.target.value))
            }
            disabled={loading}
          >
            <option value="all">전체</option>
            {semesters.map((s) => (
              <option key={s.semId} value={String(s.semId)}>
                {s.year}년 {termMap[s.termCode] ?? s.termCode}
              </option>
            ))}
          </select>
        </header>

        {error && !overview ? (
          // 개요 로드 실패 — 가짜 데이터로 가리지 않고 에러 표기 + 재시도
          <section className="mb-6 rounded-2xl border border-red-200 bg-red-50/70 px-5 py-6 text-center">
            <p className="text-sm font-medium text-red-600">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={retryTop}>
              다시 시도
            </Button>
          </section>
        ) : (
          <>
            {/* 미채점 배너 / 완료 상태 */}
            {overview && overview.totalUngraded > 0 ? (
              <section className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50/60 px-5 py-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-lg">⚠️</span>
                  <div>
                    <p className="font-semibold text-slate-800">
                      미채점 과제 {overview.totalUngraded}건이 대기 중입니다
                    </p>
                    <p className="text-xs text-slate-500">
                      {overview.byCourse.map((c) => `${c.courseName} ${c.count}건`).join(" · ")}
                    </p>
                  </div>
                </div>
              </section>
            ) : overview ? (
              <section className="mb-6 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-500">
                ✅ 미채점 과제가 없습니다. 모든 채점이 완료되었습니다.
              </section>
            ) : null}

            {/* 미채점 과제 목록 */}
            <section className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-800">미채점 과제 목록</h2>
                  <p className="text-xs text-slate-400">마감일 순</p>
                </div>
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                  {overview?.totalUngraded ?? 0}건 미채점
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                      <th className="px-5 py-3 font-medium">과목</th>
                      <th className="px-5 py-3 font-medium">과제명</th>
                      <th className="px-5 py-3 font-medium">마감일</th>
                      <th className="px-5 py-3 font-medium">제출 수</th>
                      <th className="px-5 py-3 font-medium">미채점</th>
                      <th className="px-5 py-3 font-medium text-right">채점</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                          불러오는 중…
                        </td>
                      </tr>
                    ) : ungradedAll.length > 0 ? (
                      ungradedSlice.map((a) => (
                        <tr
                          key={a.assignmentId}
                          className={`border-b border-slate-50 last:border-0 ${
                            a.assignmentId === selectedId && selectedKind === "ungraded" ? "bg-slate-50" : ""
                          }`}
                        >
                          <td className="px-5 py-3 font-medium text-slate-800">{a.courseName}</td>
                          <td className="px-5 py-3 text-slate-700">{a.title}</td>
                          <td className="px-5 py-3 text-slate-500">🕓 {a.dueDate}</td>
                          <td className="px-5 py-3 text-slate-700">{a.submittedCount}명</td>
                          <td className="px-5 py-3">
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
                              {a.ungradedCount}명
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <Button variant="outline" size="sm" onClick={() => selectAssignment(a.assignmentId, "ungraded")}>
                              채점하기 ›
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                          미채점 과제가 없습니다.
                        </td>
                      </tr>
                    )}
                    {/* 행이 부족하면(마지막 페이지 등) 빈 행으로 채워 목록 높이 고정(항상 PAGE_SIZE행) */}
                    {!loading && ungradedAll.length > 0 && (
                      <PadRows count={ASSIGNMENTS_PAGE_SIZE - ungradedSlice.length} />
                    )}
                  </tbody>
                </table>
              </div>
              {!loading && (
                <Pager
                  total={ungradedAll.length}
                  page={ungradedPage}
                  totalPages={ungradedTotalPages}
                  onPage={setUngradedPage}
                />
              )}
            </section>

            {/* 미채점 채점 상세 — 미채점 과제 목록 바로 아래 */}
            {selectedKind === "ungraded" && renderDetailSection()}

            {/* 채점 과제 목록 (채점 완료) */}
            <section className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-800">채점 과제 목록</h2>
                  <p className="text-xs text-slate-400">채점 완료된 과제</p>
                </div>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  {overview?.gradedAssignments.length ?? 0}건 완료
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                      <th className="px-5 py-3 font-medium">과목</th>
                      <th className="px-5 py-3 font-medium">과제명</th>
                      <th className="px-5 py-3 font-medium">마감일</th>
                      <th className="px-5 py-3 font-medium">제출 수</th>
                      <th className="px-5 py-3 font-medium">채점완료</th>
                      <th className="px-5 py-3 font-medium text-right">채점</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                          불러오는 중…
                        </td>
                      </tr>
                    ) : gradedAll.length > 0 ? (
                      gradedSlice.map((a) => (
                        <tr
                          key={a.assignmentId}
                          className={`border-b border-slate-50 last:border-0 ${
                            a.assignmentId === selectedId && selectedKind === "graded" ? "bg-slate-50" : ""
                          }`}
                        >
                          <td className="px-5 py-3 font-medium text-slate-800">{a.courseName}</td>
                          <td className="px-5 py-3 text-slate-700">{a.title}</td>
                          <td className="px-5 py-3 text-slate-500">🕓 {a.dueDate}</td>
                          <td className="px-5 py-3 text-slate-700">{a.submittedCount}명</td>
                          <td className="px-5 py-3">
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                              {a.gradedCount}명
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <Button variant="outline" size="sm" onClick={() => selectAssignment(a.assignmentId, "graded")}>
                              채점 보기 ›
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                          채점 완료된 과제가 없습니다.
                        </td>
                      </tr>
                    )}
                    {/* 행이 부족하면(마지막 페이지 등) 빈 행으로 채워 목록 높이 고정(항상 PAGE_SIZE행) */}
                    {!loading && gradedAll.length > 0 && (
                      <PadRows count={ASSIGNMENTS_PAGE_SIZE - gradedSlice.length} />
                    )}
                  </tbody>
                </table>
              </div>
              {!loading && (
                <Pager
                  total={gradedAll.length}
                  page={gradedPage}
                  totalPages={gradedTotalPages}
                  onPage={setGradedPage}
                />
              )}
            </section>

            {/* 채점 채점 상세 — 채점 과제 목록 바로 아래 */}
            {selectedKind === "graded" && renderDetailSection()}
          </>
        )}
      </div>

      {/* PLM-004-01 제출 파일 미리보기 모달 */}
      <SubmissionPreviewDialog
        open={previewOpen}
        submission={previewSub}
        onClose={() => setPreviewOpen(false)}
      />
    </main>
  );
}

const selectClass =
  "shrink-0 truncate rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-500/30 disabled:cursor-not-allowed disabled:bg-slate-50";

// 과제 목록 페이지당 건수 (클라이언트 슬라이싱). 과제는 보통 적어 5건이면 대개 1페이지.
const ASSIGNMENTS_PAGE_SIZE = 5;

// 마지막 페이지 등 행이 부족할 때 목록 높이를 고정(항상 PAGE_SIZE행)하기 위한 빈 행.
// 데이터 행 높이 = Button(sm, h-7=28px) + py-3 → 동일하게 h-7 스페이서로 맞춤.
function PadRows({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={`pad-${i}`} aria-hidden className="border-b border-slate-50 last:border-0">
          <td colSpan={6} className="px-5 py-3">
            <div className="h-7" />
          </td>
        </tr>
      ))}
    </>
  );
}

// 과제 목록 페이지네이션 (PLM-003 스타일). 항목 0건이면 숨김(1페이지여도 표시).
function Pager({
  total,
  page,
  totalPages,
  onPage,
}: {
  total: number;
  page: number; // 0-based
  totalPages: number;
  onPage: (p: number) => void;
}) {
  if (total === 0) return null;
  return (
    <div className="flex items-center justify-center gap-1 border-t border-slate-100 px-5 py-4">
      <PageBtn label="‹" disabled={page === 0} onClick={() => onPage(page - 1)} />
      {Array.from({ length: totalPages }, (_, i) => i).map((p) => (
        <PageBtn key={p} label={String(p + 1)} active={p === page} onClick={() => onPage(p)} />
      ))}
      <PageBtn label="›" disabled={page >= totalPages - 1} onClick={() => onPage(page + 1)} />
    </div>
  );
}

function PageBtn({
  label,
  onClick,
  active = false,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex h-7 min-w-7 items-center justify-center rounded-md px-2 text-sm transition-colors disabled:cursor-not-allowed disabled:text-slate-300 ${
        active ? "bg-slate-800 font-semibold text-white" : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {label}
    </button>
  );
}
