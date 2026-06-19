// src/types/lmsProfessorNotice.ts
// PLM-007 공지사항 관리 타입 선언 (lmsProfessorNoticeApi.ts에서 분리)

/** 공지 작성 대상 = 담당 강의 1개 (BE LectureResDto). 배지·드롭다운은 truncateLectureName으로 축약 */
export interface NoticeLecture {
  lecId: number;
  courseName: string; // LECTURE_CODE.LEC_COD_NAME (전체 과목명 — BE는 짧은 이름 미제공)
  lecSection?: number; // 분반(LEC_SECTION)
  semYear: number; // SEM_YEAR
  semTerm: string; // SEM_TERM
}

/** 첨부파일 (LECTURE_ANNOUNCEMENT_ATTACHMENT) */
export interface NoticeAttachment {
  attachmentId: number;
  fileName: string;
  fileSize: number; // bytes (표시는 formatFileSize 정본)
}

/** 공지 1건 (BE NoticeResDto) — 목록·작성/수정 공용. 첨부는 ACT 전체 배열(없으면 빈 배열) */
export interface Notice {
  noticeId: number;
  lecId: number;
  courseName: string;
  lecSection?: number;
  semYear: number; // SEM_YEAR
  semTerm: string; // SEM_TERM
  lecAnnTitle: string; // LECTURE_ANNOUNCEMENT.LEC_ANN_TITLE
  lecAnnContent: string; // LEC_ANN_CONTENT (Tiptap HTML) — 표시 직전 sanitizeLmsHtml 정화
  author: string; // 작성 교수 MEMBER_NAME(예 "이민준") — 표시 시 "교수" 접미는 화면에서 부여
  lecAnnRegDate: string; // 등록일시 "2026-05-25 16:20" (LEC_ANN_REG_DATE)
  listDate: string; // 좌측 목록 축약 날짜 "05.25" (REG_DATE 파생)
  attachments: NoticeAttachment[];
}

/** 작성/수정 입력 */
export interface NoticeInput {
  lecId: number;
  title: string;
  content: string; // HTML
  files: File[]; // 신규 첨부
  removeAttachmentIds: number[]; // 수정 시 제거할 기존 첨부
}
