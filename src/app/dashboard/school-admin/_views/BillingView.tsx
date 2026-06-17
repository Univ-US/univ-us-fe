"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
    BILLING_CYCLE_LABEL,
    getSubscriptionPaymentHistory,
    getSubscriptionPaymentMethod,
    getSubscriptionStatus,
    SUBSCRIPTION_ACCESS_LABEL,
} from "@/lib/subscriptionApi";
import type {
    SubscriptionAccessStatus,
    SubscriptionPaymentHistory,
    SubscriptionPaymentHistoryStatus,
    SubscriptionPaymentMethodInfo,
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
    PAID: "bg-emerald-100 text-emerald-700",
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
    const [paymentMethod, setPaymentMethod] = useState<SubscriptionPaymentMethodInfo | null>(null);
    const [paymentHistory, setPaymentHistory] = useState<SubscriptionPaymentHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = () => {
        setLoading(true);
        setError(null);
        Promise.all([
            getSubscriptionStatus(),
            getSubscriptionPaymentMethod(),
            getSubscriptionPaymentHistory(),
        ])
            .then(([statusData, paymentMethodData, paymentHistoryData]) => {
                setStatus(statusData);
                setPaymentMethod(paymentMethodData);
                setPaymentHistory(paymentHistoryData);
            })
            .catch((e) => {
                const message = axios.isAxiosError(e) ? e.response?.data?.message : null;
                setError(message ?? "구독 정보를 불러오지 못했습니다.");
            })
            .finally(() => setLoading(false));
    };

    useEffect(load, []);

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-2xl font-black tracking-tight">구독·결제</h1>
                <p className="mt-1 text-sm text-slate-500">현재 구독 상태와 결제 정보를 확인합니다.</p>
            </div>

            {loading ? (
                <p className="text-sm text-slate-400">불러오는 중...</p>
            ) : error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
                    <p>{error}</p>
                    <button onClick={load} className="mt-2 font-bold underline">다시 시도</button>
                </div>
            ) : (
                <>
                    <div className="grid gap-5 md:grid-cols-2">
                        <section className="rounded-2xl bg-[#064b35] p-6 text-white shadow-sm">
                            <div className="flex items-center justify-between">
                                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-extrabold">
                                    {status ? SUBSCRIPTION_ACCESS_LABEL[status.accessStatus] : "상태 확인 불가"}
                                </span>
                                {status?.planName && (
                                    <span className="text-xs font-bold text-emerald-100">
                                        {status.planName}
                                        {status.billingCycle ? ` · ${BILLING_CYCLE_LABEL[status.billingCycle] ?? status.billingCycle}` : ""}
                                    </span>
                                )}
                            </div>
                            <p className="mt-5 text-2xl font-black">{status?.univName ?? "—"}</p>
                            {status?.price != null && (
                                <p className="mt-1 text-sm text-emerald-100">
                                    {status.price.toLocaleString()}원
                                    {status.billingCycle === "MONTHLY" ? " / 월" : status.billingCycle === "YEARLY" ? " / 년" : ""}
                                </p>
                            )}
                            <div className="mt-4 space-y-1 text-sm text-emerald-100">
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
                                플랜 변경 문의
                            </button>
                        </section>

                        <section className="rounded-2xl border border-emerald-900/10 bg-white p-6 shadow-sm">
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

                    <section className="overflow-hidden rounded-2xl border border-emerald-900/10 bg-white shadow-sm">
                        <div className="border-b border-slate-100 px-5 py-4">
                            <h2 className="font-black">결제 내역</h2>
                        </div>
                        {paymentHistory.length === 0 ? (
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
                                        {paymentHistory.map((h) => (
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
