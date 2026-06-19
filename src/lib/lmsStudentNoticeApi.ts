import api from "@/lib/api";

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

const normalizeNotice = (notice: Notice): Notice => ({
  ...notice,
  lecAnnContent: notice.lecAnnContent ?? "",
  attachments: notice.attachments ?? [],
});

export const getStudentNotices = async (): Promise<Notice[]> => {
  const res = await api.get<Notice[]>("/api/lms/student/notices");
  return res.data.map(normalizeNotice);
};

export const downloadStudentNoticeAttachment = async (
  attachment: NoticeAttachment
): Promise<void> => {
  const res = await api.get(attachment.downloadUrl, { responseType: "blob" });
  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = attachment.fileName || "notice-attachment";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
