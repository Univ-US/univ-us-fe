// src/lib/lmsApiError.ts
// LMS 화면 공용: axios 에러 → 사용자용 메시지 (상태코드를 노출해 BE 문제를 가시화)
// - 가짜 데이터로 가리지 않고 상태코드는 표기하되, 5xx 서버 오류의 BE 원문(ORA/SQL/스택)은
//   가리고 일반 문구만 노출한다(raw 누수 차단). 4xx는 BE의 의도된 검증 메시지를 그대로 보여준다.
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
  // 5xx 서버 오류: BE 원문(ORA/SQL/스택 등)을 노출하지 않고 일반 문구만 — raw 누수 차단
  if (status && status >= 500)
    return `서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요. (${status})`;
  // 4xx: BE의 의도된 검증 메시지("입력값이 올바르지 않습니다." 등)는 사용자에게 유용하므로 노출
  if (status)
    return serverMsg ? `${serverMsg} (${status})` : `요청을 처리하지 못했습니다. (${status})`;
  return "서버에 연결하지 못했습니다. 백엔드 서버 상태를 확인해주세요.";
};
