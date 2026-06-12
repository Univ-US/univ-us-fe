"use client";

import {
    ArrowLeft,
    Building2,
    CalendarClock,
    CreditCard,
    ShieldCheck,
} from "lucide-react";
import type {
    ServiceSchool,
    ServiceSubscriptionPlan,
    SubscriptionPlan,
} from "../_types";
import {
    formatCurrency,
    getSubscriptionDuration,
    PaymentBadge,
    SubscriptionBadge,
} from "../_components";

interface SchoolDetailViewProps {
    school: ServiceSchool;
    plans: ServiceSubscriptionPlan[];
    onBack: () => void;
    onChangePlan: (plan: SubscriptionPlan) => void;
    onCancelSubscription: () => void;
}

export default function SchoolDetailView({
    school,
    plans,
    onBack,
    onChangePlan,
    onCancelSubscription,
}: SchoolDetailViewProps) {
    const selectedPlan = plans.find((plan) => plan.name === school.plan) ?? null;
    const selectablePlans = plans.filter(
        (plan) => plan.status === "ACTIVE" || plan.name === school.plan,
    );

    const handleCancel = () => {
        if (school.subscriptionStatus === "CANCELED") return;
        if (window.confirm(`${school.name}의 구독을 취소 처리하시겠습니까?`)) {
            onCancelSubscription();
        }
    };

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
                    <h1 className="text-2xl font-black tracking-tight">{school.name}</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        학교 기본 정보와 구독 상태를 관리합니다.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <SubscriptionBadge value={school.subscriptionStatus} />
                    <PaymentBadge value={school.paymentStatus} />
                </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
                <section className="rounded-2xl border border-emerald-900/10 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-3">
                        <span className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                            <Building2 className="size-5" />
                        </span>
                        <div>
                            <h2 className="font-black">기관 기본 정보</h2>
                            <p className="mt-1 text-xs text-slate-400">{school.category}</p>
                        </div>
                    </div>
                    <dl className="mt-6 grid gap-5 sm:grid-cols-2">
                        {[
                            ["주소", school.address],
                            ["대표 전화", school.phone],
                            ["담당 관리자", school.adminName],
                            ["관리자 이메일", school.adminEmail],
                            ["서비스 가입일", school.joinedAt],
                            ["최초 구독일", school.firstSubscribedAt ?? "미구독"],
                            [
                                "구독 기간",
                                getSubscriptionDuration(
                                    school.firstSubscribedAt,
                                    school.subscriptionEndedAt,
                                    school.subscriptionStatus,
                                ),
                            ],
                            ["전체 이용자", `${school.memberCount.toLocaleString()}명`],
                        ].map(([label, value]) => (
                            <div key={label}>
                                <dt className="text-xs font-extrabold text-slate-400">{label}</dt>
                                <dd className="mt-1 text-sm font-black text-slate-800">{value}</dd>
                            </div>
                        ))}
                    </dl>
                </section>

                <section className="rounded-2xl border border-emerald-900/10 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-3">
                        <span className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                            <CreditCard className="size-5" />
                        </span>
                        <div>
                            <h2 className="font-black">구독 및 예약 결제</h2>
                            <p className="mt-1 text-xs text-slate-400">PortOne 연동 예정 목업</p>
                        </div>
                    </div>

                    <label className="mt-6 block">
                        <span className="text-xs font-extrabold text-slate-500">구독 플랜</span>
                        <select
                            value={school.plan ?? ""}
                            onChange={(event) =>
                                onChangePlan(event.target.value as SubscriptionPlan)
                            }
                            disabled={school.subscriptionStatus === "CANCELED"}
                            className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-black outline-none focus:border-emerald-500 disabled:bg-slate-100"
                        >
                            <option value="" disabled>
                                플랜을 선택해 구독 시작
                            </option>
                            {selectablePlans.map((plan) => (
                                <option
                                    key={plan.id}
                                    value={plan.name}
                                    disabled={plan.status === "INACTIVE"}
                                >
                                    {plan.name} · 월 {plan.price.toLocaleString("ko-KR")}원
                                    {plan.status === "INACTIVE" ? " (비활성)" : ""}
                                </option>
                            ))}
                        </select>
                    </label>

                    <div className="mt-5 space-y-3 rounded-xl bg-slate-50 p-4 text-sm">
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-500">예약 결제 금액</span>
                            <span className="font-black">
                                {selectedPlan
                                    ? formatCurrency(selectedPlan.price)
                                    : "미구독"}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-500">다음 예약 결제</span>
                            <span className="font-black">{school.nextBillingAt}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-500">PortOne 고객 ID</span>
                            <span className="font-black">
                                {school.portoneCustomerId ?? "-"}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-500">최초 구독일</span>
                            <span className="font-black">
                                {school.firstSubscribedAt ?? "-"}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-500">구독 기간</span>
                            <span className="font-black">
                                {getSubscriptionDuration(
                                    school.firstSubscribedAt,
                                    school.subscriptionEndedAt,
                                    school.subscriptionStatus,
                                )}
                            </span>
                        </div>
                    </div>

                    <div className="mt-4 rounded-xl bg-emerald-50 p-4">
                        <div className="flex gap-3">
                            <CalendarClock className="mt-0.5 size-4 shrink-0 text-emerald-700" />
                            <p className="text-xs font-bold leading-5 text-emerald-800">
                                플랜 변경 시 다음 예약 결제 금액과 구독 상태가 함께
                                갱신되는 흐름을 표현한 목업입니다.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleCancel}
                        disabled={
                            school.subscriptionStatus === "CANCELED" ||
                            school.subscriptionStatus === "UNSUBSCRIBED"
                        }
                        className="mt-5 h-10 w-full rounded-lg border border-rose-200 text-sm font-black text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                    >
                        {school.subscriptionStatus === "CANCELED"
                            ? "구독 취소됨"
                            : school.subscriptionStatus === "UNSUBSCRIBED"
                                ? "현재 미구독"
                                : "구독 취소"}
                    </button>
                </section>
            </div>

            <section className="rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 size-5 text-emerald-700" />
                    <div>
                        <p className="font-black">목업 동작 범위</p>
                        <p className="mt-1 text-sm font-semibold text-slate-500">
                            현재 플랜 변경과 구독 취소는 화면 상태만 변경합니다. 실제 적용
                            단계에서는 백엔드 트랜잭션과 PortOne 예약 결제 변경 결과를
                            확인한 뒤 화면을 갱신해야 합니다.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}
