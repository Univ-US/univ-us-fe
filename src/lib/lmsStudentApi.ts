// src/lib/lmsStudentApi.ts
// SLM-001 학생 LMS 프로필 API 클라이언트 (BE: /api/lms/student/profile)
import api from "@/lib/api";

/** SLM-001 학생 프로필 조회 응답 (BE: LmsStudentProfileResponseDto) */
export interface LmsStudentProfile {
  lmsStudentProfileName: string; // 이름 (읽기전용 · 관리자 변경)
  lmsStudentProfileStudentNo: string; // 학번 (읽기전용 · 입학연도+memberId 조립)
  lmsStudentProfileDepartment: string; // 학과 (읽기전용 · 관리자 변경)
  lmsStudentProfilePhoneNumber: string; // 휴대폰 번호 (읽기전용 · 관리자 변경)
  lmsStudentProfileEmail: string; // 이메일 (수정 가능)
  lmsStudentProfileImageUrl: string | null; // 프로필 이미지 URL (예: /uploads/lms/student/image/xxx)
  // 학교명: BE 응답에 포함됨(계정에 미설정이면 null). 사이드바 브랜드에 표시.
  lmsStudentProfileUniversityName?: string | null;
  // 역할 표시값(예: "학생") — BE 제공. 사이드바 배지/사용자 라벨에 사용.
  lmsStudentProfileRole?: string | null;
}

/** SLM-001 학생 프로필 수정 입력 (학생은 이메일·이미지만 수정 가능) */
export interface LmsStudentProfileUpdateInput {
  email: string;
  image?: File | null; // 없으면 이미지 변경 안 함
}

/** GET /api/lms/student/profile — 프로필 조회 (BE가 없으면 지연 생성) */
export const getStudentProfile = async () => {
  const res = await api.get<LmsStudentProfile>("/api/lms/student/profile");
  return res.data;
};

/**
 * PUT /api/lms/student/profile — 프로필 수정 (multipart/form-data)
 *
 * ⚠️ BE가 `@ModelAttribute`(multipart)로 받으므로 JSON이 아니라 FormData로 보내야 한다.
 *   - FormData 키 이름은 BE DTO 필드명과 정확히 일치해야 함
 *     (lmsStudentProfileEmail / lmsStudentProfileImage)
 *   - api.ts 기본 헤더가 application/json이므로 이 요청만 multipart로 덮어쓴다.
 *     (axios가 FormData를 감지해 boundary 포함 헤더로 실제 전송함)
 */
export const updateStudentProfile = async (
  input: LmsStudentProfileUpdateInput
) => {
  const formData = new FormData();
  formData.append("lmsStudentProfileEmail", input.email);
  if (input.image) {
    formData.append("lmsStudentProfileImage", input.image);
  }

  const res = await api.put<LmsStudentProfile>(
    "/api/lms/student/profile",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return res.data;
};

/** DELETE /api/lms/student/profile — 회원탈퇴 요청 (SLM-012, 관리자 처리) */
export const requestStudentSecession = async () => {
  await api.delete("/api/lms/student/profile");
};

// 이미지 제약 (BE와 동일: JPG/JPEG/PNG, 최대 30MB)
export const STUDENT_PROFILE_IMAGE_MAX_SIZE = 30 * 1024 * 1024; // 30MB
export const STUDENT_PROFILE_IMAGE_ALLOWED_TYPES = ["image/jpeg", "image/png"];
