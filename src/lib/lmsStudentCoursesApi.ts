import api from "@/lib/api";
import type {
  SemesterCourses,
  SemesterSummary,
  CourseRow,
  PageResponse,
} from "@/types/lmsStudentCourses";

/** GET /courses — 전체 수강 내역 (대시보드 합성용, 미페이징) */
export const getStudentCourses = async (): Promise<SemesterCourses[]> => {
  const res = await api.get<SemesterCourses[]>("/api/lms/student/courses");
  return res.data;
};

/** GET /courses/semesters — 전 학기 요약 (카드 헤더. 과목은 학기별 페이지 조회) */
export const getSemesterSummaries = async (): Promise<SemesterSummary[]> => {
  const res = await api.get<SemesterSummary[]>("/api/lms/student/courses/semesters");
  return res.data;
};

/** GET /courses/semesters/{semId} — 한 학기의 과목 1페이지 (서버 페이지네이션). page 0-based */
export const getSemesterCoursesPaged = async (params: {
  semId: number;
  page: number;
  size: number;
}): Promise<PageResponse<CourseRow>> => {
  const res = await api.get<PageResponse<CourseRow>>(
    `/api/lms/student/courses/semesters/${params.semId}`,
    { params: { page: String(params.page), size: String(params.size) } },
  );
  return { ...res.data, content: res.data.content ?? [] };
};
