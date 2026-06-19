import api from "@/lib/api";

export type AdminPenaltyStatus = "ACTIVE" | "PLEDGED" | "ADMIN_RELEASED";
export type AdminPenaltyType = "NO_SHOW" | "MANUAL";

export interface AdminPenalty {
    penaltyId: number;
    memberId: number;
    memberName: string;
    loginId: string;
    penaltyType: AdminPenaltyType;
    reason: string;
    status: AdminPenaltyStatus;
    startTime: string;
    endTime: string;
    createdAt: string;
}

export interface AdminPenaltyPage {
    content: AdminPenalty[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    first: boolean;
    last: boolean;
}

export interface AdminPenaltyQuery {
    page: number;
    memberId?: number;
    keyword?: string;
    status?: AdminPenaltyStatus;
}

export interface AdminMemberPenaltyStatus {
    memberId: number;
    memberName: string;
    activePenaltyCount: number;
    blockThreshold: number;
    blocked: boolean;
}

export async function getAdminPenalties(params: AdminPenaltyQuery) {
    const response = await api.get<AdminPenaltyPage>(
        "/api/service-admin/reservations/penalties",
        { params },
    );
    return response.data;
}

export async function getAdminMemberPenaltyStatus(memberId: number) {
    const response = await api.get<AdminMemberPenaltyStatus>(
        `/api/service-admin/reservations/penalties/members/${memberId}/status`,
    );
    return response.data;
}

export async function createAdminPenalty(memberId: number, reason: string) {
    const response = await api.post<AdminPenalty>(
        "/api/service-admin/reservations/penalties",
        { memberId, reason },
    );
    return response.data;
}

export async function releaseAdminPenalty(penaltyId: number) {
    const response = await api.patch<AdminPenalty>(
        `/api/service-admin/reservations/penalties/${penaltyId}/release`,
    );
    return response.data;
}
