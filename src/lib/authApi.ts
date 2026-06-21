import api from "@/lib/api";
import axios from "axios";

export interface LoginRequest {
    loginId: string;
    password: string;
    forceLogin?: boolean;
}

export interface UserLoginRequest {
    loginId: string;
    password: string;
    univId: number;
    forceLogin?: boolean;
}
export interface LoginResponse {
    memberId: number;
    memberName: string;
    role: string;
    univId: number | null;
    univName: string | null;
    communityNickname: string;
    status: string;
}

export interface AdminSessionInfo {
    loginAt?: string | null;
    ipAddress?: string | null;
    device?: string | null;
}

export interface AdminSessionConflictResponse {
    success: false;
    code: "ADMIN_SESSION_CONFLICT";
    message: string;
    session?: AdminSessionInfo | null;
}

export const isAdminSessionConflictError = (
    error: unknown,
): error is { response: { status: 409; data: AdminSessionConflictResponse } } => {
    if (!axios.isAxiosError(error)) {
        return false;
    }

    const data = error.response?.data as AdminSessionConflictResponse | undefined;
    return error.response?.status === 409 && data?.code === "ADMIN_SESSION_CONFLICT";
};

export const login = async (payload: LoginRequest) => {
    const res = await api.post<LoginResponse>("/api/auth/admin/login", payload);    return res.data;
};

export const userLogin = async (payload: UserLoginRequest) => {
    const res = await api.post<LoginResponse>("/api/auth/user/login", payload);
    return res.data;
};

export const getSession = async () => {
    const res = await api.get<LoginResponse>("/api/auth/me");
    return res.data;
};

export const refreshSession = async () => {
    await api.post("/api/auth/refresh");
};

export const logout = async () => {
    await api.post("/api/auth/logout");
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

export interface CheckLoginIdResponse {
    available: boolean;
}

// 로그인 ID 중복 여부를 백엔드에 확인합니다.
// available이 true면 사용 가능, false면 이미 사용 중인 ID입니다.
export const checkLoginId = async (loginId: string) => {
    const res = await api.get<CheckLoginIdResponse>("/api/auth/check-login-id", {
        params: { loginId },
    });

    return res.data;
};

export interface AccountRecoveryIdentityRequest {
    memberName: string;
    phoneNumber: string;
    birth: string;
}

export interface PasswordRecoveryIdentityRequest extends AccountRecoveryIdentityRequest {
    loginId: string;
}

export interface RecoveryAccount {
    loginId: string;
    univName: string | null;
}

export interface IdRecoveryVerifyResponse {
    accounts: RecoveryAccount[];
}

export interface PasswordRecoveryVerifyResponse {
    resetToken: string;
}

export interface VerificationChallengeResponse {
    recipientNumber: string;
    messageText: string;
    expiresInSeconds: number;
}

export const sendIdRecoveryCode = async (payload: AccountRecoveryIdentityRequest) => {
    const response = await api.post<VerificationChallengeResponse>("/api/auth/recovery/id/send-code", payload);
    return response.data;
};

export const verifyIdRecoveryCode = async (payload: AccountRecoveryIdentityRequest) => {
    const response = await api.post<IdRecoveryVerifyResponse>("/api/auth/recovery/id/verify", payload);
    return response.data;
};

export const sendPasswordRecoveryCode = async (payload: PasswordRecoveryIdentityRequest) => {
    const response = await api.post<VerificationChallengeResponse>("/api/auth/recovery/password/send-code", payload);
    return response.data;
};

export const verifyPasswordRecoveryCode = async (payload: PasswordRecoveryIdentityRequest) => {
    const response = await api.post<PasswordRecoveryVerifyResponse>(
        "/api/auth/recovery/password/verify",
        payload,
    );
    return response.data;
};

export const resetRecoveredPassword = async (resetToken: string, password: string) => {
    await api.post("/api/auth/recovery/password/reset", { resetToken, password });
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
