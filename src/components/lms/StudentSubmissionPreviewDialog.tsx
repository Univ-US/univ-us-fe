"use client";

import { useEffect, useState } from "react";
import useEscapeClose from "@/components/lms/useEscapeClose";
import {
  downloadStudentAssignmentFile,
  formatFileSize,
  updateStudentAssignmentSubmission,
  type StudentAssignment,
} from "@/lib/lmsStudentAssignmentsApi";
import {
  UPLOAD_ACCEPT,
  UPLOAD_ALLOWED_EXTS,
  UPLOAD_MAX_SIZE,
  fileExtOf,
} from "@/lib/lmsProfessorUploadApi";
import { describeApiError } from "@/lib/lmsApiError";

const FILE_ACCEPT_HINT =
  "영상(MP4·AVI·MOV·WMV) · 음성(MP3·M4A·WAV) · 문서(PDF·HWP·DOC·PPT·XLS·TXT) · 이미지(JPG·PNG·GIF) · ZIP — 최대 5GB";
const MEMO_MAX = 1000;

interface StudentSubmissionPreviewDialogProps {
  open: boolean;
  assignment: StudentAssignment | null;
  onClose: () => void;
  onSaved?: () => void | Promise<void>;
}

export default function StudentSubmissionPreviewDialog({
  open,
  assignment,
  onClose,
  onSaved,
}: StudentSubmissionPreviewDialogProps) {
  const [memo, setMemo] = useState("");
  const [keepExisting, setKeepExisting] = useState(true);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEscapeClose(open && !!assignment, onClose);

  useEffect(() => {
    if (open && assignment) {
      setMemo(assignment.submissionMemo ?? "");
      setKeepExisting(true);
      setNewFile(null);
      setDragOver(false);
      setSaving(false);
      setDownloading(false);
      setError(null);
    }
  }, [open, assignment]);

  if (!open || !assignment) return null;
  const file = assignment.file;

  const dirty =
    memo !== (assignment.submissionMemo ?? "") || (!!file && !keepExisting) || newFile !== null;

  const pickFiles = (list: FileList | null) => {
    const f = list?.[0];
    if (!f) return;
    if (!UPLOAD_ALLOWED_EXTS.includes(fileExtOf(f.name))) {
      setError(`'${f.name}' — 허용되지 않는 파일 형식입니다.`);
      return;
    }
    if (f.size > UPLOAD_MAX_SIZE) {
      setError(`파일 용량 제한을 초과했습니다. 선택한 파일: ${formatFileSize(f.size)}`);
      return;
    }
    setNewFile(f);
    setError(null);
  };

  const handleDownload = async () => {
    if (!file) return;
    setDownloading(true);
    setError(null);
    try {
      await downloadStudentAssignmentFile(file);
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      setDownloading(false);
    }
  };

  const handleSave = async () => {
    if (!assignment.submissionId || !dirty) return;
    setSaving(true);
    setError(null);
    try {
      await updateStudentAssignmentSubmission({
        submissionId: assignment.submissionId,
        memo,
        file: newFile,
        removeExistingFile: !!file && !keepExisting,
      });
      await onSaved?.();
      onClose();
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      // 사이드바(w-60=240px)를 제외한 본문 영역 기준 중앙 정렬 (left-60)
      className="fixed inset-y-0 right-0 left-60 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="수정"
    >
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center border-b border-slate-100 px-6 py-4">
          <h3 className="text-base font-semibold text-slate-800">수정</h3>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <label className="text-sm font-semibold text-slate-700">제출 파일</label>

          {keepExisting && file && (
            <div className="mt-2 flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
              <span className="text-xl">📄</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">{file.fileName}</p>
                <p className="truncate text-xs text-slate-500">
                  {assignment.title} · 제출 {assignment.submittedAt ?? "-"}
                </p>
              </div>
              <span className="shrink-0 text-xs text-slate-400">{formatFileSize(file.fileSize)}</span>
              <button
                type="button"
                onClick={() => void handleDownload()}
                disabled={downloading}
                className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                {downloading ? "내려받는 중..." : "⤓ 다운로드"}
              </button>
              <button
                type="button"
                onClick={() => setKeepExisting(false)}
                aria-label="첨부 삭제"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500"
              >
                ✕
              </button>
            </div>
          )}

          {!keepExisting && file && (
            <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-rose-50 px-4 py-3">
              <p className="min-w-0 flex-1 truncate text-xs text-rose-600">
                &apos;{file.fileName}&apos; 첨부가 삭제됩니다 — &apos;수정 완료&apos; 시 적용
              </p>
              <button
                type="button"
                onClick={() => setKeepExisting(true)}
                className="shrink-0 text-xs font-medium text-slate-500 underline hover:text-slate-700"
              >
                되돌리기
              </button>
            </div>
          )}

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
            <span className="text-sm font-semibold text-slate-700">파일을 드래그하거나 클릭하여 업로드</span>
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

          {newFile && (
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2.5">
              <span className="text-base">📄</span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">{newFile.name}</span>
              <span className="shrink-0 text-xs text-slate-400">{formatFileSize(newFile.size)}</span>
              <button
                type="button"
                onClick={() => setNewFile(null)}
                aria-label="파일 제거"
                className="shrink-0 text-slate-400 hover:text-rose-500"
              >
                ✕
              </button>
            </div>
          )}

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
              onChange={(e) => setMemo(e.target.value.slice(0, MEMO_MAX))}
              rows={4}
              placeholder="제출 메모를 입력하세요 (선택)"
              className="mt-2 w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm leading-relaxed text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          {error && (
            <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!dirty || saving || !assignment.submissionId}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-emerald-700 px-5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-emerald-700"
          >
            {saving ? "저장 중..." : "수정 완료"}
          </button>
        </div>
      </div>
    </div>
  );
}
