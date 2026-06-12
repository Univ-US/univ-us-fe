import type {
    MemberRole,
    MemberStatus,
    SubscriptionStatus,
} from "@/app/service-admin/_types";
import api from "@/lib/api";

export interface ServiceAdminDashboardSummary {
    currentMonthRevenue: number;
    previousMonthRevenue: number;
    revenueChangeRate: number | null;
    activeSchoolCount: number;
    totalSchoolCount: number;
    totalMemberCount: number;
    currentMonthNewMemberCount: number;
    previousMonthNewMemberCount: number;
    newMemberChangeRate: number | null;
    unresolvedInquiryCount: number;
    pendingSchoolCount: number;
    failedPaymentSchoolCount: number;
}

export interface ServiceAdminDashboardSchool {
    univId: number;
    univName: string;
    planName: string | null;
    subscriptionStatus: SubscriptionStatus;
    startedAt: string | null;
    endedAt: string | null;
    nextBillingAt: string | null;
    memberCount: number;
}

export interface ServiceAdminDashboardRecentMember {
    memberId: number;
    univId: number | null;
    univName: string | null;
    loginId: string;
    memberName: string;
    role: MemberRole;
    status: MemberStatus;
    createdAt: string;
}

export interface ServiceAdminDashboardResponse {
    summary: ServiceAdminDashboardSummary;
    schools: ServiceAdminDashboardSchool[];
    recentMembers: ServiceAdminDashboardRecentMember[];
}

export async function getServiceAdminDashboard() {
    const response = await api.get<ServiceAdminDashboardResponse>(
        "/api/service-admin/dashboard",
    );
    return response.data;
}
