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

/** 학기 요약 (GET /courses/semesters — 카드 헤더, 과목은 학기별 페이지 조회) */
export interface SemesterSummary {
  semId: number;
  semYear: number;
  semTerm: string;
  semesterLabel: string;
  inProgress: boolean;
  courseCount: number;
  totalCredits: number;
}

/** 서버 페이지네이션 공통 응답 (BE PaginateUtilRestApiRes<T>) */
export interface PageResponse<T> {
  content: T[];
  page: number; // 0-based
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}
