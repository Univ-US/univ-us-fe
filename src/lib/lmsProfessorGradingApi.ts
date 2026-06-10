// src/lib/lmsProfessorGradingApi.ts
// PLM-004 / PLM-004-01 교수 "채점 현황" — 타입 + MOCK (BE 공식 명세 연동 전, 화면 개발용)
// ⚠️ 공식 API 명세 도착 시: MOCK 블록 삭제 + 아래 async 함수 본문을 실제 axios 호출로 교체 + 에러 상태 적용.
//    (정책: 명세 전 = mock-first / 명세 후 = 실제 연결 + describeApiError 에러 표기)

// ── 타입 ───────────────────────────────────────────────────
/** 미채점 과제 목록 1행 */
export interface UngradedAssignment {
  assignmentId: number;
  courseName: string; // 데이터구조 및 알고리즘
  title: string; // 알고리즘 구현 #3
  dueDate: string; // 2026.05.25
  submittedCount: number; // 제출 수
  ungradedCount: number; // 미채점 수
  maxScore: number; // 100
}

/** 제출 파일 정보 (PLM-004-01) */
export interface SubmissionFile {
  fileName: string; // algorithm_hw3_20221234.zip
  fileSize: string; // "2.3MB"
  fileUrl: string; // 미리보기/원본 다운로드 URL
  contentType: string; // image/png, application/zip ...
}

/** 채점 상세 - 학생 제출 1행 */
export interface Submission {
  submissionId: number;
  memberId: number;
  studentName: string;
  studentNo: string;
  submittedAt: string | null; // "05.24 22:11" / null = 미제출
  file: SubmissionFile | null;
  score: number | null;
  feedback: string;
  graded: boolean;
}

/** 채점 현황 개요 (PLM-004 상단) */
export interface GradingOverview {
  semesterLabel: string; // "2026년 1학기"
  totalUngraded: number; // 5
  byCourse: { courseName: string; count: number }[];
  assignments: UngradedAssignment[];
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

// ── 이미지 파일만 미리보기 (PLM-004-01 요구사항) ──────────────
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|svg)$/i;
/** 제출 파일이 이미지인지 — contentType(image/*) 또는 확장자로 판정 */
export const isImageFile = (file: SubmissionFile | null): boolean =>
  !!file && (file.contentType.startsWith("image/") || IMAGE_EXT.test(file.fileName));

// ─────────────────────────────────────────────────────────────
// MOCK (BE 명세 연동 전 — 설계서 PLM-004 / PLM-004-01)
// ─────────────────────────────────────────────────────────────
const MOCK_OVERVIEW: GradingOverview = {
  semesterLabel: "2026년 1학기",
  totalUngraded: 5,
  byCourse: [
    { courseName: "데이터구조 및 알고리즘", count: 3 },
    { courseName: "소프트웨어공학", count: 2 },
  ],
  assignments: [
    { assignmentId: 1, courseName: "데이터구조 및 알고리즘", title: "알고리즘 구현 #3", dueDate: "2026.05.25", submittedCount: 28, ungradedCount: 3, maxScore: 100 },
    { assignmentId: 2, courseName: "소프트웨어공학", title: "UML 다이어그램", dueDate: "2026.05.28", submittedCount: 20, ungradedCount: 2, maxScore: 100 },
  ],
};

const MOCK_DETAILS: Record<number, GradingDetail> = {
  1: {
    assignmentId: 1,
    courseName: "데이터구조 및 알고리즘",
    title: "알고리즘 구현 과제 #3",
    maxScore: 100,
    dueDate: "2026.05.25",
    gradedCount: 25,
    ungradedCount: 3,
    submissions: [
      // 이미지 제출 → 미리보기 가능
      { submissionId: 11, memberId: 31, studentName: "김하연", studentNo: "20221234", submittedAt: "05.24 22:11",
        file: { fileName: "design_20221234.png", fileSize: "1.2MB", fileUrl: "/globe.svg", contentType: "image/png" },
        score: null, feedback: "", graded: false },
      // 비이미지(zip) → 미리보기 미지원, 다운로드 안내
      { submissionId: 12, memberId: 32, studentName: "박준호", studentNo: "20221890", submittedAt: "05.25 15:30",
        file: { fileName: "algorithm_hw3_20221890.zip", fileSize: "2.1MB", fileUrl: "/files/algorithm_hw3_20221890.zip", contentType: "application/zip" },
        score: null, feedback: "", graded: false },
      // 이미지 제출
      { submissionId: 13, memberId: 36, studentName: "한지훈", studentNo: "20224012", submittedAt: "05.25 23:47",
        file: { fileName: "diagram_20224012.jpg", fileSize: "0.9MB", fileUrl: "/window.svg", contentType: "image/jpeg" },
        score: null, feedback: "", graded: false },
      // 채점완료
      { submissionId: 14, memberId: 34, studentName: "최민석", studentNo: "20221567", submittedAt: "05.23 18:02",
        file: { fileName: "algorithm_hw3_20221567.zip", fileSize: "2.4MB", fileUrl: "/files/algorithm_hw3_20221567.zip", contentType: "application/zip" },
        score: 96, feedback: "완성도 높음. 예외처리까지 완벽합니다.", graded: true },
      // 미제출
      { submissionId: 15, memberId: 33, studentName: "이소영", studentNo: "20223201", submittedAt: null,
        file: null, score: null, feedback: "", graded: false },
    ],
  },
  2: {
    assignmentId: 2,
    courseName: "소프트웨어공학",
    title: "UML 다이어그램",
    maxScore: 100,
    dueDate: "2026.05.28",
    gradedCount: 18,
    ungradedCount: 2,
    submissions: [
      { submissionId: 21, memberId: 41, studentName: "오세훈", studentNo: "20219921", submittedAt: "05.27 14:02",
        file: { fileName: "uml_20219921.png", fileSize: "1.6MB", fileUrl: "/globe.svg", contentType: "image/png" },
        score: null, feedback: "", graded: false },
      { submissionId: 22, memberId: 42, studentName: "장미래", studentNo: "20220310", submittedAt: "05.28 09:41",
        file: { fileName: "uml_20220310.pdf", fileSize: "0.7MB", fileUrl: "/files/uml_20220310.pdf", contentType: "application/pdf" },
        score: null, feedback: "", graded: false },
    ],
  },
};

// ── API (현재 MOCK 반환. 명세 도착 시 axios로 교체) ──────────
/** GET 채점 현황 개요 (학기 기준) */
export const getGradingOverview = async (): Promise<GradingOverview> => MOCK_OVERVIEW;

/** GET 선택 과제 채점 상세 */
export const getGradingDetail = async (assignmentId: number): Promise<GradingDetail> => {
  const detail = MOCK_DETAILS[assignmentId];
  if (!detail) throw new Error("해당 과제의 채점 상세가 없습니다.");
  return detail;
};

/** PUT 점수·피드백 저장 (mock: no-op). BE 명세 도착 시 실제 저장 호출로 교체 */
export const saveGrade = async (
  assignmentId: number,
  submissionId: number,
  payload: { score: number | null; feedback: string }
): Promise<void> => {
  void assignmentId;
  void submissionId;
  void payload;
};
