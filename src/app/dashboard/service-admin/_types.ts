export type ServiceAdminView =
    | "dashboard"
    | "schools"
    | "schoolDetail"
    | "members"
    | "payments"
    | "lectureCodes";

export type SubscriptionPlan = "Basic" | "Pro" | "Enterprise";
export type SubscriptionStatus = "ACTIVE" | "PAST_DUE" | "PENDING" | "CANCELED" | "UNSUBSCRIBED";
export type PaymentStatus = "PAID" | "READY" | "FAILED" | "CANCELED" | "NONE";

export interface ServiceSchool {
    id: number;
    name: string;
    category: string;
    address: string;
    phone: string;
    adminName: string;
    adminEmail: string;
    plan: SubscriptionPlan | null;
    subscriptionStatus: SubscriptionStatus;
    firstSubscribedAt: string | null;
    subscriptionEndedAt: string | null;
    memberCount: number;
    monthlyRevenue: number;
    nextBillingAt: string;
    paymentStatus: PaymentStatus;
    joinedAt: string;
    portoneCustomerId: string | null;
}

export type MemberRole = "STU" | "PROF" | "ADM";
export type MemberStatus = "ACTIVE" | "SUSPENDED" | "WITHDRAWN";

export interface ServiceMember {
    id: number;
    schoolId: number;
    name: string;
    loginId: string;
    email: string;
    phone: string;
    role: MemberRole;
    department: string;
    status: MemberStatus;
    joinedAt: string;
    lastLoginAt: string;
}

export type AdminPaymentStatus =
    | "PAID"
    | "PENDING"
    | "FAILED"
    | "CANCELED"
    | "REFUNDED";
export type AdminPaymentMethod = "CARD" | "TRANSFER" | "VIRTUAL_ACCOUNT";
export type AdminPaymentType = "INITIAL" | "RECURRING";

export interface ServicePayment {
    id: number;
    schoolId: number;
    merchantUid: string;
    portonePaymentId: string | null;
    plan: SubscriptionPlan;
    amount: number;
    method: AdminPaymentMethod;
    type: AdminPaymentType;
    status: AdminPaymentStatus;
    requestedAt: string;
    paidAt: string | null;
    billingPeriod: string;
    cardName: string | null;
    cardLast4: string | null;
    failureReason: string | null;
}

export interface MemberCommunityActivity {
    id: number;
    type: "POST" | "COMMENT";
    board: string;
    title: string;
    createdAt: string;
    status: "VISIBLE" | "DELETED";
}

export interface MemberAccessLog {
    id: number;
    type: "LOGIN" | "LOGOUT" | "LOGIN_FAILED";
    occurredAt: string;
    device: string;
    ipAddress: string;
}

export interface MemberCourseActivity {
    id: number;
    courseName: string;
    professorName: string;
    semester: string;
    progress: number;
    status: "IN_PROGRESS" | "COMPLETED" | "TEACHING";
}

export interface MemberSubmissionActivity {
    id: number;
    courseName: string;
    assignmentName: string;
    fileName: string;
    fileSize: string;
    submittedAt: string;
    status: "SUBMITTED" | "LATE" | "RETURNED";
}

export type SeatReservationStatus =
    | "RESERVED"
    | "COMPLETED"
    | "CANCELED"
    | "NO_SHOW";
export type ReservationPenaltyStatus = "ACTIVE" | "EXPIRED" | "CANCELED";

export interface MemberSeatReservation {
    id: number;
    roomName: string;
    seatNumber: string;
    startTime: string;
    endTime: string;
    status: SeatReservationStatus;
}

export interface MemberReservationPenalty {
    id: number;
    type: "NO_SHOW" | "MANUAL";
    reason: string;
    startTime: string;
    endTime: string;
    status: ReservationPenaltyStatus;
    createdAt: string;
}

export interface MemberReservationSummary {
    noShowCount: number;
    restrictionThreshold: number;
    isRestricted: boolean;
    restrictedUntil: string | null;
    reservations: MemberSeatReservation[];
    penalties: MemberReservationPenalty[];
}

export interface MemberActivitySummary {
    community: MemberCommunityActivity[];
    accessLogs: MemberAccessLog[];
    courses: MemberCourseActivity[];
    submissions: MemberSubmissionActivity[];
}
