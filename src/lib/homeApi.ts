import api from "@/lib/api";

export interface HomeProfile {
    univId: number;
    schoolName: string;
    phoneNumber: string;
    youtubeUrl: string | null;
    clubUrl: string | null;
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
}

export const getUniversities = async (): Promise<University[]> => {
    const res = await api.get<University[]>("/api/admin/universities");
    return res.data;
};

export const sendChatMessage = async (message: string): Promise<string> => {
    const res = await api.post<{ response: string }>("/api/ai", { message });
    return res.data.response;
};

export interface Notice {
    noticeId: number;
    title: string;
    content: string;
    memberName: string;
    postedAt: string;
}

export const getNotices = async (): Promise<Notice[]> => {
    const res = await api.get<Notice[]>("/api/admin/notices");
    return res.data;
};
