// src/types/lmsProfessorUpload.ts
// PLM-005 / PLM-005-01 교수 "강의 업로드" 타입 (lib/lmsProfessorUploadApi.ts에서 분리)

// ── 타입 (BE 응답 형태) ────────────────────────────────────
/** 과목(강의) 드롭다운 1행 — 교수 담당 강의. 라벨은 FE가 SEM_TERM 공통코드로 매핑 */
export interface Lecture {
  lecId: number;
  courseName: string;        // LECTURE_CODE.LEC_COD_NAME
  lecSection: number | null; // 분반
  semYear: number;           // SEMESTERS.SEM_YEAR
  semTerm: string;           // SM1/SM2/SMR/WNT (공통코드 SEM_TERM)
  lecValStatus: string;      // OPEN/PROG/CLSD/CNCL (공통코드 LEC_VAL_STATUS)
}

/** 첨부 1건 — attachmentId는 수정 시 개별 제거 식별자 */
export interface Attachment {
  attachmentId: number;
  fileName: string;
  fileExt: string | null; // 소문자 확장자 문자열 ("mp4"/"pdf" — MIME 아님)
  fileSize: number | null; // bytes
}

/** 강의 자료 1건 — 첨부는 유효(ACT) 전체 배열(다중 첨부, 없으면 빈 배열) */
export interface Material {
  uploadId: number;
  lecId: number;
  courseName: string;
  lecSection: number | null; // LECTURE.LEC_SECTION 분반 (2026-06-13 추가 — 목록 분반 컬럼)
  semYear: number;     // 강의 학기 연도 (SEMESTERS.SEM_YEAR) — 목록 년도/학기 필터용
  semTerm: string;     // SM1/SMR/SM2/WNT (공통코드 SEM_TERM — 라벨은 termMap 매핑)
  lecUplTitle: string;      // LECTURE_UPLOADING.LEC_UPL_TITLE
  lecUplContent: string | null; // LEC_UPL_CONTENT (에디터 HTML)
  lecUplRegDate: string;    // LEC_UPL_REG_DATE "YYYY-MM-DD"
  attachments: Attachment[];
}

/** 등록/수정 공통 입력 — 첨부 다중(2026-06-11 정책: 교체 없음, 추가/개별 제거)
 *  · files: 등록=전체 첨부 / 수정=추가할 새 파일들(기존 유지에 더해짐)
 *  · removeAttachmentIds: 수정 전용 — 제거할 기존 첨부 ID들 */
export interface MaterialSaveInput {
  title: string;
  content: string; // 빈 문서는 "" 로 정규화해서 전달 (BE가 null 저장)
  files: File[];
  removeAttachmentIds?: number[];
}

/** 서버 페이지네이션 공통 응답 (BE PageResponse<T>) */
export interface PageResponse<T> {
  content: T[];
  page: number; // 0-based
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

/** 목록 필터 옵션용 학기 (자료 보유 년도/학기) */
export interface SemesterOption {
  semYear: number;
  semTerm: string;
}

/** 목록 메타 — 전체 건수(필터 무관) + 필터 옵션 */
export interface UploadMeta {
  totalAll: number;
  semesters: SemesterOption[];
}
