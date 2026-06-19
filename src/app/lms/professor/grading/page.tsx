"use client";

// PLM-004 — 교수 "채점 현황" (미채점/채점 과제 목록 + 점수·피드백 채점)
//   + 서버 페이지네이션 전환(2026-06-13, 공통 PaginateUtilRestApi/Res)
// - 상단: 년도·학기 분리 필터(기본 '전체') + 미채점 배너(현재 필터 범위 안내) + 부제 '미채점 N건'(전체, 사이드바 배지와 동일)
// - 미채점/채점 과제 목록 = 각각 서버 페이지네이션(GET /grading/assignments?graded=&year=&termCode=&page=&size=)
//   · 미채점 목록 → '채점하기' / 채점 목록 → '채점 보기' → 목록 바로 아래에 채점 상세
// - 채점 상세(목록의 child 느낌 회색 배경): 학생별 제출일시·파일(보기)·점수·피드백
//   · 미채점 행 = 입력 가능 + '저장' · 채점완료 행 = 입력 잠금 + '완료' + '수정'(클릭 시 편집)
//   · 미제출 학생(submissionId=null) = 회색 행
// - '보기' → PLM-004-01 제출 파일 미리보기 모달(인증 다운로드)
// ⚠️ 실패 시 가짜 데이터로 가리지 않고 describeApiError로 에러 표기.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import ProfessorSubmissionPreviewDialog from "@/components/lms/ProfessorSubmissionPreviewDialog";
import {
  getGradingOverview,
  getGradingAssignments,
  getGradingDetail,
  saveGrade,
  getSemesters,
  getUngradedCount,
} from "@/lib/lmsProfessorGradingApi";
import { getCommonCodeList } from "@/lib/lmsCommonCode";
import type {
  GradingOverview,
  GradingDetail,
  AssignmentRow,
  Submission,
} from "@/types/lmsProfessorGrading";
import type { Semester } from "@/types/lmsProfessorStudents";
import { describeApiError } from "@/lib/lmsApiError";
import { useLmsGradingStore } from "@/store/lms/lmsGradingStore";

type DetailKind = "ungraded" | "graded";

// 'all' sentinel → 서버 파라미터(null) 변환
const toYearParam = (y: number | "all"): number | null => (y === "all" ? null : y);
const toTermParam = (t: string | "all"): string | null => (t === "all" ? null : t);

export default function ProfessorGradingPage() {
  const [termMap, setTermMap] = useState<Record<string, string>>({});
  const [termOrder, setTermOrder] = useState<string[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [yearFilter, setYearFilter] = useState<number | "all">("all");
  const [termFilter, setTermFilter] = useState<string | "all">("all");

  // 배너(현재 필터 범위 미채점 합 + 과목별)
  const [overview, setOverview] = useState<GradingOverview | null>(null);

  // 미채점/채점 과제 목록 — 서버 페이지네이션(독립 page)
  const [ungraded, setUngraded] = useState<AssignmentRow[]>([]);
  const [ungradedTotal, setUngradedTotal] = useState(0);
  const [ungradedTotalPages, setUngradedTotalPages] = useState(1);
  const [ungradedPage, setUngradedPage] = useState(0); // 0-based
  const [ungradedLoading, setUngradedLoading] = useState(true);

  const [graded, setGraded] = useState<AssignmentRow[]>([]);
  const [gradedTotal, setGradedTotal] = useState(0);
  const [gradedTotalPages, setGradedTotalPages] = useState(1);
  const [gradedPage, setGradedPage] = useState(0);
  const [gradedLoading, setGradedLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0); // 재시도용 강제 재조회

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
  const [originals, setOriginals] = useState<
    Record<number, { score: number | null; feedback: string }>
  >({});

  // 미리보기 모달
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSub, setPreviewSub] = useState<Submission | null>(null);

  // 채점 상세 섹션(선택한 목록 아래에 나타남) — 스크롤 이동용
  const detailRef = useRef<HTMLElement | null>(null);

  // 사이드바 '채점 현황' 배지 + 헤더 부제 '미채점 N건' = '항상 전체' 미채점 합(필터 무관, 전용 카운트 엔드포인트)
  const setUngradedCount = useLmsGradingStore((s) => s.setUngradedCount);
  const totalUngradedAll = useLmsGradingStore((s) => s.ungradedCount);

  // 상세 닫기 (필터 변경 시 다른 학기 상세 잔류 방지)
  const closeDetail = () => {
    setSelectedKind(null);
    setSelectedId(null);
    setDetail(null);
  };

  // ── 데이터 로더 ──────────────────────────────────────────
  const fetchOverview = useCallback(async (year: number | "all", term: string | "all") => {
    setError(null);
    try {
      setOverview(await getGradingOverview(toYearParam(year), toTermParam(term)));
    } catch (err) {
      setError(describeApiError(err));
      setOverview(null);
    }
  }, []);

  // 목록 1페이지 로드 (graded=false 미채점 / true 채점완료). 범위 벗어난 page는 마지막으로 보정.
  const fetchList = useCallback(
    async (gradedList: boolean, page: number, year: number | "all", term: string | "all") => {
      const setRows = gradedList ? setGraded : setUngraded;
      const setTotal = gradedList ? setGradedTotal : setUngradedTotal;
      const setTotalPages = gradedList ? setGradedTotalPages : setUngradedTotalPages;
      const setListLoading = gradedList ? setGradedLoading : setUngradedLoading;
      const setListPage = gradedList ? setGradedPage : setUngradedPage;
      setListLoading(true);
      try {
        const res = await getGradingAssignments({
          graded: gradedList,
          page,
          size: ASSIGNMENTS_PAGE_SIZE,
          year: toYearParam(year),
          termCode: toTermParam(term),
        });
        setRows(res.content);
        setTotal(res.totalElements);
        setTotalPages(Math.max(1, res.totalPages));
        if (res.totalPages > 0 && page > res.totalPages - 1) setListPage(res.totalPages - 1);
      } catch (err) {
        setError(describeApiError(err));
        setRows([]);
      } finally {
        setListLoading(false);
      }
    },
    []
  );

  // 마운트(정적): 학기 목록 + 학기 라벨 + 전체 미채점 합(부제·사이드바 배지)
  useEffect(() => {
    (async () => {
      try {
        const [sems, termList] = await Promise.all([getSemesters(), getCommonCodeList("SEM_TERM")]);
        setSemesters(sems);
        // 단일 호출(CODE_ORDER 정렬)에서 정렬 순서(termOrder)와 라벨맵(termMap) 둘 다 도출
        setTermOrder(termList.map((c) => c.codeVal));
        setTermMap(Object.fromEntries(termList.map((c) => [c.codeVal, c.codeName])));
      } catch (err) {
        setError(describeApiError(err));
      }
      try {
        setUngradedCount(await getUngradedCount()); // 전체 미채점 → 부제/배지
      } catch {
        /* 배지 실패는 숨김(치명적 아님) */
      }
    })();
  }, [setUngradedCount, reloadTick]);

  // 배너 + 두 목록 재조회 (필터/페이지/재시도 변경 시)
  useEffect(() => {
    void fetchOverview(yearFilter, termFilter);
  }, [yearFilter, termFilter, reloadTick, fetchOverview]);
  useEffect(() => {
    void fetchList(false, ungradedPage, yearFilter, termFilter);
  }, [yearFilter, termFilter, ungradedPage, reloadTick, fetchList]);
  useEffect(() => {
    void fetchList(true, gradedPage, yearFilter, termFilter);
  }, [yearFilter, termFilter, gradedPage, reloadTick, fetchList]);

  // 드롭다운 변경 → 0페이지 복귀 + 상세 닫기 (effect가 재조회)
  const handleYearChange = (year: number | "all") => {
    setYearFilter(year);
    setUngradedPage(0);
    setGradedPage(0);
    closeDetail();
  };
  const handleTermChange = (term: string | "all") => {
    setTermFilter(term);
    setUngradedPage(0);
    setGradedPage(0);
    closeDetail();
  };

  // 상단 에러 재시도 — 정적(학기/배지) + 배너 + 목록 전체 재조회
  const retryTop = () => {
    setError(null);
    setReloadTick((t) => t + 1);
  };

  // 필터 드롭다운 옵션 — 학기 목록에서 유도(년도 내림차순 / 학기 termOrder=SEM_TERM CODE_ORDER 순)
  const yearOptions = useMemo(
    () => [...new Set(semesters.map((s) => s.semYear))].sort((a, b) => b - a),
    [semesters]
  );
  const termOptions = useMemo(
    () =>
      [...new Set(semesters.map((s) => s.semTerm))].sort(
        (a, b) => termOrder.indexOf(a) - termOrder.indexOf(b)
      ),
    [semesters, termOrder]
  );

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
        Object.fromEntries(d.submissions.map((s) => [s.memberId, { score: s.asnSbmEvlScore, feedback: s.asnSbmEvlFeedback }]))
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
        asnSbmEvlScore: sub.asnSbmEvlScore,
        asnSbmEvlFeedback: sub.asnSbmEvlFeedback,
      });
      updateSubmission(sub.memberId, {
        submissionId: updated.submissionId,
        asnSbmEvlScore: updated.asnSbmEvlScore,
        asnSbmEvlFeedback: updated.asnSbmEvlFeedback,
        graded: updated.graded,
      });
      // 저장값을 새 원본으로 → 변경 없음(not-dirty) 상태가 되어 저장 다시 비활성
      setOriginals((prev) => ({
        ...prev,
        [sub.memberId]: { score: updated.asnSbmEvlScore, feedback: updated.asnSbmEvlFeedback },
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
    if (orig) updateSubmission(sub.memberId, { asnSbmEvlScore: orig.score, asnSbmEvlFeedback: orig.feedback });
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
          <div className="min-w-0">
            {/* 강의명+과제명 CSS 폭 기준 말줄임(긴 강의명에 레이아웃 안 깨지게) */}
            <h2 className="truncate text-base font-semibold text-slate-800" title={`${d.courseName} — ${d.lecAsnTitle}`}>
              {d.courseName} — {d.lecAsnTitle}
            </h2>
            <p className="text-xs text-slate-400">
              {d.maxScore}점 만점 · 마감 {d.lecAsnDueDate}
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
                  const submitted = s.submissionId != null && s.lecAsnSbmStatus !== "NSB";
                  const isEditing = editingIds.has(s.memberId);
                  const editable = !s.graded || isEditing; // 미채점=항상 편집 / 채점완료=수정 클릭 시만
                  const saving = savingIds.has(s.memberId);
                  // 원본 대비 점수/피드백 변경 여부 — 변경 없으면 저장 비활성, 취소도 불필요
                  const orig = originals[s.memberId];
                  const dirty = orig
                    ? s.asnSbmEvlScore !== orig.score || s.asnSbmEvlFeedback !== orig.feedback
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
                          <td className="px-5 py-3 text-slate-500">{s.lecAsnSbmRegDate ?? "-"}</td>
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
                              value={s.asnSbmEvlScore ?? ""}
                              disabled={!editable || saving}
                              onChange={(e) =>
                                updateSubmission(s.memberId, {
                                  asnSbmEvlScore: e.target.value === "" ? null : Number(e.target.value),
                                })
                              }
                              placeholder="–"
                              className="w-16 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-center text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-500/30 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                            />
                          </td>
                          {/* 피드백 (최대 200자) */}
                          <td className="px-5 py-3">
                            <input
                              value={s.asnSbmEvlFeedback}
                              disabled={!editable || saving}
                              maxLength={200}
                              onChange={(e) =>
                                updateSubmission(s.memberId, { asnSbmEvlFeedback: e.target.value })
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

  // 과제 목록 1개 렌더 (미채점/채점 공용) — 서버 페이지네이션
  const renderAssignmentList = (kind: DetailKind) => {
    const isUngraded = kind === "ungraded";
    const rows = isUngraded ? ungraded : graded;
    const listLoading = isUngraded ? ungradedLoading : gradedLoading;
    const total = isUngraded ? ungradedTotal : gradedTotal;
    const totalPages = isUngraded ? ungradedTotalPages : gradedTotalPages;
    const page = isUngraded ? ungradedPage : gradedPage;
    const setPage = isUngraded ? setUngradedPage : setGradedPage;
    return (
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-800">
              {isUngraded ? "미채점 과제 목록" : "채점 과제 목록"}
            </h2>
            <p className="text-xs text-slate-400">{isUngraded ? "마감일 순" : "채점 완료된 과제"}</p>
          </div>
          {isUngraded ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
              {overview?.totalUngraded ?? 0}건 미채점
            </span>
          ) : (
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              {gradedTotal}건 완료
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                <th className="px-5 py-3 font-medium">과목</th>
                <th className="px-5 py-3 font-medium">분반</th>
                <th className="px-5 py-3 font-medium">과제명</th>
                <th className="px-5 py-3 font-medium">마감일</th>
                <th className="px-5 py-3 font-medium">제출 수</th>
                <th className="px-5 py-3 font-medium">{isUngraded ? "미채점" : "채점완료"}</th>
                <th className="px-5 py-3 font-medium text-right">채점</th>
              </tr>
            </thead>
            <tbody>
              {listLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                    불러오는 중…
                  </td>
                </tr>
              ) : rows.length > 0 ? (
                rows.map((a) => (
                  <tr
                    key={a.assignmentId}
                    className={`border-b border-slate-50 last:border-0 ${
                      a.assignmentId === selectedId && selectedKind === kind ? "bg-slate-50" : ""
                    }`}
                  >
                    <td className="px-5 py-3 font-medium text-slate-800">{a.courseName}</td>
                    <td className="px-5 py-3 text-slate-600">{a.lecSection != null ? `${a.lecSection}반` : "-"}</td>
                    <td className="px-5 py-3 text-slate-700">{a.lecAsnTitle}</td>
                    <td className="px-5 py-3 text-slate-500">🕓 {a.lecAsnDueDate}</td>
                    <td className="px-5 py-3 text-slate-700">{a.submittedCount}명</td>
                    <td className="px-5 py-3">
                      {isUngraded ? (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
                          {a.ungradedCount}명
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                          {a.gradedCount}명
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button variant="outline" size="sm" onClick={() => selectAssignment(a.assignmentId, kind)}>
                        {isUngraded ? "채점하기 ›" : "채점 보기 ›"}
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                    {isUngraded ? "미채점 과제가 없습니다." : "채점 완료된 과제가 없습니다."}
                  </td>
                </tr>
              )}
              {/* 행이 부족하면(마지막 페이지 등) 빈 행으로 채워 목록 높이 고정(항상 PAGE_SIZE행) */}
              {!listLoading && rows.length > 0 && (
                <PadRows count={ASSIGNMENTS_PAGE_SIZE - rows.length} />
              )}
            </tbody>
          </table>
        </div>
        {!listLoading && (
          <Pager total={total} page={page} totalPages={totalPages} onPage={setPage} />
        )}
      </section>
    );
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-5xl">
        {/* 헤더 */}
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">채점 현황</h1>
            <p className="text-sm text-slate-500">미채점 {totalUngradedAll ?? 0}건</p>
          </div>
          {/* 년도·학기 분리 필터 — 둘 다 기본 '전체'(서버 필터) */}
          <div className="flex gap-2">
            <select
              className={selectClass}
              value={yearFilter === "all" ? "all" : String(yearFilter)}
              onChange={(e) =>
                handleYearChange(e.target.value === "all" ? "all" : Number(e.target.value))
              }
              disabled={ungradedLoading || gradedLoading}
            >
              <option value="all">전체 년도</option>
              {yearOptions.map((y) => (
                <option key={y} value={String(y)}>
                  {y}년
                </option>
              ))}
            </select>
            <select
              className={selectClass}
              value={termFilter}
              onChange={(e) => handleTermChange(e.target.value)}
              disabled={ungradedLoading || gradedLoading}
            >
              <option value="all">전체 학기</option>
              {termOptions.map((t) => (
                <option key={t} value={t}>
                  {termMap[t] ?? t}
                </option>
              ))}
            </select>
          </div>
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
            {/* 미채점 배너 / 완료 상태 (현재 필터 범위) */}
            {overview && overview.totalUngraded > 0 ? (
              <section className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50/60 px-5 py-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-lg">⚠️</span>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800">
                      미채점 과제 {overview.totalUngraded}건이 대기 중입니다
                    </p>
                    <p className="break-words text-xs text-slate-500">
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

            {/* 미채점 과제 목록 + 상세 */}
            {renderAssignmentList("ungraded")}
            {selectedKind === "ungraded" && renderDetailSection()}

            {/* 채점 과제 목록 + 상세 */}
            {renderAssignmentList("graded")}
            {selectedKind === "graded" && renderDetailSection()}
          </>
        )}
      </div>

      {/* PLM-004-01 제출 파일 미리보기 모달 */}
      <ProfessorSubmissionPreviewDialog
        open={previewOpen}
        submission={previewSub}
        onClose={() => setPreviewOpen(false)}
      />
    </main>
  );
}

const selectClass =
  "shrink-0 truncate rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-500/30 disabled:cursor-not-allowed disabled:bg-slate-50";

// 과제 목록 페이지당 건수 (서버 페이지네이션 size). 과제는 보통 적어 5건이면 대개 1페이지.
const ASSIGNMENTS_PAGE_SIZE = 5;

// 마지막 페이지 등 행이 부족할 때 목록 높이를 고정(항상 PAGE_SIZE행)하기 위한 빈 행.
function PadRows({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={`pad-${i}`} aria-hidden className="border-b border-slate-50 last:border-0">
          <td colSpan={7} className="px-5 py-3">
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
