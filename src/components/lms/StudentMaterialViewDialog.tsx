"use client";

// ─────────────────────────────────────────────────────────────
// 학생 LMS 모달 SLM-006 강의 자료 보기
// - 강의 자료 행 '자료 보기' 클릭 시 표시. 교수가 올린 자료(제목·본문 content·첨부)를 그대로 열람.
// - 본문 = 교수 Tiptap HTML → sanitizeLmsHtml로 정화 후 렌더(XSS 방지). 첨부 = 개별 다운로드.
// - 열람 제한(만료/교수 제한)은 첨부 '다운로드'만 막음 — 보기·본문은 항상 가능(downloadable=false → 잠금).
// - 학생 에메랄드 톤(§13). 데이터(material)는 부모(페이지)가 주입 — 표시만 담당.
// ─────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import useEscapeClose from "@/components/lms/useEscapeClose";
import { formatFileSize, isVideoExt } from "@/lib/lmsProfessorUploadApi";
import { sanitizeLmsHtml } from "@/lib/lmsSanitize";
import { downloadStudentMaterialAttachment } from "@/lib/lmsStudentMaterialsApi";
import type { Material } from "@/types/lmsStudentMaterials";
import "./lms-content.css"; // 교수 에디터(Tiptap)와 동일한 콘텐츠 스타일 — 표시 동일성

interface StudentMaterialViewDialogProps {
  open: boolean;
  material: Material | null;
  courseName?: string; // 헤더 컨텍스트(선택 과목명)
  onClose: () => void;
}

export default function StudentMaterialViewDialog({
  open,
  material,
  courseName,
  onClose,
}: StudentMaterialViewDialogProps) {
  useEscapeClose(open && !!material, onClose); // ESC = 닫기
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    setDownloadingId(null);
    setDownloadError(null);
  }, [open, material?.uploadId]);

  if (!open || !material) return null;

  const locked = !material.downloadable; // 첨부 다운로드만 제한 (보기·본문은 항상 가능)
  const lockLabel = material.lockedReason === "expired" ? "열람 기간 만료" : "교수 제한";
  const contentHtml = material.lecUplContent?.trim() ? sanitizeLmsHtml(material.lecUplContent) : "";

  const handleDownload = async (attachmentId: number, fileName: string) => {
    if (locked || downloadingId != null) return;
    setDownloadError(null);
    setDownloadingId(attachmentId);
    try {
      await downloadStudentMaterialAttachment(attachmentId, fileName);
    } catch {
      setDownloadError("파일 다운로드에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div
      // 사이드바(w-60=240px)를 제외한 본문 영역 기준 중앙 정렬 (left-60)
      className="fixed inset-y-0 right-0 left-60 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="강의 자료 보기"
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        {/* 헤더 — 제목 + 과목·업로드일 */}
        <div className="border-b border-slate-100 px-6 py-4">
          <h3 className="truncate text-base font-semibold text-slate-800" title={material.lecUplTitle}>
            {material.lecUplTitle}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {courseName ? `${courseName} · ` : ""}업로드 {material.lecUplRegDate}
          </p>
        </div>

        {/* 본문 — 교수가 작성한 내용(content HTML) + 첨부 목록 */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* 내용 */}
          <section>
            <h4 className="mb-1.5 text-xs font-semibold text-slate-500">내용</h4>
            {contentHtml ? (
              <div
                className="lms-content rounded-xl bg-slate-50 px-4 py-3"
                dangerouslySetInnerHTML={{ __html: contentHtml }}
              />
            ) : (
              <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
                작성된 내용이 없습니다.
              </p>
            )}
          </section>

          {/* 첨부 파일 */}
          <section className="mt-4">
            <h4 className="mb-1.5 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-500">
              첨부 파일 <span className="text-slate-400">({material.attachments.length})</span>
              {locked && material.attachments.length > 0 && (
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">
                  🔒 {lockLabel} — 다운로드 제한
                </span>
              )}
            </h4>
            {material.attachments.length === 0 ? (
              <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
                첨부 파일이 없습니다.
              </p>
            ) : (
              <>
                <ul className="space-y-2">
                  {material.attachments.map((a) => (
                    <li
                      key={a.attachmentId}
                      className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3"
                    >
                      <span
                        className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${
                          isVideoExt(a.fileExt ?? "")
                            ? "bg-red-100 text-red-600"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {isVideoExt(a.fileExt ?? "") ? "🎬" : "📄"} {a.fileExt ?? "-"}
                      </span>
                      <span
                        className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800"
                        title={a.fileName}
                      >
                        {a.fileName}
                      </span>
                      <span className="shrink-0 text-xs text-slate-400">
                        {formatFileSize(a.fileSize ?? 0)}
                      </span>
                      {locked ? (
                        <span
                          title={lockLabel}
                          className="inline-flex h-8 shrink-0 cursor-not-allowed items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-400"
                        >
                          🔒 다운로드 불가
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDownload(a.attachmentId, a.fileName)}
                          disabled={downloadingId != null}
                          className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {downloadingId === a.attachmentId ? "내려받는 중…" : "⤓ 다운로드"}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
                {downloadError && (
                  <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">
                    {downloadError}
                  </p>
                )}
              </>
            )}
          </section>
        </div>

        {/* 푸터 — 닫기 */}
        <div className="flex justify-end border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-white hover:bg-primary/90"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
