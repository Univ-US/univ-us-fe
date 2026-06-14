// src/lib/lmsStudentAttendanceApi.ts
// SLM-005 출석 내역 — 강의별 출석·지각·결석 현황 (지각·결석 수치 클릭 시 날짜 팝오버 = SLM-005-01)
// ─────────────────────────────────────────────────────────────
// 🧪 mock-first 단계(§15): BE 연동 전이라 명시적 샘플 데이터로 동작. 화면 상단 앰버 배너 표기.
// BE 연동 예정: GET /api/lms/student/attendance (학기 무관 전체 — FE가 학기 드롭다운으로 좁힘)
//   응답 = SemesterAttendance[] — 학기별 카드(최신순) + 강의별 출석/지각/결석 + 지각·결석 상세(날짜).
// ⚠️ 연동 시 이 mock 블록 + delay 삭제, axios 실호출로 교체(시그니처 유지) + describeApiError 에러 표기.
// ─────────────────────────────────────────────────────────────

/** 지각·결석 1건의 상세(팝오버 표시용) — 날짜만(교시는 표기 안 함) */
export interface AttendanceRecord {
  date: string; // "YYYY-MM-DD"
}

/** 강의 1행의 출결 현황 */
export interface AttendanceCourse {
  lecId: number;
  courseName: string;
  lecSection: number; // 분반 (LECTURE.LEC_SECTION) — DB NOT NULL, 첫 분반=1
  totalSessions: number; // 총 강의 횟수
  present: number; // 출석
  late: number; // 지각
  absent: number; // 결석
  attendanceRate: number; // 0~100
  lateRecords: AttendanceRecord[]; // 지각 상세(날짜)
  absentRecords: AttendanceRecord[]; // 결석 상세(날짜)
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
        lecId: 1, courseName: "데이터구조 및 알고리즘", lecSection: 1, totalSessions: 13, present: 12, late: 1, absent: 0, attendanceRate: 92,
        lateRecords: [{ date: "2026-03-16" }],
        absentRecords: [],
      },
      {
        lecId: 2, courseName: "운영체제", lecSection: 2, totalSessions: 13, present: 11, late: 1, absent: 1, attendanceRate: 88,
        lateRecords: [{ date: "2026-04-02" }],
        absentRecords: [{ date: "2026-05-07" }],
      },
      {
        lecId: 3, courseName: "소프트웨어공학", lecSection: 1, totalSessions: 13, present: 9, late: 1, absent: 3, attendanceRate: 74,
        lateRecords: [{ date: "2026-03-23" }],
        absentRecords: [
          { date: "2026-04-06" },
          { date: "2026-04-20" },
          { date: "2026-05-11" },
        ],
      },
      {
        lecId: 4, courseName: "데이터베이스", lecSection: 1, totalSessions: 13, present: 7, late: 1, absent: 5, attendanceRate: 65,
        lateRecords: [{ date: "2026-03-18" }],
        absentRecords: [
          { date: "2026-04-08" },
          { date: "2026-04-22" },
          { date: "2026-05-06" },
          { date: "2026-05-13" },
          { date: "2026-05-20" },
        ],
      },
      {
        lecId: 5, courseName: "웹프로그래밍", lecSection: 2, totalSessions: 13, present: 13, late: 0, absent: 0, attendanceRate: 100,
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
        lecId: 11, courseName: "알고리즘 설계", lecSection: 1, totalSessions: 14, present: 14, late: 0, absent: 0, attendanceRate: 100,
        lateRecords: [],
        absentRecords: [],
      },
      {
        lecId: 12, courseName: "컴퓨터 네트워크", lecSection: 1, totalSessions: 14, present: 12, late: 1, absent: 1, attendanceRate: 90,
        lateRecords: [{ date: "2025-09-23" }],
        absentRecords: [{ date: "2025-11-04" }],
      },
      {
        lecId: 13, courseName: "선형대수학", lecSection: 2, totalSessions: 14, present: 13, late: 1, absent: 0, attendanceRate: 95,
        lateRecords: [{ date: "2025-10-06" }],
        absentRecords: [],
      },
    ],
  },
];

const delay = <T,>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), 200));

/** GET /api/lms/student/attendance — 학기별 출결 현황 (현재 mock) */
export const getStudentAttendance = (): Promise<SemesterAttendance[]> => delay(MOCK_ATTENDANCE);
