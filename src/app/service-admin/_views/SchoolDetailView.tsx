"use client";

import { useCallback, useEffect, useState } from "react";
import {
    AlertTriangle,
    ArrowLeft,
    Building2,
    CalendarClock,
    CreditCard,
    RefreshCw,
    ShieldCheck,
    UsersRound,
} from "lucide-react";
import {
    changeServiceAdminSchoolPlan,
    getServiceAdminSchool,
    scheduleServiceAdminSchoolCancellation,
    type ServiceAdminSchool,
} from "@/lib/serviceAdminApi";
import { getSubscriptionPlans } from "@/lib/subscriptionApi";
import type { SubscriptionPlan } from "@/types/subscription";
import {
    formatCurrency,
    PaymentBadge,
    PendingActionBadge,
    SubscriptionBadge,
} from "../_components";

interface SchoolDetailViewProps {
    schoolId: number;
    onBack: () => void;
}

function formatDate(value: string | null) {
    return value ? new Date(value).toLocaleDateString("ko-KR") : "-";
}

function formatDateTime(value: string | null) {
    return value ? new Date(value).toLocaleString("ko-KR") : "로그인 기록 없음";
}

export default function SchoolDetailView({
    schoolId,
    onBack,
}: SchoolDetailViewProps) {
    const [school, setSchool] = useState<ServiceAdminSchool | null>(null);
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [selectedPlanId, setSelectedPlanId] = useState<number | "">("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const loadSchool = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const [schoolResponse, planResponse] = await Promise.all([
                getServiceAdminSchool(schoolId),
                getSubscriptionPlans(),
            ]);
            setSchool(schoolResponse);
            setPlans(planResponse);
            setSelectedPlanId(schoolResponse.planId ?? "");
        } catch (loadError) {
            console.error("Failed to load service admin school.", loadError);
            setError("학교 상세 정보를 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    }, [schoolId]);

    useEffect(() => {
        void loadSchool();
    }, [loadSchool]);

    const handlePlanChange = async () => {
        if (!school || selectedPlanId === "" || selectedPlanId === school.planId) return;
        const plan = plans.find((candidate) => candidate.planId === selectedPlanId);
        if (!plan) return;
        if (
            !window.confirm(
                `${school.univName}의 플랜을 ${plan.planName}(으)로 변경하시겠습니까?\n변경 금액은 다음 결제부터 적용됩니다.`,
            )
        ) {
            return;
        }

        setSaving(true);
        setError("");
        try {
            setSchool(await changeServiceAdminSchoolPlan(school.univId, plan.planId));
        } catch (changeError) {
            console.error("Failed to change service admin school plan.", changeError);
            setError("플랜을 변경하지 못했습니다.");
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = async () => {
        if (!school || !school.nextBillingAt) return;
        if (
            !window.confirm(
                `${school.univName}의 구독을 취소하시겠습니까?\n${formatDate(school.nextBillingAt)}까지 서비스가 유지되고 이후 종료됩니다.`,
            )
        ) {
            return;
        }

        setSaving(true);
        setError("");
        try {
            setSchool(await scheduleServiceAdminSchoolCancellation(school.univId));
        } catch (cancelError) {
            console.error("Failed to schedule subscription cancellation.", cancelError);
            setError("구독 취소를 예약하지 못했습니다.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <section className="flex min-h-72 items-center justify-center rounded-2xl border border-emerald-900/10 bg-white shadow-sm">
                <RefreshCw className="size-6 animate-spin text-emerald-700" />
            </section>
        );
    }

    if (!school) {
        return (
            <section className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm">
                <AlertTriangle className="size-7 text-rose-500" />
                <p className="mt-3 font-black text-slate-900">
                    {error || "학교 정보가 없습니다."}
                </p>
                <button
                    onClick={() => void loadSchool()}
                    className="mt-4 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-black text-white"
                >
                    다시 시도
                </button>
            </section>
        );
    }

    const selectedPlan =
        plans.find((plan) => plan.planId === selectedPlanId) ?? null;
    const cannotManage =
        school.subscriptionStatus === "CANCELED" ||
        school.subscriptionStatus === "UNSUBSCRIBED" ||
        school.pendingAction === "CANCEL";

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <button
                        onClick={onBack}
                        className="mb-3 inline-flex items-center gap-2 text-sm font-extrabold text-slate-500 hover:text-emerald-700"
                    >
                        <ArrowLeft className="size-4" />
                        학교 목록
                    </button>
                    <h1 className="text-2xl font-black tracking-tight">{school.univName}</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        학교 관리자와 구독 예약 상태를 관리합니다.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <SubscriptionBadge value={school.subscriptionStatus} />
                    <PaymentBadge value={school.currentMonthPaymentStatus} />
                    {school.pendingAction !== "CANCEL" &&
                        school.nextPaymentStatus === "READY" && (
                            <PaymentBadge value="READY" />
                        )}
                    {school.pendingAction && (
                        <PendingActionBadge value={school.pendingAction} />
                    )}
                </div>
            </div>

            {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                    {error}
                </div>
            )}

            <div className="grid gap-5 xl:grid-cols-[1fr_400px]">
                <div className="space-y-5">
                    <section className="rounded-2xl border border-emerald-900/10 bg-white p-6 shadow-sm">
                        <div className="flex items-center gap-3">
                            <span className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                                <Building2 className="size-5" />
                            </span>
                            <div>
                                <h2 className="font-black">학교 기본 정보</h2>
                                <p className="mt-1 text-xs text-slate-400">
                                    {school.sido ?? "지역 미등록"}
                                </p>
                            </div>
                        </div>
                        <dl className="mt-6 grid gap-5 sm:grid-cols-2">
                            {[
                                ["주소", school.address ?? "-"],
                                ["대표 전화", school.schoolPhone ?? "-"],
                                ["홈페이지", school.homepage ?? "-"],
                                ["서비스 가입일", formatDate(school.firstPaidAt)],
                                ["전체 회원", `${school.memberCount.toLocaleString()}명`],
                                ["이번 달 결제 합계", formatCurrency(school.currentMonthRevenue)],
                            ].map(([label, value]) => (
                                <div key={label}>
                                    <dt className="text-xs font-extrabold text-slate-400">{label}</dt>
                                    <dd className="mt-1 break-all text-sm font-black text-slate-800">
                                        {value}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </section>

                    <section className="rounded-2xl border border-emerald-900/10 bg-white p-6 shadow-sm">
                        <div className="flex items-center gap-3">
                            <span className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                                <UsersRound className="size-5" />
                            </span>
                            <div>
                                <h2 className="font-black">학교 관리자</h2>
                                <p className="mt-1 text-xs text-slate-400">
                                    ADM 권한 계정 {school.admins.length}명
                                </p>
                            </div>
                        </div>
                        <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-xs font-extrabold text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3">로그인 ID</th>
                                        <th className="px-4 py-3">이름</th>
                                        <th className="px-4 py-3">권한</th>
                                        <th className="px-4 py-3">마지막 로그인</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {school.admins.map((admin) => (
                                        <tr key={admin.memberId}>
                                            <td className="px-4 py-3 font-black">{admin.loginId}</td>
                                            <td className="px-4 py-3">{admin.memberName}</td>
                                            <td className="px-4 py-3">{admin.role}</td>
                                            <td className="px-4 py-3 text-slate-500">
                                                {formatDateTime(admin.logtimeAt)}
                                            </td>
                                        </tr>
                                    ))}
                                    {school.admins.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-10 text-center font-bold text-slate-400">
                                                등록된 학교 관리자가 없습니다.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>

                <section className="h-fit rounded-2xl border border-emerald-900/10 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-3">
                        <span className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                            <CreditCard className="size-5" />
                        </span>
                        <div>
                            <h2 className="font-black">구독 및 예약 결제</h2>
                            <p className="mt-1 text-xs text-slate-400">
                                DB와 PortOne 예약을 함께 변경합니다.
                            </p>
                        </div>
                    </div>

                    <label className="mt-6 block">
                        <span className="text-xs font-extrabold text-slate-500">구독 플랜</span>
                        <select
                            value={selectedPlanId}
                            onChange={(event) => setSelectedPlanId(Number(event.target.value))}
                            disabled={cannotManage || saving}
                            className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-black outline-none focus:border-emerald-500 disabled:bg-slate-100"
                        >
                            <option value="" disabled>
                                플랜 선택
                            </option>
                            {plans.map((plan) => (
                                <option key={plan.planId} value={plan.planId}>
                                    {plan.planName} · {formatCurrency(plan.price)}
                                </option>
                            ))}
                        </select>
                    </label>

                    <button
                        onClick={() => void handlePlanChange()}
                        disabled={
                            cannotManage ||
                            saving ||
                            selectedPlanId === "" ||
                            selectedPlanId === school.planId
                        }
                        className="mt-3 h-10 w-full rounded-lg bg-emerald-700 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                        {saving ? "처리 중" : "플랜 변경"}
                    </button>

                    <div className="mt-5 space-y-3 rounded-xl bg-slate-50 p-4 text-sm">
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-500">현재 플랜</span>
                            <span className="font-black">{school.planName ?? "미구독"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-500">다음 결제 금액</span>
                            <span className="font-black">
                                {school.pendingAction === "CANCEL"
                                    ? "-"
                                    : selectedPlan
                                        ? formatCurrency(selectedPlan.price)
                                        : "-"}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-500">
                                {school.pendingAction === "CANCEL"
                                    ? "서비스 종료 예정일"
                                    : "다음 결제일"}
                            </span>
                            <span className="font-black">
                                {formatDate(
                                    school.pendingAction === "CANCEL"
                                        ? school.cancellationEffectiveAt
                                        : school.nextBillingAt,
                                )}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-500">최초 결제일</span>
                            <span className="font-black">{formatDate(school.firstPaidAt)}</span>
                        </div>
                    </div>

                    {school.pendingAction === "PLAN_CHANGE" && (
                        <div className="mt-4 rounded-xl bg-sky-50 p-4 text-xs font-bold leading-5 text-sky-800">
                            플랜 기능은 변경되었으며 변경된 금액은 다음 결제부터 적용됩니다.
                        </div>
                    )}

                    {school.pendingAction === "CANCEL" && (
                        <div className="mt-4 rounded-xl bg-amber-50 p-4 text-xs font-bold leading-5 text-amber-800">
                            {formatDate(school.cancellationEffectiveAt)}까지 서비스를 이용할 수 있으며,
                            이후 구독이 종료됩니다.
                        </div>
                    )}

                    <div className="mt-4 rounded-xl bg-emerald-50 p-4">
                        <div className="flex gap-3">
                            <CalendarClock className="mt-0.5 size-4 shrink-0 text-emerald-700" />
                            <p className="text-xs font-bold leading-5 text-emerald-800">
                                플랜 변경 시 기존 예약을 취소하고 변경 금액으로 다시 예약합니다.
                                구독 취소 시 결제된 기간은 유지하고 다음 예약만 취소합니다.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => void handleCancel()}
                        disabled={cannotManage || saving || !school.nextBillingAt}
                        className="mt-5 h-10 w-full rounded-lg border border-rose-200 text-sm font-black text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                    >
                        {school.pendingAction === "CANCEL"
                            ? "구독 취소 예정"
                            : school.subscriptionStatus === "CANCELED"
                                ? "구독 취소됨"
                                : school.subscriptionStatus === "UNSUBSCRIBED"
                                    ? "현재 미구독"
                                    : "구독 취소 예약"}
                    </button>
                </section>
            </div>

            <section className="rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 size-5 text-emerald-700" />
                    <div>
                        <p className="font-black">처리 기준</p>
                        <p className="mt-1 text-sm font-semibold text-slate-500">
                            플랜 변경과 구독 취소는 DB 상태와 PortOne 예약 결제가 모두 성공한 경우에만
                            완료됩니다.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}
