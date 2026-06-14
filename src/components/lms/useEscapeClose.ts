"use client";

// ─────────────────────────────────────────────────────────────
// [공용 훅] LMS 모달 ESC 닫기
// - ESC 키를 헤더의 ✕(닫기) 버튼 클릭과 동일하게 처리
// - active(모달 열림 + 닫기 가능한 상태)인 동안만 document keydown 구독
// - 적용 범위: 우리(khy)가 만든 PLM·SLM 모달 4종
//   (ProfessorMaterialUploadDialog · ImageCropDialog · StudentReportDialog · ProfessorSubmissionPreviewDialog)
//   — 타 도메인(커뮤니티 등) 모달에는 적용하지 않음
// ─────────────────────────────────────────────────────────────
import { useEffect } from "react";

export default function useEscapeClose(active: boolean, onClose: () => void) {
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [active, onClose]);
}
