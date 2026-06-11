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
  univName: string;
  sido: string;
  address: string;
  schoolPhone: string;
  homepage: string;
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
  accessToken: string;
  tokenType: "Bearer";
}

export interface SubscriptionPaymentCancelRequest {
  merchantUid: string;
  reason: string;
}
