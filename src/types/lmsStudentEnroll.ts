/** 시간표 충돌 검사용 강의 시간 슬롯 */
export interface ScheduleSlot {
  day: "월" | "화" | "수" | "목" | "금";
  start: string; // "HH:mm"
  end: string; // "HH:mm"
}

/** 개설 강좌 (수강신청 대상) */
export interface EnrollLectureRow {
  lecId: number;
  courseCode: string; // 학수번호
  courseName: string;
  professor: string;
  department: string;
  lecCredit: number;
  lecSection: number;
  schedule: string; // 화면 표시용 ("월 09:00-10:30")
  scheduleSlots: ScheduleSlot[];
  capacity: number;
  enrolledCount: number;
  alreadyEnrolled: boolean; // 이미 신청 완료된 강좌
}

/** 신청 가능 학점 한도 등 상단 요약 */
export interface EnrollSummary {
  semesterLabel: string | null; // null = 현재 수강신청 기간 아님(개설된 OPEN 강좌 없음)
  maxCredit: number;
}

export interface EnrollSubmitResult {
  success: number[];
  failed: { lecId: number; reason: string }[];
}
