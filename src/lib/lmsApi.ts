// src/lib/lmsApi.ts
// PLM-001 교수 LMS 프로필 API 클라이언트 (BE: /api/lms/professor/profile)
import api from "@/lib/api";

/** PLM-001 교수 프로필 조회 응답 (BE: LmsProfessorProfileResponseDto) */
export interface LmsProfessorProfile {
  lmsProfessorProfileName: string; // 이름 (읽기전용 · 관리자 변경)
  lmsProfessorProfileDepartment: string; // 소속 학과 (읽기전용 · 관리자 변경)
  lmsProfessorProfilePhoneNumber: string; // 핸드폰 번호 (읽기전용 · 관리자 변경)
  lmsProfessorProfileEmail: string; // 이메일 (수정 가능)
  lmsProfessorProfileIntroduction: string; // 소개 (수정 가능)
  lmsProfessorProfileImageUrl: string | null; // 프로필 이미지 URL (예: /uploads/lms/professor/image/xxx)
  // 학교명: BE 응답에 포함됨(계정에 미설정이면 null). 사이드바 브랜드에 표시.
  lmsProfessorProfileUniversityName?: string | null;
  // 역할 표시값(예: "교수") — BE 제공. 사이드바 배지/사용자 라벨에 사용.
  lmsProfessorProfileRole?: string | null;
}

/** PLM-001 교수 프로필 수정 입력 */
export interface LmsProfessorProfileUpdateInput {
  email: string;
  introduction: string;
  image?: File | null; // 없으면 이미지 변경 안 함
}

/** GET /api/lms/professor/profile — 프로필 조회 (BE가 없으면 지연 생성) */
export const getProfessorProfile = async () => {
  const res = await api.get<LmsProfessorProfile>("/api/lms/professor/profile");
  return res.data;
};

/**
 * PUT /api/lms/professor/profile — 프로필 수정 (multipart/form-data)
 *
 * ⚠️ BE가 `@ModelAttribute`(multipart)로 받으므로 JSON이 아니라 FormData로 보내야 한다.
 *   - FormData 키 이름은 BE DTO 필드명과 정확히 일치해야 함
 *     (lmsProfessorProfileEmail / lmsProfessorProfileIntroduction / lmsProfessorProfileImage)
 *   - api.ts 기본 헤더가 application/json이므로 이 요청만 multipart로 덮어쓴다.
 *     (axios가 FormData를 감지해 boundary 포함 헤더로 실제 전송함)
 */
export const updateProfessorProfile = async (
  input: LmsProfessorProfileUpdateInput
) => {
  const formData = new FormData();
  formData.append("lmsProfessorProfileEmail", input.email);
  formData.append("lmsProfessorProfileIntroduction", input.introduction);
  if (input.image) {
    formData.append("lmsProfessorProfileImage", input.image);
  }

  const res = await api.put<LmsProfessorProfile>(
    "/api/lms/professor/profile",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return res.data;
};

/** DELETE /api/lms/professor/profile — 회원탈퇴 요청 (PLM-012, 관리자 처리) */
export const requestProfessorSecession = async () => {
  await api.delete("/api/lms/professor/profile");
};

// 이미지 제약 (BE와 동일: JPG/JPEG/PNG, 최대 30MB)
export const PROFILE_IMAGE_MAX_SIZE = 30 * 1024 * 1024; // 30MB
export const PROFILE_IMAGE_ALLOWED_TYPES = ["image/jpeg", "image/png"];
