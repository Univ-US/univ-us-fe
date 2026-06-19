export type StudentAssignmentStatus = "NSB" | "SBM" | "GRD";

export interface SubmissionFile {
  fileName: string;
  fileSize: number;
  fileUrl?: string | null;
  contentType?: string | null;
}

export interface AssignmentFeedback {
  asnSbmEvlScore: number;
  maxScore: number;
  courseName: string;
  professor: string;
  asnSbmEvlFeedback: string;
}

export interface StudentAssignment {
  id: number;
  submissionId?: number | null;
  lecId?: number | null;
  courseName: string;
  lecSection?: number | null;
  lecAsnTitle: string;
  lecAsnContent?: string | null;
  lecAsnDueDate: string;
  status: StudentAssignmentStatus;
  overdue?: boolean;
  asnSbmEvlScore: number | null;
  maxScore: number;
  lecAsnSbmRegDate?: string | null;
  lecAsnSbmMemo?: string | null;
  file?: SubmissionFile | null;
  feedback?: AssignmentFeedback | null;
}

export interface SemesterAssignments {
  semYear: number;
  semTerm: string;
  semesterLabel: string;
  assignments: StudentAssignment[];
}

export interface StudentAssignmentsResult {
  semesters: SemesterAssignments[];
}

export interface UpdateStudentAssignmentSubmissionInput {
  submissionId: number;
  memo?: string;
  file?: File | null;
  removeExistingFile?: boolean;
}
