// src/lib/api.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

// ⚠️⚠️ 절대 삭제·하드코딩 금지 (DO NOT HARDCODE / DO NOT DELETE) ⚠️⚠️
// API_BASE_URL 은 반드시 NEXT_PUBLIC_API_BASE_URL 환경변수를 읽어야 합니다.
//   - 배포(prod): deploy.yml 이 NEXT_PUBLIC_API_BASE_URL="" 주입 → 상대경로(/api) 호출
//                 → 페이지와 같은 오리진(Traefik) → CORS 불필요.
//   - 로컬(npm run dev): env 가 없어 ?? 뒤 기본값(http://localhost:9090) 사용.
// [회귀 이력] PR #36(refresh-token-retry, 커밋 763555a)에서 이 줄이
//   "http://localhost:9090" 하드코딩으로 덮어써져, 배포 FE 의 모든 API 가
//   localhost:9090(= 브라우저 클라이언트 자기 자신)으로 가 "CORS 차단"처럼
//   전부 실패한 회귀가 있었음. 절대 다시 하드코딩하지 말 것.
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:9090";

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
    // 401 이후 같은 요청을 한 번만 재시도하기 위한 플래그입니다.
    // 이 값이 없으면 refresh 실패/반복 상황에서 같은 요청이 계속 재시도될 수 있습니다.
    _retry?: boolean;
}

interface RefreshTokenResponse {
    accessToken: string;
    tokenType: string;
    memberId: number;
    role: string;
}

// #    여기서 NEXT_PUBLIC_API_BASE_URL 주입이 이 FE의 "prod 설정"의 핵심.
// #    - "" (빈 문자열) = 상대경로 → 배포 시 같은 도메인(Traefik)의 /api 호출 → CORS 불필요
// #    - 로컬 개발(npm run dev)엔 이 env가 없어 api.ts 기본값(localhost:9090) 사용
// #    (BE의 application-prod.yml/ConfigMap에 대응. 단 FE는 정적이라 '빌드 시점'에 값이 박힘)
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: false,
});

// refresh 요청 전용 axios 인스턴스입니다.
// 기존 api 인스턴스를 사용하면 response interceptor가 다시 실행될 수 있어서
// /api/auth/refresh 요청 자체가 401을 받을 때 재귀/무한 루프 위험이 있습니다.
const refreshClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: false,
});

// 여러 API 요청이 동시에 accessToken 만료로 401을 받을 수 있습니다.
// 이때 refresh 요청을 요청 개수만큼 보내지 않고, 진행 중인 refresh 요청 하나를 공유합니다.
let refreshPromise: Promise<RefreshTokenResponse> | null = null;

const clearAuthStorage = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("memberId");
    localStorage.removeItem("role");
};

const isAuthApiRequest = (url?: string) => {
    // 인증 API 자체는 자동 갱신 대상에서 제외합니다.
    // 예: 로그인 실패 401, refresh 실패 401, 로그아웃 실패 401은 다시 refresh를 시도하면 안 됩니다.
    return !!url && url.startsWith("/api/auth/");
};

const requestRefreshToken = async () => {
    const refreshToken = localStorage.getItem("refreshToken");

    // refreshToken이 없으면 새 accessToken을 받을 방법이 없습니다.
    // 이 경우 아래 response interceptor의 catch로 넘어가 인증 정보를 정리합니다.
    if (!refreshToken) {
        throw new Error("Refresh token is missing.");
    }

    if (!refreshPromise) {
        refreshPromise = refreshClient
            .post<RefreshTokenResponse>("/api/auth/refresh", { refreshToken })
            .then((res) => res.data)
            .finally(() => {
                // refresh 요청이 끝나면 다음 401 상황에서 새 refresh 요청을 만들 수 있도록 초기화합니다.
                refreshPromise = null;
            });
    }

    return refreshPromise;
};

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("accessToken");

        if (config.data instanceof FormData) {
            delete config.headers["Content-Type"];
        }

        // 일반 API 요청마다 현재 accessToken을 Authorization 헤더에 붙입니다.
        // BE의 JwtAuthenticationFilter는 이 Bearer token을 읽어서 인증을 처리합니다.
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as RetryableRequestConfig | undefined;

        // 401이 아닌 에러는 토큰 만료와 무관하므로 기존처럼 그대로 넘깁니다.
        // 원본 요청 정보가 없는 경우에도 재시도할 수 없으므로 그대로 실패 처리합니다.
        if (!originalRequest || error.response?.status !== 401) {
            return Promise.reject(error);
        }

        // 이미 한 번 재시도한 요청은 다시 refresh하지 않습니다.
        // 인증 API 요청도 자동 갱신 대상에서 제외합니다.
        if (originalRequest._retry || isAuthApiRequest(originalRequest.url)) {
            return Promise.reject(error);
        }

        try {
            // 이 요청은 refresh 후 한 번만 재시도되도록 표시합니다.
            originalRequest._retry = true;

            // BE의 /api/auth/refresh API에 refreshToken을 보내 새 accessToken을 받습니다.
            // BE는 갱신 기능을 제공하고, FE가 401 응답을 보고 이 API를 호출합니다.
            const refreshedToken = await requestRefreshToken();

            // 현재 BE refresh 응답에는 새 refreshToken이 없습니다.
            // 따라서 refreshToken은 기존 localStorage 값을 유지하고 accessToken만 교체합니다.
            localStorage.setItem("accessToken", refreshedToken.accessToken);
            localStorage.setItem("memberId", String(refreshedToken.memberId));
            localStorage.setItem("role", refreshedToken.role);

            // 401로 실패했던 원래 요청에 새 accessToken을 붙여 다시 보냅니다.
            originalRequest.headers.Authorization = `Bearer ${refreshedToken.accessToken}`;

            return api(originalRequest);
        } catch (refreshError) {
            // refreshToken이 없거나, 만료됐거나, DB에서 폐기된 세션이면 refresh도 실패합니다.
            // 이 경우 더 이상 로그인 상태를 유지할 수 없으므로 클라이언트 인증 정보를 제거합니다.
            clearAuthStorage();

            if (typeof window !== "undefined") {
                window.location.href = "/login";
            }

            return Promise.reject(refreshError);
        }
    }
);

export default api;
