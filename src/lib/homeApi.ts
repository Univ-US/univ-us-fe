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
}

export const getUniversities = async (): Promise<University[]> => {
    const res = await api.get<University[]>("/api/admin/universities");
    return res.data;
};
