export type LockedReason = "expired" | "restricted";

export interface Attachment {
  attachmentId: number;
  fileName: string;
  fileExt: string | null;
  fileSize: number | null;
}

export interface Material {
  uploadId: number;
  lecUplTitle: string;
  lecUplContent: string | null;
  lecUplRegDate: string;
  attachments: Attachment[];
  downloadable: boolean;
  lockedReason?: LockedReason | null;
}

/** 수강 과목(강의) 드롭다운 1행 — 라벨은 FE가 SEM_TERM 공통코드로 매핑 */
export interface Lecture {
  lecId: number;
  courseName: string;
  lecSection: number | null;
  semYear: number;
  semTerm: string;
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
