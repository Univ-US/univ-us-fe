import api, { API_BASE_URL, getCsrfToken } from "@/lib/api";
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

async function refreshAccessToken(): Promise<void> {
    const requestRefresh = async () => {
        const csrfToken = await getCsrfToken();
        return fetch(`${API_BASE_URL}/api/auth/refresh`, {
            method: "POST",
            credentials: "include",
            headers: csrfToken ? { "X-XSRF-TOKEN": csrfToken } : undefined,
        });
    };

    let res = await requestRefresh();
    if (await isCsrfInvalidResponse(res)) {
        res = await requestRefresh();
    }

    if (!res.ok) throw new Error("Refresh failed");
}

async function isCsrfInvalidResponse(response: Response): Promise<boolean> {
    if (response.status !== 403) {
        return false;
    }

    try {
        const body = await response.clone().json() as { code?: string };
        return body.code === "CSRF_INVALID";
    } catch {
        return false;
    }
}

async function fetchWithCsrfRetry(buildRequest: () => Promise<Request>): Promise<Response> {
    let response = await fetch(await buildRequest());
    if (await isCsrfInvalidResponse(response)) {
        response = await fetch(await buildRequest());
    }
    return response;
}

async function buildStreamRequest(message: string): Promise<Request> {
    const csrfToken = await getCsrfToken();
    return new Request(`${API_BASE_URL}/api/ai/stream`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}),
        },
        body: JSON.stringify({ message }),
    });
}

export async function* streamChatMessage(message: string): AsyncGenerator<string> {
    let res = await fetchWithCsrfRetry(() => buildStreamRequest(message));

    if (res.status === 401) {
        try {
            await refreshAccessToken();
            res = await fetchWithCsrfRetry(() => buildStreamRequest(message));
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
