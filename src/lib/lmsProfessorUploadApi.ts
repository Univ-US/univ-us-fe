// ─────────────────────────────────────────────────────────────
// PLM-005 / PLM-005-01 강의 업로드 — 타입 + mock 데이터 (⚠️ BE 명세 전)
// - mock-first: BE API 명세가 오면 이 파일의 mock을 제거하고 axios 실연결로 교체
// - 설계서 기준 업로드 저장소는 S3 — 실제 업로드 흐름(presigned URL 등)은 BE 명세 확정 후 반영
// ─────────────────────────────────────────────────────────────

export interface CourseOption {
  courseId: number;
  courseName: string;
}

export interface LectureMaterial {
  materialId: number;
  courseId: number;
  courseName: string;
  title: string;
  description: string;
  fileName: string;
  fileExt: string; // 확장자 — BE가 내려주는 값 그대로 표기(EXT_TYPE, 예: "mp4"·"avi"·"pdf"·"hwp")
  fileSize: number; // bytes
  uploadedAt: string; // "YYYY-MM-DD" (년-월-일까지만 표기)
}

// 업로드 허용 확장자 — 실제 대학 LMS(코스모스/유비온 계열 등) 강의자료 허용 형식 기준 잠정.
// 영상(mp4 권장)·음성·문서(hwp 포함)·이미지·압축. ⚠️ BE 정본 확정 시 이 목록을 동기화할 것.
export const UPLOAD_ALLOWED_EXTS = [
  // 영상
  "mp4", "avi", "mov", "wmv",
  // 음성
  "mp3", "m4a", "wav",
  // 문서
  "pdf", "hwp", "hwpx", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "txt",
  // 이미지
  "jpg", "jpeg", "png", "gif",
  // 압축
  "zip",
];
export const UPLOAD_MAX_SIZE = 5 * 1024 * 1024 * 1024; // 5GB
// 원본 파일명 한도 = DB LECTURE_UPLOADING_ATTACHMENT.LEC_UPL_ATT_ORG_FIL_NAME VARCHAR2(255 CHAR)
export const UPLOAD_MAX_FILENAME = 255;
export const UPLOAD_ACCEPT = UPLOAD_ALLOWED_EXTS.map((e) => `.${e}`).join(",");

export const fileExtOf = (name: string): string => {
  const i = name.lastIndexOf(".");
  return i < 0 ? "" : name.slice(i + 1).toLowerCase();
};

const VIDEO_EXTS = ["mp4", "avi", "mov", "wmv"];
export const isVideoExt = (ext: string) => VIDEO_EXTS.includes(ext);

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "-";
  const GB = 1024 ** 3;
  const MB = 1024 ** 2;
  const KB = 1024;
  if (bytes >= GB) return `${(bytes / GB).toFixed(1)}GB`;
  if (bytes >= MB) {
    const v = bytes / MB;
    return v >= 100 ? `${Math.round(v)}MB` : `${v.toFixed(1)}MB`;
  }
  if (bytes >= KB) return `${Math.round(bytes / KB)}KB`;
  return `${bytes}B`;
}

// mock 업로드 시뮬레이션 — 진행률 콜백 후 완료. BE 연동 시 실제 업로드로 교체.
export function simulateUpload(onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve) => {
    let pct = 0;
    const timer = setInterval(() => {
      pct = Math.min(100, pct + Math.ceil(Math.random() * 18) + 6);
      onProgress(pct);
      if (pct >= 100) {
        clearInterval(timer);
        setTimeout(resolve, 250);
      }
    }, 180);
  });
}

// ── 샘플 데이터 (BE 연동 전 — 화면 개발/미리보기용) ──────────────

export const MOCK_COURSES: CourseOption[] = [
  { courseId: 1, courseName: "데이터구조 및 알고리즘" },
  { courseId: 2, courseName: "소프트웨어공학" },
  { courseId: 3, courseName: "자바프로그래밍" },
  { courseId: 4, courseName: "웹프로그래밍" },
];

export const MOCK_MATERIALS: LectureMaterial[] = [
  {
    materialId: 4,
    courseId: 1,
    courseName: "데이터구조 및 알고리즘",
    title: "Week 7 — 퀵소트 알고리즘",
    description: "퀵소트 동작 원리·시간복잡도 분석",
    fileName: "week7_quicksort.mp4",
    fileExt: "mp4",
    fileSize: 851_443_712, // 812MB
    uploadedAt: "2026-05-20",
  },
  {
    materialId: 3,
    courseId: 1,
    courseName: "데이터구조 및 알고리즘",
    title: "Week 7 슬라이드",
    description: "핵심 개념 요약 포함",
    fileName: "week7_slides.pdf",
    fileExt: "pdf",
    fileSize: 4_404_019, // 4.2MB
    uploadedAt: "2026-05-20",
  },
  {
    materialId: 2,
    courseId: 1,
    courseName: "데이터구조 및 알고리즘",
    title: "Week 6 — 합병정렬",
    description: "분할 정복 기반 구현·성능 비교",
    fileName: "week6_mergesort.mp4",
    fileExt: "mp4",
    fileSize: 792_723_456, // 756MB
    uploadedAt: "2026-05-13",
  },
  {
    materialId: 1,
    courseId: 2,
    courseName: "소프트웨어공학",
    title: "UML 다이어그램 작성법",
    description: "클래스·시퀀스 다이어그램 표기법",
    fileName: "uml_guide.pdf",
    fileExt: "pdf",
    fileSize: 3_984_589, // 3.8MB
    uploadedAt: "2026-05-06",
  },
];
