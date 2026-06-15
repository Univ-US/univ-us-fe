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
  type SubmitItem,
} from "@/lib/lmsStudentSubmitApi";
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

export default function StudentSubmitPage() {
  const [items, setItems] = useState<SubmitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [memo, setMemo] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [queryReady, setQueryReady] = useState(false);
  const [preferredAssignmentId, setPreferredAssignmentId] = useState<number | null>(null);
  const setSubmittableCount = useLmsStudentAssignmentStore((s) => s.setSubmittableCount);

  const selectItem = useCallback((item: SubmitItem) => {
    setSelectedId(item.id);
    setFile(null);
    setMemo("");
    setSubmitError(null);
    setNotice(null);
  }, []);

  const load = useCallback(
    async (preferredId?: number) => {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await getSubmittableAssignments();
        setItems(data);
        setSubmittableCount(data.length);
        const next = data.find((item) => item.id === preferredId) ?? data[0] ?? null;
        if (next) {
          selectItem(next);
        } else {
          setSelectedId(null);
          setFile(null);
          setMemo("");
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

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
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
        <div>
          <h1 className="text-2xl font-bold text-slate-800">과제 제출</h1>
          <p className="mt-1 text-sm text-slate-500">미제출 과제 {items.length}건</p>
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
                        active ? "bg-emerald-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.dotColor}`} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-semibold text-slate-800">
                            {item.title}
                          </span>
                          {item.badge && (
                            <span className="shrink-0 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                              {item.badge}
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-slate-500">
                          {item.note ? `${item.courseName} · ${item.note}` : item.courseName}
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
            </ul>
          </section>

          {!selected ? (
            <section className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-10 text-sm text-slate-400">
              왼쪽에서 제출할 과제를 선택하세요.
            </section>
          ) : (
            <section className="rounded-2xl border-2 border-emerald-200 bg-white p-6">
              <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-900">{selected.title}</h2>
                <span className="shrink-0 text-sm font-semibold text-rose-600">
                  마감 {selected.dueLabel}
                </span>
              </div>

              {submitError && (
                <p className="mb-4 rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-600">
                  {submitError}
                </p>
              )}

              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="mb-1.5 text-sm font-bold text-slate-700">과제 설명</p>
                <ul className="space-y-1 text-sm text-slate-600">
                  <li>
                    · 과목: {selected.guide.courseName} ({selected.guide.professor} 교수)
                  </li>
                  {selected.guide.lines.map((line, i) => (
                    <li key={i}>· {htmlToPlainText(line)}</li>
                  ))}
                </ul>
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
