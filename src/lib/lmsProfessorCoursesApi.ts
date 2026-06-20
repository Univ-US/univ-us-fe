// src/lib/lmsProfessorCoursesApi.ts
// PLM-002 교수 "강의 내역" — 학기별 담당 강의 목록 + 상단 요약(KPI)
// ──────────────────────────────────────────────────────────────
// BE 실연결: GET /api/lms/professor/courses → ProfessorCoursesData
//   BE = 담당 교수 기준 학기별 강의 + 수강생 수 / 평균 출석률 / 미채점 과제 수 집계.
//   KPI(overview) = 진행중 학기 1개 기준(필터 무관 고정).
//   집계 계약: 총 수강생=연인원(강의별 COUNT 단순 합, 중복 허용) · 평균 출석률=강의별 단순평균.
//   이수구분(courseType)은 DB 컬럼 미보유라 미포함(화면에서 제거).
// ──────────────────────────────────────────────────────────────
import api from "@/lib/api";
import type { ProfessorCoursesData } from "@/types/lmsProfessorCourses";

/** PLM-002 강의 내역 조회 — GET /api/lms/professor/courses */
export const getProfessorCourses = async (): Promise<ProfessorCoursesData> => {
  const res = await api.get<ProfessorCoursesData>("/api/lms/professor/courses");
  return res.data;
};
