import api from "@/lib/api";

export interface LoginRequest {
    memberId: number;
    password: string;
}

export interface LoginResponse {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    memberId: number;
    role: string;
    memberName: string;
    communityNickname: string;
}

export const login = async (payload: LoginRequest) => {
    const res = await api.post<LoginResponse>("/api/auth/admin/login", payload);    return res.data;
};

export const logout = async (refreshToken: string) => {
    await api.post("/api/auth/logout", { refreshToken });
};

export interface SignupRequest {
    memberId: number;
    password: string;
    memberName: string;
    phoneNumber: string;
    gender: string;
    birth: string;
}

export const signup = async (payload: SignupRequest) => {
    await api.post("/api/auth/signup", payload);
};