import type { StudentAssignmentStatus } from "@/types/lmsStudentAssignments";

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
