"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
    BILLING_CYCLE_LABEL,
    changeSubscriptionPlan,
    getSubscriptionPaymentHistory,
    getSubscriptionPaymentMethod,
    getSubscriptionPlans,
    getSubscriptionStatus,
    revertSubscriptionCancellation,
    scheduleSubscriptionCancellation,
    SUBSCRIPTION_ACCESS_LABEL,
} from "@/lib/subscriptionApi";
import type {
    SubscriptionAccessStatus,
    SubscriptionPaymentHistory,
    SubscriptionPaymentHistoryStatus,
    SubscriptionPaymentMethodInfo,
    SubscriptionPlan,
} from "@/types/subscription";

const PAYMENT_STATUS_LABEL: Record<SubscriptionPaymentHistoryStatus, string> = {
    READY: "결제 대기",
    PAID: "결제 완료",
    FAILED: "결제 실패",
    CANCELED: "취소됨",
    REFUNDED: "환불됨",
};

const PAYMENT_STATUS_STYLE: Record<SubscriptionPaymentHistoryStatus, string> = {
    READY: "bg-slate-100 text-slate-600",
    PAID: "bg-primary/10 text-primary",
    FAILED: "bg-red-100 text-red-700",
    CANCELED: "bg-slate-100 text-slate-500",
    REFUNDED: "bg-amber-100 text-amber-700",
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
    CARD: "카드",
    KAKAO_PAY: "카카오페이",
};

function formatDate(iso: string | null) {
    if (!iso) return null;
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default function BillingView({ onNavigate }: { onNavigate: (view: string) => void }) {
    const [status, setStatus] = useState<SubscriptionAccessStatus | null>(null);
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [paymentMethod, setPaymentMethod] = useState<SubscriptionPaymentMethodInfo | null>(null);
    const [paymentHistory, setPaymentHistory] = useState<SubscriptionPaymentHistory[]>([]);
    const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const load = () => {
        setLoading(true);
        setError(null);
        Promise.all([
            getSubscriptionStatus(),
            getSubscriptionPlans(),
            getSubscriptionPaymentMethod(),
            getSubscriptionPaymentHistory(),
        ])
            .then(([statusData, plansData, paymentMethodData, paymentHistoryData]) => {
                setStatus(statusData);
                setPlans(plansData);
                setPaymentMethod(paymentMethodData);
                setPaymentHistory(paymentHistoryData);
                setSelectedPlanId(
                    statusData.pendingAction === "PLAN_CHANGE"
                        ? statusData.pendingPlanId ??
                              plansData.find((p) => p.planName === statusData.pendingPlanName)?.planId ??
                              statusData.planId
                        : statusData.planId,
                );
            })
            .catch((e) => {
                const message = axios.isAxiosError(e) ? e.response?.data?.message : null;
                setError(message ?? "구독 정보를 불러오지 못했습니다.");
            })
            .finally(() => setLoading(false));
    };

    useEffect(load, []);

    const canManageSubscription =
        status?.accessStatus === "ACTIVE" && status.pendingAction !== "CANCEL";
    const paidPaymentHistory = paymentHistory.filter((h) => h.status === "PAID");
    const effectivePlanId =
        status?.pendingAction === "PLAN_CHANGE"
            ? status.pendingPlanId ??
              plans.find((p) => p.planName === status.pendingPlanName)?.planId ??
              status.planId
            : status?.planId ?? null;

    const handlePlanChange = async () => {
        if (!status || selectedPlanId == null || selectedPlanId === effectivePlanId) return;
        const plan = plans.find((p) => p.planId === selectedPlanId);
        if (!plan) return;
        if (
            !window.confirm(
                `${plan.planName} 플랜으로 변경하시겠습니까?\n변경 사항은 다음 결제부터 적용됩니다.`,
            )
        ) {
            return;
        }

        setSaving(true);
        setActionError(null);
        try {
            setStatus(await changeSubscriptionPlan(plan.planId));
        } catch (e) {
            const message = axios.isAxiosError(e) ? e.response?.data?.message : null;
            setActionError(message ?? "플랜을 변경하지 못했습니다.");
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = async () => {
        if (!status?.nextBillingAt) return;
        if (
            !window.confirm(
                `구독을 취소하시겠습니까?\n${formatDate(status.nextBillingAt)}까지 서비스가 유지되고 이후 종료됩니다.`,
            )
        ) {
            return;
        }

        setSaving(true);
        setActionError(null);
        try {
            setStatus(await scheduleSubscriptionCancellation());
        } catch (e) {
            const message = axios.isAxiosError(e) ? e.response?.data?.message : null;
            setActionError(message ?? "구독 취소를 예약하지 못했습니다.");
        } finally {
            setSaving(false);
        }
    };

    const handleRevertCancel = async () => {
        if (!window.confirm("구독 취소 예약을 철회하시겠습니까?\n다음 결제부터 정상적으로 구독이 계속됩니다.")) {
            return;
        }

        setSaving(true);
        setActionError(null);
        try {
            setStatus(await revertSubscriptionCancellation());
        } catch (e) {
            const message = axios.isAxiosError(e) ? e.response?.data?.message : null;
            setActionError(message ?? "구독 취소 철회에 실패했습니다.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-2xl font-black tracking-tight">구독·결제</h1>
                <p className="mt-1 text-sm text-slate-500">현재 구독 상태와 결제 정보를 확인합니다.</p>
            </div>

            {loading ? (
                <p className="text-sm text-slate-400">불러오는 중...</p>
            ) : error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
                    <p>{error}</p>
                    <button onClick={load} className="mt-2 font-bold underline">다시 시도</button>
                </div>
            ) : (
                <>
                    <div className="grid gap-5 md:grid-cols-2">
                        <section className="rounded-xl bg-[var(--primary)] p-6 text-white shadow-sm">
                            <div className="flex items-center justify-between">
                                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-extrabold">
                                    {status ? SUBSCRIPTION_ACCESS_LABEL[status.accessStatus] : "상태 확인 불가"}
                                </span>
                                {status?.planName && (
                                    <span className="text-xs font-bold text-primary-foreground">
                                        {status.planName}
                                        {status.billingCycle ? ` · ${BILLING_CYCLE_LABEL[status.billingCycle] ?? status.billingCycle}` : ""}
                                    </span>
                                )}
                            </div>
                            <p className="mt-5 text-2xl font-black">{status?.univName ?? "—"}</p>
                            {status?.price != null && (
                                <p className="mt-1 text-sm text-primary-foreground">
                                    {status.price.toLocaleString()}원
                                    {status.billingCycle === "MONTHLY" ? " / 월" : status.billingCycle === "YEARLY" ? " / 년" : ""}
                                </p>
                            )}
                            {status?.pendingAction !== "CANCEL" && status?.nextBillingAt && (
                                <p className="mt-1 text-xs text-white/80">
                                    결제 예정일 · {formatDate(status.nextBillingAt)}
                                </p>
                            )}
                            <div className="mt-4 space-y-1 text-sm text-primary-foreground">
                                <p>{status?.address ?? "주소 정보 없음"}</p>
                                <p>{status?.schoolPhone ?? "전화번호 정보 없음"}</p>
                            </div>

                            {status?.pendingAction === "CANCEL" && status.cancellationEffectiveAt && (
                                <p className="mt-4 rounded-lg bg-white/10 px-3 py-2 text-xs">
                                    해지가 예약되어 있습니다 · {formatDate(status.cancellationEffectiveAt)}부터 서비스가 종료됩니다.
                                </p>
                            )}
                            {status?.accessStatus === "EXPIRED" && status.endedAt && (
                                <p className="mt-4 rounded-lg bg-white/10 px-3 py-2 text-xs">
                                    {formatDate(status.endedAt)} 구독이 종료되었습니다.
                                </p>
                            )}

                            <button
                                onClick={() => onNavigate("chat")}
                                className="mt-5 rounded-full border border-white/30 px-4 py-2 text-xs font-black hover:bg-white/10"
                            >
                                문의하기
                            </button>
                        </section>

                        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h2 className="font-black">결제 수단</h2>
                            {paymentMethod?.registered ? (
                                <div className="mt-4 rounded-xl bg-slate-50 p-4">
                                    <p className="text-sm font-black">
                                        {paymentMethod.cardIssuer ?? (paymentMethod.paymentMethodType ? PAYMENT_METHOD_LABEL[paymentMethod.paymentMethodType] ?? paymentMethod.paymentMethodType : "—")}
                                        {paymentMethod.maskedCardNumber ? ` (${paymentMethod.maskedCardNumber})` : ""}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                        자동 갱신{paymentMethod.status ? ` · ${paymentMethod.status}` : ""}
                                    </p>
                                </div>
                            ) : (
                                <div className="mt-4 rounded-xl bg-slate-50 p-4">
                                    <p className="text-sm text-slate-400">등록된 결제 수단이 없습니다.</p>
                                </div>
                            )}
                        </section>
                    </div>

                    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h2 className="font-black">플랜 변경</h2>
                            <p className="text-xs text-slate-400">변경한 플랜은 다음 결제부터 적용됩니다.</p>
                        </div>

                        {actionError && (
                            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                                {actionError}
                            </p>
                        )}

                        {status?.pendingAction === "PLAN_CHANGE" && status.pendingPlanName && (
                            <p className="mt-3 rounded-lg bg-sky-50 px-3 py-2 text-xs font-bold text-sky-700">
                                결제 예정일{status.nextBillingAt ? ` · ${formatDate(status.nextBillingAt)}` : ""}부터{" "}
                                {status.pendingPlanName} 플랜으로 변경됩니다.
                            </p>
                        )}
                        {status?.pendingAction === "CANCEL" && (
                            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
                                구독 취소가 예약되어 있어 플랜을 변경할 수 없습니다.
                            </p>
                        )}

                        {plans.length === 0 ? (
                            <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-400">
                                선택 가능한 플랜이 없습니다.
                            </p>
                        ) : (
                            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {plans.map((plan) => {
                                    const selected = plan.planId === selectedPlanId;
                                    const isCurrent = plan.planId === status?.planId;
                                    const isPending =
                                        status?.pendingAction === "PLAN_CHANGE" && plan.planId === effectivePlanId;

                                    return (
                                        <button
                                            key={plan.planId}
                                            type="button"
                                            disabled={!canManageSubscription}
                                            onClick={() => setSelectedPlanId(plan.planId)}
                                            className={`rounded-xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                                selected
                                                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                                                    : "border-slate-200 hover:border-primary/40"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="font-black">{plan.planName}</p>
                                                {isCurrent && (
                                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-500">
                                                        현재 플랜
                                                    </span>
                                                )}
                                                {isPending && (
                                                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-extrabold text-sky-700">
                                                        변경 예정
                                                    </span>
                                                )}
                                            </div>
                                            <p className="mt-2 text-lg font-black">
                                                {plan.price.toLocaleString()}원
                                                <span className="ml-1 text-xs font-bold text-slate-400">
                                                    / {BILLING_CYCLE_LABEL[plan.billingCycle] ?? plan.billingCycle}
                                                </span>
                                            </p>
                                            {plan.description && (
                                                <p className="mt-2 text-xs text-slate-500">{plan.description}</p>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                            <button
                                onClick={() => void handlePlanChange()}
                                disabled={
                                    !canManageSubscription ||
                                    saving ||
                                    selectedPlanId == null ||
                                    selectedPlanId === effectivePlanId
                                }
                                className="h-10 rounded-lg bg-primary px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                            >
                                {saving ? "처리 중" : "플랜 변경"}
                            </button>

                            {status?.pendingAction === "CANCEL" ? (
                                <button
                                    onClick={() => void handleRevertCancel()}
                                    disabled={saving}
                                    className="text-xs font-medium text-primary underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:text-slate-300"
                                >
                                    구독 취소 철회
                                </button>
                            ) : (
                                <button
                                    onClick={() => void handleCancel()}
                                    disabled={!canManageSubscription || saving || !status?.nextBillingAt}
                                    className="text-xs font-medium text-slate-400 underline-offset-2 hover:text-rose-500 hover:underline disabled:cursor-not-allowed disabled:text-slate-300"
                                >
                                    구독 취소
                                </button>
                            )}
                        </div>
                    </section>

                    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-100 px-5 py-4">
                            <h2 className="font-black">결제 내역</h2>
                        </div>
                        {paidPaymentHistory.length === 0 ? (
                            <p className="px-5 py-8 text-center text-sm text-slate-400">결제 내역이 없습니다.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[520px] text-left text-sm">
                                    <thead className="bg-slate-50 text-xs font-extrabold text-slate-500">
                                        <tr>
                                            <th className="px-5 py-3">결제일</th>
                                            <th className="px-5 py-3">플랜</th>
                                            <th className="px-5 py-3">금액</th>
                                            <th className="px-5 py-3">상태</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {paidPaymentHistory.map((h) => (
                                            <tr key={h.historyId} className="font-semibold text-slate-700">
                                                <td className="px-5 py-3 text-slate-500">{formatDate(h.paidAt ?? h.createdAt)}</td>
                                                <td className="px-5 py-3">{h.planName ?? "—"}</td>
                                                <td className="px-5 py-3">{h.amount.toLocaleString()}원</td>
                                                <td className="px-5 py-3">
                                                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${PAYMENT_STATUS_STYLE[h.status]}`}>
                                                        {PAYMENT_STATUS_LABEL[h.status]}
                                                    </span>
                                                    {h.status === "FAILED" && h.failReason && (
                                                        <p className="mt-0.5 text-xs text-slate-400">{h.failReason}</p>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </>
            )}
        </div>
    );
}
