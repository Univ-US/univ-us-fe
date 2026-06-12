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

export async function* streamChatMessage(message: string): AsyncGenerator<string> {
    const accessToken = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    const res = await fetch(`${API_BASE_URL}/api/ai/stream`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ message }),
    });

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
            if (content) yield content;
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
