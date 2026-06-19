import api from "@/lib/api";
import type { Notice, NoticeAttachment } from "@/types/lmsStudentNotice";

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
