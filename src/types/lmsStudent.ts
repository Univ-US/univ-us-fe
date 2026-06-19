// src/types/lmsStudent.ts
// SLM-001 학생 LMS 프로필 타입 (lib/lmsStudentApi.ts에서 분리)

/** SLM-001 학생 프로필 조회 응답 (BE: LmsStuProfileDto.ResDto — DB 컬럼 카멜, PLM-001 교수 프로필과 동일 정본) */
export interface LmsStudentProfile {
  name: string; // 이름 (읽기전용 · 관리자 변경, MEMBER.MEMBER_NAME)
  studentNo: string; // 학번 (읽기전용 · = MEMBER.LOGIN_ID)
  department: string | null; // 학과 (읽기전용 · 미설정 시 null, DEPARTMENT LEFT JOIN)
  phoneNumber: string; // 휴대폰 번호 (읽기전용 · 관리자 변경)
  lmsPrfEmail: string; // 이메일 (수정 가능, LMS_PROFILE.LMS_PRF_EMAIL)
  imageUrl: string | null; // 프로필 이미지 URL (예: /uploads/lms/student/image/xxx)
  // 학교명: BE 응답에 포함됨(계정에 미설정이면 null). 사이드바 브랜드에 표시.
  universityName?: string | null;
  // 역할 표시값(예: "학생") — BE 제공. 사이드바 배지/사용자 라벨에 사용.
  role?: string | null;
}

/** SLM-001 학생 프로필 수정 입력 (학생은 이메일·이미지만 수정 가능) */
export interface LmsStudentProfileUpdateInput {
  email: string;
  image?: File | null; // 없으면 이미지 변경 안 함
}
