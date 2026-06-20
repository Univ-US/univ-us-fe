"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  formatFileSize,
  UPLOAD_ACCEPT,
  UPLOAD_ALLOWED_EXTS,
  UPLOAD_MAX_SIZE,
  fileExtOf,
} from "@/lib/lmsProfessorUploadApi";
import {
  getSubmittableAssignments,
  submitStudentAssignment,
} from "@/lib/lmsStudentSubmitApi";
import { getCommonCodeList } from "@/lib/lmsCommonCode";
import { getLmsAvatarColor, getLmsAvatarInitial } from "@/lib/lmsAvatar";
import type { SubmitItem } from "@/types/lmsStudentSubmit";
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
const SUBMIT_LIST_PAGE_SIZE = 6;
const selectClass =
  "h-9 shrink-0 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";

export default function StudentSubmitPage() {
  const [items, setItems] = useState<SubmitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // 년도·학기 분리 필터 — 기본 둘 다 '전체'(§21). 강의(과목) 드롭다운은 두지 않음.
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
  const [listPage, setListPage] = useState(0);
  const setSubmittableCount = useLmsStudentAssignmentStore((s) => s.setSubmittableCount);

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

  const matchFilter = useCallback(
    (item: SubmitItem, year: number | "all", term: string | "all") =>
      (year === "all" || item.semYear === year) && (term === "all" || item.semTerm === term),
    [],
  );

  const load = useCallback(
    async (preferredId?: number) => {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await getSubmittableAssignments();
        setItems(data);
        setSubmittableCount(data.length);
        // 딥링크(과제 내역 '제출하러 가기') 우선 → 해당 과제 선택 (필터는 '전체'로 풀어 노출)
        const preferred =
          preferredId == null ? null : data.find((item) => item.id === preferredId) ?? null;
        const target = preferred ?? data[0] ?? null;
        if (target) {
          setYearFilter("all");
          setTermFilter("all");
          const idx = data.findIndex((item) => item.id === target.id);
          setListPage(idx >= 0 ? Math.floor(idx / SUBMIT_LIST_PAGE_SIZE) : 0);
          selectItem(target);
        } else {
          setSelectedId(null);
          setFile(null);
          setMemo("");
          setListPage(0);
        }
      } catch (err) {
        setLoadError(describeApiError(err));
      } finally {
        setLoading(false);
      }
    },
    [selectItem, setSubmittableCount],
  );

  useEffect(() => {
    const assignmentId = new URLSearchParams(window.location.search).get("assignmentId");
    const parsed = assignmentId == null ? NaN : Number(assignmentId);
    setPreferredAssignmentId(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
    setQueryReady(true);
  }, []);

  useEffect(() => {
    if (!queryReady) return;
    void load(preferredAssignmentId ?? undefined);
  }, [load, preferredAssignmentId, queryReady]);

  const yearOptions = useMemo(
    () => [...new Set(items.map((i) => i.semYear))].sort((a, b) => b - a),
    [items],
  );
  const termOptions = termOrder;

  // 선택 년도/학기에 매칭되는 미제출 과제 (강의 무관 — 전 과목)
  const visibleItems = useMemo(
    () => items.filter((item) => matchFilter(item, yearFilter, termFilter)),
    [items, yearFilter, termFilter, matchFilter],
  );

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  const totalListPages = Math.max(1, Math.ceil(visibleItems.length / SUBMIT_LIST_PAGE_SIZE));
  const safeListPage = Math.min(listPage, totalListPages - 1);
  const listStartIndex = safeListPage * SUBMIT_LIST_PAGE_SIZE;
  const pagedItems = visibleItems.slice(listStartIndex, listStartIndex + SUBMIT_LIST_PAGE_SIZE);
  const listEndIndex = Math.min(listStartIndex + pagedItems.length, visibleItems.length);
  const padListCount = totalListPages > 1 ? SUBMIT_LIST_PAGE_SIZE - pagedItems.length : 0;

  useEffect(() => {
    if (listPage !== safeListPage) {
      setListPage(safeListPage);
    }
  }, [listPage, safeListPage]);

  const changeListPage = useCallback(
    (page: number) => {
      const nextPage = Math.max(0, Math.min(page, totalListPages - 1));
      setListPage(nextPage);
      const nextItem = visibleItems[nextPage * SUBMIT_LIST_PAGE_SIZE];
      if (nextItem) {
        selectItem(nextItem);
      }
    },
    [visibleItems, selectItem, totalListPages],
  );

  // 년도/학기 변경 → 목록 좁힘 + 첫 과제 자동 선택 (각 축 독립)
  const applyFilter = useCallback(
    (year: number | "all", term: string | "all") => {
      setYearFilter(year);
      setTermFilter(term);
      setListPage(0);
      const first = items.find((item) => matchFilter(item, year, term)) ?? null;
      if (first) {
        selectItem(first);
      } else {
        setSelectedId(null);
        setFile(null);
        setMemo("");
      }
    },
    [items, matchFilter, selectItem],
  );

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
    if (!selected || !file) return;
    setSubmitting(true);
    setSubmitError(null);
    setNotice(null);
    try {
      await submitStudentAssignment(selected.id, { file, memo });
      await load();
      setNotice("과제가 제출되었습니다.");
    } catch (err) {
      setSubmitError(describeApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-slate-800">과제 제출</h1>
          <p className="mt-1 text-sm text-slate-500">미제출 과제 {items.length}건</p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <select
            value={yearFilter === "all" ? "" : String(yearFilter)}
            onChange={(e) => applyFilter(e.target.value === "" ? "all" : Number(e.target.value), termFilter)}
            disabled={loading || items.length === 0}
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
            onChange={(e) => applyFilter(yearFilter, e.target.value === "" ? "all" : e.target.value)}
            disabled={loading || items.length === 0}
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
        <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          {notice}
        </p>
      )}

      {loadError ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">제출 대상 과제를 불러오지 못했습니다.</p>
          <p className="mt-1 text-xs text-rose-500">{loadError}</p>
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
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <p className="text-sm font-semibold text-slate-700">제출 가능한 과제가 없습니다.</p>
          <p className="mt-1 text-xs text-slate-400">미제출 상태이면서 제출 가능한 과제만 표시됩니다.</p>
        </div>
      ) : visibleItems.length === 0 ? (
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
              {pagedItems.map((item) => {
                const active = item.id === selectedId;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => selectItem(item)}
                      className={`flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors ${
                        active ? "bg-emerald-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.dotColor}`} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-semibold text-slate-800">
                            {item.lecAsnTitle}
                          </span>
                          {item.badge && (
                            <span className="shrink-0 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
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
                          item.status === "EXTENDED" ? "text-emerald-600" : "text-rose-600"
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
            {totalListPages > 1 && (
              <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-3">
                <span className="text-[11px] font-medium text-slate-400">
                  {listStartIndex + 1}-{listEndIndex} / {visibleItems.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => changeListPage(safeListPage - 1)}
                    disabled={safeListPage === 0}
                    aria-label="이전 페이지"
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                  >
                    ‹
                  </button>
                  <span className="min-w-10 text-center text-xs font-semibold text-slate-600">
                    {safeListPage + 1} / {totalListPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => changeListPage(safeListPage + 1)}
                    disabled={safeListPage >= totalListPages - 1}
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
            <section className="rounded-2xl border-2 border-emerald-200 bg-white p-6">
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
                    <AuthorAvatar seed={selected.guide.professorLmsPrfId} name={selected.guide.professor} />
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
                  제출 파일 <span className="text-rose-500">*</span>
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
                      ? "border-emerald-400 bg-emerald-50"
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
                  className="mt-2 w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3">
                <p className="mb-1.5 text-sm font-bold text-slate-700">제출 전 확인사항</p>
                <ul className="space-y-1 text-sm text-slate-600">
                  {CHECKLIST.map((item) => (
                    <li key={item} className="flex items-center gap-1.5">
                      <span className="text-emerald-600">☑</span> {item}
                    </li>
                  ))}
                </ul>
              </div>

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
                  disabled={!file || submitting}
                  className="rounded-lg bg-emerald-700 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
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

// 작성자 아바타 — 기본 프로필 규칙(lib/lmsAvatar): 사람 식별자(교수 lmsPrfId) 시드 색 + 이름 이니셜.
// 같은 교수는 채팅·출결 등 어느 화면에서나 같은 색.
function AuthorAvatar({ seed, name }: { seed: string | number | null | undefined; name: string }) {
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${getLmsAvatarColor(seed)}`}
    >
      {getLmsAvatarInitial(name)}
    </span>
  );
}
