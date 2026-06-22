"use client";

// SLM-007 과제 제출 — 학생이 미제출(제출 가능) 과제를 골라 파일을 제출한다.
// 서버 페이지네이션: 년도/학기 필터 + page/size로 서버 조회(클라 slice 없음, SLM-006 미러).
// 딥링크(?assignmentId=)는 BE가 그 과제가 속한 페이지를 계산해 반환 → 해당 과제 자동 선택.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  formatFileSize,
  UPLOAD_ACCEPT,
  UPLOAD_ALLOWED_EXTS,
  UPLOAD_MAX_SIZE,
  fileExtOf,
} from "@/lib/lmsProfessorUploadApi";
import {
  getSubmittableAssignments,
  getSubmittableSummary,
  submitStudentAssignment,
} from "@/lib/lmsStudentSubmitApi";
import { getCommonCodeList } from "@/lib/lmsCommonCode";
import { getLmsAvatarColor, getLmsAvatarInitial } from "@/lib/lmsAvatar";
import { resolveImageUrl } from "@/lib/lmsProfessorStudentsApi";
import type { SubmitItem, SubmittableSummary, PageResponse } from "@/types/lmsStudentSubmit";
import { describeApiError } from "@/lib/lmsApiError";
import { htmlToPlainText } from "@/lib/lmsSanitize";
import { useLmsStudentAssignmentStore } from "@/store/lms/lmsStudentAssignmentStore";

const CHECKLIST = [
  "파일명에 학번 포함 여부 확인",
  "과제 요구사항 충족 여부 확인",
  "제출 후 수정은 마감일 전까지만 가능",
];

const FILE_ACCEPT_HINT =
  "영상(MP4·AVI·MOV·WMV) · 음성(MP3·M4A·WAV) · 문서(PDF·HWP·DOC·PPT·XLS·TXT) · 이미지(JPG·PNG·GIF) · ZIP — 최대 5GB";
const MEMO_MAX = 1000;
const PAGE_SIZE = 6;
const selectClass =
  "h-9 shrink-0 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";

export default function StudentSubmitPage() {
  // 요약(전역 미제출 수·연도 드롭다운 소스) — null=미로드
  const [summary, setSummary] = useState<SubmittableSummary | null>(null);
  // 현재 페이지(서버 응답)
  const [items, setItems] = useState<SubmitItem[]>([]);
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // 년도·학기 분리 필터 — 기본 둘 다 '전체'. 강의(과목) 드롭다운은 두지 않음.
  const [yearFilter, setYearFilter] = useState<number | "all">("all");
  const [termFilter, setTermFilter] = useState<string | "all">("all");
  const [termMap, setTermMap] = useState<Record<string, string>>({});
  const [termOrder, setTermOrder] = useState<string[]>([]);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [memo, setMemo] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [queryReady, setQueryReady] = useState(false);
  const [preferredAssignmentId, setPreferredAssignmentId] = useState<number | null>(null);
  const setSubmittableCount = useLmsStudentAssignmentStore((s) => s.setSubmittableCount);
  // 경쟁 요청 가드 (필터/페이지 빠른 전환 시 stale 응답 무시)
  const reqIdRef = useRef(0);

  useEffect(() => {
    void getCommonCodeList("SEM_TERM").then((list) => {
      setTermOrder(list.map((c) => c.codeVal));
      setTermMap(Object.fromEntries(list.map((c) => [c.codeVal, c.codeName])));
    });
  }, []);

  const selectItem = useCallback((item: SubmitItem) => {
    setSelectedId(item.id);
    setFile(null);
    setMemo("");
    setSubmitError(null);
    setNotice(null);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedId(null);
    setFile(null);
    setMemo("");
  }, []);

  // 요약(배지/연도) 로드 — 사이드바 배지도 동기화
  const loadSummary = useCallback(async () => {
    try {
      const s = await getSubmittableSummary();
      setSummary(s);
      setSubmittableCount(s.totalCount);
    } catch {
      // 요약 실패는 조용히 — 목록 로드가 별도 에러를 표기한다.
    }
  }, [setSubmittableCount]);

  // 한 페이지 서버 조회. 성공 시에만 목록 교체(로딩 중 이전 페이지 유지). focus=딥링크 대상 선택
  const fetchPage = useCallback(
    async (opts: {
      year: number | "all";
      term: string | "all";
      page: number;
      focusAssignmentId?: number;
    }): Promise<PageResponse<SubmitItem> | null> => {
      const reqId = ++reqIdRef.current;
      setLoading(true);
      setLoadError(null);
      try {
        const data = await getSubmittableAssignments({
          year: opts.year === "all" ? undefined : opts.year,
          term: opts.term === "all" ? undefined : opts.term,
          page: opts.page,
          size: PAGE_SIZE,
          focusAssignmentId: opts.focusAssignmentId,
        });
        if (reqId !== reqIdRef.current) return null; // stale 응답 무시
        setItems(data.content);
        setPage(data.page);
        setTotalElements(data.totalElements);
        setTotalPages(data.totalPages);
        // 선택: 딥링크 focus 우선, 없으면 페이지 첫 과제
        const focus =
          opts.focusAssignmentId != null
            ? data.content.find((it) => it.id === opts.focusAssignmentId) ?? null
            : null;
        const target = focus ?? data.content[0] ?? null;
        if (target) selectItem(target);
        else clearSelection();
        return data;
      } catch (err) {
        if (reqId === reqIdRef.current) setLoadError(describeApiError(err));
        return null;
      } finally {
        if (reqId === reqIdRef.current) setLoading(false);
      }
    },
    [selectItem, clearSelection],
  );

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    const assignmentId = new URLSearchParams(window.location.search).get("assignmentId");
    const parsed = assignmentId == null ? NaN : Number(assignmentId);
    setPreferredAssignmentId(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
    setQueryReady(true);
  }, []);

  // 최초 목록 로드 — 딥링크면 그 과제가 속한 페이지로(필터는 전체), 아니면 0페이지
  useEffect(() => {
    if (!queryReady) return;
    void fetchPage({
      year: "all",
      term: "all",
      page: 0,
      focusAssignmentId: preferredAssignmentId ?? undefined,
    });
  }, [queryReady, preferredAssignmentId, fetchPage]);

  const yearOptions = summary?.years ?? [];
  const termOptions = termOrder;

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  // 년도/학기 변경 → page 0부터 서버 재조회 (첫 과제 자동 선택)
  const handleYearChange = (year: number | "all") => {
    setYearFilter(year);
    void fetchPage({ year, term: termFilter, page: 0 });
  };
  const handleTermChange = (term: string | "all") => {
    setTermFilter(term);
    void fetchPage({ year: yearFilter, term, page: 0 });
  };
  const changePage = (p: number) => {
    void fetchPage({ year: yearFilter, term: termFilter, page: p });
  };

  const listStartIndex = page * PAGE_SIZE;
  const listEndIndex = listStartIndex + items.length;
  const multiPage = totalPages > 1;
  const padListCount = multiPage ? PAGE_SIZE - items.length : 0;

  const pickFiles = (list: FileList | null) => {
    const picked = list?.[0];
    if (!picked) return;
    if (!UPLOAD_ALLOWED_EXTS.includes(fileExtOf(picked.name))) {
      setSubmitError(
        `'${picked.name}' — 허용되지 않는 파일 형식입니다. 영상·음성·문서·이미지·ZIP만 제출할 수 있습니다.`,
      );
      return;
    }
    if (picked.size > UPLOAD_MAX_SIZE) {
      setSubmitError(
        `파일 용량 제한을 초과했습니다. 최대 5GB까지 제출할 수 있습니다. 선택한 파일: ${formatFileSize(picked.size)}`,
      );
      return;
    }
    setFile(picked);
    setSubmitError(null);
    setNotice(null);
  };

  const handleSubmit = async () => {
    // 파일은 선택 — 파일 또는 메모 중 하나는 있어야 제출
    if (!selected || (!file && !memo.trim())) return;
    setSubmitting(true);
    setSubmitError(null);
    setNotice(null);
    try {
      await submitStudentAssignment(selected.id, { file, memo });
      await loadSummary(); // 배지/전역 미제출 수 갱신
      // 제출한 과제는 목록에서 사라짐 → 현재 페이지 재조회. 페이지가 비면 한 페이지 앞으로
      let res = await fetchPage({ year: yearFilter, term: termFilter, page });
      if (res && res.content.length === 0 && res.page > 0) {
        res = await fetchPage({ year: yearFilter, term: termFilter, page: res.page - 1 });
      }
      setNotice("과제가 제출되었습니다.");
    } catch (err) {
      setSubmitError(describeApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const filtersDisabled = summary === null || summary.totalCount === 0;

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-slate-800">과제 제출</h1>
          <p className="mt-1 text-sm text-slate-500">미제출 과제 {summary?.totalCount ?? 0}건</p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <select
            value={yearFilter === "all" ? "" : String(yearFilter)}
            onChange={(e) => handleYearChange(e.target.value === "" ? "all" : Number(e.target.value))}
            disabled={filtersDisabled}
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
            onChange={(e) => handleTermChange(e.target.value === "" ? "all" : e.target.value)}
            disabled={filtersDisabled}
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

      {notice && (
        <p className="mb-4 rounded-lg bg-primary/5 px-4 py-2 text-sm text-primary">
          {notice}
        </p>
      )}

      {loadError ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">제출 대상 과제를 불러오지 못했습니다.</p>
          <p className="mt-1 text-xs text-rose-500">{loadError}</p>
          <button
            type="button"
            onClick={() => void fetchPage({ year: yearFilter, term: termFilter, page })}
            className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
          >
            다시 시도
          </button>
        </div>
      ) : summary === null || (loading && items.length === 0) ? (
        <p className="py-16 text-center text-sm text-slate-400">불러오는 중...</p>
      ) : summary.totalCount === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <p className="text-sm font-semibold text-slate-700">제출 가능한 과제가 없습니다.</p>
          <p className="mt-1 text-xs text-slate-400">미제출 상태이면서 제출 가능한 과제만 표시됩니다.</p>
        </div>
      ) : totalElements === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <p className="text-sm font-semibold text-slate-700">조건에 맞는 과제가 없습니다.</p>
          <p className="mt-1 text-xs text-slate-400">위 년도/학기 필터에 해당하는 미제출 과제가 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[20rem_1fr]">
          <section className="rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-bold text-slate-800">미제출 과제 목록</h2>
              <span className="text-[11px] text-slate-400">과제 선택 후 제출</span>
            </div>
            <ul className="p-2">
              {items.map((item) => {
                const active = item.id === selectedId;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => selectItem(item)}
                      className={`flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors ${
                        active ? "bg-primary/5" : "hover:bg-slate-50"
                      }`}
                    >
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.status === "EXTENDED" ? "bg-orange-500" : "bg-primary"}`} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-semibold text-slate-800">
                            {item.lecAsnTitle}
                          </span>
                          {item.badge && (
                            <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                              {item.badge}
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-slate-500">
                          {[
                            item.courseName,
                            item.lecSection != null ? `${item.lecSection}반` : null,
                            item.note,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 text-xs font-semibold ${
                          item.status === "EXTENDED" ? "text-primary" : "text-rose-600"
                        }`}
                      >
                        {item.dDay}
                      </span>
                    </button>
                  </li>
                );
              })}
              {Array.from({ length: padListCount }).map((_, i) => (
                <li key={`pad-${i}`} aria-hidden>
                  <div className="h-[58px]" />
                </li>
              ))}
            </ul>
            {multiPage && (
              <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-3">
                <span className="text-[11px] font-medium text-slate-400">
                  {listStartIndex + 1}-{listEndIndex} / {totalElements}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => changePage(page - 1)}
                    disabled={page === 0}
                    aria-label="이전 페이지"
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                  >
                    ‹
                  </button>
                  <span className="min-w-10 text-center text-xs font-semibold text-slate-600">
                    {page + 1} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => changePage(page + 1)}
                    disabled={page >= totalPages - 1}
                    aria-label="다음 페이지"
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                  >
                    ›
                  </button>
                </div>
              </div>
            )}
          </section>

          {!selected ? (
            <section className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-10 text-sm text-slate-400">
              왼쪽에서 제출할 과제를 선택하세요.
            </section>
          ) : (
            <section className="rounded-2xl border-2 border-primary/20 bg-white p-6">
              <div className="mb-4 border-b border-slate-100 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-bold text-slate-900">{selected.lecAsnTitle}</h2>
                  <span className="shrink-0 text-sm font-semibold text-rose-600">
                    마감 {selected.dueLabel}
                  </span>
                </div>
                {/* 작성자 행 — 교수 + 과제 등록일시 (공지 상세 SLM-009 미러) */}
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span className="flex items-center gap-2">
                    <AuthorAvatar src={selected.guide.professorImageUrl} seed={selected.guide.professorLmsPrfId} name={selected.guide.professor} />
                    <span className="font-medium text-slate-700">{selected.guide.professor} 교수</span>
                  </span>
                  <span>{selected.lecAsnRegDate}</span>
                </div>
              </div>

              {submitError && (
                <p className="mb-4 rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-600">
                  {submitError}
                </p>
              )}

              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-sm font-bold text-slate-700">과제 설명</p>
                {selected.lecAsnContent?.trim() && (
                  <p className="mt-1.5 whitespace-pre-wrap break-words text-sm text-slate-600">
                    {htmlToPlainText(selected.lecAsnContent)}
                  </p>
                )}
              </div>

              <div className="mt-5">
                <label className="text-sm font-semibold text-slate-700">
                  제출 파일 <span className="font-normal text-slate-400">선택</span>
                </label>
                <label
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    pickFiles(e.dataTransfer.files);
                  }}
                  className={`mt-2 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
                    dragOver
                      ? "border-primary/40 bg-primary/5"
                      : "border-orange-200 bg-orange-50/40 hover:bg-orange-50"
                  }`}
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-xl shadow-sm">
                    ⤒
                  </span>
                  <span className="text-sm font-semibold text-slate-700">
                    파일을 드래그하거나 클릭하여 업로드
                  </span>
                  <span className="text-xs text-slate-400">{FILE_ACCEPT_HINT}</span>
                  <input
                    type="file"
                    accept={UPLOAD_ACCEPT}
                    className="hidden"
                    onChange={(e) => {
                      pickFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>

                {file && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2.5">
                    <span className="text-base">📄</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">
                      {file.name}
                    </span>
                    <span className="shrink-0 text-xs text-slate-400">{formatFileSize(file.size)}</span>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      aria-label="파일 제거"
                      className="shrink-0 text-slate-400 hover:text-rose-500"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-700">
                    제출 메모 <span className="font-normal text-slate-400">선택</span>
                  </label>
                  <span className="text-xs text-slate-400">
                    {memo.length} / {MEMO_MAX}자
                  </span>
                </div>
                <textarea
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  rows={2}
                  maxLength={MEMO_MAX}
                  placeholder="과제 제출 관련 메모를 남길 수 있습니다."
                  className="mt-2 w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3">
                <p className="mb-1.5 text-sm font-bold text-slate-700">제출 전 확인사항</p>
                <ul className="space-y-1 text-sm text-slate-600">
                  {CHECKLIST.map((item) => (
                    <li key={item} className="flex items-center gap-1.5">
                      <span className="text-primary">☑</span> {item}
                    </li>
                  ))}
                </ul>
              </div>

              {!file && !memo.trim() && (
                <p className="mt-4 text-xs text-slate-400">
                  제출 파일 또는 메모 중 하나는 입력해야 제출할 수 있습니다.
                </p>
              )}

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => selectItem(selected)}
                  disabled={submitting}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={(!file && !memo.trim()) || submitting}
                  className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {submitting ? "제출 중..." : "⤒ 최종 제출하기"}
                </button>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

// 작성자 아바타 — 기본 프로필 규칙(lib/lmsAvatar): 업로드 이미지가 있으면 그 이미지,
// 없으면 사람 식별자(교수 lmsPrfId) 시드 색 + 이름 이니셜. 같은 교수는 어느 화면에서나 같은 색.
function AuthorAvatar({
  src,
  seed,
  name,
}: {
  src?: string | null;
  seed: string | number | null | undefined;
  name: string;
}) {
  const img = resolveImageUrl(src);
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold text-white ${getLmsAvatarColor(seed)}`}
    >
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img} alt={name} className="h-full w-full object-cover" />
      ) : (
        getLmsAvatarInitial(name)
      )}
    </span>
  );
}
