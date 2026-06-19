// src/lib/lmsProfessorStudentsApi.ts
// PLM-003 / PLM-003-01 교수 "수강생 현황" API 클라이언트 + 타입
// ─────────────────────────────────────────────────────────────
// BE 공식 명세 연동(2026-06-10). 학기 → 강의 → 수강생(서버 페이지네이션/검색/필터/정렬) → 상세 리포트.
//  · GET /api/lms/professor/semesters
//  · GET /api/lms/professor/lectures?semesterId={semId}
//  · GET /api/lms/professor/lectures/{lecId}/students?search=&submission=&sort=&order=&page=&size=
//  · GET /api/lms/professor/lectures/{lecId}/students/export?search=&submission=&sort=&order=   (xlsx)
//  · GET /api/lms/professor/lectures/{lecId}/students/{memberId}/report
//  · GET /api/common-codes/{groupCode}            (토큰 불필요, 라벨 매핑용)
// ⚠️ 서버는 "코드값"만 반환(semTerm/lecAsnSbmStatus). 라벨은 공통코드로 FE가 매핑.
// ⚠️ 실패 시 가짜 데이터로 가리지 않는다 — 페이지가 "에러 상태"를 표기한다.
// ─────────────────────────────────────────────────────────────
import api from "@/lib/api";
import { truncateLectureName } from "@/lib/lmsLectureName";
import type {
  Semester,
  Lecture,
  LectureStudentsResponse,
  StudentReport,
  CommonCode,
  StudentsQuery,
} from "@/types/lmsProfessorStudents";

// 타입은 @/types/lmsProfessorStudents로 이전. 기존 소비처(@/lib에서 import/재export) 호환 위해 type re-export.
export type {
  Semester,
  Lecture,
  CourseSummary,
  CourseStudentRow,
  Pagination,
  LectureStudentsResponse,
  AssignmentScore,
  StudentReport,
  CommonCode,
  StudentsQuery,
} from "@/types/lmsProfessorStudents";

/** 강의 없음/미선택 시 쓰는 빈 응답 (정상 0건) */
export const EMPTY_LECTURE_STUDENTS: LectureStudentsResponse = {
  lecture: null,
  summary: { totalStudents: 0, averageAttendanceRate: 0, averageSubmissionRate: 0 },
  students: [],
  pagination: { page: 0, size: 10, totalElements: 0, totalPages: 1 },
};

// ── API 호출 ───────────────────────────────────────────────
/** GET 학기 드롭다운 */
export const getSemesters = async () => {
  const res = await api.get<Semester[]>("/api/lms/professor/semesters");
  return res.data;
};

/** GET 담당 강의 드롭다운 (semesterId 생략 시 전 학기) */
export const getLectures = async (semesterId?: number) => {
  const res = await api.get<Lecture[]>("/api/lms/professor/lectures", {
    params: semesterId != null ? { semesterId } : undefined,
  });
  return res.data;
};

/** GET 수강생 목록 + 통계 (서버 페이지네이션/검색/필터/정렬) */
export const getLectureStudents = async (lecId: number, q: StudentsQuery = {}) => {
  const params: Record<string, string | number> = {
    page: q.page ?? 0,
    size: q.size ?? 10,
  };
  if (q.search) params.search = q.search;
  if (q.submission) params.submission = q.submission;
  if (q.sort) params.sort = q.sort;
  if (q.order) params.order = q.order;
  const res = await api.get<LectureStudentsResponse>(
    `/api/lms/professor/lectures/${lecId}/students`,
    { params }
  );
  return res.data;
};

/** GET 명단 Excel 내보내기 — 현재 검색·필터·정렬의 전체(page/size 없음). 토큰 필요 → blob 다운로드 */
export const exportEnrollees = async (
  lecId: number,
  q: Omit<StudentsQuery, "page" | "size"> = {}
) => {
  const params: Record<string, string> = {};
  if (q.search) params.search = q.search;
  if (q.submission) params.submission = q.submission;
  if (q.sort) params.sort = q.sort;
  if (q.order) params.order = q.order;
  const res = await api.get(
    `/api/lms/professor/lectures/${lecId}/students/export`,
    { params, responseType: "blob" }
  );
  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `수강생명단_${lecId}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

/** GET 수강생 상세 리포트 (PLM-003-01) */
export const getStudentReport = async (lecId: number, memberId: number) => {
  const res = await api.get<StudentReport>(
    `/api/lms/professor/lectures/${lecId}/students/${memberId}/report`
  );
  return res.data;
};

/**
 * GET /api/common-codes/{groupCode} — 공통코드 (토큰 불필요)
 * codeVal→codeName 맵 + 모듈 캐시. 실패 시 빈 맵({}) → 라벨은 원본 코드로 표시(가짜 라벨 안 지어냄).
 */
const _codeMapCache: Record<string, Record<string, string>> = {};
export const getCommonCodeMap = async (
  groupCode: string
): Promise<Record<string, string>> => {
  if (_codeMapCache[groupCode]) return _codeMapCache[groupCode];
  try {
    const res = await api.get<CommonCode[]>(`/api/common-codes/${groupCode}`);
    const map = Object.fromEntries(res.data.map((c) => [c.codeVal, c.codeName]));
    _codeMapCache[groupCode] = map;
    return map;
  } catch {
    return {};
  }
};

// ── 표시 헬퍼 ──────────────────────────────────────────────
/** 학기 표시: "2026년 1학기" (termCode는 SEM_TERM 맵으로 라벨링) */
export const semesterLabel = (sem: Semester, termMap: Record<string, string>) =>
  `${sem.semYear}년 ${termMap[sem.semTerm] ?? sem.semTerm}`;

// 강의명 길이 제한은 공용 유틸로 통일(교수 화면 전 드롭다운 공유). Enrollee page 호환 위해 re-export.
export { LECTURE_NAME_MAX } from "./lmsLectureName";

/**
 * 강의 드롭다운 라벨: "웹프로그래밍 · 2026년 1학기 (강의진행중)"
 * - 강의명이 LECTURE_NAME_MAX 초과 시 '…'로 자름(드롭다운 목록 가로 폭 폭주 방지). 전체명은 option title로.
 * - 학기: '전체' 선택 시 동명 강의 구분 (year + termCode→SEM_TERM)
 * - 상태: lecValStatus→LEC_VAL_STATUS (폐강·종료 구분). 값 없으면 생략.
 */
export const lectureLabel = (
  lec: Lecture,
  termMap: Record<string, string>,
  statusMap: Record<string, string> = {}
) => {
  let label = truncateLectureName(lec.lecName);
  if (lec.semYear != null && lec.semTerm) {
    label += ` · ${lec.semYear}년 ${termMap[lec.semTerm] ?? lec.semTerm}`;
  }
  if (lec.lecValStatus) {
    label += ` (${statusMap[lec.lecValStatus] ?? lec.lecValStatus})`;
  }
  return label;
};

/** 이미지 상대경로(/uploads/...)를 로컬 개발 땐 API 도메인으로 보정 */
const IMG_API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:9090";
export const resolveImageUrl = (url: string | null | undefined): string | null =>
  !url ? null : url.startsWith("http") ? url : `${IMG_API_BASE}${url}`;

// axios 에러 → 사용자용 메시지는 공용 헬퍼로 분리: @/lib/lmsApiError 의 describeApiError 사용
