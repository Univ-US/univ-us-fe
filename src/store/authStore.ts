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
    loginAction: (memberId: number, password: string) => Promise<string>;
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
        });
    },

    loginAction: async (memberId, password) => {
        const data = await login({ memberId, password });

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
        localStorage.removeItem("memberId");
        localStorage.removeItem("role");
        localStorage.removeItem("memberName");
        localStorage.removeItem("communityNickname");

        set({
            accessToken: null,
            refreshToken: null,
            memberId: null,
            role: null,
            memberName: null,
            communityNickname: null,
            isLoggedIn: false,
        });
    },
}));
