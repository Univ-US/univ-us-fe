// src/lib/lmsStudentAssignmentsApi.ts
// SLM-004 과제 내역 — 강의별 과제 제출 현황(미제출·제출·채점완료) + 점수·피드백
//   · SLM-004-01: '파일 보기' 모달(본인 제출 파일 정보 + 내용 미리보기) 데이터
//   · SLM-004-02: '피드백 보기' 모달(점수 + 교수 피드백 + 평가 항목 루브릭) 데이터
// ─────────────────────────────────────────────────────────────
// 🧪 mock-first 단계(§15): BE 연동 전이라 명시적 샘플 데이터로 동작. 화면 상단 앰버 배너 표기.
// BE 연동 예정: GET /api/lms/student/assignments (학기 무관 전체 — FE가 상태/과목 필터)
//   응답 = StudentAssignmentsResult — 학기별 섹션 + 상태별 건수 요약.
//   · 미제출(NSB) → 제출 화면(SLM-007)으로 이동 / 제출(SBM) → 파일 보기 / 채점완료(GRD) → 피드백 보기
//   · 제출 파일 다운로드는 인증 필요(BE 다운로드 엔드포인트) — 연동 시 axios(blob)로 받음.
// ⚠️ 연동 시 이 mock 블록 + delay 삭제, axios 실호출로 교체(시그니처 유지) + describeApiError 에러 표기.
// ─────────────────────────────────────────────────────────────

/** 과제 제출 상태 — NSB 미제출 / SBM 제출(채점 중) / GRD 채점완료 */
export type StudentAssignmentStatus = "NSB" | "SBM" | "GRD";

export const STUDENT_ASSIGNMENT_STATUS_LABEL: Record<StudentAssignmentStatus, string> = {
  NSB: "미제출",
  SBM: "제출",
  GRD: "채점완료",
};

/** 제출 파일 1건 (SLM-004-01) */
export interface SubmissionFile {
  fileName: string;
  fileSize: number; // bytes
  contentPreview?: string | null; // 텍스트/코드 미리보기(이미지·바이너리는 null)
}

/** 루브릭(평가 항목) 1줄 (SLM-004-02) */
export interface RubricItem {
  label: string;
  score: number;
  max: number;
}

/** 채점 피드백 (SLM-004-02) */
export interface AssignmentFeedback {
  score: number;
  maxScore: number;
  courseName: string;
  professor: string;
  comment: string;
  rubric: RubricItem[];
}

/** 과제 내역 1행 */
export interface StudentAssignment {
  id: number;
  courseName: string;
  title: string;
  dueDate: string; // 표시용 "2026.05.25"
  status: StudentAssignmentStatus;
  score: number | null; // 채점완료 시 점수(아니면 null)
  maxScore: number; // 만점(100 고정)
  urgent?: boolean; // 마감 임박(미제출일 때 빨간 날짜)
  submittedAt?: string | null; // 제출 일시 "2026.05.10 21:30"
  file?: SubmissionFile | null; // 제출 파일(제출·채점완료)
  feedback?: AssignmentFeedback | null; // 채점완료 피드백
}

/** 한 학기 단위 섹션 */
export interface SemesterAssignments {
  year: number;
  termCode: string;
  semesterLabel: string;
  assignments: StudentAssignment[];
}

/** SLM-004 응답 */
export interface StudentAssignmentsResult {
  totalCount: number;
  counts: { unsubmitted: number; submitted: number; graded: number };
  semesters: SemesterAssignments[];
}

// 파일 크기 표시 — 공용 단일 기준 재사용(§21): B/KB/MB/GB. 정본 = lib/lmsProfessorUploadApi.ts
export { formatFileSize } from "@/lib/lmsProfessorUploadApi";

// ── mock 데이터 (설계서 SLM-004 기준) — BE 연동 시 이 블록 + delay + 헬퍼 삭제 ──
const MB = 1024 * 1024;

// 루브릭 4항목(만점 30/40/20/10 = 100). 점수를 비율 배분, 마지막 항목이 잔여를 흡수해 합 = score 보장.
const RUBRIC_TEMPLATE: { label: string; max: number }[] = [
  { label: "알고리즘 이해도", max: 30 },
  { label: "구현·분석 정확성", max: 40 },
  { label: "시각화·가독성", max: 20 },
  { label: "보고서 완성도", max: 10 },
];

const buildRubric = (score: number): RubricItem[] => {
  let remaining = score;
  return RUBRIC_TEMPLATE.map((r, i) => {
    if (i === RUBRIC_TEMPLATE.length - 1) {
      return { label: r.label, score: Math.max(0, Math.min(r.max, remaining)), max: r.max };
    }
    const s = Math.min(r.max, Math.round((score * r.max) / 100));
    remaining -= s;
    return { label: r.label, score: s, max: r.max };
  });
};

const buildFeedback = (
  score: number,
  courseName: string,
  professor: string,
  comment: string,
  rubric?: RubricItem[]
): AssignmentFeedback => ({
  score,
  maxScore: 100,
  courseName,
  professor,
  comment,
  rubric: rubric ?? buildRubric(score),
});

const GENERIC_COMMENT =
  "전반적으로 요구사항을 충실히 반영했고 구현 완성도가 높습니다. 일부 예외 처리와 가독성을 보완하면 더 좋은 결과가 될 것입니다.";

const MOCK_ASSIGNMENTS: SemesterAssignments[] = [
  {
    year: 2026,
    termCode: "SM1",
    semesterLabel: "2026년 1학기",
    assignments: [
      { id: 101, courseName: "데이터구조", title: "알고리즘 구현 과제 #3", dueDate: "2026.05.25", status: "NSB", score: null, maxScore: 100, urgent: true },
      { id: 102, courseName: "소프트웨어공학", title: "UML 다이어그램 작성", dueDate: "2026.05.28", status: "NSB", score: null, maxScore: 100, urgent: true },
      { id: 103, courseName: "데이터베이스", title: "ERD 설계 과제", dueDate: "2026.05.30", status: "NSB", score: null, maxScore: 100, urgent: false },
      {
        id: 104,
        courseName: "데이터구조",
        title: "알고리즘 구현 과제 #2",
        dueDate: "2026.05.10",
        status: "SBM",
        score: null,
        maxScore: 100,
        submittedAt: "2026.05.10 21:30",
        file: {
          fileName: "algorithm_hw2_20221234.zip",
          fileSize: Math.round(1.9 * MB),
          contentPreview: `def binary_search(arr, target):
    lo, hi = 0, len(arr) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1  # 시간복잡도: O(log n)`,
        },
      },
      {
        id: 105,
        courseName: "웹프로그래밍",
        title: "React 컴포넌트 구현",
        dueDate: "2026.05.08",
        status: "SBM",
        score: null,
        maxScore: 100,
        submittedAt: "2026.05.08 18:42",
        file: {
          fileName: "react_component_20221234.zip",
          fileSize: Math.round(2.4 * MB),
          contentPreview: `export function Counter() {
  const [count, setCount] = useState(0);
  return (
    <button onClick={() => setCount((c) => c + 1)}>
      클릭 횟수: {count}
    </button>
  );
}`,
        },
      },
      {
        id: 106,
        courseName: "운영체제",
        title: "프로세스 스케줄링 분석",
        dueDate: "2026.04.28",
        status: "GRD",
        score: 92,
        maxScore: 100,
        feedback: buildFeedback(
          92,
          "운영체제",
          "박성훈",
          "스케줄링 알고리즘별 비교 분석이 정확하고, 간트 차트 시각화가 인상적입니다. 다만 RR 방식의 컨텍스트 스위칭 오버헤드 분석이 다소 부족하니 보완하면 좋겠습니다. 전반적으로 우수한 과제입니다.",
          [
            { label: "알고리즘 이해도", score: 28, max: 30 },
            { label: "구현·분석 정확성", score: 36, max: 40 },
            { label: "시각화·가독성", score: 18, max: 20 },
            { label: "보고서 완성도", score: 10, max: 10 },
          ]
        ),
      },
      { id: 107, courseName: "데이터구조", title: "알고리즘 구현 과제 #1", dueDate: "2026.04.14", status: "GRD", score: 87, maxScore: 100, feedback: buildFeedback(87, "데이터구조", "이민준", GENERIC_COMMENT) },
      { id: 108, courseName: "소프트웨어공학", title: "요구사항 명세서 작성", dueDate: "2026.04.07", status: "GRD", score: 95, maxScore: 100, feedback: buildFeedback(95, "소프트웨어공학", "김태경", GENERIC_COMMENT) },
      { id: 109, courseName: "웹프로그래밍", title: "HTML·CSS 레이아웃 구현", dueDate: "2026.03.28", status: "GRD", score: 100, maxScore: 100, feedback: buildFeedback(100, "웹프로그래밍", "이수진", "요구된 레이아웃을 픽셀 단위로 정확히 구현했고 반응형 처리까지 완벽합니다. 만점입니다.") },
      { id: 110, courseName: "운영체제", title: "OS 개념 정리 레포트", dueDate: "2026.03.21", status: "GRD", score: 80, maxScore: 100, feedback: buildFeedback(80, "운영체제", "박성훈", GENERIC_COMMENT) },
    ],
  },
  {
    year: 2025,
    termCode: "SM2",
    semesterLabel: "2025년 2학기",
    assignments: [
      { id: 201, courseName: "알고리즘 설계", title: "탐색 알고리즘 비교 분석", dueDate: "2025.11.30", status: "GRD", score: 91, maxScore: 100, feedback: buildFeedback(91, "알고리즘 설계", "이민준", GENERIC_COMMENT) },
      { id: 202, courseName: "컴퓨터 네트워크", title: "TCP/IP 패킷 분석 실습", dueDate: "2025.11.22", status: "GRD", score: 88, maxScore: 100, feedback: buildFeedback(88, "컴퓨터 네트워크", "정재훈", GENERIC_COMMENT) },
      { id: 203, courseName: "시스템 프로그래밍", title: "Shell 스크립트 작성", dueDate: "2025.11.14", status: "GRD", score: 94, maxScore: 100, feedback: buildFeedback(94, "시스템 프로그래밍", "김성일", GENERIC_COMMENT) },
      { id: 204, courseName: "알고리즘 설계", title: "동적 프로그래밍 구현", dueDate: "2025.10.26", status: "GRD", score: 85, maxScore: 100, feedback: buildFeedback(85, "알고리즘 설계", "이민준", GENERIC_COMMENT) },
      { id: 205, courseName: "컴퓨터 네트워크", title: "소켓 프로그래밍 과제", dueDate: "2025.10.12", status: "GRD", score: 90, maxScore: 100, feedback: buildFeedback(90, "컴퓨터 네트워크", "정재훈", GENERIC_COMMENT) },
      { id: 206, courseName: "시스템 프로그래밍", title: "메모리 관리 구현", dueDate: "2025.09.28", status: "GRD", score: 89, maxScore: 100, feedback: buildFeedback(89, "시스템 프로그래밍", "김성일", GENERIC_COMMENT) },
    ],
  },
];

const MOCK_RESULT: StudentAssignmentsResult = {
  totalCount: 16,
  counts: { unsubmitted: 3, submitted: 2, graded: 11 },
  semesters: MOCK_ASSIGNMENTS,
};

const delay = <T,>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), 200));

/** GET /api/lms/student/assignments — 과제 내역(전체) (현재 mock) */
export const getStudentAssignments = (): Promise<StudentAssignmentsResult> => delay(MOCK_RESULT);
