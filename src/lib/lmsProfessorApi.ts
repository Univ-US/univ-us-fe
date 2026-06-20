// src/lib/lmsProfessorApi.ts
// PLM-001 교수 LMS 프로필 API 클라이언트 (BE: /api/lms/professor/profile)
import api from "@/lib/api";
import type {
  LmsProfessorProfile,
  LmsProfessorProfileUpdateInput,
} from "@/types/lmsProfessor";

// 타입은 src/types/lmsProfessor.ts로 분리 — 기존 소비처가 이 lib에서 type import하던 호환 유지(re-export)
export type {
  LmsProfessorProfile,
  LmsProfessorProfileUpdateInput,
} from "@/types/lmsProfessor";

/** GET /api/lms/professor/profile — 프로필 조회 (BE가 없으면 지연 생성) */
export const getProfessorProfile = async () => {
  const res = await api.get<LmsProfessorProfile>("/api/lms/professor/profile");
  return res.data;
};

/**
 * PUT /api/lms/professor/profile — 프로필 수정 (multipart/form-data)
 *
 * BE가 `@ModelAttribute`(multipart)로 받으므로 JSON이 아니라 FormData로 보내야 한다.
 *   - FormData 키 이름은 BE ReqDto 필드명과 정확히 일치해야 함
 *     (lmsPrfEmail / lmsPrfIntro / image)
 *   - api.ts 기본 헤더가 application/json이므로 이 요청만 multipart로 덮어쓴다.
 *     (axios가 FormData를 감지해 boundary 포함 헤더로 실제 전송함)
 */
export const updateProfessorProfile = async (
  input: LmsProfessorProfileUpdateInput
) => {
  const formData = new FormData();
  formData.append("lmsPrfEmail", input.email);
  formData.append("lmsPrfIntro", input.introduction);
  if (input.image) {
    formData.append("image", input.image);
  }

  const res = await api.put<LmsProfessorProfile>(
    "/api/lms/professor/profile",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return res.data;
};

// 이미지 제약 (BE와 동일: JPG/JPEG/PNG, 최대 30MB)
export const PROFILE_IMAGE_MAX_SIZE = 30 * 1024 * 1024; // 30MB
export const PROFILE_IMAGE_ALLOWED_TYPES = ["image/jpeg", "image/png"];
