// src/lib/lmsProfessorNoticeApi.ts
// PLM-007 공지사항 관리 — 교수가 담당 강의 공지를 작성·수정·삭제 (좌 목록 선택 → 우 상세)
// ─────────────────────────────────────────────────────────────
// BE 공식 연동 — mock 제거. 전부 본인 담당 강의 한정(타 강의/공지 403, PROF 가드).
//   · GET    /api/lms/professor/notices/lectures   — 공지 작성 대상(담당 강의 드롭다운)
//   · GET    /api/lms/professor/notices?lecId=&page=&size= — 선택 과목 공지 1페이지(최신순, 서버 페이지네이션)
//   · POST   /api/lms/professor/notices             — 작성(multipart: lecId·title 필수, content·files 선택)
//   · PUT    /api/lms/professor/notices/{noticeId}  — 수정(multipart: title·content·files[추가]·removeAttachmentIds[제거], 과목 변경 불가)
//   · DELETE /api/lms/professor/notices/{noticeId}  — 삭제(첨부 → 본체 물리 삭제)
// 실패 시 가짜 데이터로 가리지 않음 — 페이지가 에러 상태를 표기(throw 그대로 전파).
// content = Tiptap 에디터 HTML(CLOB). 표시 직전 sanitizeLmsHtml 정화(XSS 방지, PLM-005 패턴).
//   · 이 화면(교수 write) ↔ SLM-009 학생 공지(read)는 같은 LECTURE_ANNOUNCEMENT 데이터.
// 첨부 다운로드 엔드포인트는 BE 미구현 → 상세 화면 다운로드는 준비 중(추후 인증 blob, PLM-004-01 패턴).
// ─────────────────────────────────────────────────────────────
import api from "@/lib/api";
import type {
  Notice,
  NoticeLecture,
  NoticeInput,
  PageResponse,
} from "@/types/lmsProfessorNotice";

// 타입은 src/types/lmsProfessorNotice.ts로 분리 — 기존 소비처가 이 lib에서 type import하던 호환 유지(re-export)
export type {
  NoticeLecture,
  NoticeAttachment,
  Notice,
  NoticeInput,
} from "@/types/lmsProfessorNotice";

export const TERM_LABEL: Record<string, string> = {
  SM1: "1학기",
  SMR: "여름 계절",
  SM2: "2학기",
  WNT: "겨울 계절",
};

// LECTURE_ANNOUNCEMENT 컬럼 한도 / 첨부 정책
export const NOTICE_MAX_TITLE = 200; // LECTURE_ANNOUNCEMENT.LEC_ANN_TITLE VARCHAR2(200)
export const NOTICE_MAX_CONTENT = 4000; // 에디터 텍스트 4000자(HTML은 BE @Size 가드)
export const NOTICE_MAX_FILENAME = 255;
// 첨부 전체 합계 용량 제한 = 100MB (파일당 아님). 공지=문서/이미지 위주라 강의자료/과제 5GB와 별도.
// BE도 서비스단에서 합계 100MB로 검증(멀티파트 글로벌 5GB와 다름).
export const NOTICE_MAX_TOTAL_SIZE = 100 * 1024 * 1024; // 100MB (첨부 합계)
// 첨부 허용 확장자 (LECTURE_ANNOUNCEMENT_ATTACHMENT — 문서·이미지·압축)
export const NOTICE_ALLOWED_EXTS = [
  "pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "hwp", "hwpx", "txt",
  "png", "jpg", "jpeg", "gif", "zip",
];
export const NOTICE_ACCEPT = NOTICE_ALLOWED_EXTS.map((e) => `.${e}`).join(",");

export const fileExtOf = (name: string): string => {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
};

// content(CLOB null 가능)·attachments(없으면 빈 배열) 방어 정규화
const normalizeNotice = (n: Notice): Notice => ({
  ...n,
  lecAnnContent: n.lecAnnContent ?? "",
  attachments: n.attachments ?? [],
});

/** GET /notices/lectures — 공지 작성 대상(담당 강의) */
export const getNoticeLectures = async (): Promise<NoticeLecture[]> => {
  const res = await api.get<NoticeLecture[]>("/api/lms/professor/notices/lectures");
  return res.data;
};

/** GET /notices?lecId=&page=&size= — 선택 과목 공지 1페이지(등록일시 내림차순=최신순, 서버 페이지네이션) */
export const getCourseNotices = async (params: {
  lecId: number;
  page: number;
  size: number;
}): Promise<PageResponse<Notice>> => {
  const res = await api.get<PageResponse<Notice>>("/api/lms/professor/notices", {
    params: {
      lecId: String(params.lecId),
      page: String(params.page),
      size: String(params.size),
    },
  });
  return { ...res.data, content: (res.data.content ?? []).map(normalizeNotice) };
};

/** POST /notices — 작성 (multipart: lecId·title·content·files) */
export const createNotice = async (input: NoticeInput): Promise<Notice> => {
  const formData = new FormData();
  formData.append("lecId", String(input.lecId));
  formData.append("lecAnnTitle", input.title); // BE CreateReqDto/UpdateReqDto.lecAnnTitle (멀티파트 form key)
  formData.append("lecAnnContent", input.content); // BE *.lecAnnContent
  input.files.forEach((f) => formData.append("files", f));
  const res = await api.post<Notice>("/api/lms/professor/notices", formData);
  return normalizeNotice(res.data);
};

/** PUT /notices/{id} — 수정 (과목 변경 불가 → lecId 미전송. files=추가 / removeAttachmentIds=제거) */
export const updateNotice = async (noticeId: number, input: NoticeInput): Promise<Notice> => {
  const formData = new FormData();
  formData.append("lecAnnTitle", input.title); // BE CreateReqDto/UpdateReqDto.lecAnnTitle (멀티파트 form key)
  formData.append("lecAnnContent", input.content); // BE *.lecAnnContent
  input.files.forEach((f) => formData.append("files", f));
  input.removeAttachmentIds.forEach((id) => formData.append("removeAttachmentIds", String(id)));
  const res = await api.put<Notice>(`/api/lms/professor/notices/${noticeId}`, formData);
  return normalizeNotice(res.data);
};

/** DELETE /notices/{id} — 삭제 */
export const deleteNotice = async (noticeId: number): Promise<void> => {
  await api.delete(`/api/lms/professor/notices/${noticeId}`);
};

/** GET /notices/attachments/{id}/file — 첨부 다운로드 (인증 필요 → blob).
 *  <a download>는 JWT 헤더를 못 실으므로 axios(blob, 인터셉터가 Bearer 부착)로 받아 저장(PLM-004-01 패턴). */
export const downloadNoticeAttachment = async (attachmentId: number, fileName: string): Promise<void> => {
  const res = await api.get(`/api/lms/professor/notices/attachments/${attachmentId}/file`, {
    responseType: "blob",
  });
  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
