"use client";

// ─────────────────────────────────────────────────────────────
// [학생 LMS 모달] SLM-004-01 본인 제출 파일 미리보기
// - SLM-004(과제 내역) '제출'(채점 중) 행의 '파일 보기' 클릭 시 표시
// - 파일 정보 + 내용 미리보기(텍스트/코드) + 원본 다운로드
// - 학생 화면 = 에메랄드 톤(§13). 데이터(assignment)는 부모(페이지)가 주입 — 표시만 담당
// 🧪 mock-first: 다운로드는 BE 연동 전이라 안내만. 연동 시 axios(blob) 인증 다운로드로 교체.
// ─────────────────────────────────────────────────────────────
import useEscapeClose from "@/components/lms/useEscapeClose";
import {
  formatFileSize,
  type StudentAssignment,
} from "@/lib/lmsStudentAssignmentsApi";

interface StudentSubmissionPreviewDialogProps {
  open: boolean;
  assignment: StudentAssignment | null;
  onClose: () => void;
}

export default function StudentSubmissionPreviewDialog({
  open,
  assignment,
  onClose,
}: StudentSubmissionPreviewDialogProps) {
  useEscapeClose(open && !!assignment, onClose); // ESC = ✕ 버튼과 동일

  if (!open || !assignment) return null;
  const file = assignment.file;

  const handleDownload = () => {
    // 🧪 mock 단계 — 실제 파일이 없으므로 안내만. BE 연동 시 인증 blob 다운로드로 교체.
    window.alert("샘플 데이터입니다 (BE 연동 전) — 실제 파일 다운로드는 연동 후 동작합니다.");
  };

  return (
    <div
      // 사이드바(w-60=240px)를 제외한 본문 영역 기준 중앙 정렬 (left-60)
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
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
                <span className="text-xl">📄</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{file.fileName}</p>
                  <p className="truncate text-xs text-slate-500">
                    {assignment.title} · 제출 {assignment.submittedAt ?? "-"}
                    {assignment.status === "SBM" ? " · 채점 중" : ""}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-slate-400">{formatFileSize(file.fileSize)}</span>
              </div>

              {/* 내용 미리보기 (텍스트/코드만 — 그 외는 안내) */}
              {file.contentPreview ? (
                <pre className="mt-4 max-h-72 overflow-auto rounded-xl bg-slate-800 px-4 py-3 text-xs leading-relaxed text-slate-100">
                  <code>{file.contentPreview}</code>
                </pre>
              ) : (
                <p className="mt-4 rounded-xl bg-slate-50 px-4 py-6 text-center text-xs text-slate-400">
                  미리보기를 지원하지 않는 형식입니다. 다운로드해 확인하세요.
                </p>
              )}
            </>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={handleDownload}
            disabled={!file}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ⤓ 다운로드
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-emerald-700 px-5 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
