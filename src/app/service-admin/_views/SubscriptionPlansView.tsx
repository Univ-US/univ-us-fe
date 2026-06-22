"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
    AlertTriangle,
    Ban,
    CheckCircle2,
    CircleDollarSign,
    Pencil,
    Plus,
    RotateCcw,
    RefreshCw,
    Search,
    UsersRound,
    X,
} from "lucide-react";
import {
    changeServiceAdminPlanStatus,
    createServiceAdminPlan,
    getServiceAdminPlans,
    updateServiceAdminPlan,
    type ServiceAdminPlan,
    type ServiceAdminPlanResponse,
    type ServiceAdminPlanStatus,
} from "@/lib/serviceAdminApi";
import { formatCurrency } from "../_components";

type PlanForm = {
    name: string;
    price: string;
    maxMemberCount: string;
    description: string;
};

const EMPTY_FORM: PlanForm = {
    name: "",
    price: "",
    maxMemberCount: "",
    description: "",
};

function PlanStatusBadge({ status }: { status: ServiceAdminPlanStatus }) {
    return (
        <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-extrabold ${
                status === "ACTIVE"
                    ? "bg-primary/10 text-primary"
                    : "bg-slate-100 text-slate-500"
            }`}
        >
            {status === "ACTIVE" ? "활성" : "비활성"}
        </span>
    );
}

function getErrorMessage(error: unknown) {
    if (axios.isAxiosError<{ message?: string; detail?: string }>(error)) {
        return error.response?.data?.message ?? error.response?.data?.detail;
    }
    return undefined;
}

export default function SubscriptionPlansView() {
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<"ALL" | ServiceAdminPlanStatus>("ALL");
    const [result, setResult] = useState<ServiceAdminPlanResponse | null>(null);
    const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
    const [form, setForm] = useState<PlanForm>(EMPTY_FORM);
    const [formError, setFormError] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const plans = useMemo(() => result?.plans ?? [], [result?.plans]);
    const isFormOpen = editingPlanId !== null || form !== EMPTY_FORM;
    const editingPlan =
        plans.find((plan) => plan.planId === editingPlanId) ?? null;

    const loadPlans = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            setResult(await getServiceAdminPlans());
        } catch (loadError) {
            console.error("Failed to load service admin plans.", loadError);
            setError("구독 플랜을 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadPlans();
    }, [loadPlans]);

    const filteredPlans = useMemo(() => {
        const keyword = search.trim().toLocaleLowerCase("ko-KR");
        return plans.filter((plan) => {
            const matchesSearch =
                !keyword ||
                plan.planName.toLocaleLowerCase("ko-KR").includes(keyword) ||
                plan.description.toLocaleLowerCase("ko-KR").includes(keyword);
            const matchesStatus = status === "ALL" || plan.status === status;
            return matchesSearch && matchesStatus;
        });
    }, [plans, search, status]);

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

    const openEditForm = (plan: ServiceAdminPlan) => {
        setEditingPlanId(plan.planId);
        setForm({
            name: plan.planName,
            price: String(plan.price),
            maxMemberCount: String(plan.maxMemberCount),
            description: plan.description,
        });
        setFormError("");
    };

    const closeForm = () => {
        setEditingPlanId(null);
        setForm(EMPTY_FORM);
        setFormError("");
    };

    const submitForm = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const name = form.name.trim();
        const price = Number(form.price);
        const maxMemberCount = Number(form.maxMemberCount);
        const duplicate = plans.some(
            (plan) =>
                plan.planId !== editingPlanId &&
                plan.planName.toLocaleLowerCase("ko-KR") ===
                    name.toLocaleLowerCase("ko-KR"),
        );

        if (!name) {
            setFormError("플랜명을 입력해주세요.");
            return;
        }
        if (name.length > 10) {
            setFormError("플랜명은 10자 이내로 입력해주세요.");
            return;
        }
        if (!Number.isInteger(price) || price <= 0) {
            setFormError("월 요금은 1원 이상의 정수로 입력해주세요.");
            return;
        }
        if (!Number.isInteger(maxMemberCount) || maxMemberCount <= 0) {
            setFormError("최대 이용자 수는 1명 이상의 정수로 입력해주세요.");
            return;
        }
        if (duplicate) {
            setFormError("이미 사용 중인 플랜명입니다.");
            return;
        }

        const payload = {
            planName: name,
            price,
            maxMemberCount,
            description: form.description.trim(),
        };
        if (!payload.description) {
            setFormError("플랜 설명을 입력해주세요.");
            return;
        }

        setSaving(true);
        setFormError("");
        try {
            if (editingPlanId === null) {
                await createServiceAdminPlan(payload);
            } else {
                await updateServiceAdminPlan(editingPlanId, payload);
            }
            closeForm();
            await loadPlans();
        } catch (saveError) {
            console.error("Failed to save service admin plan.", saveError);
            setFormError(
                getErrorMessage(saveError) ?? "구독 플랜을 저장하지 못했습니다.",
            );
        } finally {
            setSaving(false);
        }
    };

    const toggleStatus = async (plan: ServiceAdminPlan) => {
        if (
            plan.status === "ACTIVE" &&
            !window.confirm(
                `${plan.planName} 플랜을 비활성화하시겠습니까?\n현재 이용 중인 ${plan.subscriberCount}개 학교의 구독과 예약 결제는 유지됩니다.`,
            )
        ) {
            return;
        }

        setSaving(true);
        setError("");
        try {
            await changeServiceAdminPlanStatus(
                plan.planId,
                plan.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
            );
            await loadPlans();
        } catch (statusError) {
            console.error("Failed to change service admin plan status.", statusError);
            setError(
                getErrorMessage(statusError) ?? "플랜 상태를 변경하지 못했습니다.",
            );
        } finally {
            setSaving(false);
        }
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
                    disabled={saving}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-black text-white hover:bg-primary/90"
                >
                    <Plus className="size-4" />
                    새 플랜 생성
                </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
                {[
                    {
                        label: "전체 플랜",
                        value: `${result?.totalCount ?? 0}개`,
                        icon: CheckCircle2,
                        color: "text-slate-700",
                    },
                    {
                        label: "활성 플랜",
                        value: `${result?.activeCount ?? 0}개`,
                        icon: UsersRound,
                        color: "text-primary",
                    },
                    {
                        label: "월 구독 매출",
                        value: formatCurrency(result?.currentMonthRevenue ?? 0),
                        icon: CircleDollarSign,
                        color: "text-sky-700",
                    },
                ].map(({ label, value, icon: Icon, color }) => (
                    <section
                        key={label}
                        className="rounded-2xl border border-primary/10 bg-white p-5 shadow-sm"
                    >
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-extrabold text-slate-500">{label}</p>
                            <Icon className={`size-5 ${color}`} />
                        </div>
                        <p className={`mt-3 text-2xl font-black ${color}`}>{value}</p>
                    </section>
                ))}
            </div>

            {error && (
                <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                    <span className="inline-flex items-center gap-2">
                        <AlertTriangle className="size-4" />
                        {error}
                    </span>
                    <button
                        onClick={() => void loadPlans()}
                        className="inline-flex items-center gap-2 text-rose-700"
                    >
                        <RefreshCw className="size-4" />
                        다시 시도
                    </button>
                </div>
            )}

            <section className="rounded-2xl border border-primary/10 bg-white p-5 shadow-sm">
                <div className="grid gap-3 md:grid-cols-[1fr_180px]">
                    <label className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="플랜명 또는 설명 검색"
                            className="h-11 w-full rounded-lg border border-slate-200 pl-10 pr-3 text-sm font-semibold outline-none focus:border-primary"
                        />
                    </label>
                    <select
                        value={status}
                        onChange={(event) =>
                            setStatus(
                                event.target.value as
                                    | "ALL"
                                    | ServiceAdminPlanStatus,
                            )
                        }
                        className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-primary"
                    >
                        <option value="ALL">전체 상태</option>
                        <option value="ACTIVE">활성</option>
                        <option value="INACTIVE">비활성</option>
                    </select>
                </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-primary/10 bg-white shadow-sm">
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
                            {loading && (
                                <tr>
                                    <td colSpan={7} className="px-5 py-16 text-center">
                                        <RefreshCw className="mx-auto size-6 animate-spin text-primary" />
                                    </td>
                                </tr>
                            )}
                            {!loading && filteredPlans.map((plan) => (
                                <tr key={plan.planId} className="font-semibold text-slate-700">
                                    <td className="px-5 py-4">
                                        <p className="truncate font-black text-slate-950" title={plan.planName}>
                                            {plan.planName}
                                        </p>
                                        <p className="mt-1 truncate text-xs text-slate-400" title={plan.description}>
                                            {plan.description || "설명 없음"}
                                        </p>
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-4 font-black text-slate-950">
                                        {formatCurrency(plan.price)}
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-4">
                                        {plan.maxMemberCount.toLocaleString()}명
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-4">
                                        {plan.subscriberCount.toLocaleString()}개
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-4">
                                        <PlanStatusBadge status={plan.status} />
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                                        {new Date(plan.updateAt).toLocaleString("ko-KR")}
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => openEditForm(plan)}
                                                disabled={plan.status === "INACTIVE" || saving}
                                                className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-primary/30 hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-300"
                                                aria-label={`${plan.planName} 수정`}
                                                title={plan.status === "INACTIVE" ? "비활성 플랜은 수정할 수 없습니다." : "수정"}
                                            >
                                                <Pencil className="size-4" />
                                            </button>
                                            <button
                                                onClick={() => toggleStatus(plan)}
                                                disabled={saving}
                                                className={`flex size-9 items-center justify-center rounded-lg border ${
                                                    plan.status === "ACTIVE"
                                                        ? "border-rose-200 text-rose-600 hover:bg-rose-50"
                                                        : "border-primary/20 text-primary hover:bg-primary/10"
                                                }`}
                                                aria-label={`${plan.planName} ${plan.status === "ACTIVE" ? "비활성화" : "활성화"}`}
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
                            {!loading && filteredPlans.length === 0 && (
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
                                    placeholder="예: BASIC (최대 10자)"
                                    maxLength={10}
                                    className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-primary"
                                />
                                <span className="mt-1.5 block text-xs font-semibold text-slate-400">
                                    최대 10자까지 입력할 수 있습니다.
                                </span>
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
                                            className="h-11 w-full rounded-lg border border-slate-200 px-3 pr-9 text-sm font-semibold outline-none focus:border-primary"
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
                                        placeholder="1명 이상"
                                        required
                                        className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-primary"
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
                                    className="mt-2 w-full resize-none rounded-lg border border-slate-200 px-3 py-3 text-sm font-semibold outline-none focus:border-primary"
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
                                disabled={saving}
                                className="h-10 rounded-lg bg-primary px-5 text-sm font-black text-white hover:bg-primary/90 disabled:bg-slate-300"
                            >
                                {saving
                                    ? "저장 중"
                                    : editingPlan
                                        ? "수정 저장"
                                        : "플랜 생성"}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
