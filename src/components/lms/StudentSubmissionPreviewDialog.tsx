"use client";

// ─────────────────────────────────────────────────────────────
// [학생 LMS 모달] SLM-004-01 본인 제출 수정
// - SLM-004(과제 내역) '제출'(채점 중) 행의 '수정' 클릭 시 표시
// - 제출 메모 편집 + 기존 첨부 삭제(✕) + 새 파일 업로드(과제 제출 SLM-007 업로드 영역과 동일) + 다운로드
// - 학생 화면 = 에메랄드 톤(§13). 데이터(assignment)는 부모(페이지)가 주입.
// 🧪 mock-first: 저장·다운로드는 BE 연동 전이라 안내만(연동 시 axios — 메모/첨부 UPDATE·blob 다운로드).
//   수정 가능 = 마감 전까지(서버 시각 기준) · 첨부 삭제 = ATT_VAL_STATUS=DEL 소프트삭제.
// ─────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import useEscapeClose from "@/components/lms/useEscapeClose";
import { formatFileSize, type StudentAssignment } from "@/lib/lmsStudentAssignmentsApi";
import {
  UPLOAD_ACCEPT,
  UPLOAD_ALLOWED_EXTS,
  UPLOAD_MAX_SIZE,
  fileExtOf,
} from "@/lib/lmsProfessorUploadApi";

// 업로드 안내 문구·메모 한도 = 과제 제출(SLM-007)과 동일
const FILE_ACCEPT_HINT =
  "영상(MP4·AVI·MOV·WMV) · 음성(MP3·M4A·WAV) · 문서(PDF·HWP·DOC·PPT·XLS·TXT) · 이미지(JPG·PNG·GIF) · ZIP — 최대 5GB";
const MEMO_MAX = 1000; // DB LEC_ASN_SBM_MEMO VARCHAR2(1000)

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
  const [memo, setMemo] = useState("");
  const [keepExisting, setKeepExisting] = useState(true); // 기존 첨부 유지(✕ 누르면 제거 예약)
  const [newFile, setNewFile] = useState<{ name: string; size: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEscapeClose(open && !!assignment, onClose); // ESC = 닫기

  // 열릴 때마다 대상 과제 기준으로 초기화
  useEffect(() => {
    if (open && assignment) {
      setMemo(assignment.submissionMemo ?? "");
      setKeepExisting(true);
      setNewFile(null);
      setDragOver(false);
    }
  }, [open, assignment]);

  if (!open || !assignment) return null;
  const file = assignment.file;

  // 변경 사항(메모 편집·기존 첨부 삭제·새 파일 추가)이 있을 때만 '수정 완료' 활성
  const dirty =
    memo !== (assignment.submissionMemo ?? "") || (!!file && !keepExisting) || newFile !== null;

  // 파일 선택/드롭 검증 — 과제 제출(SLM-007)과 동일(허용 확장자 22종·단일 5GB)
  const pickFiles = (list: FileList | null) => {
    const f = list?.[0];
    if (!f) return;
    if (!UPLOAD_ALLOWED_EXTS.includes(fileExtOf(f.name))) {
      window.alert(
        `'${f.name}' — 허용되지 않는 파일 형식입니다.\n영상(MP4·AVI·MOV·WMV)·음성(MP3·M4A·WAV)·문서(PDF·HWP·DOC·PPT·XLS·TXT)·이미지(JPG·PNG·GIF)·ZIP만 제출할 수 있습니다.`
      );
      return;
    }
    if (f.size > UPLOAD_MAX_SIZE) {
      window.alert(
        `파일 용량 제한을 초과했습니다. 최대 5GB까지 제출할 수 있습니다.\n(선택한 파일: ${f.name} · ${formatFileSize(f.size)})`
      );
      return;
    }
    setNewFile({ name: f.name, size: f.size });
  };

  const handleDownload = () => {
    // 🧪 mock 단계 — 실제 파일이 없으므로 안내만. BE 연동 시 인증 blob 다운로드로 교체.
    window.alert("샘플 데이터입니다 (BE 연동 전) — 실제 파일 다운로드는 연동 후 동작합니다.");
  };

  const handleSave = () => {
    // 🧪 mock 단계 — 실제 저장 없음. BE 연동 시 메모/첨부 UPDATE(axios) + 목록 재조회.
    window.alert("샘플 데이터입니다 (BE 연동 전) — 실제로 저장되지 않습니다.");
    onClose();
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
        {/* 헤더 — ✕ 제거(닫기는 푸터 버튼 / ESC로 처리) */}
        <div className="flex items-center border-b border-slate-100 px-6 py-4">
          <h3 className="text-base font-semibold text-slate-800">수정</h3>
        </div>

        {/* 본문 — 제출 파일(기존 첨부 삭제 + 새 파일 업로드) + 제출 메모(편집) */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <label className="text-sm font-semibold text-slate-700">제출 파일</label>

          {/* 기존 첨부 — 다운로드 + ✕ 삭제 */}
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
                onClick={handleDownload}
                className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                ⤓ 다운로드
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

          {/* 기존 첨부 삭제 예약 안내 (되돌리기) */}
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

          {/* 새 파일 업로드 드롭존 — 과제 제출(SLM-007)과 동일 */}
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

          {/* 새로 추가한 파일 */}
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

          {/* 제출 메모 — 편집 가능 (DB LEC_ASN_SBM_MEMO VARCHAR2(1000)) */}
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
        </div>

        {/* 푸터 — 닫기(취소) / 수정 완료 */}
        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-emerald-700 px-5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-emerald-700"
          >
            수정 완료
          </button>
        </div>
      </div>
    </div>
  );
}
