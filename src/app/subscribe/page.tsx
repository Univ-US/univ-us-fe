"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Building2,
  Check,
  CreditCard,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/apiError";
import {
  cancelSubscriptionPayment,
  getSubscriptionPaymentConfig,
  getSubscriptionPlans,
  prepareSubscription,
  verifySubscriptionPayment,
} from "@/lib/subscriptionApi";
import { loadPortOneSdk } from "@/lib/portone";
import { useAuthStore } from "@/store/authStore";
import type {
  SubscriptionPaymentVerifyResponse,
  SubscriptionPlan,
  SubscriptionPrepareRequest,
} from "@/types/subscription";

type SubscriptionAuthUpdater = (
  verification: SubscriptionPaymentVerifyResponse,
  univName: string,
) => void;

const initialForm: Omit<SubscriptionPrepareRequest, "planId"> = {
  univName: "",
  sido: "",
  address: "",
  schoolPhone: "",
  homepage: "",
};

function formatPrice(price: number) {
  return `${price.toLocaleString("ko-KR")}원`;
}

function formatBillingCycle(billingCycle: string) {
  switch (billingCycle.toUpperCase()) {
    case "MONTHLY":
      return "월";
    case "YEARLY":
      return "년";
    default:
      return billingCycle;
  }
}

function formatMemberLimit(maxMemberCount: number | null) {
  if (maxMemberCount == null) {
    return "회원 수 제한 없음";
  }

  return `최대 ${maxMemberCount.toLocaleString("ko-KR")}명`;
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return getApiErrorMessage(error, fallbackMessage);
}

export default function SubscribePage() {
  const router = useRouter();
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const role = useAuthStore((state) => state.role);
  const memberName = useAuthStore((state) => state.memberName);
  const applySubscriptionVerification = useAuthStore(
    (state) =>
      (
        state as typeof state & {
          applySubscriptionVerification: SubscriptionAuthUpdater;
        }
      ).applySubscriptionVerification,
  );

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [form, setForm] = useState(initialForm);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.planId === selectedPlanId) ?? null,
    [plans, selectedPlanId],
  );

  useEffect(() => {
    if (!isInitialized) return;

    if (!isLoggedIn) {
      router.replace("/login");
      return;
    }

    if (role === "ADM") {
      router.replace("/dashboard/school-admin");
      return;
    }

    if (role !== "GUEST") {
      router.replace("/landing");
    }
  }, [isInitialized, isLoggedIn, role, router]);

  useEffect(() => {
    let active = true;

    getSubscriptionPlans()
      .then((response) => {
        if (!active) return;

        setPlans(response);

        const planIdFromQuery = Number(
          new URLSearchParams(window.location.search).get("planId"),
        );
        const requestedPlan = response.find(
          (plan) => plan.planId === planIdFromQuery,
        );

        setSelectedPlanId(requestedPlan?.planId ?? response[0]?.planId ?? null);
      })
      .catch((requestError) => {
        if (!active) return;
        setError(
          getApiErrorMessage(
            requestError,
            "구독 플랜을 불러오지 못했습니다.",
          ),
        );
      })
      .finally(() => {
        if (active) {
          setLoadingPlans(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const updateForm = (
    field: keyof typeof initialForm,
    value: string,
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const closePreparedPayment = async (
    merchantUid: string,
    reason: string,
  ) => {
    try {
      await cancelSubscriptionPayment({
        merchantUid,
        reason: reason.slice(0, 500),
      });
    } catch {
      // 결제창 오류 메시지를 우선 노출하고, 정리 실패는 서버 로그로 확인합니다.
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedPlan) {
      setError("구독 플랜을 선택해주세요.");
      return;
    }

    setSubmitting(true);
    setError(null);

    let merchantUid: string | null = null;
    let verificationStarted = false;

    try {
      const prepareResponse = await prepareSubscription({
        planId: selectedPlan.planId,
        univName: form.univName.trim(),
        sido: form.sido.trim(),
        address: form.address.trim(),
        schoolPhone: form.schoolPhone.trim(),
        homepage: form.homepage.trim(),
      });
      merchantUid = prepareResponse.merchantUid;

      const { storeId, channelKey } =
        await getSubscriptionPaymentConfig();

      if (!storeId || !channelKey) {
        throw new Error("구독 결제 설정이 누락되었습니다.");
      }

      const portOne = await loadPortOneSdk();
      const payment = await portOne.requestPayment({
        storeId,
        channelKey,
        paymentId: prepareResponse.merchantUid,
        orderName: `UnivUs ${prepareResponse.planName} 구독`,
        totalAmount: prepareResponse.amount,
        currency: "CURRENCY_KRW",
        payMethod: "EASY_PAY",
        customer: {
          fullName: memberName ?? undefined,
        },
      });

      if (payment.code) {
        const reason = payment.message || payment.code;
        await closePreparedPayment(prepareResponse.merchantUid, reason);
        setError(payment.message || "결제가 취소되었습니다.");
        return;
      }

      if (!payment.paymentId) {
        await closePreparedPayment(
          prepareResponse.merchantUid,
          "PORTONE_PAYMENT_ID_MISSING",
        );
        setError("PortOne 결제 ID를 확인할 수 없습니다.");
        return;
      }

      verificationStarted = true;
      const verification = await verifySubscriptionPayment({
        merchantUid: prepareResponse.merchantUid,
        portonePaymentId: payment.paymentId,
      });

      applySubscriptionVerification(verification, form.univName.trim());
      router.replace("/dashboard/school-admin");
    } catch (requestError) {
      if (merchantUid && !verificationStarted) {
        await closePreparedPayment(
          merchantUid,
          getErrorMessage(requestError, "PAYMENT_REQUEST_FAILED"),
        );
      }

      setError(
        getErrorMessage(
          requestError,
          verificationStarted
            ? "결제 검증에 실패했습니다."
            : "구독 결제를 시작하지 못했습니다.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (
    !isInitialized ||
    !isLoggedIn ||
    role !== "GUEST"
  ) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950">
      <div className="mx-auto max-w-[1080px]">
        <Link
          href="/landing"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          홈으로 돌아가기
        </Link>

        <div className="mt-6">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CreditCard className="size-5" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight">구독 신청</h1>
              <p className="mt-1 text-sm text-slate-500">
                플랜과 학교 정보를 확인한 뒤 결제를 진행해주세요.
              </p>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-8 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]"
        >
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <CreditCard className="size-4 text-primary" />
                <h2 className="font-black">플랜 선택</h2>
              </div>

              {loadingPlans ? (
                <div className="flex h-36 items-center justify-center text-slate-400">
                  <LoaderCircle className="size-5 animate-spin" />
                </div>
              ) : plans.length === 0 ? (
                <p className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">
                  현재 신청 가능한 구독 플랜이 없습니다.
                </p>
              ) : (
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {plans.map((plan) => {
                    const selected = plan.planId === selectedPlanId;

                    return (
                      <button
                        key={plan.planId}
                        type="button"
                        onClick={() => setSelectedPlanId(plan.planId)}
                        className={`rounded-xl border p-5 text-left transition ${
                          selected
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-slate-200 hover:border-primary/40"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-lg font-black">
                              {plan.planName}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {formatMemberLimit(plan.maxMemberCount)}
                            </p>
                          </div>
                          {selected && (
                            <span className="flex size-6 items-center justify-center rounded-full bg-primary text-white">
                              <Check className="size-4" />
                            </span>
                          )}
                        </div>
                        <p className="mt-5 text-2xl font-black">
                          {formatPrice(plan.price)}
                          <span className="ml-1 text-sm text-slate-500">
                            / {formatBillingCycle(plan.billingCycle)}
                          </span>
                        </p>
                        {plan.description && (
                          <p className="mt-3 text-sm leading-6 text-slate-500">
                            {plan.description}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <Building2 className="size-4 text-primary" />
                <h2 className="font-black">학교 정보</h2>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                결제 성공 후 입력한 정보로 학교가 생성됩니다.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="text-sm font-bold">
                  학교명
                  <input
                    required
                    value={form.univName}
                    onChange={(event) =>
                      updateForm("univName", event.target.value)
                    }
                    placeholder="예: UnivUs대학교"
                    className="mt-2 h-11 w-full rounded-lg border border-input px-3.5 font-normal outline-none focus:border-primary"
                  />
                </label>

                <label className="text-sm font-bold">
                  시도
                  <input
                    required
                    value={form.sido}
                    onChange={(event) =>
                      updateForm("sido", event.target.value)
                    }
                    placeholder="예: 서울특별시"
                    className="mt-2 h-11 w-full rounded-lg border border-input px-3.5 font-normal outline-none focus:border-primary"
                  />
                </label>

                <label className="text-sm font-bold md:col-span-2">
                  주소
                  <input
                    required
                    value={form.address}
                    onChange={(event) =>
                      updateForm("address", event.target.value)
                    }
                    placeholder="학교 주소를 입력해주세요."
                    className="mt-2 h-11 w-full rounded-lg border border-input px-3.5 font-normal outline-none focus:border-primary"
                  />
                </label>

                <label className="text-sm font-bold">
                  대표 전화번호
                  <input
                    required
                    value={form.schoolPhone}
                    onChange={(event) =>
                      updateForm("schoolPhone", event.target.value)
                    }
                    placeholder="02-1234-5678"
                    className="mt-2 h-11 w-full rounded-lg border border-input px-3.5 font-normal outline-none focus:border-primary"
                  />
                </label>

                <label className="text-sm font-bold">
                  홈페이지
                  <input
                    required
                    type="url"
                    value={form.homepage}
                    onChange={(event) =>
                      updateForm("homepage", event.target.value)
                    }
                    placeholder="https://www.example.ac.kr"
                    className="mt-2 h-11 w-full rounded-lg border border-input px-3.5 font-normal outline-none focus:border-primary"
                  />
                </label>
              </div>
            </section>
          </div>

          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-6">
            <h2 className="text-lg font-black">결제 정보</h2>

            {selectedPlan ? (
              <div className="mt-5 space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">선택 플랜</span>
                  <span className="font-black">{selectedPlan.planName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">결제 주기</span>
                  <span className="font-black">
                    {formatBillingCycle(selectedPlan.billingCycle)}
                  </span>
                </div>
                <div className="border-t border-slate-200 pt-4">
                  <div className="flex items-end justify-between">
                    <span className="text-sm font-bold">총 결제 금액</span>
                    <span className="text-2xl font-black text-primary">
                      {formatPrice(selectedPlan.price)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-5 text-sm text-slate-400">
                플랜을 선택해주세요.
              </p>
            )}

            <div className="mt-6 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-500">
              <div className="flex items-center gap-2 font-black text-slate-700">
                <ShieldCheck className="size-4 text-primary" />
                안전한 결제
              </div>
              <p className="mt-2">
                결제 정보는 PortOne 결제창에서 처리되며, 결제 검증이 완료된
                뒤에만 학교와 관리자 권한이 생성됩니다.
              </p>
            </div>

            {error && (
              <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={
                submitting ||
                loadingPlans ||
                !selectedPlan ||
                plans.length === 0
              }
              className="mt-5 h-12 w-full text-base font-black"
            >
              {submitting ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  결제 진행 중
                </>
              ) : (
                "결제하기"
              )}
            </Button>
          </aside>
        </form>
      </div>
    </main>
  );
}
