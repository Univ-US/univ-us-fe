// src/types/lmsProfessorAssignments.ts
// PLM-006 교수 "과제 관리" 타입 (BE 응답 형태)

// ── 타입 (BE 응답 형태) ────────────────────────────────────
/** 과목(강의) 드롭다운 1행 — 교수 담당 강의 */
export interface AssignmentLecture {
  lecId: number;
  courseName: string;
  lecSection: number | null;
  semYear: number; // SEMESTERS.SEM_YEAR
  semTerm: string; // SM1/SMR/SM2/WNT (공통코드 SEM_TERM)
  lecValStatus: string; // OPEN/PROG/CLSD/CNCL
}

/** 첨부 1건 — attachmentId는 수정 시 개별 제거 식별자 */
export interface AssignmentAttachment {
  attachmentId: number;
  fileName: string;
  fileExt: string | null;
  fileSize: number | null; // bytes
}

/** 과제 1건 — 제출/채점/수강생 집계 포함 */
export interface Assignment {
  assignmentId: number;
  lecId: number;
  courseName: string;
  lecSection: number | null;
  semYear: number; // SEMESTERS.SEM_YEAR
  semTerm: string; // 공통코드 SEM_TERM
  lecAsnTitle: string; // LECTURE_ASSIGNMENT.LEC_ASN_TITLE
  lecAsnContent: string | null; // LEC_ASN_CONTENT (Tiptap 에디터 HTML) — 목록 요약은 htmlToPlainText
  lecAsnDueDate: string; // LEC_ASN_DUE_DATE "YYYY-MM-DDTHH:mm" (input datetime-local 호환)
  lecAsnValStatus: string; // LEC_ASN_VAL_STATUS 코드
  submittedCount: number;
  totalStudents: number;
  ungradedCount: number;
  attachments: AssignmentAttachment[];
}

/** 등록/수정 공통 입력 — 첨부는 다중(추가/개별 제거, PLM-005 정책) */
export interface AssignmentSaveInput {
  lecId: number;
  title: string;
  description: string; // 에디터 HTML — 빈 문서("<p></p>")는 ""로 정규화 전달(BE가 null 저장)
  dueDate: string; // datetime-local 값
  files: File[];
  removeAttachmentIds?: number[];
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
