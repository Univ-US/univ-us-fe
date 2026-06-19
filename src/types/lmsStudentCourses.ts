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
