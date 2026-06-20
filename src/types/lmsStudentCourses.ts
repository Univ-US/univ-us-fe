export interface CourseRow {
  lecId: number;
  courseName: string;
  lecStdEnrStatus: string; // 수강 상태 (ENR_STS 공통코드: ENR/CMP/DRP/FAL)
  lecValStatus: string; // 강의 상태 (LEC_VAL_STATUS 공통코드: OPEN/PROG/CLSD/CNCL)
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
