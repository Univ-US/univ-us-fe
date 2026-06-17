// src/lib/lmsProfessorCoursesApi.ts
// PLM-002 교수 "강의 내역" — 학기별 담당 강의 목록 + 상단 요약(KPI)
// ──────────────────────────────────────────────────────────────
// ✅ BE 실연결(2026-06-17): GET /api/lms/professor/courses → ProfessorCoursesData
//   BE = 담당 교수 기준 학기별 강의 + 수강생 수 / 평균 출석률 / 미채점 과제 수 집계.
//   KPI(overview) = 진행중 학기 1개 기준(필터 무관 고정).
//   집계 계약: 총 수강생=연인원(강의별 COUNT 단순 합, 중복 허용) · 평균 출석률=강의별 단순평균.
//   ※ 이수구분(courseType)은 DB 컬럼 미보유라 미포함(2026-06-17 화면에서 제거 결정).
// ──────────────────────────────────────────────────────────────
import api from "@/lib/api";

/** 담당 강의 1건 (학기 카드 안 한 행) */
export interface ProfessorCourseRow {
  lecId: number;
  courseName: string; // 과목명 (LECTURE_CODE.LEC_COD_NAME)
  lecSection: number; // 분반 (LECTURE.LEC_SECTION)
  studentCount: number; // 수강생 수 (명, DRP 제외)
  schedule: string; // 강의 시간 ("월 10:00 · 수 10:00"), 시간표 없으면 "" (FE는 `|| "-"`)
  attendanceRate: number; // 평균 출석률 (%)
  ungradedCount: number; // 미채점 과제 수 (건) — 마감 학기는 표시 안 함
}

/** 한 학기 묶음 (학기별 카드) */
export interface ProfessorSemesterCourses {
  semYear: number;
  semTerm: string; // 공통코드 SEM_TERM (SM1/SMR/SM2/WNT)
  semesterLabel: string; // "2026년 1학기"
  inProgress: boolean; // 진행중 학기 여부 (false면 '마감')
  courseCount: number; // 과목 수
  studentTotal: number; // 학기 총 수강생 (명)
  courses: ProfessorCourseRow[];
}

/** 상단 KPI 요약 (진행중 학기 기준) */
export interface ProfessorCoursesOverview {
  courseCount: number; // 담당 강의 (과목)
  studentTotal: number; // 총 수강생 (명)
  ungradedTotal: number; // 미채점 과제 (건)
  avgAttendanceRate: number; // 평균 출석률 (%)
}

export interface ProfessorCoursesData {
  overview: ProfessorCoursesOverview;
  semesters: ProfessorSemesterCourses[]; // 학기 시작일 최신순(서버 보장)
}

/** PLM-002 강의 내역 조회 — GET /api/lms/professor/courses */
export const getProfessorCourses = async (): Promise<ProfessorCoursesData> => {
  const res = await api.get<ProfessorCoursesData>("/api/lms/professor/courses");
  return res.data;
};
