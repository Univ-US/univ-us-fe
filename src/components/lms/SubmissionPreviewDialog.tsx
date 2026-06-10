"use client";

// ─────────────────────────────────────────────────────────────
// [공용 모달 컴포넌트] PLM-004-01 제출 파일 미리보기 다이얼로그
// - PLM-004(채점 현황) 채점 행의 '보기' 클릭 시 표시
// - ⭐ 미리보기는 "이미지 파일만" 지원. 비이미지(zip/pdf 등)는 미리보기 대신 안내 + 원본 다운로드.
// - 데이터(submission)는 부모(페이지)가 주입 — 표시만 담당
// ─────────────────────────────────────────────────────────────
import { Button } from "@/components/ui/button";
import {
  isImageFile,
  type Submission,
} from "@/lib/lmsProfessorGradingApi";

// 사이드바(w-60=240px) 제외 본문 영역 기준 중앙
interface SubmissionPreviewDialogProps {
  open: boolean;
  submission: Submission | null;
  onClose: () => void;
}

export default function SubmissionPreviewDialog({
  open,
  submission,
  onClose,
}: SubmissionPreviewDialogProps) {
  if (!open || !submission) return null;
  const file = submission.file;
  const previewable = isImageFile(file);

  return (
    <div
      className="fixed inset-y-0 right-0 left-60 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="제출 파일 미리보기"
    >
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-base font-semibold text-slate-800">제출 파일 미리보기</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {!file ? (
            <div className="flex h-40 items-center justify-center text-sm text-slate-400">
              제출된 파일이 없습니다.
            </div>
          ) : (
            <>
              {/* 파일 정보 */}
              <div className="mb-4 flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
                <span className="text-xl">📄</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{file.fileName}</p>
                  <p className="truncate text-xs text-slate-500">
                    {submission.studentName} · 제출 {submission.submittedAt ?? "-"}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-slate-400">{file.fileSize}</span>
              </div>

              {/* 미리보기 — 이미지만 */}
              {previewable ? (
                <div className="flex justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-900/90 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={file.fileUrl}
                    alt={`${submission.studentName} 제출 이미지`}
                    className="max-h-[50vh] w-auto object-contain"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
                  <span className="text-2xl">🗂️</span>
                  <p className="text-sm font-medium text-slate-600">
                    이미지 파일만 미리보기를 지원합니다.
                  </p>
                  <p className="text-xs text-slate-400">
                    원본을 다운로드해 확인해주세요. ({file.fileName.split(".").pop()?.toUpperCase()})
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <a
            href={file?.fileUrl ?? "#"}
            download={file?.fileName}
            aria-disabled={!file}
            className={`inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 ${
              !file ? "pointer-events-none opacity-50" : ""
            }`}
          >
            ⤓ 원본 다운로드
          </a>
          <Button
            size="lg"
            onClick={onClose}
            className="bg-slate-800 text-white hover:bg-slate-700"
          >
            닫기
          </Button>
        </div>
      </div>
    </div>
  );
}
