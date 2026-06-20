import { getStudentAssignments, type SemesterAssignments, type StudentAssignment } from "@/lib/lmsStudentAssignmentsApi";
import { getStudentAttendance, type SemesterAttendance } from "@/lib/lmsStudentAttendanceApi";
import { getStudentCourses } from "@/lib/lmsStudentCoursesApi";
import type { SemesterCourses } from "@/types/lmsStudentCourses";
import { getStudentProfile } from "@/lib/lmsStudentApi";
import { getCommonCodeList } from "@/lib/lmsCommonCode";
import type {
  DashboardAssignment,
  DashboardCourse,
  DashboardSemesterOption,
  GetStudentDashboardParams,
  LectureTime,
  StudentDashboard,
} from "@/types/lmsStudentDashboard";

export type { StudentAssignmentStatus } from "@/types/lmsStudentAssignments";
export type {
  DashboardAssignment,
  DashboardCourse,
  DashboardSemesterOption,
  GetStudentDashboardParams,
  LectureTime,
  StudentDashboard,
} from "@/types/lmsStudentDashboard";

const DAY_CODE_BY_LABEL: Record<string, string> = {
  월: "MON",
  화: "TUE",
  수: "WED",
  목: "THU",
  금: "FRI",
  토: "SAT",
  일: "SUN",
  MON: "MON",
  TUE: "TUE",
  WED: "WED",
  THU: "THU",
  FRI: "FRI",
  SAT: "SAT",
  SUN: "SUN",
};

type SemesterLike = {
  year: number;
  termCode: string;
  semesterLabel: string;
  inProgress?: boolean;
};

const semesterKey = (year: number, termCode: string) => `${year}:${termCode}`;

const sortSemesters = <T extends SemesterLike>(
  items: T[],
  termOrder: Record<string, number>
) =>
  [...items].sort(
    (a, b) =>
      b.year - a.year ||
      (termOrder[b.termCode] ?? 0) - (termOrder[a.termCode] ?? 0)
  );

const semesterLabel = (
  year: number,
  termCode: string,
  termMap: Record<string, string>
) => `${year}년 ${termMap[termCode] ?? termCode}`;

const buildAvailableSemesters = (
  courseSemesters: SemesterCourses[],
  assignmentSemesters: SemesterAssignments[],
  attendanceSemesters: SemesterAttendance[],
  termMap: Record<string, string>,
  termOrder: Record<string, number>
): DashboardSemesterOption[] => {
  const byKey = new Map<string, DashboardSemesterOption>();
  const add = (s: SemesterLike) => {
    const key = semesterKey(s.year, s.termCode);
    if (!byKey.has(key)) {
      byKey.set(key, {
        year: s.year,
        termCode: s.termCode,
        semesterLabel: s.semesterLabel || semesterLabel(s.year, s.termCode, termMap),
      });
    }
  };

  courseSemesters.forEach((s) =>
    add({ year: s.semYear, termCode: s.semTerm, semesterLabel: s.semesterLabel }),
  );
  assignmentSemesters.forEach((s) =>
    add({ year: s.semYear, termCode: s.semTerm, semesterLabel: s.semesterLabel }),
  );
  attendanceSemesters.forEach((s) =>
    add({ year: s.semYear, termCode: s.semTerm, semesterLabel: s.semesterLabel }),
  );

  return sortSemesters([...byKey.values()], termOrder);
};

const pickSemester = (
  params: GetStudentDashboardParams | undefined,
  available: DashboardSemesterOption[],
  courseSemesters: SemesterCourses[],
  attendanceSemesters: SemesterAttendance[],
  termMap: Record<string, string>
): DashboardSemesterOption | null => {
  // 필터로 학기를 명시 선택하면 그 학기를 그대로 사용 — 수강 데이터가 없어도 폴백하지 않고
  // 빈 상태("표시할 내역 없음")로 보여준다 (교수 강의 내역 PLM-002와 동일 정책).
  // 폴백(진행중/첫 학기)은 초기 로드(params 없음)에만 적용.
  if (params?.year != null && params?.termCode) {
    return (
      available.find((s) => s.year === params.year && s.termCode === params.termCode) ?? {
        year: params.year,
        termCode: params.termCode,
        semesterLabel: semesterLabel(params.year, params.termCode, termMap),
      }
    );
  }

  const inProgressCourse = courseSemesters.find((s) => s.inProgress);
  if (inProgressCourse)
    return {
      year: inProgressCourse.semYear,
      termCode: inProgressCourse.semTerm,
      semesterLabel: inProgressCourse.semesterLabel,
    };

  const inProgressAttendance = attendanceSemesters.find((s) => s.inProgress);
  if (inProgressAttendance)
    return {
      year: inProgressAttendance.semYear,
      termCode: inProgressAttendance.semTerm,
      semesterLabel: inProgressAttendance.semesterLabel,
    };

  return available[0] ?? null;
};

const parseSchedule = (schedule: string): LectureTime[] => {
  if (!schedule || schedule === "-") return [];

  return schedule
    .split(/\s*(?:·|쨌|,|\/)\s*/)
    .map((part) => {
      const match = part.trim().match(/^(.+?)\s+(\d{1,2}:\d{2})~(\d{1,2}:\d{2})$/);
      if (!match) return null;
      const [, dayLabel, start, end] = match;
      return {
        dayCode: DAY_CODE_BY_LABEL[dayLabel.trim()] ?? dayLabel.trim(),
        start: normalizeTime(start),
        end: normalizeTime(end),
      };
    })
    .filter((time): time is LectureTime => Boolean(time));
};

const normalizeTime = (value: string) => {
  const [hour, minute] = value.split(":");
  return `${hour.padStart(2, "0")}:${minute}`;
};

const courseMatchKey = (courseName: string, lecSection?: number | null) =>
  `${courseName}:${lecSection ?? ""}`;

const resolveAssignmentLecId = (
  assignment: StudentAssignment,
  courses: DashboardCourse[],
  sourceCourses: SemesterCourses | undefined
) => {
  if (assignment.lecId != null) return assignment.lecId;

  const sourceCourse = sourceCourses?.courses.find(
    (course) =>
      courseMatchKey(course.courseName, course.lecSection) ===
      courseMatchKey(assignment.courseName, assignment.lecSection)
  );
  if (sourceCourse) return sourceCourse.lecId;

  return courses.find((course) => course.courseName === assignment.courseName)?.lecId ?? 0;
};

export const getStudentDashboard = async (
  params?: GetStudentDashboardParams,
  termMap: Record<string, string> = {}
): Promise<StudentDashboard> => {
  const [profile, courseSemesters, assignmentResult, attendanceSemesters, termCodes] =
    await Promise.all([
      getStudentProfile(),
      getStudentCourses(),
      getStudentAssignments(),
      getStudentAttendance(),
      getCommonCodeList("SEM_TERM"),
    ]);

  const termOrder = Object.fromEntries(termCodes.map((c, i) => [c.codeVal, i]));
  const assignmentSemesters = assignmentResult.semesters ?? [];
  const availableSemesters = buildAvailableSemesters(
    courseSemesters,
    assignmentSemesters,
    attendanceSemesters,
    termMap,
    termOrder
  );
  const selectedSemester = pickSemester(
    params,
    availableSemesters,
    courseSemesters,
    attendanceSemesters,
    termMap
  );

  const fallbackYear = new Date().getFullYear();
  const selected = selectedSemester ?? {
    year: fallbackYear,
    termCode: "SM1",
    semesterLabel: semesterLabel(fallbackYear, "SM1", termMap),
  };
  const key = semesterKey(selected.year, selected.termCode);
  const courseSemester = courseSemesters.find((s) => semesterKey(s.semYear, s.semTerm) === key);
  const assignmentSemester = assignmentSemesters.find((s) => semesterKey(s.semYear, s.semTerm) === key);
  const attendanceSemester = attendanceSemesters.find((s) => semesterKey(s.semYear, s.semTerm) === key);
  const attendanceByLecId = new Map(
    (attendanceSemester?.courses ?? []).map((course) => [course.lecId, course.attendanceRate])
  );

  // 대시보드 '수강 중'은 현재 상태 스냅샷 → 드랍(DRP)·폐강(CNCL) 제외 (전체를 보여주는 수강 내역과 분리)
  const activeCourses = (courseSemester?.courses ?? []).filter(
    (course) => course.lecStdEnrStatus !== "DRP" && course.lecValStatus !== "CNCL",
  );
  const courses: DashboardCourse[] = activeCourses.map((course) => ({
    lecId: course.lecId,
    courseName: course.courseName,
    credit: course.lecCredit,
    professor: course.professor,
    times: parseSchedule(course.schedule),
    attendanceRate: attendanceByLecId.get(course.lecId) ?? 0,
  }));

  const assignments: DashboardAssignment[] = (assignmentSemester?.assignments ?? []).map((assignment) => ({
    id: assignment.id,
    lecId: resolveAssignmentLecId(assignment, courses, courseSemester),
    title: assignment.lecAsnTitle,
    due: assignment.lecAsnDueDate,
    status: assignment.status,
  }));

  const avgAttendance =
    courses.length === 0
      ? 0
      : Math.round(courses.reduce((sum, course) => sum + course.attendanceRate, 0) / courses.length);

  return {
    studentName: profile.name || "학생",
    semesterLabel: selected.semesterLabel,
    year: selected.year,
    termCode: selected.termCode,
    availableSemesters,
    stats: {
      // 활성 강의 기준 (BE courseCount/totalCredits는 드랍·폐강 포함이라 미사용)
      courseCount: courses.length,
      totalCredits: courses.reduce((sum, course) => sum + course.credit, 0),
      avgAttendance,
    },
    courses,
    assignments,
  };
};
