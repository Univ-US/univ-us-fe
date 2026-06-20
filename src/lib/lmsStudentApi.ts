// src/lib/lmsStudentApi.ts
// SLM-001 학생 LMS 프로필 API 클라이언트 (BE: /api/lms/student/profile)
import api from "@/lib/api";
import type {
  LmsStudentProfile,
  LmsStudentProfileUpdateInput,
} from "@/types/lmsStudent";

// 타입은 @/types/lmsStudent로 이동. 기존 소비처 호환을 위해 re-export 유지.
export type {
  LmsStudentProfile,
  LmsStudentProfileUpdateInput,
} from "@/types/lmsStudent";

/** GET /api/lms/student/profile — 프로필 조회 (BE가 없으면 지연 생성) */
export const getStudentProfile = async () => {
  const res = await api.get<LmsStudentProfile>("/api/lms/student/profile");
  return res.data;
};

/**
 * PUT /api/lms/student/profile — 프로필 수정 (multipart/form-data)
 *
 * BE가 `@ModelAttribute`(multipart)로 받으므로 JSON이 아니라 FormData로 보내야 한다.
 *   - FormData 키 이름은 BE ReqDto 필드명과 정확히 일치해야 함 (lmsPrfEmail / image)
 *   - api.ts 기본 헤더가 application/json이므로 이 요청만 multipart로 덮어쓴다.
 *     (axios가 FormData를 감지해 boundary 포함 헤더로 실제 전송함)
 */
export const updateStudentProfile = async (
  input: LmsStudentProfileUpdateInput
) => {
  const formData = new FormData();
  formData.append("lmsPrfEmail", input.email);
  if (input.image) {
    formData.append("image", input.image);
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
