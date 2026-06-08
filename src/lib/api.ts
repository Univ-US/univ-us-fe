// src/lib/api.ts
import axios from "axios";

// #    여기서 NEXT_PUBLIC_API_BASE_URL 주입이 이 FE의 "prod 설정"의 핵심.
// #    - "" (빈 문자열) = 상대경로 → 배포 시 같은 도메인(Traefik)의 /api 호출 → CORS 불필요
// #    - 로컬 개발(npm run dev)엔 이 env가 없어 api.ts 기본값(localhost:9090) 사용
// #    (BE의 application-prod.yml/ConfigMap에 대응. 단 FE는 정적이라 '빌드 시점'에 값이 박힘)
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:9090", // for deploy(backend connection), DO NOT ERASE
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: false,
});

// 요청 인터셉터: 모든 요청에 JWT 토큰 자동 삽입
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 응답 인터셉터: 401 시 토큰 삭제
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      // TODO: 로그인 라우트 확정 후 window.location.href = '/login' 추가
    }
    return Promise.reject(error);
  }
);

export default api;