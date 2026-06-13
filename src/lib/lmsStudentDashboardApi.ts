// src/lib/lmsStudentDashboardApi.ts
// SLM-002 학생 대시보드 — 출석률 요약 통계 + 수강 중인 강의 + 최근 과제 현황
// ─────────────────────────────────────────────────────────────
// 🧪 mock-first 단계(§15): BE 연동 전이라 명시적 샘플 데이터로 동작. 화면 상단 앰버 배너 표기.
// BE 연동 예정: GET /api/lms/student/dashboard (현재 학기 기준 요약)
//   응답 = StudentDashboard — 통계 5종 + 수강 강의 목록 + 최근 과제 현황.
// ⚠️ 연동 시 이 mock 블록 + delay 삭제, axios 실호출로 교체(시그니처 유지) + describeApiError 에러 표기.
// ─────────────────────────────────────────────────────────────

/** 과제 제출 상태 — NSB 미제출 / SBM 제출(채점 중) / GRD 채점완료 */
export type StudentAssignmentStatus = "NSB" | "SBM" | "GRD";

/** 수강 중인 강의 1건 (대시보드 카드) */
export interface DashboardCourse {
  lecId: number;
  courseName: string;
  credit: number;
  professor: string;
  schedule: string; // 예: "월·수 10:00"
  attendanceRate: number; // 0~100
}

/** 최근 과제 1건 */
export interface DashboardAssignment {
  id: number;
  title: string;
  courseName: string;
  due: string; // 표시용 마감(예: "5/25")
  status: StudentAssignmentStatus;
}

/** SLM-002 대시보드 응답 */
export interface StudentDashboard {
  studentName: string;
  semesterLabel: string; // 예: "2026년 1학기"
  year: number; // 현재 학기 년도 (드롭다운 기본 선택)
  termCode: string; // 현재 학기 코드 SM1/SMR/SM2/WNT (드롭다운 기본 선택)
  stats: {
    courseCount: number; // 수강 과목
    totalCredits: number; // 전체 학점
    avgAttendance: number; // 평균 출석률(%)
    unsubmittedCount: number; // 미제출 과제
    gradedCount: number; // 채점 완료
  };
  courses: DashboardCourse[];
  recentAssignments: DashboardAssignment[];
}

// ── mock 데이터 (설계서 SLM-002 기준) — BE 연동 시 이 블록 + delay 삭제 ──
const MOCK_DASHBOARD: StudentDashboard = {
  studentName: "김하연",
  semesterLabel: "2026년 1학기",
  year: 2026,
  termCode: "SM1",
  stats: {
    courseCount: 5,
    totalCredits: 15,
    avgAttendance: 87,
    unsubmittedCount: 3,
    gradedCount: 2,
  },
  courses: [
    { lecId: 1, courseName: "데이터구조 및 알고리즘", credit: 3, professor: "이민준", schedule: "월·수 10:00", attendanceRate: 92 },
    { lecId: 2, courseName: "운영체제", credit: 3, professor: "박성훈", schedule: "화 13:00 · 목 11:00", attendanceRate: 88 },
    { lecId: 3, courseName: "소프트웨어공학", credit: 3, professor: "김태경", schedule: "월·목 14:00", attendanceRate: 74 },
    { lecId: 4, courseName: "데이터베이스", credit: 2, professor: "최영수", schedule: "수·금 11:00", attendanceRate: 65 },
    { lecId: 5, courseName: "웹프로그래밍", credit: 3, professor: "이수진", schedule: "금 15:00-16:00", attendanceRate: 100 },
  ],
  recentAssignments: [
    { id: 1, title: "알고리즘 구현 과제 #3", courseName: "데이터구조", due: "5/25", status: "NSB" },
    { id: 2, title: "프로세스 스케줄링 분석", courseName: "운영체제", due: "5/22", status: "GRD" },
    { id: 3, title: "UML 다이어그램 작성", courseName: "소프트웨어공학", due: "5/28", status: "NSB" },
    { id: 4, title: "ERD 설계 과제", courseName: "데이터베이스", due: "5/30", status: "SBM" },
  ],
};

const delay = <T,>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), 200));

/** GET /api/lms/student/dashboard — 학생 대시보드 (현재 mock) */
export const getStudentDashboard = (): Promise<StudentDashboard> => delay(MOCK_DASHBOARD);
