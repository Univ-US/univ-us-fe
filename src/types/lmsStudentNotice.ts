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
  lecAnnRegDate: string;
  listDate: string;
  featured?: boolean;
  lecAnnContent: string;
  attachments: NoticeAttachment[];
}
