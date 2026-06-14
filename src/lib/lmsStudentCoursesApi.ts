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
  lecSection?: number | null; // 분반(LECTURE.LEC_SECTION) — 표시 "N반", null=`-`
  credit: number;
  professor: string;
  schedule: string; // 시작~종료(LECTURE_TIME STR/END) 예: "월 10:00~11:30 · 수 10:00~11:30"
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
    courseCount: 6,
    totalCredits: 17,
    courses: [
      // 트렁케이트(폭 기준 말줄임) 시연용 — 과목명 20자
      { lecId: 100, courseName: "고급소프트웨어공학설계및실습프로젝트심화", lecSection: 1, credit: 3, professor: "박성훈", schedule: "화 09:00~10:30 · 목 09:00~10:30" },
      { lecId: 1, courseName: "데이터구조 및 알고리즘", lecSection: 1, credit: 3, professor: "이민준", schedule: "월 10:00~11:30 · 수 10:00~11:30" },
      { lecId: 2, courseName: "운영체제", lecSection: 2, credit: 3, professor: "박성훈", schedule: "화 13:00~14:30 · 목 11:00~12:30" },
      { lecId: 3, courseName: "소프트웨어공학", lecSection: 1, credit: 3, professor: "김태경", schedule: "월 14:00~15:30 · 목 14:00~15:30" },
      { lecId: 4, courseName: "데이터베이스", lecSection: 2, credit: 2, professor: "최영수", schedule: "수 11:00~12:00 · 금 11:00~12:00" },
      { lecId: 5, courseName: "웹프로그래밍", lecSection: 1, credit: 3, professor: "이수진", schedule: "금 15:00~18:00" },
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
      { lecId: 11, courseName: "알고리즘 설계", lecSection: 1, credit: 3, professor: "이민준", schedule: "월 09:00~10:30 · 수 09:00~10:30" },
      { lecId: 12, courseName: "컴퓨터 네트워크", lecSection: 1, credit: 3, professor: "정재훈", schedule: "화 10:00~11:30 · 목 10:00~11:30" },
      { lecId: 13, courseName: "선형대수학", lecSection: 1, credit: 3, professor: "박미래", schedule: "월 13:00~14:30 · 수 13:00~14:30" },
      { lecId: 14, courseName: "시스템 프로그래밍", lecSection: 2, credit: 3, professor: "김성일", schedule: "화 14:00~15:30 · 목 14:00~15:30" },
      { lecId: 15, courseName: "영어 커뮤니케이션", lecSection: 1, credit: 3, professor: "James Park", schedule: "금 13:00~16:00" },
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
      { lecId: 21, courseName: "자료구조", lecSection: 1, credit: 3, professor: "이민준", schedule: "월 10:00~11:30 · 수 10:00~11:30" },
      { lecId: 22, courseName: "이산수학", lecSection: 1, credit: 3, professor: "한지수", schedule: "화 09:00~10:30 · 목 09:00~10:30" },
      { lecId: 23, courseName: "객체지향프로그래밍", lecSection: 1, credit: 3, professor: "강민호", schedule: "월 13:00~14:30 · 수 13:00~14:30" },
      { lecId: 24, courseName: "확률과 통계", lecSection: 2, credit: 3, professor: "박미래", schedule: "화 13:00~14:30 · 목 13:00~14:30" },
      { lecId: 25, courseName: "컴퓨터 구조론", lecSection: 1, credit: 3, professor: "오승현", schedule: "수 10:00~11:30 · 금 10:00~11:30" },
      { lecId: 26, courseName: "글쓰기와 표현", lecSection: 1, credit: 2, professor: "윤지혜", schedule: "금 14:00~16:00" },
    ],
  },
];

const delay = <T,>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), 200));

/** GET /api/lms/student/courses — 학기별 수강 강의 (현재 mock) */
export const getStudentCourses = (): Promise<SemesterCourses[]> => delay(MOCK_COURSES);
