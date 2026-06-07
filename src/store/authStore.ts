"use client";

import { create } from "zustand";
import { login, logout } from "@/lib/authApi";

interface AuthState {
    accessToken: string | null;
    refreshToken: string | null;
    memberId: number | null;
    role: string | null;
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
    isLoggedIn: false,

    loadFromStorage: () => {
        const accessToken = localStorage.getItem("accessToken");
        const refreshToken = localStorage.getItem("refreshToken");
        const memberId = localStorage.getItem("memberId");
        const role = localStorage.getItem("role");

        set({
            accessToken,
            refreshToken,
            memberId: memberId ? Number(memberId) : null,
            role,
            isLoggedIn: !!accessToken,
        });
    },

    loginAction: async (memberId, password) => {
        const data = await login({ memberId, password });

        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);
        localStorage.setItem("memberId", String(data.memberId));
        localStorage.setItem("role", data.role);

        set({
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            memberId: data.memberId,
            role: data.role,
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

        set({
            accessToken: null,
            refreshToken: null,
            memberId: null,
            role: null,
            isLoggedIn: false,
        });
    },
}));
