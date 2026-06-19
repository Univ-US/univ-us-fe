// src/types/lmsProfessorStudents.ts
// PLM-003 / PLM-003-01 교수 "수강생 현황" 타입 (lib에서 분리)

// ── 타입 (BE 응답 형태) ────────────────────────────────────
export interface Semester {
  semId: number;
  semYear: number;
  semTerm: string; // SM1/SM2/SMR/WNT (라벨은 SEM_TERM 공통코드)
}

export interface Lecture {
  lecId: number;
  lecName: string;
  lecCode: string;
  lecSection: string | number; // 분반
  semId: number;
  semYear?: number | null; // 학기 연도 (같은 강의명 학기별 구분용)
  semTerm?: string | null; // 학기 코드 (SEM_TERM 공통코드)
  lecValStatus?: string | null; // 강의 상태 OPEN/PROG/CLSD/CNCL → LEC_VAL_STATUS 라벨
}

export interface CourseSummary {
  totalStudents: number; // 수강 인원 (검색 전체 기준)
  averageAttendanceRate: number; // 평균 출석률 (%)
  averageSubmissionRate: number; // 과제 제출률 (%)
}

export interface CourseStudentRow {
  enrollmentId: number; // 수강신청 식별자
  memberId: number; // 상세 리포트 조회 키
  studentName: string;
  studentNo: string;
  imageUrl: string | null; // 프로필 이미지(없으면 null → 이니셜 fallback)
  attendanceRate: number;
  submittedCount: number;
  totalAssignments: number;
  averageScore: number | null; // 미채점이면 null
}

export interface Pagination {
  page: number; // 0-based
  size: number;
  totalElements: number;
  totalPages: number; // 0~10명이어도 최소 1
}

export interface LectureStudentsResponse {
  lecture: Lecture | null;
  summary: CourseSummary;
  students: CourseStudentRow[];
  pagination: Pagination;
}

export interface AssignmentScore {
  assignmentId: number;
  lecAsnTitle: string;
  asnSbmEvlScore: number | null; // 미채점/미제출이면 null
  lecAsnSbmStatus: string; // NSB/SBM/GRD/RTN (LEC_ASN_SBM_STATUS)
  submissionStatusLabel?: string | null; // 서버 미채움(null) — FE가 공통코드로 매핑
  submitted: boolean; // 서버 계산 — 분기에 바로 사용
  scored: boolean; // false → "미채점"
}

export interface StudentReport {
  memberId: number;
  studentName: string;
  studentNo: string;
  imageUrl: string | null; // 프로필 이미지(없으면 null → 이니셜)
  lectureName: string;
  attendanceRate: number;
  submittedCount: number;
  totalAssignments: number;
  averageScore: number | null;
  attendancePresent: number;
  attendanceLate: number;
  attendanceAbsent: number;
  attendanceTotal: number;
  assignmentScores: AssignmentScore[];
}

export interface CommonCode {
  codeVal: string;
  codeName: string;
  codeOrder: number;
}

/** 수강생 목록 쿼리 파라미터 */
export interface StudentsQuery {
  search?: string;
  submission?: "complete" | "incomplete" | "";
  sort?: "name" | "studentNo" | "attendance" | "score" | ""; // 미지정=이름 오름차순
  order?: "asc" | "desc";
  page?: number; // 0-based
  size?: number;
}
