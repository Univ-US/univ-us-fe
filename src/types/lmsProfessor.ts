// src/types/lmsProfessor.ts
// PLM-001 교수 LMS 프로필 타입 선언 (lmsProfessorApi.ts에서 분리)

/** PLM-001 교수 프로필 조회 응답 (BE: LmsProfProfileDto.ResDto — 필드명=DB 컬럼 카멜/조인=의미별칭) */
export interface LmsProfessorProfile {
  name: string; // 이름 (MEMBER.MEMBER_NAME · 읽기전용)
  employeeNo: string; // 사번 (MEMBER.LOGIN_ID · 읽기전용, 학생 학번과 동일 컬럼)
  department: string | null; // 소속 학과 (DEPARTMENT.DEPT_NAME · 미설정 시 null)
  phoneNumber: string; // 핸드폰 번호 (MEMBER.PHONE_NUMBER · 읽기전용)
  lmsPrfEmail: string | null; // 이메일 (LMS_PROFILE.LMS_PRF_EMAIL · 수정 가능)
  lmsPrfIntro: string | null; // 소개 (LMS_PROFILE.LMS_PRF_INTRO · 수정 가능)
  imageUrl: string | null; // 프로필 이미지 URL (예: /uploads/lms/professor/image/xxx)
  // 학교명: BE 응답에 포함됨(계정에 미설정이면 null). 사이드바 브랜드에 표시.
  universityName?: string | null; // UNIVERSITY.UNIV_NAME
  // 역할 표시값(예: "교수") — BE 제공(라벨 변환). 사이드바 배지/사용자 라벨에 사용.
  role?: string | null;
}

/** PLM-001 교수 프로필 수정 입력 */
export interface LmsProfessorProfileUpdateInput {
  email: string;
  introduction: string;
  image?: File | null; // 없으면 이미지 변경 안 함
}
