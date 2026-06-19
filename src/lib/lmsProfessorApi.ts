// src/lib/lmsProfessorApi.ts
// PLM-001 교수 LMS 프로필 API 클라이언트 (BE: /api/lms/professor/profile)
import api from "@/lib/api";

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

/** GET /api/lms/professor/profile — 프로필 조회 (BE가 없으면 지연 생성) */
export const getProfessorProfile = async () => {
  const res = await api.get<LmsProfessorProfile>("/api/lms/professor/profile");
  return res.data;
};

/**
 * PUT /api/lms/professor/profile — 프로필 수정 (multipart/form-data)
 *
 * ⚠️ BE가 `@ModelAttribute`(multipart)로 받으므로 JSON이 아니라 FormData로 보내야 한다.
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
