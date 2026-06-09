"use client";

import { create } from "zustand";
import { login, logout } from "@/lib/authApi";

interface AuthState {
    accessToken: string | null;
    refreshToken: string | null;
    memberName: string | null;
    role: string | null;
    univId: number | null;
    univName: string | null;
    isLoggedIn: boolean;
    // localStorage 복원이 끝났는지 확인하는 값입니다.
    isInitialized: boolean;
    loginAction: (loginId: string, password: string) => Promise<string>;
    logoutAction: () => Promise<void>;
    loadFromStorage: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    accessToken: null,
    refreshToken: null,
    memberName: null,
    role: null,
    univId: null,
    univName: null,
    isLoggedIn: false,
    // 앱이 처음 뜬 직후에는 아직 localStorage를 읽기 전입니다.
    isInitialized: false,

    loadFromStorage: () => {
        const accessToken = localStorage.getItem("accessToken");
        const refreshToken = localStorage.getItem("refreshToken");
        const memberName = localStorage.getItem("memberName");
        const role = localStorage.getItem("role");
        const univId = localStorage.getItem("univId");
        const univName = localStorage.getItem("univName");

        set({
            accessToken,
            refreshToken,
            memberName,
            role,
            univId: univId ? Number(univId) : null,
            univName: univName ?? null,
            isLoggedIn: !!accessToken,
            // localStorage 복원이 끝났다는 표시입니다.
            isInitialized: true,
        });
    },

    loginAction: async (loginId, password) => {
        const data = await login({ loginId, password });

        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);
        localStorage.setItem("memberName", data.memberName);
        localStorage.setItem("role", data.role);
        if (data.univId != null) localStorage.setItem("univId", String(data.univId));
        if (data.univName) localStorage.setItem("univName", data.univName);

        set({
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            memberName: data.memberName,
            role: data.role,
            univId: data.univId ?? null,
            univName: data.univName ?? null,
            isLoggedIn: true,
            // 로그인 성공 후에는 인증 상태가 초기화 완료 상태입니다.
            isInitialized: true,
        });

        return data.role;
    },

    logoutAction: async () => {
        const refreshToken = get().refreshToken ?? localStorage.getItem("refreshToken");

        if (refreshToken) {
            await logout(refreshToken);
        }

        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("memberName");
        localStorage.removeItem("role");
        localStorage.removeItem("univId");
        localStorage.removeItem("univName");

        set({
            accessToken: null,
            refreshToken: null,
            memberName: null,
            role: null,
            univId: null,
            univName: null,
            isLoggedIn: false,
            // 로그아웃 후에도 인증 상태 판단은 끝난 상태입니다.
            isInitialized: true,
        });
    },
}));
