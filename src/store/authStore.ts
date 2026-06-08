"use client";

import { create } from "zustand";
import { login, logout } from "@/lib/authApi";

interface AuthState {
    accessToken: string | null;
    refreshToken: string | null;
    memberId: number | null;
    role: string | null;
    memberName: string | null;
    communityNickname: string | null;
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
    memberId: null,
    role: null,
    memberName: null,
    communityNickname: null,
    isLoggedIn: false,
    // 앱이 처음 뜬 직후에는 아직 localStorage를 읽기 전입니다.
    isInitialized: false,

    loadFromStorage: () => {
        const accessToken = localStorage.getItem("accessToken");
        const refreshToken = localStorage.getItem("refreshToken");
        const memberId = localStorage.getItem("memberId");
        const role = localStorage.getItem("role");
        const memberName = localStorage.getItem("memberName");
        const communityNickname = localStorage.getItem("communityNickname");

        set({
            accessToken,
            refreshToken,
            memberId: memberId ? Number(memberId) : null,
            role,
            memberName,
            communityNickname,
            isLoggedIn: !!accessToken,
            // localStorage 복원이 끝났다는 표시입니다.
            isInitialized: true,
        });
    },

    loginAction: async (loginId, password) => {
        const data = await login({ loginId, password });

        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);
        localStorage.setItem("memberId", String(data.memberId));
        localStorage.setItem("role", data.role);
        localStorage.setItem("memberName", data.memberName ?? "");
        localStorage.setItem("communityNickname", data.communityNickname ?? "");

        set({
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            memberId: data.memberId,
            role: data.role,
            memberName: data.memberName,
            communityNickname: data.communityNickname,
            isLoggedIn: true,
            // 로그인 성공 후에는 인증 상태가 초기화 완료 상태입니다.
            isInitialized: true,
        });

        return data.role;
    },

    logoutAction: async () => {
        const refreshToken = get().refreshToken ?? localStorage.getItem("refreshToken");

        try {
            if (refreshToken) {
                await logout(refreshToken);
            }
        } catch {
            // 서버 로그아웃 실패와 관계없이 클라이언트 로그아웃은 계속 진행합니다.
        } finally {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            localStorage.removeItem("memberId");
            localStorage.removeItem("role");
            localStorage.removeItem("memberName");
            localStorage.removeItem("communityNickname");

            set({
                accessToken: null,
                refreshToken: null,
                memberId: null,
                role: null,
                isLoggedIn: false,
                isInitialized: true,
            });
        }
    },
}));
