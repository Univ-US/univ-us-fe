import api from "@/lib/api";
import type { Lecture, Notice, NoticeAttachment, PageResponse } from "@/types/lmsStudentNotice";

const normalizeNotice = (notice: Notice): Notice => ({
  ...notice,
  lecAnnContent: notice.lecAnnContent ?? "",
  attachments: notice.attachments ?? [],
});

/** GET 수강 과목(강의) 드롭다운 — 년도/학기/과목 필터 소스 */
export const getStudentNoticeLectures = async (): Promise<Lecture[]> => {
  const res = await api.get<Lecture[]>("/api/lms/student/notices/lectures");
  return res.data;
};

/** GET 선택 과목 공지 1페이지 (서버 페이지네이션). page 0-based */
export const getStudentNotices = async (params: {
  lecId: number;
  page: number;
  size: number;
}): Promise<PageResponse<Notice>> => {
  const res = await api.get<PageResponse<Notice>>("/api/lms/student/notices", {
    params: {
      lecId: String(params.lecId),
      page: String(params.page),
      size: String(params.size),
    },
  });
  return { ...res.data, content: (res.data.content ?? []).map(normalizeNotice) };
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
