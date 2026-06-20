export interface NoticeAttachment {
  attachmentId: number;
  fileName: string;
  fileSize: number | null;
  downloadUrl: string;
}

export interface Notice {
  noticeId: number;
  semYear: number;
  semTerm: string;
  semesterLabel: string;
  lecId: number;
  lecSection?: number | null;
  courseName: string;
  courseFullName: string;
  lecAnnTitle: string;
  author: string;
  authorImageUrl?: string | null;
  professorLmsPrfId: number; // lmsAvatar 색 시드(작성 교수 LMS_PRF_ID) — 같은 교수는 어느 화면에서나 같은 색
  lecAnnRegDate: string;
  listDate: string;
  featured?: boolean;
  lecAnnContent: string;
  attachments: NoticeAttachment[];
}
