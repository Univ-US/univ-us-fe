// src/lib/lmsStudentAssignmentsApi.ts
// SLM-004 과제 내역 — 강의별 과제 제출 현황(미제출·제출·채점완료) + 점수·피드백
//   · SLM-004-01: '파일 보기' 모달(본인 제출 파일 정보 + 다운로드 — 내용 미리보기는 미구현) 데이터
//   · SLM-004-02: '피드백 보기' 모달(점수 + 교수 피드백) 데이터 — 평가 항목/루브릭은 미구현(제외)
// ─────────────────────────────────────────────────────────────
// 🧪 mock-first 단계(§15): BE 연동 전이라 명시적 샘플 데이터로 동작. 화면 상단 앰버 배너 표기.
// BE 연동 예정: GET /api/lms/student/assignments (학기 무관 전체 — FE가 상태/과목 필터)
//   응답 = StudentAssignmentsResult — 학기별 섹션(각 과제의 status 포함). 상태별 건수는 FE가 status로 계산(BE 집계 불필요).
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

/** 제출 파일 1건 (SLM-004-01) — 파일 정보만(내용 미리보기 미구현, 다운로드로 확인) */
export interface SubmissionFile {
  fileName: string;
  fileSize: number; // bytes
}

/** 채점 피드백 (SLM-004-02) — 점수 + 교수 피드백(평가 항목/루브릭은 미구현) */
export interface AssignmentFeedback {
  score: number;
  maxScore: number;
  courseName: string;
  professor: string;
  comment: string;
}

/** 과제 내역 1행 */
export interface StudentAssignment {
  id: number;
  courseName: string;
  lecSection?: number | null; // 분반(LECTURE.LEC_SECTION) — 표시 "N반", null=`-`
  title: string;
  content?: string | null; // 과제 내용(LECTURE_ASSIGNMENT.LEC_ASN_CONTENT, CLOB)
  dueDate: string; // 표시용 "2026.05.25"
  status: StudentAssignmentStatus;
  overdue?: boolean; // 미제출 한정 — 마감일 경과 여부(true면 '제출하러 가기' 비활성 '마감됨'). BE: 서버 시각 기준 LEC_ASN_DUE_DATE < now (또는 LEC_ASN_VAL_STATUS CLS/NOP) — 클라 시계 비신뢰
  score: number | null; // 채점완료 시 점수(아니면 null)
  maxScore: number; // 만점(100 고정)
  submittedAt?: string | null; // 제출 일시 "2026.05.10 21:30"
  submissionMemo?: string | null; // 본인이 작성한 제출 메모(DB LEC_ASN_SBM_MEMO, 선택)
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

/** SLM-004 응답 — BE는 학기별 과제 목록만 반환(집계 건수는 FE가 status로 계산해 BE 복잡도↓) */
export interface StudentAssignmentsResult {
  semesters: SemesterAssignments[];
}

// 파일 크기 표시 — 공용 단일 기준 재사용(§21): B/KB/MB/GB. 정본 = lib/lmsProfessorUploadApi.ts
export { formatFileSize } from "@/lib/lmsProfessorUploadApi";

// ── mock 데이터 (설계서 SLM-004 기준) — BE 연동 시 이 블록 + delay + 헬퍼 삭제 ──
const MB = 1024 * 1024;

const buildFeedback = (
  score: number,
  courseName: string,
  professor: string,
  comment: string
): AssignmentFeedback => ({
  score,
  maxScore: 100,
  courseName,
  professor,
  comment,
});

const GENERIC_COMMENT =
  "전반적으로 요구사항을 충실히 반영했고 구현 완성도가 높습니다. 일부 예외 처리와 가독성을 보완하면 더 좋은 결과가 될 것입니다.";

const MOCK_ASSIGNMENTS: SemesterAssignments[] = [
  {
    year: 2026,
    termCode: "SM1",
    semesterLabel: "2026년 1학기",
    assignments: [
      // 트렁케이트(폭 기준 말줄임) 시연용 — 과목명 20자·과제명 100자·과제 내용 556자(500↑)
      {
        id: 100,
        courseName: "고급소프트웨어공학설계및실습프로젝트심화",
        lecSection: 1,
        title:
          "분산 시스템 환경에서 마이크로서비스 아키텍처를 적용하여 대규모 동시 접속 트래픽을 안정적으로 처리하는 확장 가능한 백엔드 시스템을 설계하고 구현한 뒤 성능을 측정하여 보고서로 제출",
        content:
          "본 과제는 고급 소프트웨어 설계 원리를 실제 분산 시스템 구축에 적용하는 것을 목표로 한다. 먼저 단일 모놀리식 애플리케이션을 도메인 단위의 마이크로서비스로 분해하고, 각 서비스 간 통신을 REST와 메시지 큐 기반 비동기 방식으로 구현하여 결합도를 낮춘다. 다음으로 API 게이트웨이와 서비스 디스커버리를 도입하여 동적으로 변하는 인스턴스를 라우팅하고, 서킷 브레이커 패턴으로 장애가 연쇄적으로 전파되는 것을 차단한다. 데이터 계층에서는 서비스별로 독립된 데이터베이스를 두되, 분산 트랜잭션 대신 사가 패턴을 적용하여 최종 일관성을 보장한다. 또한 대규모 동시 접속을 처리하기 위해 수평 확장이 가능한 무상태 서버를 설계하고, 부하 분산기 뒤에 여러 인스턴스를 배치한 뒤 부하 테스트 도구로 초당 처리량과 응답 지연을 측정한다. 마지막으로 수집한 지표를 모니터링 대시보드로 시각화하고, 병목 구간을 분석하여 캐싱과 인덱싱으로 성능을 개선한 과정을 보고서에 정리하여 제출한다. 평가는 아키텍처 설계의 타당성과 구현 완성도, 성능 측정의 정확성, 보고서의 논리성을 종합적으로 고려하여 이루어진다.",
        dueDate: "2026.05.31",
        status: "GRD",
        score: 96,
        maxScore: 100,
        feedback: buildFeedback(96, "고급소프트웨어공학설계및실습프로젝트심화", "박성훈", GENERIC_COMMENT),
      },
      { id: 101, courseName: "데이터구조", lecSection: 1, title: "알고리즘 구현 과제 #3", content: "삽입·병합·퀵 정렬을 구현하고 입력 크기별 시간복잡도를 비교 분석", dueDate: "2026.05.25", status: "NSB", score: null, maxScore: 100 },
      { id: 102, courseName: "소프트웨어공학", lecSection: 1, title: "UML 다이어그램 작성", content: "수강 시스템의 유스케이스·클래스·시퀀스 다이어그램 작성", dueDate: "2026.05.28", status: "NSB", score: null, maxScore: 100 },
      { id: 103, courseName: "데이터베이스", lecSection: 2, title: "ERD 설계 과제", content: "요구사항을 분석해 정규화된 ERD를 설계하고 정규화 단계 설명", dueDate: "2026.05.30", status: "NSB", score: null, maxScore: 100 },
      // 미제출이지만 마감일이 지난 과제 — '제출하러 가기' 비활성('마감됨'). overdue=true (BE 서버 시각 기준 판정)
      { id: 111, courseName: "데이터구조", lecSection: 1, title: "사전 자료구조 퀴즈", content: "강의 전 자료구조 기본 개념 사전 퀴즈 제출", dueDate: "2026.04.20", status: "NSB", score: null, maxScore: 100, overdue: true },
      {
        id: 104,
        courseName: "데이터구조",
        lecSection: 1,
        title: "알고리즘 구현 과제 #2",
        content: "퀵소트·힙소트를 구현해 입력 크기별 성능을 비교",
        dueDate: "2026.05.10",
        status: "SBM",
        score: null,
        maxScore: 100,
        submittedAt: "2026.05.10 21:30",
        submissionMemo:
          "퀵소트와 힙소트를 모두 구현해 입력 크기별 실행 시간을 비교했습니다. 결과 그래프는 보고서 마지막 장에 첨부했습니다.",
        file: {
          fileName: "algorithm_hw2_20221234.zip",
          fileSize: Math.round(1.9 * MB),
        },
      },
      {
        id: 105,
        courseName: "웹프로그래밍",
        lecSection: 1,
        title: "React 컴포넌트 구현",
        content: "재사용 가능한 React 컴포넌트 3종 이상 구현(상태 관리 포함)",
        dueDate: "2026.05.08",
        status: "SBM",
        score: null,
        maxScore: 100,
        submittedAt: "2026.05.08 18:42",
        file: {
          fileName: "react_component_20221234.zip",
          fileSize: Math.round(2.4 * MB),
        },
      },
      {
        id: 106,
        courseName: "운영체제",
        lecSection: 2,
        title: "프로세스 스케줄링 분석",
        content: "FCFS·SJF·RR 스케줄링을 비교하고 간트 차트로 시각화",
        dueDate: "2026.04.28",
        status: "GRD",
        score: 92,
        maxScore: 100,
        feedback: buildFeedback(
          92,
          "운영체제",
          "박성훈",
          "스케줄링 알고리즘별 비교 분석이 정확하고, 간트 차트 시각화가 인상적입니다. 다만 RR 방식의 컨텍스트 스위칭 오버헤드 분석이 다소 부족하니 보완하면 좋겠습니다. 전반적으로 우수한 과제입니다."
        ),
      },
      { id: 107, courseName: "데이터구조", lecSection: 1, title: "알고리즘 구현 과제 #1", content: "스택·큐·연결 리스트 등 기본 자료구조 구현", dueDate: "2026.04.14", status: "GRD", score: 87, maxScore: 100, feedback: buildFeedback(87, "데이터구조", "이민준", GENERIC_COMMENT) },
      { id: 108, courseName: "소프트웨어공학", lecSection: 1, title: "요구사항 명세서 작성", content: "기능·비기능 요구사항 명세서 작성", dueDate: "2026.04.07", status: "GRD", score: 95, maxScore: 100, feedback: buildFeedback(95, "소프트웨어공학", "김태경", GENERIC_COMMENT) },
      { id: 109, courseName: "웹프로그래밍", lecSection: 1, title: "HTML·CSS 레이아웃 구현", content: "반응형 레이아웃을 HTML·CSS로 구현", dueDate: "2026.03.28", status: "GRD", score: 100, maxScore: 100, feedback: buildFeedback(100, "웹프로그래밍", "이수진", "요구된 레이아웃을 픽셀 단위로 정확히 구현했고 반응형 처리까지 완벽합니다. 만점입니다.") },
      { id: 110, courseName: "운영체제", lecSection: 2, title: "OS 개념 정리 레포트", content: "프로세스·스레드·메모리 관리 개념 정리", dueDate: "2026.03.21", status: "GRD", score: 80, maxScore: 100, feedback: buildFeedback(80, "운영체제", "박성훈", GENERIC_COMMENT) },
    ],
  },
  {
    year: 2025,
    termCode: "SM2",
    semesterLabel: "2025년 2학기",
    assignments: [
      { id: 201, courseName: "알고리즘 설계", lecSection: 1, title: "탐색 알고리즘 비교 분석", content: "BFS·DFS·다익스트라 탐색 알고리즘 비교 분석", dueDate: "2025.11.30", status: "GRD", score: 91, maxScore: 100, feedback: buildFeedback(91, "알고리즘 설계", "이민준", GENERIC_COMMENT) },
      { id: 202, courseName: "컴퓨터 네트워크", lecSection: 1, title: "TCP/IP 패킷 분석 실습", content: "Wireshark로 TCP/IP 패킷을 캡처·분석", dueDate: "2025.11.22", status: "GRD", score: 88, maxScore: 100, feedback: buildFeedback(88, "컴퓨터 네트워크", "정재훈", GENERIC_COMMENT) },
      { id: 203, courseName: "시스템 프로그래밍", lecSection: 2, title: "Shell 스크립트 작성", content: "Bash 셸 스크립트로 자동화 도구 작성", dueDate: "2025.11.14", status: "GRD", score: 94, maxScore: 100, feedback: buildFeedback(94, "시스템 프로그래밍", "김성일", GENERIC_COMMENT) },
      { id: 204, courseName: "알고리즘 설계", lecSection: 1, title: "동적 프로그래밍 구현", content: "동적 프로그래밍으로 배낭 문제 해결", dueDate: "2025.10.26", status: "GRD", score: 85, maxScore: 100, feedback: buildFeedback(85, "알고리즘 설계", "이민준", GENERIC_COMMENT) },
      { id: 205, courseName: "컴퓨터 네트워크", lecSection: 1, title: "소켓 프로그래밍 과제", content: "TCP 소켓 기반 채팅 서버·클라이언트 구현", dueDate: "2025.10.12", status: "GRD", score: 90, maxScore: 100, feedback: buildFeedback(90, "컴퓨터 네트워크", "정재훈", GENERIC_COMMENT) },
      { id: 206, courseName: "시스템 프로그래밍", lecSection: 2, title: "메모리 관리 구현", content: "동적 메모리 할당자(malloc/free) 구현", dueDate: "2025.09.28", status: "GRD", score: 89, maxScore: 100, feedback: buildFeedback(89, "시스템 프로그래밍", "김성일", GENERIC_COMMENT) },
    ],
  },
];

const MOCK_RESULT: StudentAssignmentsResult = {
  semesters: MOCK_ASSIGNMENTS,
};

const delay = <T,>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), 200));

/** GET /api/lms/student/assignments — 과제 내역(전체) (현재 mock) */
export const getStudentAssignments = (): Promise<StudentAssignmentsResult> => delay(MOCK_RESULT);
