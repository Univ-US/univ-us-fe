// src/lib/lmsStudentDashboardApi.ts
// SLM-002 학생 대시보드 — 출석률 요약 통계 + 수강 중인 강의 + 과제 현황(선택 과목별)
// ─────────────────────────────────────────────────────────────
// 🧪 mock-first 단계(§15): BE 연동 전이라 명시적 샘플 데이터로 동작. 화면 상단 앰버 배너 표기.
// BE 연동 예정: GET /api/lms/student/dashboard (현재 학기 기준 요약)
//   응답 = StudentDashboard — 통계 카드 5(전체 3: 수강과목·학점·평균출석률 / 선택 과목 2: 미제출·채점완료=assignments 파생) + 수강 강의 목록 + 과제 현황(과목별).
//   assignments[]=수강 과목 전체 과제, FE가 '수강 중인 강의' 선택 과목(lecId)으로 필터 → 과제 현황·미제출·채점완료 카드 모두 이 선택 과목 기준.
//   ⚠️ 수강 강의 times[] = LECTURE_TIME 행 그대로(요일별 분리·시작 LEC_TIM_STR_TIME~종료 LEC_TIM_END_TIME) — 같은 시간이라도 병합 금지.
// ⚠️ 연동 시 이 mock 블록 + delay 삭제, axios 실호출로 교체(시그니처 유지) + describeApiError 에러 표기.
// ─────────────────────────────────────────────────────────────

/** 과제 제출 상태 — NSB 미제출 / SBM 제출(채점 중) / GRD 채점완료 */
export type StudentAssignmentStatus = "NSB" | "SBM" | "GRD";

/** 강의 시간 1슬롯 = LECTURE_TIME 1행 — 요일별로 행이 분리됨(같은 시간이라도 병합 금지) */
export interface LectureTime {
  dayCode: string; // 요일코드 MON~SUN (BE: LEC_TIM_DAY_CODE)
  start: string; // 시작 "10:00" (BE: LEC_TIM_STR_TIME, HH:mm)
  end: string; // 종료 "12:00" (BE: LEC_TIM_END_TIME, HH:mm)
}

/** 수강 중인 강의 1건 (대시보드 카드) */
export interface DashboardCourse {
  lecId: number;
  courseName: string;
  credit: number;
  professor: string;
  times: LectureTime[]; // 요일별 강의 시간 — 각 LECTURE_TIME 행 분리(같은 시간이라도)·시작~종료
  attendanceRate: number; // 0~100
}

/** 과제 1건 (과제 현황 — 과목별) */
export interface DashboardAssignment {
  id: number;
  lecId: number; // 소속 과목(강의) — '수강 중인 강의' 선택 시 이 lecId로 필터 (BE: LECTURE.LEC_ID)
  title: string;
  due: string; // 마감일시 "2026.05.25 23:59" (BE: LEC_ASN_DUE_DATE — 날짜+시간, ⭐마감 시각 중요)
  status: StudentAssignmentStatus;
}

/** SLM-002 대시보드 응답 */
export interface StudentDashboard {
  studentName: string;
  semesterLabel: string; // 예: "2026년 1학기"
  year: number; // 현재 학기 년도 (드롭다운 기본 선택)
  termCode: string; // 현재 학기 코드 SM1/SMR/SM2/WNT (드롭다운 기본 선택)
  stats: {
    // ⚠️ 전체(학기) 기준 3종. 미제출·채점완료 카드는 선택 과목 기준이라 stats가 아니라 assignments[](선택 lecId)에서 파생(NSB/GRD 카운트).
    courseCount: number; // 수강 과목 (전체)
    totalCredits: number; // 전체 학점
    avgAttendance: number; // 평균 출석률(%) — 전체
  };
  courses: DashboardCourse[];
  assignments: DashboardAssignment[]; // 수강 과목 전체 과제 — FE가 선택 과목(lecId)으로 필터
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
  },
  courses: [
    { lecId: 1, courseName: "데이터구조 및 알고리즘", credit: 3, professor: "이민준", times: [{ dayCode: "MON", start: "10:00", end: "12:00" }, { dayCode: "WED", start: "10:00", end: "12:00" }], attendanceRate: 92 },
    { lecId: 2, courseName: "운영체제", credit: 3, professor: "박성훈", times: [{ dayCode: "TUE", start: "13:00", end: "15:00" }, { dayCode: "THU", start: "11:00", end: "13:00" }], attendanceRate: 88 },
    { lecId: 3, courseName: "소프트웨어공학", credit: 3, professor: "김태경", times: [{ dayCode: "MON", start: "14:00", end: "16:00" }, { dayCode: "THU", start: "14:00", end: "16:00" }], attendanceRate: 74 },
    { lecId: 4, courseName: "데이터베이스", credit: 2, professor: "최영수", times: [{ dayCode: "WED", start: "11:00", end: "12:00" }, { dayCode: "FRI", start: "11:00", end: "12:00" }], attendanceRate: 65 },
    { lecId: 5, courseName: "웹프로그래밍", credit: 3, professor: "이수진", times: [{ dayCode: "FRI", start: "15:00", end: "16:00" }], attendanceRate: 100 },
  ],
  // 과제 현황 — 수강 과목별 과제(좌측 '수강 중인 강의' 선택 시 lecId로 필터). 마감 desc.
  assignments: [
    // 데이터구조 및 알고리즘 (lecId 1)
    { id: 1, lecId: 1, title: "알고리즘 구현 과제 #3", due: "2026.05.25 23:59", status: "NSB" },
    { id: 2, lecId: 1, title: "정렬 알고리즘 분석 보고서", due: "2026.04.30 23:59", status: "GRD" },
    { id: 3, lecId: 1, title: "트리 순회 구현", due: "2026.04.10 23:59", status: "GRD" },
    // 운영체제 (lecId 2)
    { id: 4, lecId: 2, title: "프로세스 스케줄링 분석", due: "2026.05.22 18:00", status: "GRD" },
    { id: 5, lecId: 2, title: "페이지 교체 시뮬레이션", due: "2026.05.18 23:59", status: "SBM" },
    // 소프트웨어공학 (lecId 3)
    { id: 6, lecId: 3, title: "UML 다이어그램 작성", due: "2026.05.28 23:59", status: "NSB" },
    { id: 7, lecId: 3, title: "요구사항 명세서", due: "2026.04.25 23:59", status: "GRD" },
    // 데이터베이스 (lecId 4)
    { id: 8, lecId: 4, title: "ERD 설계 과제", due: "2026.05.30 13:00", status: "SBM" },
    { id: 9, lecId: 4, title: "정규화 실습", due: "2026.06.02 23:59", status: "NSB" },
    // 웹프로그래밍 (lecId 5)
    { id: 10, lecId: 5, title: "반응형 레이아웃 과제", due: "2026.05.15 23:59", status: "GRD" },
    { id: 11, lecId: 5, title: "REST API 연동 미니프로젝트", due: "2026.05.27 23:59", status: "SBM" },
  ],
};

const delay = <T,>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), 200));

/** GET /api/lms/student/dashboard — 학생 대시보드 (현재 mock) */
export const getStudentDashboard = (): Promise<StudentDashboard> => delay(MOCK_DASHBOARD);
