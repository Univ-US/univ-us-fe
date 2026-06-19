"use client";

// ─────────────────────────────────────────────────────────────
// [모달] PLM-005-01 강의 자료 등록 모달 (+ 같은 모달로 수정 모드 지원)
// - '새 자료 업로드' 버튼 클릭 시 표시. 딤(바깥)·X 클릭·ESC 키 시 닫힘(설계서 동작 + ESC=X 동일 처리)
// - 본문 폼(ProfessorMaterialUploadForm)이 BE 호출까지 수행 — 성공 시 onSubmit(저장된 자료)로 페이지에 통지
// - 사이드바(w-60) 제외 본문 영역 기준 중앙 (기존 LMS 모달 컨벤션)
// ─────────────────────────────────────────────────────────────
import { Button } from "@/components/ui/button";
import ProfessorMaterialUploadForm from "@/components/lms/ProfessorMaterialUploadForm";
import useEscapeClose from "@/components/lms/useEscapeClose";
import type { Lecture, Material } from "@/types/lmsProfessorUpload";

interface ProfessorMaterialUploadDialogProps {
  open: boolean;
  lectures: Lecture[];
  termMap: Record<string, string>; // SEM_TERM 공통코드 라벨 맵
  edit?: Material | null; // 있으면 수정 모드(폼 초기값 주입)
  onClose: () => void;
  onSubmit: (saved: Material) => void; // BE 저장 성공 시 (페이지가 목록 재조회)
}

export default function ProfessorMaterialUploadDialog({
  open,
  lectures,
  termMap,
  edit,
  onClose,
  onSubmit,
}: ProfessorMaterialUploadDialogProps) {
  useEscapeClose(open, onClose); // ESC = ✕ 버튼과 동일

  if (!open) return null;

  return (
    <div
      className="fixed inset-y-0 right-0 left-60 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={edit ? "강의 자료 수정" : "새 강의 자료 등록"}
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-base font-semibold text-slate-800">
            {edit ? "강의 자료 수정" : "새 강의 자료 등록"}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="닫기"
            className="h-7 w-7 p-0 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </Button>
        </div>

        {/* 본문 — 폼이 BE 호출 수행 (취소 = 모달 닫기) */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <ProfessorMaterialUploadForm
            lectures={lectures}
            termMap={termMap}
            mode={edit ? "edit" : "create"}
            initial={
              edit
                ? {
                    lecId: edit.lecId,
                    title: edit.lecUplTitle,
                    content: edit.lecUplContent ?? "",
                  }
                : undefined
            }
            initialAttachments={edit?.attachments ?? []}
            editUploadId={edit?.uploadId}
            onSubmit={onSubmit}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
}
