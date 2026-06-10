// src/lib/lmsApiError.ts
// LMS 화면 공용: axios 에러 → 사용자용 메시지 (상태코드를 노출해 BE 문제를 가시화)
// - 가짜 데이터로 가리지 않고, "어디서 문제가 났는지"를 화면에 그대로 표기하기 위한 헬퍼.
// - 현재 사용처: PLM-003(수강생 현황), PLM-001/SLM-001(프로필), LMS 사이드바.
// - 로직 자체는 범용(axios 상태코드 매핑)이라, 다른 도메인이 채택하면 apiError.ts로 승격 가능.
export const describeApiError = (err: unknown): string => {
  const e = err as {
    response?: { status?: number; data?: { message?: string } };
    code?: string;
  };
  const status = e?.response?.status;
  const serverMsg = e?.response?.data?.message;
  if (status === 401) return "인증이 만료되었거나 로그인이 필요합니다. (401)";
  if (status === 403) return "접근 권한이 없습니다. (403)";
  if (status === 404) return "요청한 데이터를 찾을 수 없습니다. (404)";
  if (status)
    return serverMsg ? `${serverMsg} (${status})` : `서버 오류가 발생했습니다. (${status})`;
  return "서버에 연결하지 못했습니다. 백엔드 서버 상태를 확인해주세요.";
};
