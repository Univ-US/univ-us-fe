import api from "@/lib/api";

export interface LoginRequest {
    loginId: string;
    password: string;
}

export interface UserLoginRequest {
    loginId: string;
    password: string;
    univId: number;
}
export interface LoginResponse {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    memberId: number;
    memberName: string;
    role: string;
    univId: number | null;
    univName: string | null;
    communityNickname: string;
}

export const login = async (payload: LoginRequest) => {
    const res = await api.post<LoginResponse>("/api/auth/admin/login", payload);    return res.data;
};

export const userLogin = async (payload: UserLoginRequest) => {
    const res = await api.post<LoginResponse>("/api/auth/user/login", payload);
    return res.data;
};

export const logout = async (refreshToken: string) => {
    await api.post("/api/auth/logout", { refreshToken });
};

export interface SignupRequest {
    loginId: string;
    password: string;
    memberName: string;
    phoneNumber: string;
    gender: string;
    birth: string;
}

export const signup = async (payload: SignupRequest) => {
    await api.post("/api/auth/signup", payload);
};

export interface SupportRequest {
    univId: number;
    memberName: string;
    contact: string;
    message: string;
}

export const submitSupport = async (payload: SupportRequest) => {
    await api.post("/api/admin/support", payload);
};