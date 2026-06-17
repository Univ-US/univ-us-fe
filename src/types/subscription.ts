export interface SubscriptionPlan {
  planId: number;
  planName: string;
  price: number;
  description: string | null;
  billingCycle: string;
  maxMemberCount: number | null;
}

export interface SubscriptionPaymentConfig {
  storeId: string;
  channelKey: string;
  cardBillingChannelKey: string;
  kakaoBillingChannelKey: string;
}

export type SubscriptionPaymentMethod = "CARD" | "KAKAO_PAY";

export interface SubscriptionPrepareRequest {
  planId: number;
  univId?: number;
  univName: string;
  sido: string;
  address: string;
  schoolPhone: string;
  homepage: string;
}

export interface SubscriptionUniversityOption {
  univId: number;
  univName: string;
  sido: string;
  address: string;
  schoolPhone: string;
  homepage: string;
  subscriptionStatus: string | null;
}

export interface SubscriptionPrepareResponse {
  subscriptionId: number;
  paymentHistoryId: number;
  merchantUid: string;
  amount: number;
  planId: number;
  planName: string;
}

export interface SubscriptionPaymentVerifyRequest {
  merchantUid: string;
  portonePaymentId: string;
}

export interface SubscriptionBillingPaymentRequest {
  merchantUid: string;
  billingKey: string;
  paymentMethod: SubscriptionPaymentMethod;
}

export interface SubscriptionPaymentVerifyResponse {
  subscriptionId: number;
  paymentHistoryId: number;
  portonePaymentId: string;
  merchantUid: string;
  amount: number;
  paymentStatus: "PAID";
  subscriptionStatus: "ACTIVE";
  paidAt: string;
  nextBillingAt: string;
  memberId: number;
  univId: number;
  role: "ADM";
}

export interface SubscriptionPaymentCancelRequest {
  merchantUid: string;
  reason: string;
}

export type SubscriptionAccessState =
  | "ACTIVE"
  | "CANCEL_SCHEDULED"
  | "PENDING"
  | "EXPIRED"
  | "UNSUBSCRIBED";

export interface SubscriptionAccessStatus {
  memberId: number;
  role: string;
  univId: number | null;
  univName: string | null;
  sido: string | null;
  address: string | null;
  schoolPhone: string | null;
  homepage: string | null;
  subscriptionId: number | null;
  subscriptionStatus: string | null;
  pendingAction: string | null;
  cancellationEffectiveAt: string | null;
  endedAt: string | null;
  accessStatus: SubscriptionAccessState;
  serviceAccessible: boolean;
  resubscribeAvailable: boolean;
  planId: number | null;
  planName: string | null;
  price: number | null;
  billingCycle: string | null;
}

export interface SubscriptionPaymentMethodInfo {
  registered: boolean;
  paymentMethodType: SubscriptionPaymentMethod | null;
  maskedCardNumber: string | null;
  cardIssuer: string | null;
  status: string | null;
}

export type SubscriptionPaymentHistoryStatus =
  | "READY"
  | "PAID"
  | "FAILED"
  | "CANCELED"
  | "REFUNDED";

export type SubscriptionPaymentType = "INITIAL" | "RECURRING";

export interface SubscriptionPaymentHistory {
  historyId: number;
  planName: string | null;
  billingCycle: string | null;
  amount: number;
  status: SubscriptionPaymentHistoryStatus;
  paymentMethod: SubscriptionPaymentMethod;
  paymentType: SubscriptionPaymentType;
  createdAt: string;
  paidAt: string | null;
  failReason: string | null;
  nextBillingAt: string | null;
  refundedAt: string | null;
  refundAmount: number | null;
}
