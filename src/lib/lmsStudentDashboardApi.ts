import { getStudentAssignments, type SemesterAssignments, type StudentAssignment } from "@/lib/lmsStudentAssignmentsApi";
import { getStudentAttendance, type SemesterAttendance } from "@/lib/lmsStudentAttendanceApi";
import { getStudentCourses, type SemesterCourses } from "@/lib/lmsStudentCoursesApi";
import { getStudentProfile } from "@/lib/lmsStudentApi";

export type { StudentAssignmentStatus } from "@/lib/lmsStudentAssignmentsApi";
import type { StudentAssignmentStatus } from "@/lib/lmsStudentAssignmentsApi";

export interface LectureTime {
  dayCode: string;
  start: string;
  end: string;
}

export interface DashboardCourse {
  lecId: number;
  courseName: string;
  credit: number;
  professor: string;
  times: LectureTime[];
  attendanceRate: number;
}

export interface DashboardAssignment {
  id: number;
  lecId: number;
  title: string;
  due: string;
  status: StudentAssignmentStatus;
}

export interface DashboardSemesterOption {
  year: number;
  termCode: string;
  semesterLabel: string;
}

export interface StudentDashboard {
  studentName: string;
  semesterLabel: string;
  year: number;
  termCode: string;
  availableSemesters: DashboardSemesterOption[];
  stats: {
    courseCount: number;
    totalCredits: number;
    avgAttendance: number;
  };
  courses: DashboardCourse[];
  assignments: DashboardAssignment[];
}

export interface GetStudentDashboardParams {
  year?: number | null;
  termCode?: string | null;
}

const TERM_LABEL: Record<string, string> = {
  SM1: "1학기",
  SMR: "여름 계절",
  SM2: "2학기",
  WNT: "겨울 계절",
};

const TERM_ORDER: Record<string, number> = {
  SM1: 1,
  SMR: 2,
  SM2: 3,
  WNT: 4,
};

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

const sortSemesters = <T extends SemesterLike>(items: T[]) =>
  [...items].sort(
    (a, b) =>
      b.year - a.year ||
      (TERM_ORDER[b.termCode] ?? 0) - (TERM_ORDER[a.termCode] ?? 0)
  );

const semesterLabel = (year: number, termCode: string) =>
  `${year}년 ${TERM_LABEL[termCode] ?? termCode}`;

const buildAvailableSemesters = (
  courseSemesters: SemesterCourses[],
  assignmentSemesters: SemesterAssignments[],
  attendanceSemesters: SemesterAttendance[]
): DashboardSemesterOption[] => {
  const byKey = new Map<string, DashboardSemesterOption>();
  const add = (s: SemesterLike) => {
    const key = semesterKey(s.year, s.termCode);
    if (!byKey.has(key)) {
      byKey.set(key, {
        year: s.year,
        termCode: s.termCode,
        semesterLabel: s.semesterLabel || semesterLabel(s.year, s.termCode),
      });
    }
  };

  courseSemesters.forEach((s) =>
    add({ year: s.semYear, termCode: s.semTerm, semesterLabel: s.semesterLabel }),
  );
  assignmentSemesters.forEach((s) =>
    add({ year: s.semYear, termCode: s.semTerm, semesterLabel: s.semesterLabel }),
  );
  attendanceSemesters.forEach(add);

  return sortSemesters([...byKey.values()]);
};

const pickSemester = (
  params: GetStudentDashboardParams | undefined,
  available: DashboardSemesterOption[],
  courseSemesters: SemesterCourses[],
  attendanceSemesters: SemesterAttendance[]
): DashboardSemesterOption | null => {
  const requested =
    params?.year != null && params?.termCode
      ? available.find((s) => s.year === params.year && s.termCode === params.termCode)
      : null;
  if (requested) return requested;

  const inProgressCourse = courseSemesters.find((s) => s.inProgress);
  if (inProgressCourse)
    return {
      year: inProgressCourse.semYear,
      termCode: inProgressCourse.semTerm,
      semesterLabel: inProgressCourse.semesterLabel,
    };

  const inProgressAttendance = attendanceSemesters.find((s) => s.inProgress);
  if (inProgressAttendance) return inProgressAttendance;

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
  params?: GetStudentDashboardParams
): Promise<StudentDashboard> => {
  const [profile, courseSemesters, assignmentResult, attendanceSemesters] = await Promise.all([
    getStudentProfile(),
    getStudentCourses(),
    getStudentAssignments(),
    getStudentAttendance(),
  ]);

  const assignmentSemesters = assignmentResult.semesters ?? [];
  const availableSemesters = buildAvailableSemesters(
    courseSemesters,
    assignmentSemesters,
    attendanceSemesters
  );
  const selectedSemester = pickSemester(
    params,
    availableSemesters,
    courseSemesters,
    attendanceSemesters
  );

  const fallbackYear = new Date().getFullYear();
  const selected = selectedSemester ?? {
    year: fallbackYear,
    termCode: "SM1",
    semesterLabel: semesterLabel(fallbackYear, "SM1"),
  };
  const key = semesterKey(selected.year, selected.termCode);
  const courseSemester = courseSemesters.find((s) => semesterKey(s.semYear, s.semTerm) === key);
  const assignmentSemester = assignmentSemesters.find((s) => semesterKey(s.semYear, s.semTerm) === key);
  const attendanceSemester = attendanceSemesters.find((s) => semesterKey(s.year, s.termCode) === key);
  const attendanceByLecId = new Map(
    (attendanceSemester?.courses ?? []).map((course) => [course.lecId, course.attendanceRate])
  );

  const courses: DashboardCourse[] = (courseSemester?.courses ?? []).map((course) => ({
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
      courseCount: courseSemester?.courseCount ?? courses.length,
      totalCredits:
        courseSemester?.totalCredits ?? courses.reduce((sum, course) => sum + course.credit, 0),
      avgAttendance,
    },
    courses,
    assignments,
  };
};
