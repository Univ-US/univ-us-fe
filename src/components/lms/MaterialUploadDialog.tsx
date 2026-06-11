"use client";

// ─────────────────────────────────────────────────────────────
// [모달] PLM-005-01 강의 자료 등록 모달 (+ 같은 모달로 수정 모드 지원)
// - '새 자료 업로드' 버튼 클릭 시 표시. 딤(바깥) 또는 X 클릭 시 닫힘(설계서 동작)
// - 본문 폼은 PLM-005 인라인 카드와 동일한 MaterialUploadForm 공유
// - 사이드바(w-60) 제외 본문 영역 기준 중앙 (기존 LMS 모달 컨벤션)
// ─────────────────────────────────────────────────────────────
import { Button } from "@/components/ui/button";
import MaterialUploadForm, {
  type MaterialFormResult,
} from "@/components/lms/MaterialUploadForm";
import type { CourseOption, LectureMaterial } from "@/lib/lmsProfessorUploadApi";

interface MaterialUploadDialogProps {
  open: boolean;
  courses: CourseOption[];
  edit?: LectureMaterial | null; // 있으면 수정 모드(폼 초기값 주입)
  onClose: () => void;
  onSubmit: (result: MaterialFormResult) => void;
}

export default function MaterialUploadDialog({
  open,
  courses,
  edit,
  onClose,
  onSubmit,
}: MaterialUploadDialogProps) {
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

        {/* 본문 — 공용 폼 (취소 = 모달 닫기) */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <MaterialUploadForm
            courses={courses}
            mode={edit ? "edit" : "create"}
            initial={
              edit
                ? {
                    courseId: edit.courseId,
                    title: edit.title,
                    description: edit.description,
                  }
                : undefined
            }
            initialFileName={edit?.fileName}
            onSubmit={onSubmit}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
}
