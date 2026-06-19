// src/types/lmsProfessorGrading.ts
// PLM-004 / PLM-004-01 교수 "채점 현황" 타입 (BE 응답 형태)
// lib/lmsProfessorGradingApi.ts 에서 선언 분리(위치 이동만, 이름·필드 무변경).

/** 과제 목록 1행 — 미채점(assignments)·채점완료(gradedAssignments) 공통 형태 */
export interface AssignmentRow {
  assignmentId: number;
  courseName: string; // 데이터구조 및 알고리즘
  lecSection: number | null; // 분반 (LECTURE.LEC_SECTION) — "N반" 표기
  lecAsnTitle: string; // LECTURE_ASSIGNMENT.LEC_ASN_TITLE
  lecAsnDueDate: string; // LECTURE_ASSIGNMENT.LEC_ASN_DUE_DATE "2026.05.25"
  submittedCount: number; // 제출 수 (미제출 제외)
  gradedCount: number; // 채점완료 수 (점수 있음)
  ungradedCount: number; // 미채점 = submitted − graded
  maxScore: number; // 100 고정 (현재 스키마, 추후 변동 가능)
}

/** 제출 파일 정보 (PLM-004-01). 첨부가 여러 개여도 최신 1건만 file로 내려온다. */
export interface SubmissionFile {
  fileName: string; // algorithm_hw3.zip
  fileSize: number; // bytes (FE가 "2.3MB"로 포맷)
  fileUrl: string; // /api/lms/professor/grading/submissions/{sid}/file (인증 필요)
  contentType: string; // 확장자 문자열 "zip"/"pdf" (MIME 아님)
}

/** 채점 상세 - 학생 제출 1행. 미제출 학생도 포함(submissionId/file/submittedAt=null, graded=false). */
export interface Submission {
  submissionId: number | null; // null = 미제출 (채점 대상 아님)
  memberId: number; // 행 식별 키 (미제출 포함 항상 존재)
  studentName: string;
  studentNo: string;
  lecAsnSbmRegDate: string | null; // LEC_ASN_SBM_REG_DATE "05.24 22:11" / null = 미제출
  lecAsnSbmStatus: string | null; // LEC_ASN_SBM_STATUS 제출상태 공통코드(SBM/NSB…) — FE 미사용
  file: SubmissionFile | null;
  asnSbmEvlScore: number | null; // ASN_SBM_EVL_SCORE null = 미채점
  asnSbmEvlFeedback: string; // ASN_SBM_EVL_FEEDBACK 없으면 ""
  graded: boolean; // asnSbmEvlScore 있음 여부
}

/** 채점 현황 개요 배너 (PLM-004 상단) — 선택 필터 범위의 미채점 합·과목별. 목록은 페이지 API로 분리 */
export interface GradingOverview {
  totalUngraded: number; // 미채점 제출 건수 합 (필터 범위)
  byCourse: { courseName: string; count: number }[]; // 과목별 미채점 건수
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

/** 채점 상세 (선택 과제) */
export interface GradingDetail {
  assignmentId: number;
  courseName: string;
  lecAsnTitle: string;
  maxScore: number;
  lecAsnDueDate: string;
  gradedCount: number;
  ungradedCount: number;
  submissions: Submission[];
}
