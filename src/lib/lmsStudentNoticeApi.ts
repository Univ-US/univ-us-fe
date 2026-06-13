// src/lib/lmsStudentNoticeApi.ts
// SLM-009 공지사항 — 수강 과목 교수가 작성한 강의 공지 확인 (좌 목록 선택 → 우 상세)
// ─────────────────────────────────────────────────────────────
// 🧪 mock-first 단계(§15): BE 연동 전이라 명시적 샘플 데이터로 동작. 화면 상단 앰버 배너 표기.
// BE 연동 예정: GET /api/lms/student/notices?semesterId= (수강 과목 교수 공지)
//   · 안읽은 공지는 굵게 + 점 표시 / 첨부파일 다운로드(인증 blob) / 학기 드롭다운(특정 학기)
//   · 작성자 = 수강 과목 교수. (질문은 채팅 SLM-008)
// ⚠️ 연동 시 이 mock 블록 + delay 삭제, axios 실호출로 교체(시그니처 유지) + describeApiError 에러 표기.
// ─────────────────────────────────────────────────────────────

/** 공지 본문 블록 — 문단/소제목/목록 */
export type NoticeBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "list"; items: string[] };

/** 첨부파일 */
export interface NoticeAttachment {
  fileName: string;
  size: string; // 표시용(예: "0.8 MB")
}

/** 공지 1건 */
export interface Notice {
  id: number;
  year: number;
  termCode: string;
  semesterLabel: string;
  courseName: string; // 좌측 배지(짧은 이름)
  courseFullName: string; // 상세 배지(전체 이름)
  title: string;
  author: string; // "이민준 교수"
  date: string; // "2026.05.15"
  listDate: string; // 좌측 목록 날짜(예: "05.15")
  views: number;
  unread: boolean;
  featured?: boolean; // 기본 선택(설계서 스크린샷 기준)
  content: NoticeBlock[];
  attachment?: NoticeAttachment | null;
}

// ── mock 데이터 (설계서 SLM-009 기준, 안읽음 먼저 정렬) — BE 연동 시 이 블록 + delay 삭제 ──
const MOCK_NOTICES: Notice[] = [
  {
    id: 1, year: 2026, termCode: "SM1", semesterLabel: "2026년 1학기",
    courseName: "데이터구조", courseFullName: "데이터구조 및 알고리즘",
    title: "기말 프로젝트 발표 일정 및 평가 기준 안내", author: "이민준 교수",
    date: "2026-05-24", listDate: "05.24", views: 96, unread: true,
    content: [
      { type: "paragraph", text: "기말 프로젝트 발표 일정과 평가 기준을 안내드립니다." },
      { type: "heading", text: "발표 일정" },
      { type: "list", items: ["6월 11일(목) ~ 6월 12일(금) · 강의 시간 내 진행", "조별 발표 12분 + 질의응답 3분"] },
      { type: "heading", text: "평가 기준" },
      { type: "list", items: ["문제 정의·자료구조 선택의 타당성 30%", "구현 완성도 40%", "발표·시연 30%"] },
      { type: "paragraph", text: "발표 자료는 발표 전날 18시까지 강의 자료실에 업로드해 주세요." },
    ],
    attachment: { fileName: "기말프로젝트_평가기준.pdf", size: "0.5 MB" },
  },
  {
    id: 2, year: 2026, termCode: "SM1", semesterLabel: "2026년 1학기",
    courseName: "운영체제", courseFullName: "운영체제",
    title: "보강 수업 안내 (6/3 18:00, 공학관 401)", author: "박성훈 교수",
    date: "2026-05-20", listDate: "05.20", views: 73, unread: true,
    content: [
      { type: "paragraph", text: "공휴일로 휴강했던 수업의 보강을 아래와 같이 진행합니다." },
      { type: "list", items: ["일시: 6월 3일(수) 18:00 ~ 19:30", "장소: 공학관 401호", "범위: 페이지 교체 알고리즘 (LRU·Clock)"] },
      { type: "paragraph", text: "부득이하게 참석이 어려운 경우 채팅으로 미리 알려 주세요." },
    ],
    attachment: null,
  },
  {
    id: 3, year: 2026, termCode: "SM1", semesterLabel: "2026년 1학기",
    courseName: "데이터구조", courseFullName: "데이터구조 및 알고리즘",
    title: "기말고사 범위 및 준비 안내", author: "이민준 교수",
    date: "2026-05-15", listDate: "05.15", views: 128, unread: true, featured: true,
    content: [
      { type: "paragraph", text: "안녕하세요, 데이터구조 및 알고리즘 수강생 여러분." },
      { type: "paragraph", text: "기말고사 범위와 준비 사항을 아래와 같이 안내드립니다." },
      { type: "heading", text: "시험 정보" },
      { type: "list", items: ["일시: 6월 18일(목) 10:00 ~ 11:30 (90분)", "장소: 공학관 401호 (정규 강의실)", "형식: 이론 60% + 알고리즘 구현 서술 40%"] },
      { type: "heading", text: "시험 범위" },
      { type: "list", items: ["8주차 ~ 14주차 전 범위 (정렬·트리·그래프·동적 계획법)", "과제 #1~#3에서 다룬 구현 문제 포함"] },
      { type: "paragraph", text: "질문은 채팅 또는 강의 후 질의응답 시간을 이용해 주세요." },
    ],
    attachment: { fileName: "기말고사_안내_데이터구조.pdf", size: "0.8 MB" },
  },
  {
    id: 4, year: 2026, termCode: "SM1", semesterLabel: "2026년 1학기",
    courseName: "데이터구조", courseFullName: "데이터구조 및 알고리즘",
    title: "7주차 강의 자료 및 과제 #3 안내", author: "이민준 교수",
    date: "2026-05-25", listDate: "05.25", views: 142, unread: false,
    content: [
      { type: "paragraph", text: "7주차 강의 자료를 강의 자료실에 업로드했습니다." },
      { type: "paragraph", text: "과제 #3은 정렬 알고리즘 직접 구현 과제이며, 마감은 5월 25일 23:59입니다." },
      { type: "list", items: ["제출 형식: ZIP 또는 PDF", "파일명에 학번 포함", "배점 100점"] },
    ],
    attachment: { fileName: "week7_slides.pdf", size: "4.2 MB" },
  },
  {
    id: 5, year: 2026, termCode: "SM1", semesterLabel: "2026년 1학기",
    courseName: "운영체제", courseFullName: "운영체제",
    title: "중간고사 일정 변경 공지", author: "박성훈 교수",
    date: "2026-05-23", listDate: "05.23", views: 88, unread: false,
    content: [
      { type: "paragraph", text: "학사 일정 조정으로 중간고사 일정이 변경되었습니다." },
      { type: "list", items: ["변경 전: 4월 22일(수)", "변경 후: 4월 24일(금) 13:00", "장소·범위는 동일"] },
    ],
    attachment: null,
  },
  {
    id: 6, year: 2026, termCode: "SM1", semesterLabel: "2026년 1학기",
    courseName: "SW공학", courseFullName: "소프트웨어공학",
    title: "과제 마감 연장 안내 (5/22 → 5/28)", author: "김태경 교수",
    date: "2026-05-18", listDate: "05.18", views: 61, unread: false,
    content: [
      { type: "paragraph", text: "다수의 요청을 반영하여 UML 다이어그램 작성 과제의 마감을 연장합니다." },
      { type: "list", items: ["변경 전 마감: 5월 22일(목) 23:59", "변경 후 마감: 5월 28일(수) 23:59"] },
      { type: "paragraph", text: "연장된 마감 이후에는 제출이 불가하니 유의해 주세요." },
    ],
    attachment: null,
  },
  // 학기 드롭다운 동작 확인용(이전 학기)
  {
    id: 11, year: 2025, termCode: "SM2", semesterLabel: "2025년 2학기",
    courseName: "알고리즘 설계", courseFullName: "알고리즘 설계",
    title: "기말 성적 이의신청 안내", author: "이민준 교수",
    date: "2025-12-18", listDate: "12.18", views: 154, unread: false,
    content: [
      { type: "paragraph", text: "기말 성적 확인 및 이의신청 기간을 안내드립니다." },
      { type: "list", items: ["확인 기간: 12월 19일 ~ 12월 21일", "이의신청: 채팅 또는 이메일"] },
    ],
    attachment: null,
  },
];

const delay = <T,>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), 200));

/** GET /api/lms/student/notices — 수강 과목 공지(현재 mock) */
export const getStudentNotices = (): Promise<Notice[]> => delay(MOCK_NOTICES);
