// src/lib/lmsStudentMaterialsApi.ts
// SLM-006 강의 자료 — 교수가 올린 자료(제목·본문·첨부)를 과목별 확인 + '자료 보기' 모달 열람/다운로드
// ─────────────────────────────────────────────────────────────
// 🧪 mock-first 단계(§15): BE 연동 전이라 명시적 샘플 데이터로 동작. 화면 상단 앰버 배너 표기.
// BE 연동 예정: GET /api/lms/student/materials (학기 무관 전체 — FE가 년도/학기 + 과목으로 좁힘)
//   응답 = SemesterMaterials[] — 화면은 년도/학기(기본 둘 다 '전체') + 과목 드롭다운(첫 과목 자동 선택)
//   → 선택 과목 1개의 자료만 표시(PLM-006 패턴). lecSection=분반(LEC_SECTION), 과목 드롭다운 라벨용.
// ⭐ 자료 구조 = 교수 강의 업로드(PLM-005)와 동일 미러: 자료 1건(LECTURE_UPLOADING) = 제목 + 본문(content) + 첨부 0..N
//   (LECTURE_UPLOADING_ATTACHMENT). 행은 유형/크기 요약(첨부 파생)·'자료 보기' 액션 → 모달에서 본문·첨부 열람.
//   필드명(uploadId·title·content·uploadedAt·attachments·fileExt·fileSize)은 교수 Material/Attachment와 동일.
//   교수는 insert(원천), 학생은 Read. 다운로드는 인증 필요(BE 다운로드 엔드포인트) — 만료/제한 시 downloadable=false(첨부 다운로드만 막음).
// ⚠️ 연동 시 이 mock 블록 + delay 삭제, axios 실호출로 교체(시그니처 유지) + describeApiError 에러 표기.
// 출력 규칙(§21): 크기 = formatFileSize(bytes) 정본 / 업로드일 = YYYY-MM-DD(날짜만) / 유형·크기 빈값 = `—`(교수 동일).
// 본문(content) = 교수 Tiptap HTML(CLOB) → 표시 직전 sanitizeLmsHtml로 정화 후 렌더.
// ─────────────────────────────────────────────────────────────

/** 다운로드 불가 사유 — 학생 접근 관점(교수 구조엔 없는 학생 전용 개념). '자료 보기/본문'은 항상 가능, 첨부 다운로드만 막음.
 *  expired = 첨부 ATT_VAL_STATUS=EXPR(만료) / restricted = 교수 제한(현 스키마 전용 컬럼 없음 → BE 정책·MVP 미구현 가정) */
export type LockedReason = "expired" | "restricted";

/** 첨부 1건 — 교수 업로드 구조 미러(LECTURE_UPLOADING_ATTACHMENT). 유형 배지·크기·다운로드 식별.
 *  ⚠️ BE는 표시 첨부 = ATT_VAL_STATUS=ACT 만 직렬화(DEL/FAIL 제외). 첨부 상태는 클라 미노출 → 자료의 downloadable로 환원. */
export interface Attachment {
  attachmentId: number;
  fileName: string; // 원본 파일명 (다운로드용)
  fileExt: string | null; // 소문자 확장자 ("mp4"/"pdf" — EXT_TYPE, MIME 아님). 유형 배지 파생
  fileSize: number | null; // bytes
}

/** 강의 자료 1건(= 교수 자료 1건, LECTURE_UPLOADING) — 본문 content + 첨부 0..N(없으면 빈 배열 → 유형/크기 '—') */
export interface Material {
  uploadId: number; // LEC_UPL_ID (교수 Material.uploadId와 동일 필드명)
  title: string; // LEC_UPL_TITLE
  content: string | null; // LEC_UPL_CONTENT — 교수 Tiptap HTML(CLOB). '자료 보기' 모달 본문(표시 전 sanitize). null=내용 없음
  uploadedAt: string; // "2026-05-20" 날짜만 (LEC_UPL_REG_DATE, 시각 의미 없음 §21 — 교수 uploadedAt와 동일)
  attachments: Attachment[]; // 다중 첨부, 텍스트 전용이면 빈 배열
  downloadable: boolean; // 표시 첨부가 전부 ACT면 true, 하나라도 EXPR이면 false (BE 서버측 도출). 첨부 다운로드 가부만 좌우. 학생 전용
  lockedReason?: LockedReason; // downloadable=false 일 때 사유
}

/** 과목 단위 자료 묶음 */
export interface CourseMaterials {
  lecId: number;
  courseName: string;
  lecSection: number | null; // 분반 (LECTURE.LEC_SECTION) — 교수 Lecture.lecSection과 동형(nullable). 드롭다운 라벨용(null이면 분반 토막 생략)
  materials: Material[];
}

/** 한 학기 단위 자료 */
export interface SemesterMaterials {
  year: number;
  termCode: string;
  semesterLabel: string;
  courses: CourseMaterials[];
}

// ── mock 데이터 (설계서 SLM-006 기준 — 교수 업로드 구조 미러) — BE 연동 시 이 블록 + delay 삭제 ──
const MB = 1024 ** 2;

const MOCK_MATERIALS: SemesterMaterials[] = [
  {
    year: 2026,
    termCode: "SM1",
    semesterLabel: "2026년 1학기",
    courses: [
      {
        lecId: 1,
        courseName: "데이터구조 및 알고리즘",
        lecSection: 1,
        materials: [
          {
            // 다중 첨부 + 첫 첨부가 영상 → 유형 '🎬 mp4 +1'
            uploadId: 1,
            title: "Week 7 - 퀵소트 알고리즘 강의",
            content:
              "<p>퀵소트의 <strong>분할 정복</strong> 전략과 피벗 선택 기준을 설명합니다.</p><p>평균 시간복잡도 <strong>O(n log n)</strong>, 최악 O(n²)는 랜덤/중앙값 피벗으로 회피합니다.</p>",
            uploadedAt: "2026-05-20",
            attachments: [
              { attachmentId: 101, fileName: "week7_quicksort.mp4", fileExt: "mp4", fileSize: Math.round(812 * MB) },
              { attachmentId: 106, fileName: "week7_quicksort_notes.pdf", fileExt: "pdf", fileSize: Math.round(2.4 * MB) },
            ],
            downloadable: true,
          },
          {
            // 다중 첨부
            uploadId: 2,
            title: "Week 7 강의 슬라이드 + 실습 코드",
            content:
              "<p>강의 슬라이드(PDF)와 실습 코드(ZIP)를 함께 첨부합니다. 실습 과제는 다음 강의 전까지 제출하세요.</p>",
            uploadedAt: "2026-05-20",
            attachments: [
              { attachmentId: 102, fileName: "week7_slides.pdf", fileExt: "pdf", fileSize: Math.round(4.2 * MB) },
              { attachmentId: 103, fileName: "week7_practice.zip", fileExt: "zip", fileSize: Math.round(1.1 * MB) },
            ],
            downloadable: true,
          },
          {
            uploadId: 3,
            title: "Week 6 - 합병정렬 강의",
            content: null,
            uploadedAt: "2026-05-13",
            attachments: [
              { attachmentId: 104, fileName: "week6_mergesort.mp4", fileExt: "mp4", fileSize: Math.round(756 * MB) },
            ],
            downloadable: true,
          },
          {
            // 다운로드 불가(만료) — 본문/보기는 가능, 첨부 다운로드만 🔒
            uploadId: 4,
            title: "Week 5 - 삽입·버블정렬 강의 (열람 기간 만료)",
            content:
              "<p>삽입정렬·버블정렬의 동작과 한계를 다룹니다. 열람 기간이 만료되어 <strong>영상 다운로드는 제한</strong>됩니다.</p>",
            uploadedAt: "2026-05-06",
            attachments: [
              { attachmentId: 105, fileName: "week5_sort.mp4", fileExt: "mp4", fileSize: Math.round(698 * MB) },
            ],
            downloadable: false,
            lockedReason: "expired",
          },
          {
            // 텍스트 전용 — 첨부 0개. 본문만 있는 공지 (모달=본문 + '첨부 없음')
            uploadId: 5,
            title: "5주차 학습 안내 (공지)",
            content:
              "<p>5주차 학습 안내입니다.</p><p>이번 주는 별도 강의 영상 없이 <strong>교재 3장</strong>을 자습하고, 연습문제 1~10번을 다음 강의 전까지 풀어오세요.</p>",
            uploadedAt: "2026-05-11",
            attachments: [],
            downloadable: true,
          },
          {
            uploadId: 6,
            title: "Week 4 - 연결 리스트와 포인터",
            content: null,
            uploadedAt: "2026-04-29",
            attachments: [
              { attachmentId: 131, fileName: "week4_linkedlist.mp4", fileExt: "mp4", fileSize: Math.round(688 * MB) },
            ],
            downloadable: true,
          },
          {
            uploadId: 7,
            title: "Week 4 강의 슬라이드",
            content: "<p>연결 리스트 구현(단일·이중)과 삽입/삭제 시간복잡도를 정리했습니다.</p>",
            uploadedAt: "2026-04-29",
            attachments: [
              { attachmentId: 132, fileName: "week4_slides.pdf", fileExt: "pdf", fileSize: Math.round(3.9 * MB) },
            ],
            downloadable: true,
          },
          {
            uploadId: 8,
            title: "Week 3 - 스택과 큐",
            content: null,
            uploadedAt: "2026-04-22",
            attachments: [
              { attachmentId: 133, fileName: "week3_stack_queue.mp4", fileExt: "mp4", fileSize: Math.round(642 * MB) },
            ],
            downloadable: true,
          },
          {
            uploadId: 9,
            title: "Week 3 실습 코드",
            content: null,
            uploadedAt: "2026-04-22",
            attachments: [
              { attachmentId: 134, fileName: "week3_practice.zip", fileExt: "zip", fileSize: Math.round(0.9 * MB) },
            ],
            downloadable: true,
          },
          {
            uploadId: 10,
            title: "Week 2 - 배열과 점근 표기법",
            content: "<p>배열·동적 배열과 <strong>Big-O</strong> 점근 표기법을 다룹니다.</p>",
            uploadedAt: "2026-04-15",
            attachments: [
              { attachmentId: 135, fileName: "week2_array_bigo.mp4", fileExt: "mp4", fileSize: Math.round(596 * MB) },
            ],
            downloadable: true,
          },
          {
            uploadId: 15,
            title: "Week 2 보충 자료 (연습문제)",
            content: null,
            uploadedAt: "2026-04-15",
            attachments: [
              { attachmentId: 136, fileName: "week2_exercises.pdf", fileExt: "pdf", fileSize: Math.round(1.2 * MB) },
            ],
            downloadable: true,
          },
          {
            uploadId: 16,
            title: "Week 1 - 자료구조 개요 (OT)",
            content: "<p>강의 OT와 자료구조 학습 로드맵을 안내합니다.</p>",
            uploadedAt: "2026-04-08",
            attachments: [
              { attachmentId: 137, fileName: "week1_intro.mp4", fileExt: "mp4", fileSize: Math.round(412 * MB) },
            ],
            downloadable: true,
          },
          {
            // 텍스트 전용 — 강의 계획서 공지(첨부 없음)
            uploadId: 17,
            title: "강의 계획서 (Syllabus)",
            content:
              "<p>평가 비율: 출석 10%, 과제 30%, 중간 30%, 기말 30%.</p><p>주차별 진도와 준비물은 매주 공지합니다.</p>",
            uploadedAt: "2026-04-08",
            attachments: [],
            downloadable: true,
          },
        ],
      },
      {
        lecId: 2,
        courseName: "운영체제",
        lecSection: 2,
        materials: [
          {
            uploadId: 11,
            title: "Week 7 - 프로세스 스케줄링",
            content: null,
            uploadedAt: "2026-05-19",
            attachments: [
              { attachmentId: 111, fileName: "week7_scheduling.mp4", fileExt: "mp4", fileSize: Math.round(640 * MB) },
            ],
            downloadable: true,
          },
          {
            uploadId: 12,
            title: "Week 7 슬라이드 자료",
            content: "<p>프로세스 스케줄링 알고리즘(FCFS·SJF·RR·MLFQ)을 정리한 슬라이드입니다.</p>",
            uploadedAt: "2026-05-19",
            attachments: [
              { attachmentId: 112, fileName: "week7_os_slides.pdf", fileExt: "pdf", fileSize: Math.round(3.6 * MB) },
            ],
            downloadable: true,
          },
          {
            // 다운로드 불가(교수 제한)
            uploadId: 13,
            title: "실습 코드 패키지 (Week 6) — 교수 제한",
            content: "<p>Week 6 실습 코드 패키지입니다. 다운로드는 교수 승인 후 제공됩니다.</p>",
            uploadedAt: "2026-05-12",
            attachments: [
              { attachmentId: 113, fileName: "week6_lab.zip", fileExt: "zip", fileSize: Math.round(22 * MB) },
            ],
            downloadable: false,
            lockedReason: "restricted",
          },
          {
            uploadId: 14,
            title: "Week 5 슬라이드 자료",
            content: null,
            uploadedAt: "2026-05-05",
            attachments: [
              { attachmentId: 114, fileName: "week5_os_slides.pdf", fileExt: "pdf", fileSize: Math.round(2.8 * MB) },
            ],
            downloadable: true,
          },
        ],
      },
      {
        lecId: 3,
        courseName: "소프트웨어공학",
        lecSection: 1,
        materials: [
          {
            uploadId: 21,
            title: "Week 7 - 디자인 패턴 개요",
            content: null,
            uploadedAt: "2026-05-18",
            attachments: [
              { attachmentId: 121, fileName: "week7_patterns.mp4", fileExt: "mp4", fileSize: Math.round(578 * MB) },
            ],
            downloadable: true,
          },
          {
            // 다중 첨부(PDF + 이미지)
            uploadId: 22,
            title: "UML 다이어그램 참고자료",
            content: "<p>UML 다이어그램 작성 시 참고할 표기법 정리본과 예시 이미지입니다.</p>",
            uploadedAt: "2026-05-18",
            attachments: [
              { attachmentId: 122, fileName: "uml_reference.pdf", fileExt: "pdf", fileSize: Math.round(5.1 * MB) },
              { attachmentId: 123, fileName: "uml_diagram.png", fileExt: "png", fileSize: Math.round(1.8 * MB) },
            ],
            downloadable: true,
          },
          {
            uploadId: 23,
            title: "요구사항 명세서 템플릿",
            content: "<p>요구사항 명세서(SRS) 작성용 템플릿입니다. 팀 프로젝트 과제에 활용하세요.</p>",
            uploadedAt: "2026-03-10",
            attachments: [
              { attachmentId: 124, fileName: "srs_template.docx", fileExt: "docx", fileSize: Math.round(0.4 * MB) },
            ],
            downloadable: true,
          },
        ],
      },
    ],
  },
  {
    year: 2025,
    termCode: "SM2",
    semesterLabel: "2025년 2학기",
    courses: [
      {
        lecId: 11,
        courseName: "알고리즘 설계",
        lecSection: 1,
        materials: [
          {
            uploadId: 101,
            title: "Week 14 - 동적 프로그래밍 심화",
            content: null,
            uploadedAt: "2025-11-28",
            attachments: [
              { attachmentId: 201, fileName: "week14_dp.mp4", fileExt: "mp4", fileSize: Math.round(702 * MB) },
            ],
            downloadable: true,
          },
          {
            uploadId: 102,
            title: "기말 정리 슬라이드",
            content: "<p>기말 범위 핵심 알고리즘을 정리한 슬라이드입니다. 시험 전 복습용.</p>",
            uploadedAt: "2025-11-28",
            attachments: [
              { attachmentId: 202, fileName: "final_review.pdf", fileExt: "pdf", fileSize: Math.round(6.3 * MB) },
            ],
            downloadable: true,
          },
        ],
      },
      {
        lecId: 12,
        courseName: "컴퓨터 네트워크",
        lecSection: 1,
        materials: [
          {
            uploadId: 111,
            title: "TCP/IP 계층 구조 정리",
            content: null,
            uploadedAt: "2025-11-20",
            attachments: [
              { attachmentId: 211, fileName: "tcpip_layers.pdf", fileExt: "pdf", fileSize: Math.round(3.1 * MB) },
            ],
            downloadable: true,
          },
          {
            uploadId: 112,
            title: "패킷 분석 실습 데이터",
            content: null,
            uploadedAt: "2025-11-05",
            attachments: [
              { attachmentId: 212, fileName: "packet_capture.zip", fileExt: "zip", fileSize: Math.round(48 * MB) },
            ],
            downloadable: true,
          },
        ],
      },
    ],
  },
];

const delay = <T,>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), 200));

/** GET /api/lms/student/materials — 학기별 과목 자료 (현재 mock) */
export const getStudentMaterials = (): Promise<SemesterMaterials[]> => delay(MOCK_MATERIALS);
