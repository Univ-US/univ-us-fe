// src/lib/lmsProfessorNoticeApi.ts
// PLM-007 공지사항 관리 — 교수가 담당 강의 공지를 작성·수정·삭제 (좌 목록 선택 → 우 상세)
// ─────────────────────────────────────────────────────────────
// 🧪 mock-first(§15): BE 미구현 → 명시적 샘플 + 인메모리 CRUD(작성/수정/삭제가 화면에 즉시 반영).
//   화면 상단 앰버 배너로 mock 단계 표기. BE 연동 시 이 mock 블록 전체 삭제 + axios 실호출로 교체(시그니처 유지).
//
// 이 화면(교수 write) ↔ SLM-009 학생 공지(read)는 같은 LECTURE_ANNOUNCEMENT 데이터.
//   · 교수는 '담당 강의'(LECTURE.LMS_PRF_ID=본인)의 공지만 관리 → 그게 수강생 SLM-009에 노출.
//   · 본문 = Tiptap HTML(작성=읽기 형식 일치) → 표시 직전 sanitizeLmsHtml 정화(XSS 방지, PLM-005 패턴).
//
// BE 연동 예정(안):
//   · GET    /api/lms/professor/notices/lectures            — 공지 작성 대상(담당 강의)
//   · GET    /api/lms/professor/notices?lecId=&page=&size=   — 선택 과목 공지(최신순)
//   · POST   /api/lms/professor/notices                      — 작성(multipart: lecId·title·content·files)
//   · PUT    /api/lms/professor/notices/{noticeId}           — 수정(+ removeAttachmentIds, 과목 변경 불가)
//   · DELETE /api/lms/professor/notices/{noticeId}           — 삭제
//   인증: PROF 가드. 본인 담당 강의만 작성/수정/삭제(소유권 검증). 첨부=ATT_VAL_STATUS=ACT만.
// ─────────────────────────────────────────────────────────────

export const TERM_LABEL: Record<string, string> = {
  SM1: "1학기",
  SMR: "여름 계절",
  SM2: "2학기",
  WNT: "겨울 계절",
};

// LECTURE_ANNOUNCEMENT 컬럼 한도 / 첨부 정책
export const NOTICE_MAX_TITLE = 200; // LECTURE_ANNOUNCEMENT.TITLE VARCHAR2(200)
export const NOTICE_MAX_CONTENT = 4000; // 에디터 텍스트 4000자(HTML은 BE @Size 가드)
export const NOTICE_MAX_FILENAME = 255;
// 첨부 전체 합계 용량 제한 = 100MB (파일당 아님 — 공지 일러스트 등 수십MB 이미지 고려).
// 공지=문서/이미지 위주라 강의자료/과제 5GB와 별도. BE도 서비스단에서 합계 100MB로 검증할 것(멀티파트 글로벌 5GB와 다름).
export const NOTICE_MAX_TOTAL_SIZE = 100 * 1024 * 1024; // 100MB (첨부 합계)
// 첨부 허용 확장자 (LECTURE_ANNOUNCEMENT_ATTACHMENT — 문서·이미지·압축)
export const NOTICE_ALLOWED_EXTS = [
  "pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "hwp", "hwpx", "txt",
  "png", "jpg", "jpeg", "gif", "zip",
];
export const NOTICE_ACCEPT = NOTICE_ALLOWED_EXTS.map((e) => `.${e}`).join(",");

export const fileExtOf = (name: string): string => {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
};

/** 공지 작성 대상 = 담당 강의 1개 (BE: LECTURE + LECTURE_CODE) */
export interface NoticeLecture {
  lecId: number;
  courseName: string; // 전체 과목명(LEC_COD_NAME)
  courseShort: string; // 좌측 목록 배지용 짧은 이름
  lecSection?: number; // 분반(LEC_SECTION)
  year: number; // SEM_YEAR
  termCode: string; // SEM_TERM
}

/** 첨부파일 (LECTURE_ANNOUNCEMENT_ATTACHMENT) */
export interface NoticeAttachment {
  attachmentId: number;
  fileName: string;
  fileSize: number; // bytes (표시는 formatFileSize 정본)
}

/** 공지 1건 (LECTURE_ANNOUNCEMENT) */
export interface Notice {
  noticeId: number;
  lecId: number;
  courseName: string;
  courseShort: string;
  lecSection?: number;
  year: number;
  termCode: string;
  title: string;
  content: string; // Tiptap HTML — 표시 직전 sanitizeLmsHtml 정화
  author: string; // 작성 교수("이민준 교수")
  date: string; // 등록일시 "2026-05-25 16:20" (REG_DATE)
  listDate: string; // 좌측 목록 날짜 "05.25"
  attachments: NoticeAttachment[];
}

/** 작성/수정 입력 */
export interface NoticeInput {
  lecId: number;
  title: string;
  content: string; // HTML
  files: File[]; // 신규 첨부
  removeAttachmentIds: number[]; // 수정 시 제거할 기존 첨부
}

// ── mock 데이터 (BE 연동 시 이 블록 + delay 삭제) ──────────────────
const MOCK_AUTHOR = "이민준 교수";

const MOCK_LECTURES: NoticeLecture[] = [
  { lecId: 101, courseName: "데이터구조 및 알고리즘", courseShort: "데이터구조", lecSection: 1, year: 2026, termCode: "SM1" },
  { lecId: 102, courseName: "소프트웨어공학", courseShort: "SW공학", lecSection: 1, year: 2026, termCode: "SM1" },
  { lecId: 103, courseName: "알고리즘 설계", courseShort: "알고리즘", lecSection: 1, year: 2026, termCode: "SM1" },
  // 이전 학기(년도/학기 필터 동작 확인용)
  { lecId: 104, courseName: "자료구조", courseShort: "자료구조", lecSection: 2, year: 2025, termCode: "SM2" },
];

let seqNotice = 100;
let seqAttachment = 500;

const lecOf = (lecId: number) => MOCK_LECTURES.find((l) => l.lecId === lecId);

function makeNotice(
  lecId: number,
  title: string,
  content: string,
  date: string,
  attachments: { fileName: string; fileSize: number }[] = []
): Notice {
  const l = lecOf(lecId)!;
  const listDate = date.slice(5, 10).replace("-", "."); // "MM.DD"
  return {
    noticeId: ++seqNotice,
    lecId,
    courseName: l.courseName,
    courseShort: l.courseShort,
    lecSection: l.lecSection,
    year: l.year,
    termCode: l.termCode,
    title,
    content,
    author: MOCK_AUTHOR,
    date,
    listDate,
    attachments: attachments.map((a) => ({ attachmentId: ++seqAttachment, ...a })),
  };
}

const MOCK_NOTICES: Notice[] = [
  // 데이터구조 및 알고리즘 (lecId 101)
  makeNotice(
    101,
    "7주차 강의 자료 업로드 안내",
    "<p>안녕하세요, 수강생 여러분.</p><p>7주차 강의 영상(퀵소트 알고리즘)과 슬라이드 PDF가 강의자료 탭에 업로드되었습니다.</p><p>과제 #3 마감은 <strong>2026.05.25 23:59</strong>이오니 기한을 꼭 지켜주세요.</p><p>질문은 채팅 또는 강의 후 질의응답 시간을 이용해 주세요.</p>",
    "2026-05-25 09:15",
    [{ fileName: "week7_quicksort.pdf", fileSize: 4_404_019 }]
  ),
  makeNotice(
    101,
    "과제 #3 제출 유의사항",
    "<p>과제 #3(정렬 알고리즘 직접 구현) 제출 시 아래를 지켜주세요.</p><p>• 제출 형식: ZIP 또는 PDF</p><p>• 파일명에 <strong>학번</strong> 포함 (예: 20240001_assignment3.zip)</p><p>• 배점 100점 · 지각 제출 시 감점</p>",
    "2026-05-20 14:30",
    []
  ),
  makeNotice(
    101,
    "중간 피드백 설문 참여 요청",
    "<p>강의 개선을 위한 중간 피드백 설문을 진행합니다.</p><p>참여하신 분께는 다음 과제에 <strong>가산점 2점</strong>을 부여합니다. 5월 15일까지 응답해 주세요.</p>",
    "2026-05-10 11:00",
    []
  ),
  makeNotice(
    101,
    "기말고사 범위 및 준비 안내",
    "<p>기말고사 범위와 준비 사항을 안내드립니다.</p><p><strong>시험 정보</strong></p><p>• 일시: 6월 18일(목) 10:00 ~ 11:30 (90분)</p><p>• 장소: 공학관 401호</p><p>• 형식: 이론 60% + 알고리즘 구현 서술 40%</p><p>질문은 채팅 또는 질의응답 시간을 이용해 주세요.</p>",
    "2026-05-28 16:20",
    [{ fileName: "기말고사_안내_데이터구조.pdf", fileSize: 838_860 }]
  ),
  // 소프트웨어공학 (lecId 102)
  makeNotice(
    102,
    "과제 마감 연장 안내 (5/22 → 5/28)",
    "<p>다수의 요청을 반영하여 UML 다이어그램 작성 과제의 마감을 연장합니다.</p><p>• 변경 전 마감: 5월 22일(목) 23:59</p><p>• 변경 후 마감: 5월 28일(수) 23:59</p><p>연장된 마감 이후에는 제출이 불가하니 유의해 주세요.</p>",
    "2026-05-18 17:50",
    []
  ),
  makeNotice(
    102,
    "팀 프로젝트 조 편성 결과",
    "<p>팀 프로젝트 조 편성 결과를 첨부합니다. 조별 첫 미팅은 이번 주 강의 후 진행해 주세요.</p>",
    "2026-05-12 10:05",
    [{ fileName: "team_assignment.xlsx", fileSize: 152_064 }]
  ),
  // 알고리즘 설계 (lecId 103)
  makeNotice(
    103,
    "특강 일정 변경 안내",
    "<p>외부 연사 특강 일정이 아래와 같이 변경되었습니다.</p><p>• 변경 전: 5월 12일(월)</p><p>• 변경 후: 5월 19일(월) 15:00, 공학관 대강당</p>",
    "2026-05-08 13:40",
    []
  ),
  // 자료구조 — 2025 2학기 (학기 필터 동작 확인용)
  makeNotice(
    104,
    "기말 성적 이의신청 안내",
    "<p>기말 성적 확인 및 이의신청 기간을 안내드립니다.</p><p>• 확인 기간: 12월 19일 ~ 12월 21일</p><p>• 이의신청: 채팅 또는 이메일</p>",
    "2025-12-18 13:00",
    []
  ),
];

const delay = <T,>(value: T, ms = 200): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

const cloneNotice = (n: Notice): Notice => ({
  ...n,
  attachments: n.attachments.map((a) => ({ ...a })),
});

// 등록 시각 스탬프 (mock — BE는 REG_DATE=SYSTIMESTAMP)
const nowStamp = (): { date: string; listDate: string } => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const date = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  const listDate = `${p(d.getMonth() + 1)}.${p(d.getDate())}`;
  return { date, listDate };
};

/** GET /notices/lectures — 공지 작성 대상(담당 강의) */
export const getNoticeLectures = (): Promise<NoticeLecture[]> =>
  delay(MOCK_LECTURES.map((l) => ({ ...l })));

/** GET /notices?lecId= — 선택 과목 공지(등록일시 내림차순=최신순) */
export const getCourseNotices = (lecId: number): Promise<Notice[]> =>
  delay(
    MOCK_NOTICES.filter((n) => n.lecId === lecId)
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(cloneNotice)
  );

/** POST /notices — 작성 */
export const createNotice = (input: NoticeInput): Promise<Notice> => {
  const l = lecOf(input.lecId);
  if (!l) return Promise.reject(new Error("대상 강의를 찾을 수 없습니다."));
  const { date, listDate } = nowStamp();
  const notice: Notice = {
    noticeId: ++seqNotice,
    lecId: l.lecId,
    courseName: l.courseName,
    courseShort: l.courseShort,
    lecSection: l.lecSection,
    year: l.year,
    termCode: l.termCode,
    title: input.title,
    content: input.content,
    author: MOCK_AUTHOR,
    date,
    listDate,
    attachments: input.files.map((f) => ({
      attachmentId: ++seqAttachment,
      fileName: f.name,
      fileSize: f.size,
    })),
  };
  MOCK_NOTICES.push(notice);
  return delay(cloneNotice(notice));
};

/** PUT /notices/{id} — 수정 (과목 변경 불가 → input.lecId 무시) */
export const updateNotice = (noticeId: number, input: NoticeInput): Promise<Notice> => {
  const n = MOCK_NOTICES.find((x) => x.noticeId === noticeId);
  if (!n) return Promise.reject(new Error("공지를 찾을 수 없습니다."));
  n.title = input.title;
  n.content = input.content;
  n.attachments = n.attachments
    .filter((a) => !input.removeAttachmentIds.includes(a.attachmentId))
    .concat(
      input.files.map((f) => ({
        attachmentId: ++seqAttachment,
        fileName: f.name,
        fileSize: f.size,
      }))
    );
  return delay(cloneNotice(n));
};

/** DELETE /notices/{id} — 삭제 */
export const deleteNotice = (noticeId: number): Promise<void> => {
  const i = MOCK_NOTICES.findIndex((x) => x.noticeId === noticeId);
  if (i >= 0) MOCK_NOTICES.splice(i, 1);
  return delay(undefined);
};
