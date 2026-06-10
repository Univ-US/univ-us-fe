"use client";

// ─────────────────────────────────────────────────────────────
// [공용 모달 컴포넌트] PLM-004-01 제출 파일 미리보기 다이얼로그
// - PLM-004(채점 현황) 채점 행의 '보기' 클릭 시 표시
// - ⭐ 설계 변경(2026-06-10): 파일 상세 내용 미리보기 영역 제거 → 파일 정보 + 원본 다운로드만 제공.
// - 데이터(submission)는 부모(페이지)가 주입 — 표시만 담당
// ─────────────────────────────────────────────────────────────
import { Button } from "@/components/ui/button";
import { type Submission } from "@/lib/lmsProfessorGradingApi";

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
            // 파일 정보만 표시 — 상세 내용 미리보기 영역은 설계 변경으로 제거됨
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
              <span className="text-xl">📄</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">{file.fileName}</p>
                <p className="truncate text-xs text-slate-500">
                  {submission.studentName} · 제출 {submission.submittedAt ?? "-"}
                </p>
              </div>
              <span className="shrink-0 text-xs text-slate-400">{file.fileSize}</span>
            </div>
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
