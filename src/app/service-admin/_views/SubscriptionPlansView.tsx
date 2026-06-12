"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
    Ban,
    CheckCircle2,
    CircleDollarSign,
    Pencil,
    Plus,
    RotateCcw,
    Search,
    UsersRound,
    X,
} from "lucide-react";
import { formatCurrency } from "../_components";
import type {
    ServiceSchool,
    ServiceSubscriptionPlan,
    SubscriptionPlanStatus,
} from "../_types";

type PlanForm = {
    name: string;
    price: string;
    maxMemberCount: string;
    description: string;
};

interface SubscriptionPlansViewProps {
    plans: ServiceSubscriptionPlan[];
    schools: ServiceSchool[];
    onCreate: (plan: PlanForm) => void;
    onUpdate: (planId: number, plan: PlanForm) => void;
    onToggleStatus: (planId: number) => void;
}

const EMPTY_FORM: PlanForm = {
    name: "",
    price: "",
    maxMemberCount: "",
    description: "",
};

function PlanStatusBadge({ status }: { status: SubscriptionPlanStatus }) {
    return (
        <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-extrabold ${
                status === "ACTIVE"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-500"
            }`}
        >
            {status === "ACTIVE" ? "활성" : "비활성"}
        </span>
    );
}

export default function SubscriptionPlansView({
    plans,
    schools,
    onCreate,
    onUpdate,
    onToggleStatus,
}: SubscriptionPlansViewProps) {
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<"ALL" | SubscriptionPlanStatus>("ALL");
    const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
    const [form, setForm] = useState<PlanForm>(EMPTY_FORM);
    const [formError, setFormError] = useState("");
    const isFormOpen = editingPlanId !== null || form !== EMPTY_FORM;
    const editingPlan = plans.find((plan) => plan.id === editingPlanId) ?? null;

    const subscriberCountByPlan = useMemo(() => {
        const counts = new Map<string, number>();
        schools.forEach((school) => {
            if (!school.plan) return;
            counts.set(school.plan, (counts.get(school.plan) ?? 0) + 1);
        });
        return counts;
    }, [schools]);

    const filteredPlans = useMemo(() => {
        const keyword = search.trim().toLocaleLowerCase("ko-KR");
        return plans.filter((plan) => {
            const matchesSearch =
                !keyword ||
                plan.name.toLocaleLowerCase("ko-KR").includes(keyword) ||
                plan.description.toLocaleLowerCase("ko-KR").includes(keyword);
            const matchesStatus = status === "ALL" || plan.status === status;
            return matchesSearch && matchesStatus;
        });
    }, [plans, search, status]);

    const activePlans = plans.filter((plan) => plan.status === "ACTIVE");
    const activeRevenue = schools
        .filter((school) => school.subscriptionStatus === "ACTIVE")
        .reduce((sum, school) => sum + school.monthlyRevenue, 0);

    useEffect(() => {
        if (!isFormOpen) return;

        document.body.style.overflow = "hidden";
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setEditingPlanId(null);
                setForm(EMPTY_FORM);
                setFormError("");
            }
        };
        window.addEventListener("keydown", handleEscape);
        return () => {
            document.body.style.overflow = "";
            window.removeEventListener("keydown", handleEscape);
        };
    }, [isFormOpen]);

    const openCreateForm = () => {
        setEditingPlanId(null);
        setForm({ ...EMPTY_FORM });
        setFormError("");
    };

    const openEditForm = (plan: ServiceSubscriptionPlan) => {
        setEditingPlanId(plan.id);
        setForm({
            name: plan.name,
            price: String(plan.price),
            maxMemberCount:
                plan.maxMemberCount === null ? "" : String(plan.maxMemberCount),
            description: plan.description,
        });
        setFormError("");
    };

    const closeForm = () => {
        setEditingPlanId(null);
        setForm(EMPTY_FORM);
        setFormError("");
    };

    const submitForm = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const name = form.name.trim();
        const price = Number(form.price);
        const maxMemberCount = form.maxMemberCount
            ? Number(form.maxMemberCount)
            : null;
        const duplicate = plans.some(
            (plan) =>
                plan.id !== editingPlanId &&
                plan.name.toLocaleLowerCase("ko-KR") ===
                    name.toLocaleLowerCase("ko-KR"),
        );

        if (!name) {
            setFormError("플랜명을 입력해주세요.");
            return;
        }
        if (!Number.isInteger(price) || price <= 0) {
            setFormError("월 요금은 1원 이상의 정수로 입력해주세요.");
            return;
        }
        if (
            maxMemberCount !== null &&
            (!Number.isInteger(maxMemberCount) || maxMemberCount <= 0)
        ) {
            setFormError("최대 이용자 수는 1명 이상의 정수로 입력해주세요.");
            return;
        }
        if (duplicate) {
            setFormError("이미 사용 중인 플랜명입니다.");
            return;
        }

        const payload = {
            name,
            price: String(price),
            maxMemberCount:
                maxMemberCount === null ? "" : String(maxMemberCount),
            description: form.description.trim(),
        };
        if (editingPlanId === null) {
            onCreate(payload);
        } else {
            onUpdate(editingPlanId, payload);
        }
        closeForm();
    };

    const toggleStatus = (plan: ServiceSubscriptionPlan) => {
        const subscriberCount = subscriberCountByPlan.get(plan.name) ?? 0;
        if (
            plan.status === "ACTIVE" &&
            !window.confirm(
                `${plan.name} 플랜을 비활성화하시겠습니까?\n현재 이용 중인 ${subscriberCount}개 학교의 구독은 유지됩니다.`,
            )
        ) {
            return;
        }
        onToggleStatus(plan.id);
    };

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-black tracking-tight">구독 플랜 설정</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        학교에 제공할 구독 플랜을 생성·수정하고 신청 가능 상태를 관리합니다.
                    </p>
                </div>
                <button
                    onClick={openCreateForm}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-black text-white hover:bg-emerald-800"
                >
                    <Plus className="size-4" />
                    새 플랜 생성
                </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
                {[
                    {
                        label: "전체 플랜",
                        value: `${plans.length}개`,
                        icon: CheckCircle2,
                        color: "text-slate-700",
                    },
                    {
                        label: "활성 플랜",
                        value: `${activePlans.length}개`,
                        icon: UsersRound,
                        color: "text-emerald-700",
                    },
                    {
                        label: "월 구독 매출",
                        value: formatCurrency(activeRevenue),
                        icon: CircleDollarSign,
                        color: "text-sky-700",
                    },
                ].map(({ label, value, icon: Icon, color }) => (
                    <section
                        key={label}
                        className="rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-sm"
                    >
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-extrabold text-slate-500">{label}</p>
                            <Icon className={`size-5 ${color}`} />
                        </div>
                        <p className={`mt-3 text-2xl font-black ${color}`}>{value}</p>
                    </section>
                ))}
            </div>

            <section className="rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-sm">
                <div className="grid gap-3 md:grid-cols-[1fr_180px]">
                    <label className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="플랜명 또는 설명 검색"
                            className="h-11 w-full rounded-lg border border-slate-200 pl-10 pr-3 text-sm font-semibold outline-none focus:border-emerald-500"
                        />
                    </label>
                    <select
                        value={status}
                        onChange={(event) =>
                            setStatus(
                                event.target.value as
                                    | "ALL"
                                    | SubscriptionPlanStatus,
                            )
                        }
                        className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-500"
                    >
                        <option value="ALL">전체 상태</option>
                        <option value="ACTIVE">활성</option>
                        <option value="INACTIVE">비활성</option>
                    </select>
                </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-emerald-900/10 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1050px] table-fixed text-left text-sm">
                        <colgroup>
                            <col className="w-[170px]" />
                            <col className="w-[190px]" />
                            <col className="w-[160px]" />
                            <col className="w-[115px]" />
                            <col className="w-[115px]" />
                            <col className="w-[160px]" />
                            <col className="w-[140px]" />
                        </colgroup>
                        <thead className="bg-slate-50 text-xs font-extrabold text-slate-500">
                            <tr>
                                <th className="px-5 py-3">플랜명</th>
                                <th className="px-5 py-3">월 요금</th>
                                <th className="px-5 py-3">최대 이용자</th>
                                <th className="px-5 py-3">이용 학교</th>
                                <th className="px-5 py-3">상태</th>
                                <th className="px-5 py-3">최종 수정일</th>
                                <th className="px-5 py-3">관리</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredPlans.map((plan) => (
                                <tr key={plan.id} className="font-semibold text-slate-700">
                                    <td className="px-5 py-4">
                                        <p className="truncate font-black text-slate-950" title={plan.name}>
                                            {plan.name}
                                        </p>
                                        <p className="mt-1 truncate text-xs text-slate-400" title={plan.description}>
                                            {plan.description || "설명 없음"}
                                        </p>
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-4 font-black text-slate-950">
                                        {formatCurrency(plan.price)}
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-4">
                                        {plan.maxMemberCount === null
                                            ? "제한 없음"
                                            : `${plan.maxMemberCount.toLocaleString()}명`}
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-4">
                                        {(subscriberCountByPlan.get(plan.name) ?? 0).toLocaleString()}개
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-4">
                                        <PlanStatusBadge status={plan.status} />
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                                        {plan.updatedAt}
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => openEditForm(plan)}
                                                className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                                                aria-label={`${plan.name} 수정`}
                                                title="수정"
                                            >
                                                <Pencil className="size-4" />
                                            </button>
                                            <button
                                                onClick={() => toggleStatus(plan)}
                                                className={`flex size-9 items-center justify-center rounded-lg border ${
                                                    plan.status === "ACTIVE"
                                                        ? "border-rose-200 text-rose-600 hover:bg-rose-50"
                                                        : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                                }`}
                                                aria-label={`${plan.name} ${plan.status === "ACTIVE" ? "비활성화" : "활성화"}`}
                                                title={plan.status === "ACTIVE" ? "비활성화" : "활성화"}
                                            >
                                                {plan.status === "ACTIVE" ? (
                                                    <Ban className="size-4" />
                                                ) : (
                                                    <RotateCcw className="size-4" />
                                                )}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredPlans.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-5 py-16 text-center font-bold text-slate-400">
                                        조건에 맞는 구독 플랜이 없습니다.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {isFormOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-5 backdrop-blur-sm"
                    onMouseDown={(event) => {
                        if (event.currentTarget === event.target) closeForm();
                    }}
                >
                    <form
                        onSubmit={submitForm}
                        className="w-full max-w-[560px] rounded-2xl bg-white shadow-2xl"
                    >
                        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                            <div>
                                <h2 className="text-lg font-black">
                                    {editingPlan ? "구독 플랜 수정" : "새 구독 플랜 생성"}
                                </h2>
                                <p className="mt-1 text-xs font-semibold text-slate-400">
                                    비활성화된 플랜은 신규 학교가 선택할 수 없습니다.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeForm}
                                className="flex size-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
                                aria-label="닫기"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        <div className="space-y-5 px-6 py-5">
                            <label className="block">
                                <span className="text-sm font-extrabold text-slate-700">플랜명</span>
                                <input
                                    value={form.name}
                                    onChange={(event) =>
                                        setForm((current) => ({
                                            ...current,
                                            name: event.target.value,
                                        }))
                                    }
                                    placeholder="예: Campus Plus"
                                    maxLength={40}
                                    className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-emerald-500"
                                />
                            </label>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="block">
                                    <span className="text-sm font-extrabold text-slate-700">월 요금</span>
                                    <div className="relative mt-2">
                                        <input
                                            type="number"
                                            min={1}
                                            step={1}
                                            value={form.price}
                                            onChange={(event) =>
                                                setForm((current) => ({
                                                    ...current,
                                                    price: event.target.value,
                                                }))
                                            }
                                            placeholder="0"
                                            className="h-11 w-full rounded-lg border border-slate-200 px-3 pr-9 text-sm font-semibold outline-none focus:border-emerald-500"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                                            원
                                        </span>
                                    </div>
                                </label>
                                <label className="block">
                                    <span className="text-sm font-extrabold text-slate-700">최대 이용자 수</span>
                                    <input
                                        type="number"
                                        min={1}
                                        step={1}
                                        value={form.maxMemberCount}
                                        onChange={(event) =>
                                            setForm((current) => ({
                                                ...current,
                                                maxMemberCount: event.target.value,
                                            }))
                                        }
                                        placeholder="비우면 제한 없음"
                                        className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-emerald-500"
                                    />
                                </label>
                            </div>

                            <label className="block">
                                <span className="text-sm font-extrabold text-slate-700">플랜 설명</span>
                                <textarea
                                    value={form.description}
                                    onChange={(event) =>
                                        setForm((current) => ({
                                            ...current,
                                            description: event.target.value,
                                        }))
                                    }
                                    placeholder="플랜의 대상과 주요 특징을 입력하세요."
                                    maxLength={200}
                                    rows={4}
                                    className="mt-2 w-full resize-none rounded-lg border border-slate-200 px-3 py-3 text-sm font-semibold outline-none focus:border-emerald-500"
                                />
                            </label>

                            {formError && (
                                <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600">
                                    {formError}
                                </p>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
                            <button
                                type="button"
                                onClick={closeForm}
                                className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-black text-slate-600 hover:bg-slate-50"
                            >
                                취소
                            </button>
                            <button
                                type="submit"
                                className="h-10 rounded-lg bg-emerald-700 px-5 text-sm font-black text-white hover:bg-emerald-800"
                            >
                                {editingPlan ? "수정 저장" : "플랜 생성"}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

export type { PlanForm };
