// src/lib/api.ts
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:9090",
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