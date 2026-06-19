import api from "@/lib/api";
import type { SubmitItem, SubmitAssignmentInput } from "@/types/lmsStudentSubmit";

export const getSubmittableAssignments = async (): Promise<SubmitItem[]> => {
  const res = await api.get<SubmitItem[]>("/api/lms/student/assignments/submittable");
  return res.data;
};

export const submitStudentAssignment = async (
  assignmentId: number,
  input: SubmitAssignmentInput,
): Promise<void> => {
  const formData = new FormData();
  formData.append("file", input.file);
  formData.append("memo", input.memo ?? "");

  await api.post(`/api/lms/student/assignments/${assignmentId}/submit`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
