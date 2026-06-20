// ─────────────────────────────────────────────────────────────
// LMS 리치텍스트 정화/변환 유틸 (Tiptap 트라이얼)
// - DOMPurify는 브라우저 DOM 필요 → 클라이언트 컴포넌트에서만 호출 전제
// - 표시 직전 sanitize가 원칙: 에디터 산출물이라도 저장·전송 경로 오염에 대비해 항상 거친다
// ─────────────────────────────────────────────────────────────
import DOMPurify from "dompurify";

// HTML 정화 — 학생 뷰(추후)·미리보기 등 모든 리치텍스트 출력 직전에 사용
export const sanitizeLmsHtml = (html: string): string =>
  DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });

// HTML → plain text (목록 부제 등 요약 표시용). 빌드 프리렌더(window 없음)에서는 태그 제거 폴백.
export const htmlToPlainText = (html: string): string => {
  if (!html) return "";
  if (typeof window === "undefined") return html.replace(/<[^>]*>/g, "").trim();
  const doc = new DOMParser().parseFromString(sanitizeLmsHtml(html), "text/html");
  return (doc.body.textContent ?? "").replace(/\s+/g, " ").trim();
};
