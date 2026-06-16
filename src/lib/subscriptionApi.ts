import api from "@/lib/api";
import type {
  SubscriptionBillingPaymentRequest,
  SubscriptionAccessStatus,
  SubscriptionPaymentCancelRequest,
  SubscriptionPaymentConfig,
  SubscriptionPaymentVerifyRequest,
  SubscriptionPaymentVerifyResponse,
  SubscriptionPlan,
  SubscriptionPrepareRequest,
  SubscriptionPrepareResponse,
  SubscriptionUniversityOption,
} from "@/types/subscription";

export async function getSubscriptionStatus() {
  const response = await api.get<SubscriptionAccessStatus>(
    "/api/subscriptions/status",
  );
  return response.data;
}

export async function getSubscriptionPlans() {
  const response = await api.get<SubscriptionPlan[]>("/api/subscriptions/plans");
  return response.data;
}

export async function getSubscriptionUniversities(keyword?: string) {
  const response = await api.get<SubscriptionUniversityOption[]>(
    "/api/subscriptions/universities",
    { params: keyword?.trim() ? { keyword: keyword.trim() } : undefined },
  );
  return response.data;
}

export async function getSubscriptionPaymentConfig() {
  const response = await api.get<SubscriptionPaymentConfig>(
    "/api/subscriptions/payments/config",
  );
  return response.data;
}

export async function prepareSubscription(payload: SubscriptionPrepareRequest) {
  const response = await api.post<SubscriptionPrepareResponse>(
    "/api/subscriptions/prepare",
    payload,
  );
  return response.data;
}

export async function verifySubscriptionPayment(
  payload: SubscriptionPaymentVerifyRequest,
) {
  const response = await api.post<SubscriptionPaymentVerifyResponse>(
    "/api/subscriptions/payments/verify",
    payload,
  );
  return response.data;
}

export async function completeSubscriptionBillingPayment(
  payload: SubscriptionBillingPaymentRequest,
) {
  const response = await api.post<SubscriptionPaymentVerifyResponse>(
    "/api/subscriptions/payments/billing",
    payload,
  );
  return response.data;
}

export async function cancelSubscriptionPayment(
  payload: SubscriptionPaymentCancelRequest,
) {
  await api.post("/api/subscriptions/payments/cancel", payload);
}
