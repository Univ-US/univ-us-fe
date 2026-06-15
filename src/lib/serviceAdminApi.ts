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

export type ServiceAdminSchoolPendingAction = "PLAN_CHANGE" | "CANCEL" | null;

export interface ServiceAdminSchoolAdmin {
    memberId: number;
    univId: number;
    loginId: string;
    memberName: string;
    role: "ADM";
    status: string;
    createdAt: string;
    logtimeAt: string;
}

export interface ServiceAdminSchool {
    univId: number;
    univName: string;
    sido: string | null;
    address: string | null;
    schoolPhone: string | null;
    homepage: string | null;
    subscriptionId: number | null;
    planId: number | null;
    planName: string | null;
    planPrice: number | null;
    subscriptionStatus:
        | "ACTIVE"
        | "PAST_DUE"
        | "PENDING"
        | "CANCELED"
        | "UNSUBSCRIBED";
    firstPaidAt: string | null;
    startedAt: string | null;
    nextBillingAt: string | null;
    endedAt: string | null;
    memberCount: number;
    currentMonthRevenue: number;
    currentMonthPaymentStatus:
        | "PAID"
        | "FAILED"
        | "CANCELED"
        | "NONE";
    nextPaymentStatus: "READY" | "NONE";
    pendingAction: ServiceAdminSchoolPendingAction;
    pendingActionAt: string | null;
    cancellationEffectiveAt: string | null;
    admins: ServiceAdminSchoolAdmin[];
}

export interface ServiceAdminSchoolPage {
    content: ServiceAdminSchool[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    first: boolean;
    last: boolean;
}

export interface ServiceAdminMember {
    memberId: number;
    univId: number;
    univName: string;
    loginId: string;
    memberName: string;
    phoneNumber: number | null;
    status: MemberStatus;
    createdAt: string;
    logtimeAt: string | null;
}

export interface ServiceAdminMemberPage {
    content: ServiceAdminMember[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    first: boolean;
    last: boolean;
    totalCount: number;
    activeCount: number;
    suspendedCount: number;
}

export interface ServiceAdminMemberQuery {
    page: number;
    keyword?: string;
    status?: MemberStatus;
    sort?: "SCHOOL_ASC" | "NAME_ASC" | "JOINED_DESC";
}

export interface ServiceAdminSchoolQuery {
    page: number;
    keyword?: string;
    subscriptionStatus?: ServiceAdminSchool["subscriptionStatus"];
    planId?: number;
    sort?:
        | "NAME_ASC"
        | "MEMBERS_ASC"
        | "MEMBERS_DESC"
        | "REVENUE_ASC"
        | "REVENUE_DESC";
}

export async function getServiceAdminDashboard() {
    const response = await api.get<ServiceAdminDashboardResponse>(
        "/api/service-admin/dashboard",
    );
    return response.data;
}

export async function getServiceAdminSchools(params: ServiceAdminSchoolQuery) {
    const response = await api.get<ServiceAdminSchoolPage>(
        "/api/service-admin/schools",
        { params },
    );
    return response.data;
}

export async function getServiceAdminSchool(univId: number) {
    const response = await api.get<ServiceAdminSchool>(
        `/api/service-admin/schools/${univId}`,
    );
    return response.data;
}

export async function changeServiceAdminSchoolPlan(
    univId: number,
    planId: number,
) {
    const response = await api.patch<ServiceAdminSchool>(
        `/api/service-admin/schools/${univId}/plan`,
        { planId },
    );
    return response.data;
}

export async function scheduleServiceAdminSchoolCancellation(univId: number) {
    const response = await api.patch<ServiceAdminSchool>(
        `/api/service-admin/schools/${univId}/cancel`,
    );
    return response.data;
}

export async function getServiceAdminMembers(
    params: ServiceAdminMemberQuery,
) {
    const response = await api.get<ServiceAdminMemberPage>(
        "/api/service-admin/members",
        { params },
    );
    return response.data;
}

export async function changeServiceAdminMemberStatus(
    memberId: number,
    status: "ACTIVE" | "SUSPENDED",
) {
    const response = await api.patch<ServiceAdminMember>(
        `/api/service-admin/members/${memberId}/status`,
        { status },
    );
    return response.data;
}
