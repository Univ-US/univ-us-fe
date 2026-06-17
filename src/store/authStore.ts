"use client";

import { create } from "zustand";
import { getSession, login, logout } from "@/lib/authApi";
import type {
    SubscriptionAccessState,
    SubscriptionPaymentVerifyResponse,
} from "@/types/subscription";

interface AuthUser {
    memberId: number | null;
    memberName: string | null;
    role: string | null;
    univId: number | null;
    univName: string | null;
    communityNickname: string | null;
    status: string | null;
}

interface AuthState extends AuthUser {
    isLoggedIn: boolean;
    isInitialized: boolean;
    loginAction: (
        loginId: string,
        password: string,
        forceLogin?: boolean,
    ) => Promise<string>;
    logoutAction: () => Promise<void>;
    loadFromStorage: () => Promise<boolean>;
    applySubscriptionVerification: (
        verification: SubscriptionPaymentVerifyResponse,
        univName: string,
    ) => void;
    updateStatus: (status: string) => void;
    updateCommunityNickname: (communityNickname: string) => void;
    subscriptionAccessStatus: SubscriptionAccessState | null;
    updateSubscriptionAccessStatus: (
        status: SubscriptionAccessState | null,
    ) => void;
}

const emptyUser: AuthUser = {
    memberId: null,
    memberName: null,
    role: null,
    univId: null,
    univName: null,
    communityNickname: null,
    status: null,
};

const toUserState = (data: {
    memberId: number;
    memberName: string;
    role: string;
    univId: number | null;
    univName: string | null;
    communityNickname?: string | null;
    status?: string | null;
}): AuthUser => ({
    memberId: data.memberId,
    memberName: data.memberName,
    role: data.role,
    univId: data.univId ?? null,
    univName: data.univName ?? null,
    communityNickname: data.communityNickname || null,
    status: data.status ?? "ACTIVE",
});

export const useAuthStore = create<AuthState>((set) => ({
    ...emptyUser,
    isLoggedIn: false,
    isInitialized: false,
    subscriptionAccessStatus: null,

    loadFromStorage: async () => {
        try {
            const data = await getSession();
            set({
                ...toUserState(data),
                isLoggedIn: true,
                isInitialized: true,
            });
            return true;
        } catch {
            set({
                ...emptyUser,
                isLoggedIn: false,
                isInitialized: true,
                subscriptionAccessStatus: null,
            });
            return false;
        }
    },

    loginAction: async (loginId, password, forceLogin = false) => {
        const data = await login({ loginId, password, forceLogin });
        set({
            ...toUserState(data),
            isLoggedIn: true,
            isInitialized: true,
        });

        return data.role;
    },

    applySubscriptionVerification: (verification, univName) => {
        set((state) => ({
            memberId: verification.memberId,
            role: verification.role,
            univId: verification.univId,
            univName,
            memberName: state.memberName,
            communityNickname: state.communityNickname,
            status: state.status ?? "ACTIVE",
            isLoggedIn: true,
            isInitialized: true,
            subscriptionAccessStatus: "ACTIVE",
        }));
    },

    updateStatus: (status: string) => {
        set({ status });
    },

    updateCommunityNickname: (communityNickname: string) => {
        set({ communityNickname: communityNickname || null });
    },

    updateSubscriptionAccessStatus: (status) => {
        set({ subscriptionAccessStatus: status });
    },

    logoutAction: async () => {
        try {
            await logout();
        } finally {
            set({
                ...emptyUser,
                isLoggedIn: false,
                isInitialized: true,
                subscriptionAccessStatus: null,
            });
        }
    },
}));
