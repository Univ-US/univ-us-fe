// src/lib/lmsProfessorGradingApi.ts
// PLM-004 / PLM-004-01 교수 "채점 현황" API 클라이언트 + 타입
// ─────────────────────────────────────────────────────────────
// BE 공식 명세 연동(2026-06-10). 채점 개요 → 과제 채점 상세 → 점수·피드백 저장 → 제출 파일 다운로드.
//  · GET  /api/lms/professor/grading/overview?semesterId=                              (없으면 최신 학기)
//  · GET  /api/lms/professor/grading/assignments/{assignmentId}
//  · PUT  /api/lms/professor/grading/assignments/{assignmentId}/submissions/{submissionId}
//  · GET  /api/lms/professor/grading/submissions/{submissionId}/file                   (인증 필요 → blob)
// ⚠️ 전부 PROF 본인 강의 한정(타 강의 403). 서버는 "코드값"만 반환(termCode) → 라벨은 SEM_TERM 공통코드로 FE 매핑.
// ⚠️ 실패 시 가짜 데이터로 가리지 않는다 — 페이지가 describeApiError로 "에러 상태"를 표기한다.
// ─────────────────────────────────────────────────────────────
import api from "@/lib/api";

// 공통코드 맵(codeVal→codeName)·학기 목록 조회는 PLM-003과 공유. 추후 공용 모듈로 승격 후보.
export { getCommonCodeMap, getSemesters } from "@/lib/lmsProfessorStudentsApi";
export type { Semester } from "@/lib/lmsProfessorStudentsApi";

// ── 타입 (BE 응답 형태) ────────────────────────────────────
/** 과제 목록 1행 — 미채점(assignments)·채점완료(gradedAssignments) 공통 형태 */
export interface AssignmentRow {
  assignmentId: number;
  courseName: string; // 데이터구조 및 알고리즘
  title: string; // 알고리즘 구현 #3
  dueDate: string; // 2026.05.25
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
  submittedAt: string | null; // "05.24 22:11" / null = 미제출
  submissionStatus: string | null; // 제출상태 공통코드(SBM/NSB…) — FE 미사용
  file: SubmissionFile | null;
  score: number | null; // null = 미채점
  feedback: string; // 없으면 ""
  graded: boolean; // score 있음 여부
}

/** 채점 현황 개요 (PLM-004 상단) */
export interface GradingOverview {
  year: number; // 2026
  termCode: string; // SM1/SM2/SMR/WNT → SEM_TERM 공통코드로 "1학기" 매핑
  totalUngraded: number; // 미채점 제출 건수 합
  byCourse: { courseName: string; count: number }[]; // 과목별 미채점 건수
  assignments: AssignmentRow[]; // 미채점 과제 (ungradedCount>0)
  gradedAssignments: AssignmentRow[]; // 채점완료 과제 (ungradedCount==0)
}

/** 채점 상세 (선택 과제) */
export interface GradingDetail {
  assignmentId: number;
  courseName: string;
  title: string;
  maxScore: number;
  dueDate: string;
  gradedCount: number;
  ungradedCount: number;
  submissions: Submission[];
}

// ── API 호출 ───────────────────────────────────────────────
/** GET 채점 개요 (semesterId 생략 시 최신 학기) */
export const getGradingOverview = async (
  semesterId?: number
): Promise<GradingOverview> => {
  const res = await api.get<GradingOverview>("/api/lms/professor/grading/overview", {
    params: semesterId != null ? { semesterId } : undefined,
  });
  return res.data;
};

/**
 * GET 전 학기 미채점 합 (사이드바 배지용 경량 카운트).
 * BE가 단일 SQL로 전 학기 합산 → overview.totalUngraded와 동일 규칙(과제별 max(0, submitted−graded) 합).
 * 학기별 overview를 N+1로 불러 합치던 걸 1콜로 대체.
 */
export const getUngradedCount = async (): Promise<number> => {
  const res = await api.get<{ totalUngraded: number }>(
    "/api/lms/professor/grading/ungraded-count"
  );
  return res.data.totalUngraded;
};

/** GET 과제 채점 상세 (미제출 학생 포함) */
export const getGradingDetail = async (
  assignmentId: number
): Promise<GradingDetail> => {
  const res = await api.get<GradingDetail>(
    `/api/lms/professor/grading/assignments/${assignmentId}`
  );
  return res.data;
};

/** PUT 점수·피드백 저장 → 갱신된 submission 1건 반환. score=null이면 미채점 되돌림. */
export const saveGrade = async (
  assignmentId: number,
  submissionId: number,
  payload: { score: number | null; feedback: string }
): Promise<Submission> => {
  const res = await api.put<Submission>(
    `/api/lms/professor/grading/assignments/${assignmentId}/submissions/${submissionId}`,
    payload
  );
  return res.data;
};

/**
 * GET 제출 파일 다운로드 (PLM-004-01) — 인증 필요.
 * <a download>/<img>는 토큰을 못 실으므로 axios(blob, 인터셉터가 Bearer 부착)로 받아 다운로드한다.
 * file.fileUrl 이 이미 다운로드 경로(별도 조회 불필요). 물리 파일 없으면 404가 날 수 있음(에러 표기).
 */
export const downloadSubmissionFile = async (file: SubmissionFile): Promise<void> => {
  const res = await api.get(file.fileUrl, { responseType: "blob" });
  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

/**
 * '전체' 학기 합산 — overview는 semesterId 생략 시 '최신 학기'(전체 아님)만 주므로,
 * 학기별 overview를 합쳐 진짜 '전체'를 만든다. year/termCode는 단일 학기 전제라 sentinel(전체).
 * assignmentId는 전역 유일이라 concat 안전. byCourse는 과목명 기준 합산.
 */
export const mergeGradingOverviews = (list: GradingOverview[]): GradingOverview => {
  const byCourse = new Map<string, number>();
  let totalUngraded = 0;
  const assignments: AssignmentRow[] = [];
  const gradedAssignments: AssignmentRow[] = [];
  for (const ov of list) {
    totalUngraded += ov.totalUngraded;
    ov.byCourse.forEach((c) => byCourse.set(c.courseName, (byCourse.get(c.courseName) ?? 0) + c.count));
    assignments.push(...ov.assignments);
    gradedAssignments.push(...ov.gradedAssignments);
  }
  return {
    year: 0,
    termCode: "ALL", // sentinel — 화면은 selectedSemId==="all"이면 "전체" 라벨 사용
    totalUngraded,
    byCourse: [...byCourse].map(([courseName, count]) => ({ courseName, count })),
    assignments,
    gradedAssignments,
  };
};

// ── 표시 헬퍼 ──────────────────────────────────────────────
/** 학기 라벨: "2026년 1학기" (termCode는 SEM_TERM 공통코드 맵으로) */
export const gradingSemesterLabel = (
  o: Pick<GradingOverview, "year" | "termCode">,
  termMap: Record<string, string>
): string => `${o.year}년 ${termMap[o.termCode] ?? o.termCode}`;

/** 파일 크기(bytes) → "2.3MB" / "640.0KB" / "512B" */
export const formatFileSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes < 0) return "-";
  if (bytes < 1024) return `${bytes}B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)}KB`;
  return `${(kb / 1024).toFixed(1)}MB`;
};

// axios 에러 → 사용자용 메시지는 공용 헬퍼로: @/lib/lmsApiError 의 describeApiError 사용
