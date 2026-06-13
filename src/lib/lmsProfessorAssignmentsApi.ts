// src/lib/lmsProfessorAssignmentsApi.ts
// PLM-006 교수 "과제 관리" API 클라이언트 + 타입
// ─────────────────────────────────────────────────────────────
// BE 공식 연동(2026-06-13). 전부 본인 강의 한정(타 강의/과제 403).
//  · GET    /api/lms/professor/assignments/lectures   (등록 폼 과목 드롭다운 — 담당 강의)
//  · GET    /api/lms/professor/assignments            (과제 목록 + 제출/채점/수강생 집계 + 첨부)
//  · POST   /api/lms/professor/assignments            (multipart: lecId·title·dueDate 필수, description·files 선택)
//  · PUT    /api/lms/professor/assignments/{id}       (multipart: files=추가 첨부, removeAttachmentIds=개별 제거)
//  · DELETE /api/lms/professor/assignments/{id}
// ⚠️ 만점 = 100 고정(스키마 미보유, 2026-06-12 확정). valStatus = 공통코드 LEC_ASN_VAL_STATUS.
// ⚠️ 실패 시 가짜 데이터로 가리지 않는다 — 페이지가 describeApiError로 "에러 상태"를 표기한다.
// ─────────────────────────────────────────────────────────────
import api from "@/lib/api";

// ── 타입 (BE 응답 형태) ────────────────────────────────────
/** 과목(강의) 드롭다운 1행 — 교수 담당 강의 */
export interface AssignmentLecture {
  lecId: number;
  courseName: string;
  lecSection: number | null;
  year: number;
  termCode: string; // SM1/SMR/SM2/WNT
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
  year: number;
  termCode: string;
  title: string;
  description: string | null; // Tiptap 에디터 HTML — 목록 요약은 htmlToPlainText
  dueDate: string; // "YYYY-MM-DDTHH:mm" (input datetime-local 호환)
  valStatus: string; // LEC_ASN_VAL_STATUS 코드
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

// ── 제약 (BE LmsProfessorAssignmentServiceImpl과 동일 기준 — 변경 시 양쪽 동시 수정) ──
export const ASSIGNMENT_ALLOWED_EXTS = [
  "mp4", "avi", "mov", "wmv",
  "mp3", "m4a", "wav",
  "pdf", "hwp", "hwpx", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "txt",
  "jpg", "jpeg", "png", "gif",
  "zip",
];
export const ASSIGNMENT_ACCEPT = ASSIGNMENT_ALLOWED_EXTS.map((e) => `.${e}`).join(",");
export const ASSIGNMENT_MAX_FILENAME = 255;
export const ASSIGNMENT_MAX_TITLE = 200; // LEC_ASN_TITLE VARCHAR2(200)
export const ASSIGNMENT_MAX_DESC = 4000; // 에디터 텍스트 4000자(HTML은 BE @Size(20000) 가드)

export const fileExtOf = (name: string): string => {
  const i = name.lastIndexOf(".");
  return i < 0 ? "" : name.slice(i + 1).toLowerCase();
};

/** ⚠️ 임시 라벨 — TODO: GET /api/common-codes/LEC_ASN_VAL_STATUS 정본 라벨로 교체(PLM-003/004 termMap 패턴) */
export const ASN_STATUS_LABEL: Record<string, string> = {
  AVL: "진행 중",
  MOD: "수정됨",
  LAT: "지각 허용",
  CLS: "마감",
  NOP: "비공개",
};

/** ⚠️ 임시 라벨 — TODO: 공통코드 SEM_TERM 매핑으로 교체 */
export const TERM_LABEL: Record<string, string> = {
  SM1: "1학기",
  SMR: "여름 계절학기",
  SM2: "2학기",
  WNT: "겨울 계절학기",
};

/* multipart 진행률(0~100) 콜백 — total 미상이면 호출 생략 */
const progressConfig = (onProgress?: (pct: number) => void) => ({
  headers: { "Content-Type": "multipart/form-data" },
  onUploadProgress: (e: { loaded: number; total?: number }) => {
    if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
  },
});

// ── API 호출 ───────────────────────────────────────────────
/** GET 등록 폼 과목(강의) 드롭다운 */
export const getAssignmentLectures = async (): Promise<AssignmentLecture[]> => {
  const res = await api.get<AssignmentLecture[]>("/api/lms/professor/assignments/lectures");
  return res.data;
};

/** GET 과제 목록 (담당 강의 전체 — 학기 필터·그룹핑은 FE 클라이언트) */
export const getAssignments = async (): Promise<Assignment[]> => {
  const res = await api.get<Assignment[]>("/api/lms/professor/assignments");
  return res.data;
};

/** POST 과제 등록 → 생성된 과제 반환 */
export const createAssignment = async (
  input: AssignmentSaveInput,
  onProgress?: (pct: number) => void
): Promise<Assignment> => {
  const fd = new FormData();
  fd.append("lecId", String(input.lecId));
  fd.append("title", input.title);
  fd.append("dueDate", input.dueDate);
  fd.append("description", input.description);
  input.files.forEach((f) => fd.append("files", f));
  const res = await api.post<Assignment>("/api/lms/professor/assignments", fd, progressConfig(onProgress));
  return res.data;
};

/** PUT 과제 수정 — files=추가 첨부 / removeAttachmentIds=기존 첨부 개별 제거 (과목 변경 불가) */
export const updateAssignment = async (
  assignmentId: number,
  input: AssignmentSaveInput,
  onProgress?: (pct: number) => void
): Promise<Assignment> => {
  const fd = new FormData();
  fd.append("title", input.title);
  fd.append("dueDate", input.dueDate);
  fd.append("description", input.description);
  input.files.forEach((f) => fd.append("files", f));
  (input.removeAttachmentIds ?? []).forEach((id) => fd.append("removeAttachmentIds", String(id)));
  const res = await api.put<Assignment>(
    `/api/lms/professor/assignments/${assignmentId}`,
    fd,
    progressConfig(onProgress)
  );
  return res.data;
};

/** DELETE 과제 삭제 (첨부 포함) */
export const deleteAssignment = async (assignmentId: number): Promise<void> => {
  await api.delete(`/api/lms/professor/assignments/${assignmentId}`);
};
