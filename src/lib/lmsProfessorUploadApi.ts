// src/lib/lmsProfessorUploadApi.ts
// PLM-005 / PLM-005-01 교수 "강의 업로드" API 클라이언트 + 타입
// ─────────────────────────────────────────────────────────────
// BE 공식 연동(2026-06-11) — mock 제거. 전부 본인 강의 한정(타 강의/자료 403).
//  · GET    /api/lms/professor/uploads/lectures        (등록 폼 과목 드롭다운 — 담당 강의)
//  · GET    /api/lms/professor/uploads                 (자료 목록, 최신순 — 페이지네이션은 FE 슬라이싱)
//  · POST   /api/lms/professor/uploads                 (multipart: lecId·title 필수, content·files[다중] 선택 — 텍스트만 등록 가능)
//  · PUT    /api/lms/professor/uploads/{uploadId}      (multipart: files=추가 첨부, removeAttachmentIds=기존 첨부 개별 제거)
//  · DELETE /api/lms/professor/uploads/{uploadId}
// ⚠️ 실패 시 가짜 데이터로 가리지 않는다 — 페이지가 describeApiError로 "에러 상태"를 표기한다.
// ⚠️ content = Tiptap 에디터 HTML 문자열(CLOB). 목록 요약 표시는 htmlToPlainText(lmsSanitize) 사용.
// ─────────────────────────────────────────────────────────────
import api from "@/lib/api";

// ── 타입 (BE 응답 형태) ────────────────────────────────────
/** 과목(강의) 드롭다운 1행 — 교수 담당 강의. 라벨은 FE가 SEM_TERM 공통코드로 매핑 */
export interface Lecture {
  lecId: number;
  courseName: string;        // LECTURE_CODE.LEC_COD_NAME
  lecSection: number | null; // 분반
  year: number;              // SEMESTERS.SEM_YEAR
  termCode: string;          // SM1/SM2/SMR/WNT (공통코드 SEM_TERM)
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
  year: number;     // 강의 학기 연도 (SEMESTERS.SEM_YEAR) — 목록 년도/학기 필터용 (2026-06-11 추가)
  termCode: string; // SM1/SMR/SM2/WNT (공통코드 SEM_TERM — 라벨은 termMap 매핑)
  title: string;
  content: string | null; // 에디터 HTML
  uploadedAt: string;     // "YYYY-MM-DD"
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

// ── 업로드 제약 (BE LmsProfessorUploadServiceImpl과 동일 기준 — 변경 시 양쪽 동시 수정) ──
export const UPLOAD_ALLOWED_EXTS = [
  "mp4", "avi", "mov", "wmv",
  "mp3", "m4a", "wav",
  "pdf", "hwp", "hwpx", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "txt",
  "jpg", "jpeg", "png", "gif",
  "zip",
];
export const UPLOAD_MAX_SIZE = 5 * 1024 * 1024 * 1024; // 5GB
export const UPLOAD_MAX_FILENAME = 255; // LEC_UPL_ATT_ORG_FIL_NAME VARCHAR2(255 CHAR)
export const UPLOAD_MAX_TITLE = 500; // LEC_UPL_TITLE VARCHAR2(500 CHAR) — BE @Size(500)와 동일
export const UPLOAD_ACCEPT = UPLOAD_ALLOWED_EXTS.map((e) => `.${e}`).join(",");

export const fileExtOf = (name: string): string => {
  const i = name.lastIndexOf(".");
  return i < 0 ? "" : name.slice(i + 1).toLowerCase();
};

export const isVideoExt = (ext: string) => ["mp4", "avi", "mov", "wmv"].includes(ext);

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "-";
  const GB = 1024 ** 3;
  const MB = 1024 ** 2;
  const KB = 1024;
  if (bytes >= GB) return `${(bytes / GB).toFixed(1)}GB`;
  if (bytes >= MB) {
    const v = bytes / MB;
    return v >= 100 ? `${Math.round(v)}MB` : `${v.toFixed(1)}MB`;
  }
  if (bytes >= KB) return `${Math.round(bytes / KB)}KB`;
  return `${bytes}B`;
}

// ── API 호출 ───────────────────────────────────────────────
/** GET 등록 폼 과목(강의) 드롭다운 */
export const getUploadLectures = async (): Promise<Lecture[]> => {
  const res = await api.get<Lecture[]>("/api/lms/professor/uploads/lectures");
  return res.data;
};

/** GET 자료 목록 (담당 강의 전체, 최신순) */
export const getUploads = async (): Promise<Material[]> => {
  const res = await api.get<Material[]>("/api/lms/professor/uploads");
  return res.data;
};

/* multipart 진행률(0~100) 콜백 — total을 모르는 환경이면 호출 생략 */
const progressConfig = (onProgress?: (pct: number) => void) => ({
  headers: { "Content-Type": "multipart/form-data" },
  onUploadProgress: (e: { loaded: number; total?: number }) => {
    if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
  },
});

/** POST 자료 등록 (files 선택·다중 — 없으면 텍스트만 등록) → 생성된 자료 반환 */
export const createUpload = async (
  lecId: number,
  input: MaterialSaveInput,
  onProgress?: (pct: number) => void
): Promise<Material> => {
  const formData = new FormData();
  formData.append("lecId", String(lecId));
  formData.append("title", input.title);
  formData.append("content", input.content);
  input.files.forEach((f) => formData.append("files", f));
  const res = await api.post<Material>("/api/lms/professor/uploads", formData, progressConfig(onProgress));
  return res.data;
};

/** PUT 자료 수정 — files=추가 첨부(기존 유지+추가) / removeAttachmentIds=기존 첨부 개별 제거 */
export const updateUpload = async (
  uploadId: number,
  input: MaterialSaveInput,
  onProgress?: (pct: number) => void
): Promise<Material> => {
  const formData = new FormData();
  formData.append("title", input.title);
  formData.append("content", input.content);
  input.files.forEach((f) => formData.append("files", f));
  (input.removeAttachmentIds ?? []).forEach((id) =>
    formData.append("removeAttachmentIds", String(id))
  );
  const res = await api.put<Material>(
    `/api/lms/professor/uploads/${uploadId}`,
    formData,
    progressConfig(onProgress)
  );
  return res.data;
};

/** DELETE 자료 삭제 (첨부 포함) */
export const deleteUpload = async (uploadId: number): Promise<void> => {
  await api.delete(`/api/lms/professor/uploads/${uploadId}`);
};
