"use client";

// SLM-007 과제 제출 — 미제출 과제 선택(좌) → 파일 업로드(S3·드래그&드롭)·메모 작성하여 제출(우)
// 🧪 mock-first(§15): BE 연동 전 샘플 데이터. 색상 = 학생 에메랄드 계열(§13). 이력은 SLM-004.
// - 좌: 제출 대상 목록(미제출/연장 승인/마감 종료) — 종료는 비활성
// - 우: 과제 안내 + 드래그&드롭 업로드 + 제출 메모 + 제출 전 체크리스트 + 최종 제출
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatFileSize } from "@/lib/lmsProfessorUploadApi"; // 파일 크기 정본(§21)
import {
  getSubmittableAssignments,
  type SubmitItem,
} from "@/lib/lmsStudentSubmitApi";

interface PickedFile {
  name: string;
  size: number; // bytes
}

const CHECKLIST = [
  "파일명에 학번 포함 여부 확인",
  "과제 요구사항 충족 여부 확인",
  "제출 후 수정은 마감일 전까지만 가능",
];

export default function StudentSubmitPage() {
  const [items, setItems] = useState<SubmitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [file, setFile] = useState<PickedFile | null>(null);
  const [memo, setMemo] = useState("");
  const [dragOver, setDragOver] = useState(false);

  // 과제 선택 → 패널 전환 + 초안(draft) 프리필/초기화 (setState 세터만 사용 → 안정적)
  const selectItem = useCallback((it: SubmitItem) => {
    setSelectedId(it.id);
    if (it.draft) {
      setFile({ name: it.draft.fileName, size: it.draft.fileSize });
      setMemo(it.draft.memo);
    } else {
      setFile(null);
      setMemo("");
    }
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    let alive = true;
    getSubmittableAssignments()
      .then((d) => {
        if (!alive) return;
        setItems(d);
        // 기본 선택 = 첫 제출 가능 과제 (설계서 = 알고리즘 #3, draft 프리필)
        const first = d.find((it) => it.status !== "CLOSED") ?? d[0] ?? null;
        if (first) selectItem(first);
      })
      .catch(() => alive && setError(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [selectItem]);

  useEffect(() => load(), [load]);

  const selected = useMemo(
    () => items.find((it) => it.id === selectedId) ?? null,
    [items, selectedId]
  );

  const unsubmittedCount = items.filter((it) => it.status !== "CLOSED").length;

  const pickFiles = (list: FileList | null) => {
    const f = list?.[0];
    if (!f) return;
    setFile({ name: f.name, size: f.size });
  };

  const handleSubmit = () => {
    // 🧪 mock 단계 — BE 연동 시 multipart S3 업로드로 교체.
    window.alert("샘플 데이터입니다 (BE 연동 전) — 실제 제출은 연동 후 동작합니다.");
  };

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      {/* 헤더 */}
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">과제 제출</h1>
          <p className="mt-1 text-sm text-slate-500">미제출 과제 {unsubmittedCount}건</p>
        </div>
        {unsubmittedCount > 0 && (
          <span className="flex items-center gap-1 text-xs font-semibold text-rose-600">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> 미제출 {unsubmittedCount}건
          </span>
        )}
      </header>

      {/* mock 단계 안내 (§15) */}
      <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
        🧪 샘플 데이터(BE 연동 전) — 실제 제출되지 않습니다.
      </div>

      {error ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">제출 대상 과제를 불러오지 못했습니다.</p>
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
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[20rem_1fr]">
          {/* 좌: 제출 대상 목록 */}
          <section className="rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-bold text-slate-800">미제출 과제 목록</h2>
              <span className="text-[11px] text-slate-400">과제 선택 후 제출</span>
            </div>
            <ul className="p-2">
              {items.map((it) => {
                const active = it.id === selectedId;
                const closed = it.status === "CLOSED";
                return (
                  <li key={it.id}>
                    <button
                      type="button"
                      onClick={() => selectItem(it)}
                      className={`flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors ${
                        active ? "bg-emerald-50" : "hover:bg-slate-50"
                      } ${closed ? "opacity-50" : ""}`}
                    >
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${it.dotColor}`} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-semibold text-slate-800">{it.title}</span>
                          {it.badge && (
                            <span
                              className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                closed ? "bg-slate-100 text-slate-500" : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {it.badge}
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-slate-500">
                          {it.note ? `${it.courseName} · ${it.note}` : it.courseName}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 text-xs font-semibold ${
                          closed
                            ? "text-slate-400"
                            : it.status === "EXTENDED"
                              ? "text-emerald-600"
                              : "text-rose-600"
                        }`}
                      >
                        {closed ? "종료" : it.dDay}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* 우: 제출 패널 */}
          {!selected ? (
            <section className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-10 text-sm text-slate-400">
              왼쪽에서 제출할 과제를 선택하세요.
            </section>
          ) : (
            <section className="rounded-2xl border-2 border-emerald-200 bg-white p-6">
              {/* 헤더 */}
              <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-900">{selected.title}</h2>
                <span className="shrink-0 text-sm font-semibold text-rose-600">마감 {selected.dueLabel}</span>
              </div>

              {/* 과제 안내 */}
              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="mb-1.5 text-sm font-bold text-slate-700">과제 안내</p>
                <ul className="space-y-1 text-sm text-slate-600">
                  <li>· 과목: {selected.guide.courseName} ({selected.guide.professor} 교수)</li>
                  {selected.guide.lines.map((line, i) => (
                    <li key={i}>· {line}</li>
                  ))}
                </ul>
              </div>

              {selected.status === "CLOSED" ? (
                <p className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  🔒 마감이 종료되어 제출할 수 없습니다.
                </p>
              ) : (
                <>
                  {/* 제출 파일 (S3 업로드) */}
                  <div className="mt-5">
                    <label className="text-sm font-semibold text-slate-700">
                      제출 파일 (S3 업로드) <span className="text-rose-500">*</span>
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
                      <span className="text-xs text-slate-400">{selected.acceptHint}</span>
                      <input
                        type="file"
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

                  {/* 제출 메모 */}
                  <div className="mt-4">
                    <label className="text-sm font-semibold text-slate-700">
                      제출 메모 <span className="font-normal text-slate-400">선택</span>
                    </label>
                    <textarea
                      value={memo}
                      onChange={(e) => setMemo(e.target.value)}
                      rows={2}
                      placeholder="과제 제출 관련 메모를 남길 수 있습니다."
                      className="mt-2 w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* 제출 전 확인사항 */}
                  <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3">
                    <p className="mb-1.5 text-sm font-bold text-slate-700">제출 전 확인사항</p>
                    <ul className="space-y-1 text-sm text-slate-600">
                      {CHECKLIST.map((c) => (
                        <li key={c} className="flex items-center gap-1.5">
                          <span className="text-emerald-600">☑</span> {c}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 액션 */}
                  <div className="mt-5 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => selectItem(selected)}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={!file}
                      className="rounded-lg bg-emerald-700 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      ⤒ 최종 제출하기
                    </button>
                  </div>
                </>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
