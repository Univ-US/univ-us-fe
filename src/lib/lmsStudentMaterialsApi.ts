import api from "@/lib/api";
import type { Lecture, Material, PageResponse } from "@/types/lmsStudentMaterials";

const normalizeMaterial = (material: Material): Material => ({
  ...material,
  lecUplContent: material.lecUplContent ?? "",
  attachments: material.attachments ?? [],
  downloadable: material.downloadable ?? true,
  lockedReason: material.lockedReason ?? null,
});

/** GET 수강 과목(강의) 드롭다운 — 년도/학기/과목 필터 소스 */
export const getStudentMaterialLectures = async (): Promise<Lecture[]> => {
  const res = await api.get<Lecture[]>("/api/lms/student/materials/lectures");
  return res.data;
};

/** GET 선택 과목 자료 1페이지 (서버 페이지네이션). page 0-based */
export const getStudentMaterials = async (params: {
  lecId: number;
  page: number;
  size: number;
}): Promise<PageResponse<Material>> => {
  const res = await api.get<PageResponse<Material>>("/api/lms/student/materials", {
    params: {
      lecId: String(params.lecId),
      page: String(params.page),
      size: String(params.size),
    },
  });
  return { ...res.data, content: (res.data.content ?? []).map(normalizeMaterial) };
};

export const downloadStudentMaterialAttachment = async (
  attachmentId: number,
  fileName: string,
): Promise<void> => {
  const res = await api.get(`/api/lms/student/materials/attachments/${attachmentId}/file`, {
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
