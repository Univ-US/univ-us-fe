"use client";

import { create } from "zustand";
import { login, logout } from "@/lib/authApi";
import type {
    SubscriptionAccessState,
    SubscriptionPaymentVerifyResponse,
} from "@/types/subscription";

interface AuthState {
    accessToken: string | null;
    refreshToken: string | null;
    memberId: number | null;
    memberName: string | null;
    role: string | null;
    univId: number | null;
    univName: string | null;
    communityNickname: string | null;
    status: string | null;
    isLoggedIn: boolean;
    // localStorage 복원이 끝났는지 확인하는 값입니다.
    isInitialized: boolean;
    loginAction: (loginId: string, password: string) => Promise<string>;
    logoutAction: () => Promise<void>;
    loadFromStorage: () => void;

    applySubscriptionVerification: (
        verification: SubscriptionPaymentVerifyResponse,
        univName: string,
    ) => void;
    updateStatus: (status: string) => void;
    updateCommunityNickname: (communityNickname: string) => void;
    // 구독에 따른 서비스 접근 상태를 Zustand 전역 상태와 localStorage에서 공유합니다.
    subscriptionAccessStatus: SubscriptionAccessState | null;
    updateSubscriptionAccessStatus: (
        status: SubscriptionAccessState | null,
    ) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    accessToken: null,
    refreshToken: null,
    memberId: null,
    memberName: null,
    role: null,
    univId: null,
    univName: null,
    communityNickname: null,
    status: null,
    isLoggedIn: false,
    // 앱이 처음 뜬 직후에는 아직 localStorage를 읽기 전입니다.
    isInitialized: false,
    subscriptionAccessStatus: null,

    loadFromStorage: () => {
        const accessToken = localStorage.getItem("accessToken");
        const refreshToken = localStorage.getItem("refreshToken");
        const memberId = localStorage.getItem("memberId");
        const memberName = localStorage.getItem("memberName");
        const role = localStorage.getItem("role");
        const univId = localStorage.getItem("univId");
        const univName = localStorage.getItem("univName");
        const communityNickname = localStorage.getItem("communityNickname");
        const status = localStorage.getItem("status");
        // 새로고침 후에도 저장된 구독 접근 상태를 전역 상태로 복원합니다.
        const subscriptionAccessStatus = localStorage.getItem(
            "subscriptionAccessStatus",
        ) as SubscriptionAccessState | null;

        set({
            accessToken,
            refreshToken,
            memberId: memberId ? Number(memberId) : null,
            memberName,
            role,
            univId: univId ? Number(univId) : null,
            univName: univName ?? null,
            communityNickname: communityNickname || null,
            status: status || null,
            isLoggedIn: !!accessToken,
            // localStorage 복원이 끝났다는 표시입니다.
            isInitialized: true,
            subscriptionAccessStatus,
        });
    },

    loginAction: async (loginId, password) => {
        const data = await login({ loginId, password });

        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);
        localStorage.setItem("memberId", String(data.memberId));
        localStorage.setItem("memberName", data.memberName);
        localStorage.setItem("role", data.role);
        if (data.univId != null) localStorage.setItem("univId", String(data.univId));
        if (data.univName) localStorage.setItem("univName", data.univName);
        localStorage.setItem("communityNickname", data.communityNickname ?? "");
        localStorage.setItem("status", data.status ?? "ACTIVE");

        set({
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            memberId: data.memberId,
            memberName: data.memberName,
            role: data.role,
            univId: data.univId ?? null,
            univName: data.univName ?? null,
            communityNickname: data.communityNickname || null,
            status: data.status ?? "ACTIVE",
            isLoggedIn: true,
            // 로그인 성공 후에는 인증 상태가 초기화 완료 상태입니다.
            isInitialized: true,
        });

        return data.role;
    },

    applySubscriptionVerification: (verification, univName) => {
        localStorage.setItem("accessToken", verification.accessToken);
        localStorage.setItem("memberId", String(verification.memberId));
        localStorage.setItem("role", verification.role);
        localStorage.setItem("univId", String(verification.univId));
        localStorage.setItem("univName", univName);
        // 구독 결제 검증이 끝나면 즉시 접근 가능 상태로 갱신합니다.
        localStorage.setItem("subscriptionAccessStatus", "ACTIVE");

        set({
            accessToken: verification.accessToken,
            memberId: verification.memberId,
            role: verification.role,
            univId: verification.univId,
            univName,
            isLoggedIn: true,
            isInitialized: true,
            subscriptionAccessStatus: "ACTIVE",
        });
    },

    updateStatus: (status: string) => {
        localStorage.setItem("status", status);
        set({ status });
    },

    updateCommunityNickname: (communityNickname: string) => {
        localStorage.setItem("communityNickname", communityNickname);
        set({ communityNickname: communityNickname || null });
    },

    updateSubscriptionAccessStatus: (status) => {
        // 화면 간 이동과 새로고침에서도 같은 구독 접근 상태를 사용하도록 함께 저장합니다.
        if (status) {
            localStorage.setItem("subscriptionAccessStatus", status);
        } else {
            localStorage.removeItem("subscriptionAccessStatus");
        }

        set({ subscriptionAccessStatus: status });
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
            localStorage.removeItem("univId");
            localStorage.removeItem("univName");
            localStorage.removeItem("status");
            localStorage.removeItem("subscriptionAccessStatus");

            set({
                accessToken: null,
                refreshToken: null,
                memberId: null,
                memberName: null,
                role: null,
                univId: null,
                univName: null,
                communityNickname: null,
                status: null,
                isLoggedIn: false,
                isInitialized: true,
                subscriptionAccessStatus: null,
            });
        }
    },
}));
