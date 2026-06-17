// src/lib/lmsProfessorCoursesApi.ts
// PLM-002 교수 "강의 내역" — 학기별 담당 강의 목록 + 상단 요약(KPI)
// ──────────────────────────────────────────────────────────────
// 🧪 mock-first (2026-06-16): BE 명세 도착 전까지 mock 반환.
//   명세 오면 MOCK 블록 삭제 + axios 실연결(시그니처 유지) + describeApiError 전환(§15 mock-first 정책).
//   예상 엔드포인트: GET /api/lms/professor/courses → ProfessorCoursesData
//   (BE = 담당 교수 기준 학기별 강의 + 수강생 수 / 평균 출석률 / 미채점 과제 수 집계)
// ──────────────────────────────────────────────────────────────

/** 담당 강의 1건 (학기 카드 안 한 행) */
export interface ProfessorCourseRow {
  lecId: number;
  courseName: string; // 과목명
  courseCode: string; // 학수번호 (예: CSE-2014)
  courseType: string; // 이수구분 라벨 (전공필수/전공선택 등) — BE는 코드, FE 공통코드 매핑 예정
  studentCount: number; // 수강생 수 (명)
  schedule: string; // 강의 시간 ("월 10:00 · 수 10:00", 단일이면 "목 15:00")
  attendanceRate: number; // 평균 출석률 (%)
  ungradedCount: number; // 미채점 과제 수 (건) — 마감 학기는 표시 안 함
}

/** 한 학기 묶음 (학기별 카드) */
export interface ProfessorSemesterCourses {
  year: number;
  termCode: string; // 공통코드 SEM_TERM (SM1/SMR/SM2/WNT)
  semesterLabel: string; // "2026년 1학기"
  inProgress: boolean; // 진행중 학기 여부 (false면 '마감')
  courseCount: number; // 과목 수
  studentTotal: number; // 학기 총 수강생 (명)
  courses: ProfessorCourseRow[];
}

/** 상단 KPI 요약 (이번 학기 기준) */
export interface ProfessorCoursesOverview {
  courseCount: number; // 담당 강의 (과목)
  studentTotal: number; // 총 수강생 (명)
  ungradedTotal: number; // 미채점 과제 (건)
  avgAttendanceRate: number; // 평균 출석률 (%)
  studentDelta: number; // 직전 학기 대비 수강생 증감 (명)
  attendanceDelta: number; // 직전 학기 대비 출석률 증감 (%p)
}

export interface ProfessorCoursesData {
  overview: ProfessorCoursesOverview;
  semesters: ProfessorSemesterCourses[]; // 최신순 정렬(서버 보장 가정)
}

// ── 🧪 MOCK (BE 연동 시 이 블록 삭제) ──────────────────────────
const MOCK_DATA: ProfessorCoursesData = {
  overview: {
    courseCount: 3,
    studentTotal: 87,
    ungradedTotal: 5,
    avgAttendanceRate: 86,
    studentDelta: 4,
    attendanceDelta: 2,
  },
  semesters: [
    {
      year: 2026,
      termCode: "SM1",
      semesterLabel: "2026년 1학기",
      inProgress: true,
      courseCount: 3,
      studentTotal: 87,
      courses: [
        {
          lecId: 1,
          courseName: "데이터구조 및 알고리즘",
          courseCode: "CSE-2014",
          courseType: "전공필수",
          studentCount: 32,
          schedule: "월 10:00 · 수 10:00",
          attendanceRate: 88,
          ungradedCount: 3,
        },
        {
          lecId: 2,
          courseName: "소프트웨어공학",
          courseCode: "CSE-3021",
          courseType: "전공선택",
          studentCount: 28,
          schedule: "화 13:00 · 목 14:00",
          attendanceRate: 79,
          ungradedCount: 2,
        },
        {
          lecId: 3,
          courseName: "알고리즘 특강",
          courseCode: "CSE-4099",
          courseType: "전공선택",
          studentCount: 27,
          schedule: "목 15:00",
          attendanceRate: 91,
          ungradedCount: 0,
        },
      ],
    },
    {
      year: 2025,
      termCode: "SM2",
      semesterLabel: "2025년 2학기",
      inProgress: false,
      courseCount: 3,
      studentTotal: 90,
      courses: [
        {
          lecId: 4,
          courseName: "알고리즘 설계",
          courseCode: "CSE-3015",
          courseType: "전공선택",
          studentCount: 30,
          schedule: "월 09:00 · 수 09:00",
          attendanceRate: 94,
          ungradedCount: 0,
        },
        {
          lecId: 5,
          courseName: "자료구조 심화",
          courseCode: "CSE-3018",
          courseType: "전공선택",
          studentCount: 25,
          schedule: "화 10:00 · 목 11:00",
          attendanceRate: 86,
          ungradedCount: 0,
        },
        {
          lecId: 6,
          courseName: "운영체제",
          courseCode: "CSE-3102",
          courseType: "전공필수",
          studentCount: 35,
          schedule: "수 13:00 · 금 13:00",
          attendanceRate: 90,
          ungradedCount: 0,
        },
      ],
    },
  ],
};
// ───────────────────────────────────────────────────────────────

/** PLM-002 강의 내역 데이터 조회 (현재 mock). */
export const getProfessorCourses = (): Promise<ProfessorCoursesData> => {
  // 🧪 mock — BE 연동 시: const res = await api.get<ProfessorCoursesData>("/api/lms/professor/courses"); return res.data;
  return Promise.resolve(MOCK_DATA);
};
