export type SubmitStatus = "OPEN" | "EXTENDED" | "CLOSED";

export interface SubmitGuide {
  courseName: string;
  professor: string;
  professorLmsPrfId: number;
  lines: string[];
}

export interface SubmitDraft {
  fileName: string;
  fileSize: number;
  memo: string;
}

export interface SubmitItem {
  id: number;
  semYear: number;
  semTerm: string;
  lecId: number;
  lecSection: number | null;
  lecAsnTitle: string;
  lecAsnContent: string | null;
  lecAsnRegDate: string;
  courseName: string;
  dueLabel: string;
  status: SubmitStatus;
  dDay: string | null;
  note?: string | null;
  badge?: string | null;
  dotColor: string;
  guide: SubmitGuide;
  draft?: SubmitDraft;
}

export interface SubmitAssignmentInput {
  file?: File | null; // 선택 — 파일 또는 메모 중 하나는 있어야 함
  memo?: string;
}

/** 서버 페이지네이션 공통 응답 (BE PaginateUtilRestApiRes<T>) */
export interface PageResponse<T> {
  content: T[];
  page: number; // 0-based
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

/** 제출 가능 과제 요약 — 사이드바 배지(전역 미제출 수) + 연도 필터 드롭다운 소스 */
export interface SubmittableSummary {
  totalCount: number;
  years: number[];
}
