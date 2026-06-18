import api from "@/lib/api";

export type LockedReason = "expired" | "restricted";

export interface Attachment {
  attachmentId: number;
  fileName: string;
  fileExt: string | null;
  fileSize: number | null;
}

export interface Material {
  uploadId: number;
  lecUplTitle: string;
  lecUplContent: string | null;
  lecUplRegDate: string;
  attachments: Attachment[];
  downloadable: boolean;
  lockedReason?: LockedReason | null;
}

export interface CourseMaterials {
  lecId: number;
  courseName: string;
  lecSection: number | null;
  materials: Material[];
}

export interface SemesterMaterials {
  semYear: number;
  semTerm: string;
  semesterLabel: string;
  courses: CourseMaterials[];
}

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
