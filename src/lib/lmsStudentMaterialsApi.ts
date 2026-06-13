// src/lib/lmsStudentMaterialsApi.ts
// SLM-006 강의 자료 — 교수가 올린 자료(영상·PDF·이미지·문서)를 학기·과목별 확인/다운로드
// ─────────────────────────────────────────────────────────────
// 🧪 mock-first 단계(§15): BE 연동 전이라 명시적 샘플 데이터로 동작. 화면 상단 앰버 배너 표기.
// BE 연동 예정: GET /api/lms/student/materials?semesterId= (특정 학기의 과목별 자료)
//   응답 = SemesterMaterials[] — 학기 드롭다운은 '특정 학기만'(전체 옵션 없음, 최신 학기 기본).
//   다운로드는 인증 필요(BE 다운로드 엔드포인트) — 연동 시 axios(blob)로 받음.
//   일부 자료는 열람 기간 만료 / 교수 제한으로 다운로드 불가(downloadable=false).
// ⚠️ 연동 시 이 mock 블록 + delay 삭제, axios 실호출로 교체(시그니처 유지) + describeApiError 에러 표기.
// 출력 규칙(§21): 크기 = formatFileSize(bytes) 정본 / 업로드일 = YYYY-MM-DD(날짜만) / 빈값 = `-`.
// ─────────────────────────────────────────────────────────────

/** 자료 유형 — 영상/PDF/이미지/압축/문서 */
export type MaterialType = "VIDEO" | "PDF" | "IMAGE" | "ZIP" | "DOCX";

/** 다운로드 불가 사유 */
export type LockedReason = "expired" | "restricted"; // 열람 기간 만료 / 교수 제한

/** 강의 자료 1건 */
export interface Material {
  id: number;
  type: MaterialType;
  title: string;
  uploadDate: string; // "2026-05-20" (날짜만 — 시각 의미 없음, §21)
  size: number; // bytes (표시는 formatFileSize 정본)
  downloadable: boolean;
  lockedReason?: LockedReason; // downloadable=false 일 때 사유
}

/** 과목 단위 자료 묶음 */
export interface CourseMaterials {
  lecId: number;
  courseName: string;
  materials: Material[];
}

/** 한 학기 단위 자료 */
export interface SemesterMaterials {
  year: number;
  termCode: string;
  semesterLabel: string;
  courses: CourseMaterials[];
}

/** 자료 유형 라벨/배지 색 */
export const MATERIAL_TYPE_META: Record<MaterialType, { label: string; cls: string }> = {
  VIDEO: { label: "영상", cls: "bg-red-50 text-red-600" },
  PDF: { label: "PDF", cls: "bg-emerald-50 text-emerald-700" },
  IMAGE: { label: "이미지", cls: "bg-emerald-50 text-emerald-700" },
  ZIP: { label: "ZIP", cls: "bg-slate-100 text-slate-500" },
  DOCX: { label: "DOCX", cls: "bg-slate-100 text-slate-500" },
};

// ── mock 데이터 (설계서 SLM-006 기준) — BE 연동 시 이 블록 + delay 삭제 ──
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
        materials: [
          { id: 1, type: "VIDEO", title: "Week 7 - 퀵소트 알고리즘 강의", uploadDate: "2026-05-20", size: Math.round(812 * MB), downloadable: true },
          { id: 2, type: "PDF", title: "Week 7 강의 슬라이드", uploadDate: "2026-05-20", size: Math.round(4.2 * MB), downloadable: true },
          { id: 3, type: "VIDEO", title: "Week 6 - 합병정렬 강의", uploadDate: "2026-05-13", size: Math.round(756 * MB), downloadable: true },
          { id: 4, type: "VIDEO", title: "Week 5 - 삽입·버블정렬 강의 (열람 기간 만료)", uploadDate: "2026-05-06", size: Math.round(698 * MB), downloadable: false, lockedReason: "expired" },
          { id: 5, type: "IMAGE", title: "알고리즘 복잡도 비교 차트", uploadDate: "2026-05-13", size: Math.round(1.8 * MB), downloadable: true },
        ],
      },
      {
        lecId: 2,
        courseName: "운영체제",
        materials: [
          { id: 11, type: "VIDEO", title: "Week 7 - 프로세스 스케줄링", uploadDate: "2026-05-19", size: Math.round(640 * MB), downloadable: true },
          { id: 12, type: "PDF", title: "Week 7 슬라이드 자료", uploadDate: "2026-05-19", size: Math.round(3.6 * MB), downloadable: true },
          { id: 13, type: "ZIP", title: "실습 코드 패키지 (Week 6) — 교수 제한", uploadDate: "2026-05-12", size: Math.round(22 * MB), downloadable: false, lockedReason: "restricted" },
          { id: 14, type: "PDF", title: "Week 5 슬라이드 자료", uploadDate: "2026-05-05", size: Math.round(2.8 * MB), downloadable: true },
        ],
      },
      {
        lecId: 3,
        courseName: "소프트웨어공학",
        materials: [
          { id: 21, type: "VIDEO", title: "Week 7 - 디자인 패턴 개요", uploadDate: "2026-05-18", size: Math.round(578 * MB), downloadable: true },
          { id: 22, type: "PDF", title: "UML 다이어그램 참고자료", uploadDate: "2026-05-18", size: Math.round(5.1 * MB), downloadable: true },
          { id: 23, type: "DOCX", title: "요구사항 명세서 템플릿", uploadDate: "2026-03-10", size: Math.round(0.4 * MB), downloadable: true },
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
        materials: [
          { id: 101, type: "VIDEO", title: "Week 14 - 동적 프로그래밍 심화", uploadDate: "2025-11-28", size: Math.round(702 * MB), downloadable: true },
          { id: 102, type: "PDF", title: "기말 정리 슬라이드", uploadDate: "2025-11-28", size: Math.round(6.3 * MB), downloadable: true },
        ],
      },
      {
        lecId: 12,
        courseName: "컴퓨터 네트워크",
        materials: [
          { id: 111, type: "PDF", title: "TCP/IP 계층 구조 정리", uploadDate: "2025-11-20", size: Math.round(3.1 * MB), downloadable: true },
          { id: 112, type: "ZIP", title: "패킷 분석 실습 데이터", uploadDate: "2025-11-05", size: Math.round(48 * MB), downloadable: true },
        ],
      },
    ],
  },
];

const delay = <T,>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), 200));

/** GET /api/lms/student/materials — 학기별 과목 자료 (현재 mock) */
export const getStudentMaterials = (): Promise<SemesterMaterials[]> => delay(MOCK_MATERIALS);
