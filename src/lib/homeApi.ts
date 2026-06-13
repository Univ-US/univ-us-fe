import api, { API_BASE_URL } from "@/lib/api";
import type { HomeWidgetConfig } from "@/lib/adminApi";

export const getHomeConfig = async (): Promise<HomeWidgetConfig> => {
    const res = await api.get<HomeWidgetConfig>("/api/home/config");
    return res.data;
};

export type { HomeWidgetConfig };

export interface HomeProfile {
    univId: number;
    schoolName: string;
    phoneNumber: string;
    youtubeUrl: string | null;
    clubUrl: string | null;
    snsUrl: string | null;
}

export const getHomeProfile = async (): Promise<HomeProfile> => {
    const res = await api.get<HomeProfile>("/api/home/profile");
    return res.data;
};

export interface University {
    univId: number;
    univName: string;
    schoolPhone: string;
    homepage: string | null;
    address: string | null;
    youtubeUrl: string | null;
    clubUrl: string | null;
    snsUrl: string | null;
}

export const getUniversities = async (): Promise<University[]> => {
    const res = await api.get<University[]>("/api/admin/universities");
    return res.data;
};

async function refreshAccessToken(): Promise<string> {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) throw new Error("No refresh token");

    const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) throw new Error("Refresh failed");

    const data = await res.json();
    localStorage.setItem("accessToken", data.accessToken);
    if (data.memberId) localStorage.setItem("memberId", String(data.memberId));
    if (data.role) localStorage.setItem("role", data.role);
    return data.accessToken;
}

function buildStreamRequest(token: string | null, message: string): Request {
    return new Request(`${API_BASE_URL}/api/ai/stream`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message }),
    });
}

export async function* streamChatMessage(message: string): AsyncGenerator<string> {
    let accessToken = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    let res = await fetch(buildStreamRequest(accessToken, message));

    if (res.status === 401) {
        try {
            accessToken = await refreshAccessToken();
            res = await fetch(buildStreamRequest(accessToken, message));
        } catch {
            throw new Error("UNAUTHORIZED");
        }
    }

    if (res.status === 401) {
        throw new Error("UNAUTHORIZED");
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (!res.body) throw new Error("body is null");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
            if (!line.startsWith("data:")) continue;
            const content = line.slice(5);
            if (content && content !== "[DONE]") yield content;
        }
    }
}

export interface Notice {
    noticeId: number;
    title: string;
    content: string;
    memberName: string;
    target: "ALL" | "STU" | "PROF";
    postedAt: string;
}

export const getNotices = async (): Promise<Notice[]> => {
    const res = await api.get<Notice[]>("/api/admin/notices");
    return res.data;
};
