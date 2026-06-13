// src/lib/lmsStudentSubmitApi.ts
// SLM-007 과제 제출 — 미제출 과제 선택 → 파일 업로드(S3)·메모 작성하여 제출 (이력은 SLM-004)
// ─────────────────────────────────────────────────────────────
// 🧪 mock-first 단계(§15): BE 연동 전이라 명시적 샘플 데이터로 동작. 화면 상단 앰버 배너 표기.
// BE 연동 예정: GET /api/lms/student/assignments/submittable (제출 대상 목록)
//   · POST /api/lms/student/assignments/{id}/submit (multipart — 파일 S3 업로드 + 메모)
//   · 종료(CLOSED) 과제는 제출 불가, 교수 연장 승인(EXTENDED)은 연장 마감으로 제출 가능.
// ⚠️ 연동 시 이 mock 블록 + delay 삭제, axios 실호출로 교체(시그니처 유지) + describeApiError 에러 표기.
// ─────────────────────────────────────────────────────────────

/** 제출 상태 — OPEN 제출가능 / EXTENDED 연장 승인(연장 마감까지) / CLOSED 마감 종료 */
export type SubmitStatus = "OPEN" | "EXTENDED" | "CLOSED";

/** 과제 안내(우측 패널) */
export interface SubmitGuide {
  courseName: string;
  professor: string;
  lines: string[]; // 요구사항·제출 형식·배점 등
}

/** 선택 시 프리필되는 제출 초안(설계서의 '작성 중' 상태 재현) */
export interface SubmitDraft {
  fileName: string;
  fileSize: number; // bytes (표시는 formatFileSize 정본)
  memo: string;
}

/** 제출 대상 과제 1건 */
export interface SubmitItem {
  id: number;
  title: string;
  courseName: string;
  dueLabel: string; // "2026.05.25 23:59"
  status: SubmitStatus;
  dDay: string | null; // "D-0 · 05.25" (CLOSED는 null)
  note?: string; // "05.20 마감 경과" / "교수 연장 승인 (05.22→06.01)"
  badge?: string; // 좌측 목록 배지(예: "제출", "마감 종료")
  dotColor: string; // 좌측 목록 점 색
  acceptHint: string; // 업로드 안내(예: "PDF, ZIP, DOCX, PY, JAVA 등 · 최대 100MB")
  guide: SubmitGuide;
  draft?: SubmitDraft; // 선택 시 프리필(설계서 예시 재현용)
}

// ── mock 데이터 (설계서 SLM-007 기준) — BE 연동 시 이 블록 + delay 삭제 ──
const ACCEPT_HINT = "PDF, ZIP, DOCX, PY, JAVA 등 · 최대 100MB";

const MOCK_SUBMIT_ITEMS: SubmitItem[] = [
  {
    id: 101,
    title: "알고리즘 구현 과제 #3",
    courseName: "데이터구조 및 알고리즘",
    dueLabel: "2026.05.25 23:59",
    status: "OPEN",
    dDay: "D-0 · 05.25",
    dotColor: "bg-emerald-500",
    acceptHint: ACCEPT_HINT,
    guide: {
      courseName: "데이터구조 및 알고리즘",
      professor: "이민준",
      lines: [
        "O(n log n) 이하 시간복잡도의 정렬 알고리즘을 직접 구현",
        "제출 형식: ZIP 또는 PDF / 언어 제한 없음 · 배점 100점",
      ],
    },
    draft: {
      fileName: "algorithm_hw3_20221234.zip",
      fileSize: Math.round(2.3 * 1024 ** 2),
      memo: "퀵소트와 힙소트를 모두 구현하여 성능을 비교하였습니다.",
    },
  },
  {
    id: 102,
    title: "UML 다이어그램 작성",
    courseName: "소프트웨어공학",
    dueLabel: "2026.05.28 23:59",
    status: "OPEN",
    dDay: "D-3 · 05.28",
    dotColor: "bg-orange-500",
    acceptHint: ACCEPT_HINT,
    guide: {
      courseName: "소프트웨어공학",
      professor: "김태경",
      lines: [
        "수강 중인 시스템의 유스케이스·클래스·시퀀스 다이어그램 작성",
        "제출 형식: PDF 또는 이미지 · 배점 100점",
      ],
    },
  },
  {
    id: 103,
    title: "ERD 설계 과제",
    courseName: "데이터베이스",
    dueLabel: "2026.05.30 23:59",
    status: "OPEN",
    dDay: "D-5 · 05.30",
    dotColor: "bg-purple-500",
    acceptHint: ACCEPT_HINT,
    guide: {
      courseName: "데이터베이스",
      professor: "최영수",
      lines: [
        "주어진 요구사항을 분석하여 정규화된 ERD를 설계",
        "제출 형식: PDF · 정규화 단계 설명 포함 · 배점 100점",
      ],
    },
  },
  {
    id: 104,
    title: "프로세스 동기화 레포트",
    courseName: "운영체제",
    dueLabel: "2026.05.20 23:59",
    status: "CLOSED",
    dDay: null,
    note: "05.20 마감 경과",
    badge: "마감 종료",
    dotColor: "bg-slate-300",
    acceptHint: ACCEPT_HINT,
    guide: {
      courseName: "운영체제",
      professor: "박성훈",
      lines: ["세마포어·뮤텍스를 활용한 동기화 문제 해결 레포트", "마감이 지나 제출할 수 없습니다."],
    },
  },
  {
    id: 105,
    title: "React 컴포넌트 구현",
    courseName: "웹프로그래밍",
    dueLabel: "2026.06.01 23:59",
    status: "EXTENDED",
    dDay: "D-7 · 06.01",
    note: "교수 연장 승인 (05.22→06.01)",
    badge: "제출",
    dotColor: "bg-emerald-500",
    acceptHint: ACCEPT_HINT,
    guide: {
      courseName: "웹프로그래밍",
      professor: "이수진",
      lines: [
        "재사용 가능한 React 컴포넌트 3종 이상 구현 (상태 관리 포함)",
        "제출 형식: ZIP · 배점 100점 · 교수 연장 승인으로 06.01까지 제출 가능",
      ],
    },
  },
];

const delay = <T,>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), 200));

/** GET /api/lms/student/assignments/submittable — 제출 대상 목록 (현재 mock) */
export const getSubmittableAssignments = (): Promise<SubmitItem[]> => delay(MOCK_SUBMIT_ITEMS);
