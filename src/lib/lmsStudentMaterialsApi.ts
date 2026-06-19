import api from "@/lib/api";
import type {
  CourseMaterials,
  Material,
  SemesterMaterials,
} from "@/types/lmsStudentMaterials";

const normalizeMaterial = (material: Material): Material => ({
  ...material,
  lecUplContent: material.lecUplContent ?? "",
  attachments: material.attachments ?? [],
  downloadable: material.downloadable ?? true,
  lockedReason: material.lockedReason ?? null,
});

const normalizeCourse = (course: CourseMaterials): CourseMaterials => ({
  ...course,
  materials: (course.materials ?? []).map(normalizeMaterial),
});

export const getStudentMaterials = async (): Promise<SemesterMaterials[]> => {
  const res = await api.get<SemesterMaterials[]>("/api/lms/student/materials");
  return res.data.map((semester) => ({
    ...semester,
    courses: (semester.courses ?? []).map(normalizeCourse),
  }));
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
