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
