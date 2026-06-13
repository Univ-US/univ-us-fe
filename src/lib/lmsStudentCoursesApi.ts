// src/lib/lmsStudentCoursesApi.ts
// SLM-003 수강 내역 — 학기별 수강 강의 목록 + 출석률·과제 현황
// ─────────────────────────────────────────────────────────────
// 🧪 mock-first 단계(§15): BE 연동 전이라 명시적 샘플 데이터로 동작. 화면 상단 앰버 배너 표기.
// BE 연동 예정: GET /api/lms/student/courses (학기 무관 전체 — FE가 학기 드롭다운으로 좁힘)
//   응답 = SemesterCourses[] — 학기별 카드(최신순) + 각 강의의 출석률·과제 제출 현황.
// ⚠️ 연동 시 이 mock 블록 + delay 삭제, axios 실호출로 교체(시그니처 유지) + describeApiError 에러 표기.
// ─────────────────────────────────────────────────────────────

/** 학기별 카드 안의 수강 강의 1행 */
export interface CourseRow {
  lecId: number;
  courseName: string;
  credit: number;
  professor: string;
  schedule: string; // 예: "월 10:00 · 수 10:00"
  attendanceRate: number; // 0~100
  submittedCount: number; // 제출한 과제 수
  totalAssignments: number; // 전체 과제 수
}

/** 한 학기 단위 카드 */
export interface SemesterCourses {
  year: number;
  termCode: string; // SM1/SMR/SM2/WNT
  semesterLabel: string; // 예: "2026년 1학기"
  inProgress: boolean; // 진행 중 학기 여부(배지)
  courseCount: number;
  totalCredits: number;
  courses: CourseRow[];
}

// ── mock 데이터 (설계서 SLM-003 기준, 최신 학기 순) — BE 연동 시 이 블록 + delay 삭제 ──
const MOCK_COURSES: SemesterCourses[] = [
  {
    year: 2026,
    termCode: "SM1",
    semesterLabel: "2026년 1학기",
    inProgress: true,
    courseCount: 5,
    totalCredits: 14,
    courses: [
      { lecId: 1, courseName: "데이터구조 및 알고리즘", credit: 3, professor: "이민준", schedule: "월 10:00 · 수 10:00", attendanceRate: 92, submittedCount: 3, totalAssignments: 5 },
      { lecId: 2, courseName: "운영체제", credit: 3, professor: "박성훈", schedule: "화 13:00 · 목 11:00", attendanceRate: 88, submittedCount: 4, totalAssignments: 4 },
      { lecId: 3, courseName: "소프트웨어공학", credit: 3, professor: "김태경", schedule: "월 14:00 · 목 14:00", attendanceRate: 74, submittedCount: 1, totalAssignments: 3 },
      { lecId: 4, courseName: "데이터베이스", credit: 2, professor: "최영수", schedule: "수 11:00 · 금 11:00", attendanceRate: 65, submittedCount: 2, totalAssignments: 4 },
      { lecId: 5, courseName: "웹프로그래밍", credit: 3, professor: "이수진", schedule: "금 15:00 · 16:00", attendanceRate: 100, submittedCount: 5, totalAssignments: 5 },
    ],
  },
  {
    year: 2025,
    termCode: "SM2",
    semesterLabel: "2025년 2학기",
    inProgress: false,
    courseCount: 5,
    totalCredits: 15,
    courses: [
      { lecId: 11, courseName: "알고리즘 설계", credit: 3, professor: "이민준", schedule: "월 09:00 · 수 09:00", attendanceRate: 95, submittedCount: 5, totalAssignments: 5 },
      { lecId: 12, courseName: "컴퓨터 네트워크", credit: 3, professor: "정재훈", schedule: "화 10:00 · 목 10:00", attendanceRate: 90, submittedCount: 4, totalAssignments: 4 },
      { lecId: 13, courseName: "선형대수학", credit: 3, professor: "박미래", schedule: "월 13:00 · 수 13:00", attendanceRate: 80, submittedCount: 3, totalAssignments: 3 },
      { lecId: 14, courseName: "시스템 프로그래밍", credit: 3, professor: "김성일", schedule: "화 14:00 · 목 14:00", attendanceRate: 88, submittedCount: 5, totalAssignments: 5 },
      { lecId: 15, courseName: "영어 커뮤니케이션", credit: 3, professor: "James Park", schedule: "금 13:00 · 15:00", attendanceRate: 93, submittedCount: 4, totalAssignments: 4 },
    ],
  },
  {
    year: 2025,
    termCode: "SM1",
    semesterLabel: "2025년 1학기",
    inProgress: false,
    courseCount: 6,
    totalCredits: 17,
    courses: [
      { lecId: 21, courseName: "자료구조", credit: 3, professor: "이민준", schedule: "월 10:00 · 수 10:00", attendanceRate: 97, submittedCount: 6, totalAssignments: 6 },
      { lecId: 22, courseName: "이산수학", credit: 3, professor: "한지수", schedule: "화 09:00 · 목 09:00", attendanceRate: 85, submittedCount: 4, totalAssignments: 4 },
      { lecId: 23, courseName: "객체지향프로그래밍", credit: 3, professor: "강민호", schedule: "월 13:00 · 수 13:00", attendanceRate: 92, submittedCount: 5, totalAssignments: 5 },
      { lecId: 24, courseName: "확률과 통계", credit: 3, professor: "박미래", schedule: "화 13:00 · 목 13:00", attendanceRate: 78, submittedCount: 3, totalAssignments: 4 },
      { lecId: 25, courseName: "컴퓨터 구조론", credit: 3, professor: "오승현", schedule: "수 10:00 · 금 10:00", attendanceRate: 90, submittedCount: 5, totalAssignments: 5 },
      { lecId: 26, courseName: "글쓰기와 표현", credit: 2, professor: "윤지혜", schedule: "금 14:00", attendanceRate: 100, submittedCount: 3, totalAssignments: 3 },
    ],
  },
];

const delay = <T,>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), 200));

/** GET /api/lms/student/courses — 학기별 수강 강의 (현재 mock) */
export const getStudentCourses = (): Promise<SemesterCourses[]> => delay(MOCK_COURSES);
