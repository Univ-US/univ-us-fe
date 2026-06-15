// src/lib/lmsStudentNoticeApi.ts
// SLM-009 공지사항 — 수강 과목 교수가 작성한 강의 공지 확인 (좌 목록 선택 → 우 상세)
// ─────────────────────────────────────────────────────────────
// 🧪 mock-first 단계(§15): BE 연동 전이라 명시적 샘플 데이터로 동작. 화면 상단 앰버 배너 표기.
// BE 연동 예정: GET /api/lms/student/notices (수강 과목 교수 공지 — 전체 반환, FE가 좁힘)
//   · 화면 = 년도/학기(기본 둘 다 '전체') + 과목 드롭다운(첫 과목 자동 선택, SLM-006/PLM-006 패턴) → 선택 '한 과목'의 공지만 표시
//   · 첨부파일 다운로드(인증 blob) — 읽음 유무(안읽음 표시) 기능 없음
//   · 작성자 = 수강 과목 교수(프로필 사진 = LMS_PROFILE_IMAGE → authorImageUrl, 없으면 기본 프로필사진). (질문은 채팅 SLM-008)
// ⭐ 본문 = 교수 Tiptap HTML (PLM-007 공지 작성 화면에서 확정 — 작성=읽기 형식 일치). 표시 직전 sanitizeLmsHtml 정화 후 렌더.
//    ⚠️ 교수 에디터(ProfessorRichTextEditor)는 굵게/기울임/밑줄/크기/색상 5종만 지원(헤딩·목록 미지원) →
//       mock 본문도 <p>/<strong>만 사용(목록은 '• ' 접두 문단). h3/ul/li를 쓰면 에디터 라운드트립에서 평탄화됨.
// ⚠️ 연동 시 이 mock 블록 + delay 삭제, axios 실호출로 교체(시그니처 유지) + describeApiError 에러 표기.
// ─────────────────────────────────────────────────────────────

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
  lecId: number; // 과목(강의) 식별 — 과목 드롭다운/필터 기준 (BE: LECTURE.LEC_ID)
  lecSection?: number; // 분반 (BE: LECTURE.LEC_SECTION)
  courseName: string; // 좌측 배지(짧은 이름)
  courseFullName: string; // 과목 드롭다운(전체 이름)
  title: string;
  author: string; // "이민준 교수"
  authorImageUrl?: string | null; // 작성 교수 프로필 사진(BE: LMS_PROFILE_IMAGE) — 없으면 기본 프로필사진
  date: string; // 등록일시 "2026-05-15 14:30" (BE: REG_DATE — 상세에 날짜+시간)
  listDate: string; // 좌측 목록 날짜(예: "05.15")
  featured?: boolean; // 기본 선택(설계서 스크린샷 기준)
  content: string; // 교수 Tiptap HTML (BE: LECTURE_ANNOUNCEMENT.CONTENT CLOB) — 표시 직전 sanitizeLmsHtml
  attachment?: NoticeAttachment | null;
}

// ── mock 데이터 (설계서 SLM-009 기준, 최신순 정렬) — BE 연동 시 이 블록 + delay 삭제 ──
const MOCK_NOTICES: Notice[] = [
  {
    id: 1, year: 2026, termCode: "SM1", semesterLabel: "2026년 1학기", lecId: 101, lecSection: 1,
    courseName: "데이터구조", courseFullName: "데이터구조 및 알고리즘",
    title: "기말 프로젝트 발표 일정 및 평가 기준 안내", author: "이민준 교수",
    date: "2026-05-24 16:20", listDate: "05.24",
    content:
      "<p>기말 프로젝트 발표 일정과 평가 기준을 안내드립니다.</p>" +
      "<p><strong>발표 일정</strong></p>" +
      "<p>• 6월 11일(목) ~ 6월 12일(금) · 강의 시간 내 진행</p><p>• 조별 발표 12분 + 질의응답 3분</p>" +
      "<p><strong>평가 기준</strong></p>" +
      "<p>• 문제 정의·자료구조 선택의 타당성 30%</p><p>• 구현 완성도 40%</p><p>• 발표·시연 30%</p>" +
      "<p>발표 자료는 발표 전날 18시까지 강의 자료실에 업로드해 주세요.</p>",
    attachment: { fileName: "기말프로젝트_평가기준.pdf", size: "0.5 MB" },
  },
  {
    id: 2, year: 2026, termCode: "SM1", semesterLabel: "2026년 1학기", lecId: 102, lecSection: 1,
    courseName: "운영체제", courseFullName: "운영체제",
    title: "보강 수업 안내 (6/3 18:00, 공학관 401)", author: "박성훈 교수",
    date: "2026-05-20 10:05", listDate: "05.20",
    content:
      "<p>공휴일로 휴강했던 수업의 보강을 아래와 같이 진행합니다.</p>" +
      "<p>• 일시: 6월 3일(수) 18:00 ~ 19:30</p><p>• 장소: 공학관 401호</p><p>• 범위: 페이지 교체 알고리즘 (LRU·Clock)</p>" +
      "<p>부득이하게 참석이 어려운 경우 채팅으로 미리 알려 주세요.</p>",
    attachment: null,
  },
  {
    id: 3, year: 2026, termCode: "SM1", semesterLabel: "2026년 1학기", lecId: 101, lecSection: 1,
    courseName: "데이터구조", courseFullName: "데이터구조 및 알고리즘",
    title: "기말고사 범위 및 준비 안내", author: "이민준 교수",
    date: "2026-05-15 14:30", listDate: "05.15", featured: true,
    content:
      "<p>안녕하세요, 데이터구조 및 알고리즘 수강생 여러분.</p>" +
      "<p>기말고사 범위와 준비 사항을 아래와 같이 안내드립니다.</p>" +
      "<p><strong>시험 정보</strong></p>" +
      "<p>• 일시: 6월 18일(목) 10:00 ~ 11:30 (90분)</p><p>• 장소: 공학관 401호 (정규 강의실)</p><p>• 형식: 이론 60% + 알고리즘 구현 서술 40%</p>" +
      "<p><strong>시험 범위</strong></p>" +
      "<p>• 8주차 ~ 14주차 전 범위 (정렬·트리·그래프·동적 계획법)</p><p>• 과제 #1~#3에서 다룬 구현 문제 포함</p>" +
      "<p>질문은 채팅 또는 강의 후 질의응답 시간을 이용해 주세요.</p>",
    attachment: { fileName: "기말고사_안내_데이터구조.pdf", size: "0.8 MB" },
  },
  {
    id: 4, year: 2026, termCode: "SM1", semesterLabel: "2026년 1학기", lecId: 101, lecSection: 1,
    courseName: "데이터구조", courseFullName: "데이터구조 및 알고리즘",
    title: "7주차 강의 자료 및 과제 #3 안내", author: "이민준 교수",
    date: "2026-05-25 09:15", listDate: "05.25",
    content:
      "<p>7주차 강의 자료를 강의 자료실에 업로드했습니다.</p>" +
      "<p>과제 #3은 정렬 알고리즘 직접 구현 과제이며, 마감은 5월 25일 23:59입니다.</p>" +
      "<p>• 제출 형식: ZIP 또는 PDF</p><p>• 파일명에 학번 포함</p><p>• 배점 100점</p>",
    attachment: { fileName: "week7_slides.pdf", size: "4.2 MB" },
  },
  {
    id: 5, year: 2026, termCode: "SM1", semesterLabel: "2026년 1학기", lecId: 102, lecSection: 1,
    courseName: "운영체제", courseFullName: "운영체제",
    title: "중간고사 일정 변경 공지", author: "박성훈 교수",
    date: "2026-05-23 11:40", listDate: "05.23",
    content:
      "<p>학사 일정 조정으로 중간고사 일정이 변경되었습니다.</p>" +
      "<p>• 변경 전: 4월 22일(수)</p><p>• 변경 후: 4월 24일(금) 13:00</p><p>• 장소·범위는 동일</p>",
    attachment: null,
  },
  {
    id: 6, year: 2026, termCode: "SM1", semesterLabel: "2026년 1학기", lecId: 103, lecSection: 1,
    courseName: "SW공학", courseFullName: "소프트웨어공학",
    title: "과제 마감 연장 안내 (5/22 → 5/28)", author: "김태경 교수",
    date: "2026-05-18 17:50", listDate: "05.18",
    content:
      "<p>다수의 요청을 반영하여 UML 다이어그램 작성 과제의 마감을 연장합니다.</p>" +
      "<p>• 변경 전 마감: 5월 22일(목) 23:59</p><p>• 변경 후 마감: 5월 28일(수) 23:59</p>" +
      "<p>연장된 마감 이후에는 제출이 불가하니 유의해 주세요.</p>",
    attachment: null,
  },
  // 학기 드롭다운 동작 확인용(이전 학기)
  {
    id: 11, year: 2025, termCode: "SM2", semesterLabel: "2025년 2학기", lecId: 104, lecSection: 1,
    courseName: "알고리즘 설계", courseFullName: "알고리즘 설계",
    title: "기말 성적 이의신청 안내", author: "이민준 교수",
    date: "2025-12-18 13:00", listDate: "12.18",
    content:
      "<p>기말 성적 확인 및 이의신청 기간을 안내드립니다.</p>" +
      "<p>• 확인 기간: 12월 19일 ~ 12월 21일</p><p>• 이의신청: 채팅 또는 이메일</p>",
    attachment: null,
  },
];

const delay = <T,>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), 200));

/** GET /api/lms/student/notices — 수강 과목 공지(현재 mock) */
export const getStudentNotices = (): Promise<Notice[]> => delay(MOCK_NOTICES);
