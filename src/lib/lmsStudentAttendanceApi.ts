// src/lib/lmsStudentAttendanceApi.ts
// SLM-005 출석 내역 — 강의별 출석·지각·결석 현황 (지각·결석 수치 클릭 시 날짜·교시 팝오버 = SLM-005-01)
// ─────────────────────────────────────────────────────────────
// 🧪 mock-first 단계(§15): BE 연동 전이라 명시적 샘플 데이터로 동작. 화면 상단 앰버 배너 표기.
// BE 연동 예정: GET /api/lms/student/attendance (학기 무관 전체 — FE가 학기 드롭다운으로 좁힘)
//   응답 = SemesterAttendance[] — 학기별 카드(최신순) + 강의별 출석/지각/결석 + 지각·결석 상세(날짜·교시).
// ⚠️ 연동 시 이 mock 블록 + delay 삭제, axios 실호출로 교체(시그니처 유지) + describeApiError 에러 표기.
// ─────────────────────────────────────────────────────────────

/** 지각·결석 1건의 상세(팝오버 표시용) */
export interface AttendanceRecord {
  date: string; // "YYYY-MM-DD"
  period: string; // 교시(예: "2교시")
}

/** 강의 1행의 출결 현황 */
export interface AttendanceCourse {
  lecId: number;
  courseName: string;
  totalSessions: number; // 총 강의 횟수
  present: number; // 출석
  late: number; // 지각
  absent: number; // 결석
  attendanceRate: number; // 0~100
  lateRecords: AttendanceRecord[]; // 지각 상세(날짜·교시)
  absentRecords: AttendanceRecord[]; // 결석 상세(날짜·교시)
}

/** 한 학기 단위 카드 */
export interface SemesterAttendance {
  year: number;
  termCode: string;
  semesterLabel: string;
  inProgress: boolean;
  courseCount: number;
  courses: AttendanceCourse[];
}

// ── mock 데이터 (설계서 SLM-005 / 005-01 기준) — BE 연동 시 이 블록 + delay 삭제 ──
const MOCK_ATTENDANCE: SemesterAttendance[] = [
  {
    year: 2026,
    termCode: "SM1",
    semesterLabel: "2026년 1학기",
    inProgress: true,
    courseCount: 5,
    courses: [
      {
        lecId: 1, courseName: "데이터구조 및 알고리즘", totalSessions: 13, present: 12, late: 1, absent: 0, attendanceRate: 92,
        lateRecords: [{ date: "2026-03-16", period: "1교시" }],
        absentRecords: [],
      },
      {
        lecId: 2, courseName: "운영체제", totalSessions: 13, present: 11, late: 1, absent: 1, attendanceRate: 88,
        lateRecords: [{ date: "2026-04-02", period: "4교시" }],
        absentRecords: [{ date: "2026-05-07", period: "4교시" }],
      },
      {
        lecId: 3, courseName: "소프트웨어공학", totalSessions: 13, present: 9, late: 1, absent: 3, attendanceRate: 74,
        lateRecords: [{ date: "2026-03-23", period: "5교시" }],
        absentRecords: [
          { date: "2026-04-06", period: "5교시" },
          { date: "2026-04-20", period: "5교시" },
          { date: "2026-05-11", period: "5교시" },
        ],
      },
      {
        lecId: 4, courseName: "데이터베이스", totalSessions: 13, present: 7, late: 1, absent: 5, attendanceRate: 65,
        lateRecords: [{ date: "2026-03-18", period: "2교시" }],
        absentRecords: [
          { date: "2026-04-08", period: "2교시" },
          { date: "2026-04-22", period: "2교시" },
          { date: "2026-05-06", period: "2교시" },
          { date: "2026-05-13", period: "2교시" },
          { date: "2026-05-20", period: "2교시" },
        ],
      },
      {
        lecId: 5, courseName: "웹프로그래밍", totalSessions: 13, present: 13, late: 0, absent: 0, attendanceRate: 100,
        lateRecords: [],
        absentRecords: [],
      },
    ],
  },
  {
    year: 2025,
    termCode: "SM2",
    semesterLabel: "2025년 2학기",
    inProgress: false,
    courseCount: 3,
    courses: [
      {
        lecId: 11, courseName: "알고리즘 설계", totalSessions: 14, present: 14, late: 0, absent: 0, attendanceRate: 100,
        lateRecords: [],
        absentRecords: [],
      },
      {
        lecId: 12, courseName: "컴퓨터 네트워크", totalSessions: 14, present: 12, late: 1, absent: 1, attendanceRate: 90,
        lateRecords: [{ date: "2025-09-23", period: "3교시" }],
        absentRecords: [{ date: "2025-11-04", period: "3교시" }],
      },
      {
        lecId: 13, courseName: "선형대수학", totalSessions: 14, present: 13, late: 1, absent: 0, attendanceRate: 95,
        lateRecords: [{ date: "2025-10-06", period: "1교시" }],
        absentRecords: [],
      },
    ],
  },
];

const delay = <T,>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), 200));

/** GET /api/lms/student/attendance — 학기별 출결 현황 (현재 mock) */
export const getStudentAttendance = (): Promise<SemesterAttendance[]> => delay(MOCK_ATTENDANCE);
