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
    withdrawnCount: number;
}

export interface ServiceAdminMemberActivitySummary {
    noticeCount: number;
    postCount: number;
    commentCount: number;
    inquiryCount: number;
}

export interface ServiceAdminMemberDetail {
    member: ServiceAdminMember;
    summary: ServiceAdminMemberActivitySummary;
    loginLogs: ServiceAdminUserLoginLog[];
}

export interface ServiceAdminMemberQuery {
    page: number;
    keyword?: string;
    status?: MemberStatus;
    sort?: "SCHOOL_ASC" | "NAME_ASC" | "JOINED_DESC";
}

export type ServiceAdminMemberActivityType =
    | "notices"
    | "posts"
    | "comments"
    | "inquiries";

export type ServiceAdminUserRole = Exclude<MemberRole, "ADM">;

export interface ServiceAdminUser {
    memberId: number;
    univId: number | null;
    univName: string | null;
    deptId: number | null;
    deptName: string | null;
    loginId: string;
    memberName: string;
    role: ServiceAdminUserRole;
    phoneNumber: number | null;
    gender: string | null;
    status: MemberStatus;
    createdAt: string;
    logtimeAt: string | null;
    communityNickname: string | null;
    birth: string | null;
}

export interface ServiceAdminUserPage {
    content: ServiceAdminUser[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    first: boolean;
    last: boolean;
    totalCount: number;
    activeCount: number;
    suspendedCount: number;
    withdrawnCount: number;
    studentCount: number;
    professorCount: number;
    alumniCount: number;
    guestCount: number;
}

export interface ServiceAdminUserQuery {
    page: number;
    keyword?: string;
    univId?: number;
    role?: ServiceAdminUserRole;
    status?: MemberStatus;
    sort?:
        | "JOINED_DESC"
        | "JOINED_ASC"
        | "NAME_ASC"
        | "SCHOOL_ASC"
        | "ROLE_ASC"
        | "LOGIN_DESC";
}

export interface ServiceAdminBulkSignupMemberInput {
    loginId: string;
    password: string;
    memberName: string;
    phoneNumber: string;
    gender: string;
    birth: string;
    role: "STU" | "PROF";
    deptId: number | null;
}

export interface ServiceAdminBulkSignupRequest {
    univId: number;
    members: ServiceAdminBulkSignupMemberInput[];
}

export interface ServiceAdminBulkSignupValidationError {
    rowNumber: number;
    message: string;
}

export interface ServiceAdminBulkSignupPrecheck {
    canRegister: boolean;
    reason: string | null;
    univName: string | null;
    planName: string | null;
    currentMemberCount: number;
    maxMemberCount: number;
    requestedMemberCount: number;
    remainingMemberCount: number;
    errors: ServiceAdminBulkSignupValidationError[];
}

export interface ServiceAdminBulkSignupResult {
    createdCount: number;
}

export interface ServiceAdminUserActivitySummary {
    postCount: number;
    commentCount: number;
    courseCount: number;
    submissionCount: number;
    reservationCount: number;
    noShowCount: number;
    inquiryCount: number;
}

export interface ServiceAdminUserLoginLog {
    logId: number;
    result: string;
    failReason: string | null;
    logTime: string;
}

export interface ServiceAdminUserLoginLogPage {
    content: ServiceAdminUserLoginLog[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    first: boolean;
    last: boolean;
}

export interface ServiceAdminUserActivityItem {
    id: string;
    type: string;
    title: string | null;
    description: string | null;
    status: string | null;
    occurredAt: string | null;
}

export type ServiceAdminUserActivityType =
    | "posts"
    | "comments"
    | "courses"
    | "submissions"
    | "reservations"
    | "penalties"
    | "inquiries";

export interface ServiceAdminUserActivityItemPage {
    content: ServiceAdminUserActivityItem[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    first: boolean;
    last: boolean;
}

export interface ServiceAdminUserDetail {
    user: ServiceAdminUser;
    summary: ServiceAdminUserActivitySummary;
    loginLogs: ServiceAdminUserLoginLog[];
    communityActivities: ServiceAdminUserActivityItem[];
    courseActivities: ServiceAdminUserActivityItem[];
    submissionActivities: ServiceAdminUserActivityItem[];
    reservationActivities: ServiceAdminUserActivityItem[];
    inquiryActivities: ServiceAdminUserActivityItem[];
}

export interface ServiceAdminForceLogoutResponse {
    memberId: number;
    revokedSessionCount: number;
}

export type ServiceAdminPaymentStatus =
    | "READY"
    | "PAID"
    | "FAILED"
    | "CANCELED"
    | "REFUNDED";
export type ServiceAdminPaymentMethod = "CARD" | "KAKAO_PAY";
export type ServiceAdminPaymentType = "INITIAL" | "RECURRING";

export interface ServiceAdminPayment {
    historyId: number;
    subscriptionId: number;
    univId: number | null;
    univName: string;
    memberId: number;
    billingKeyId: number | null;
    planId: number | null;
    planName: string | null;
    billingCycle: "MONTHLY" | "YEARLY" | null;
    amount: number;
    status: ServiceAdminPaymentStatus;
    paymentMethod: ServiceAdminPaymentMethod;
    paymentType: ServiceAdminPaymentType;
    merchantUid: string;
    portonePaymentId: string | null;
    portoneScheduleId: string | null;
    createdAt: string;
    paidAt: string | null;
    failReason: string | null;
    nextBillingAt: string | null;
    subscriptionStatus: string;
    pendingAction: "PLAN_CHANGE" | "CANCEL" | null;
    cancellationEffectiveAt: string | null;
    refundedAt: string | null;
    refundAmount: number | null;
    refundReason: string | null;
    portoneCancellationId: string | null;
}

export interface ServiceAdminPaymentPlan {
    planId: number;
    planName: string;
}

export type ServiceAdminPlanStatus = "ACTIVE" | "INACTIVE";

export interface ServiceAdminPlan {
    planId: number;
    planName: string;
    price: number;
    description: string;
    billingCycle: "MONTHLY";
    maxMemberCount: number;
    createdAt: string;
    updateAt: string;
    deletedAt: string | null;
    subscriberCount: number;
    status: ServiceAdminPlanStatus;
}

export interface ServiceAdminPlanResponse {
    plans: ServiceAdminPlan[];
    totalCount: number;
    activeCount: number;
    currentMonthRevenue: number;
}

export interface ServiceAdminPlanInput {
    planName: string;
    price: number;
    description: string;
    maxMemberCount: number;
}

export interface ServiceAdminPaymentPage {
    content: ServiceAdminPayment[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    first: boolean;
    last: boolean;
    currentMonthRevenue: number;
    currentMonthPaidCount: number;
    currentMonthFailedCount: number;
    currentMonthReadyCount: number;
    readyPaymentAmount: number;
    plans: ServiceAdminPaymentPlan[];
}

export interface ServiceAdminPaymentQuery {
    page: number;
    keyword?: string;
    status?: ServiceAdminPaymentStatus;
    planId?: number;
    method?: ServiceAdminPaymentMethod;
    sort?: "RECENT" | "AMOUNT_DESC" | "AMOUNT_ASC" | "SCHOOL_ASC";
}

export type ServiceAdminOperationLogCategory = "ACCESS" | "PAYMENT";
export type ServiceAdminOperationLogResult =
    | "SUCCESS"
    | "FAILURE"
    | "SCHEDULED";
export type ServiceAdminOperationLogAction =
    | "LOGIN_SUCCESS"
    | "LOGOUT"
    | "LOGIN_FAILED"
    | "PAYMENT_PAID"
    | "PAYMENT_FAILED"
    | "PAYMENT_READY"
    | "PAYMENT_CANCELED"
    | "PAYMENT_REFUNDED"
    | "PAYMENT";
export type ServiceAdminOperationLogPeriod = "1" | "7" | "30" | "90" | "ALL";

export interface ServiceAdminOperationLog {
    id: string;
    category: ServiceAdminOperationLogCategory;
    action: ServiceAdminOperationLogAction;
    result: ServiceAdminOperationLogResult;
    occurredAt: string;
    sourceId: number;
    memberId: number | null;
    memberName: string | null;
    loginId: string | null;
    role: MemberRole | null;
    memberStatus: MemberStatus | null;
    univId: number | null;
    univName: string | null;
    identifier: string | null;
    failReason: string | null;
    failReasonLabel: string | null;
    subscriptionId: number | null;
    paymentStatus: ServiceAdminPaymentStatus | null;
    merchantUid: string | null;
    portonePaymentId: string | null;
    portoneScheduleId: string | null;
    amount: number | null;
    planName: string | null;
    paidAt: string | null;
    nextBillingAt: string | null;
    refundedAt: string | null;
    refundAmount: number | null;
    refundReason: string | null;
    portoneCancellationId: string | null;
}

export interface ServiceAdminOperationLogPage {
    content: ServiceAdminOperationLog[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    first: boolean;
    last: boolean;
    totalCount: number;
    successCount: number;
    failureCount: number;
    scheduledCount: number;
}

export interface ServiceAdminOperationLogQuery {
    page: number;
    keyword?: string;
    category?: ServiceAdminOperationLogCategory;
    result?: ServiceAdminOperationLogResult;
    period?: ServiceAdminOperationLogPeriod;
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

export async function getServiceAdminMemberDetail(memberId: number) {
    const response = await api.get<ServiceAdminMemberDetail>(
        `/api/service-admin/members/${memberId}`,
    );
    return response.data;
}

export async function getServiceAdminMemberLoginLogs(
    memberId: number,
    params: { page: number; size?: number },
) {
    const response = await api.get<ServiceAdminUserLoginLogPage>(
        `/api/service-admin/members/${memberId}/login-logs`,
        { params },
    );
    return response.data;
}

export async function getServiceAdminMemberActivities(
    memberId: number,
    activityType: ServiceAdminMemberActivityType,
    params: { page: number; size?: number },
) {
    const response = await api.get<ServiceAdminUserActivityItemPage>(
        `/api/service-admin/members/${memberId}/activities/${activityType}`,
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

export async function forceLogoutServiceAdminMember(memberId: number) {
    const response = await api.post<ServiceAdminForceLogoutResponse>(
        `/api/service-admin/members/${memberId}/force-logout`,
    );
    return response.data;
}

export async function getServiceAdminUsers(
    params: ServiceAdminUserQuery,
) {
    const response = await api.get<ServiceAdminUserPage>(
        "/api/service-admin/members/users",
        { params },
    );
    return response.data;
}

export async function getServiceAdminUserDetail(memberId: number) {
    const response = await api.get<ServiceAdminUserDetail>(
        `/api/service-admin/members/users/${memberId}`,
    );
    return response.data;
}

export async function getServiceAdminUserLoginLogs(
    memberId: number,
    params: { page: number; size?: number },
) {
    const response = await api.get<ServiceAdminUserLoginLogPage>(
        `/api/service-admin/members/users/${memberId}/login-logs`,
        { params },
    );
    return response.data;
}

export async function getServiceAdminUserActivities(
    memberId: number,
    activityType: ServiceAdminUserActivityType,
    params: { page: number; size?: number },
) {
    const response = await api.get<ServiceAdminUserActivityItemPage>(
        `/api/service-admin/members/users/${memberId}/activities/${activityType}`,
        { params },
    );
    return response.data;
}

export async function changeServiceAdminUserStatus(
    memberId: number,
    status: MemberStatus,
) {
    const response = await api.patch<ServiceAdminUser>(
        `/api/service-admin/members/users/${memberId}/status`,
        { status },
    );
    return response.data;
}

export async function forceLogoutServiceAdminUser(memberId: number) {
    const response = await api.post<ServiceAdminForceLogoutResponse>(
        `/api/service-admin/members/users/${memberId}/force-logout`,
    );
    return response.data;
}

export async function precheckServiceAdminBulkSignup(
    request: ServiceAdminBulkSignupRequest,
) {
    const response = await api.post<ServiceAdminBulkSignupPrecheck>(
        "/api/service-admin/bulk-signups/precheck",
        request,
    );
    return response.data;
}

export async function createServiceAdminBulkSignup(
    request: ServiceAdminBulkSignupRequest,
) {
    const response = await api.post<ServiceAdminBulkSignupResult>(
        "/api/service-admin/bulk-signups",
        request,
    );
    return response.data;
}

export async function getServiceAdminPayments(
    params: ServiceAdminPaymentQuery,
) {
    const response = await api.get<ServiceAdminPaymentPage>(
        "/api/service-admin/payments",
        { params },
    );
    return response.data;
}

export async function refundServiceAdminPayment(
    historyId: number,
    reason: string,
) {
    const response = await api.patch<ServiceAdminPayment>(
        `/api/service-admin/payments/${historyId}/refund`,
        { reason },
    );
    return response.data;
}

export async function retryServiceAdminPayment(historyId: number) {
    const response = await api.patch<ServiceAdminPayment>(
        `/api/service-admin/payments/${historyId}/retry`,
    );
    return response.data;
}

export async function cancelServiceAdminScheduledPayment(historyId: number) {
    const response = await api.patch<ServiceAdminPayment>(
        `/api/service-admin/payments/${historyId}/cancel`,
    );
    return response.data;
}

export async function getServiceAdminOperationLogs(
    params: ServiceAdminOperationLogQuery,
) {
    const response = await api.get<ServiceAdminOperationLogPage>(
        "/api/service-admin/operation-logs",
        { params },
    );
    return response.data;
}

export async function getServiceAdminPlans() {
    const response = await api.get<ServiceAdminPlanResponse>(
        "/api/service-admin/plans",
    );
    return response.data;
}

export async function createServiceAdminPlan(payload: ServiceAdminPlanInput) {
    const response = await api.post<ServiceAdminPlan>(
        "/api/service-admin/plans",
        payload,
    );
    return response.data;
}

export async function updateServiceAdminPlan(
    planId: number,
    payload: ServiceAdminPlanInput,
) {
    const response = await api.patch<ServiceAdminPlan>(
        `/api/service-admin/plans/${planId}`,
        payload,
    );
    return response.data;
}

export async function changeServiceAdminPlanStatus(
    planId: number,
    status: ServiceAdminPlanStatus,
) {
    const response = await api.patch<ServiceAdminPlan>(
        `/api/service-admin/plans/${planId}/status`,
        { status },
    );
    return response.data;
}
