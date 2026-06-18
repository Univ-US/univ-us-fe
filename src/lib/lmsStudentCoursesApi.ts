import api from "@/lib/api";

export interface CourseRow {
  lecId: number;
  courseName: string;
  lecSection?: number | null;
  lecCredit: number;
  professor: string;
  schedule: string;
}

export interface SemesterCourses {
  semYear: number;
  semTerm: string;
  semesterLabel: string;
  inProgress: boolean;
  courseCount: number;
  totalCredits: number;
  courses: CourseRow[];
}

export const getStudentCourses = async (): Promise<SemesterCourses[]> => {
  const res = await api.get<SemesterCourses[]>("/api/lms/student/courses");
  return res.data;
};
