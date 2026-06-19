import api from "@/lib/api";
import type { SemesterCourses } from "@/types/lmsStudentCourses";

export const getStudentCourses = async (): Promise<SemesterCourses[]> => {
  const res = await api.get<SemesterCourses[]>("/api/lms/student/courses");
  return res.data;
};
