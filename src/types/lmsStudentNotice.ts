export interface NoticeAttachment {
  attachmentId: number;
  fileName: string;
  fileSize: number | null;
  downloadUrl: string;
}

export interface Notice {
  noticeId: number;
  lecAnnTitle: string;
  author: string;
  authorImageUrl?: string | null;
  professorLmsPrfId: number; // lmsAvatar 색 시드(작성 교수 LMS_PRF_ID) — 같은 교수는 어느 화면에서나 같은 색
  lecAnnRegDate: string;
  listDate: string;
  lecAnnContent: string;
  attachments: NoticeAttachment[];
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
