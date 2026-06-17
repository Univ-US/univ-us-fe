"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    RefreshCw,
    Search,
} from "lucide-react";
import {
    getServiceAdminSchools,
    getServiceAdminPlans,
    type ServiceAdminPlan,
    type ServiceAdminSchool,
    type ServiceAdminSchoolPage,
    type ServiceAdminSchoolQuery,
} from "@/lib/serviceAdminApi";
import {
    formatCurrency,
    PaymentBadge,
    PendingActionBadge,
    SubscriptionBadge,
} from "../_components";

interface SchoolsViewProps {
    onSelectSchool: (univId: number) => void;
}

type SortOption = NonNullable<ServiceAdminSchoolQuery["sort"]>;
type PaginationItem = number | "ellipsis-start" | "ellipsis-end";

const PAGE_WINDOW_SIZE = 5;
const PAGE_JUMP_SIZE = 10;

function formatDate(value: string | null) {
    return value ? new Date(value).toLocaleDateString("ko-KR") : "-";
}

function formatDateTime(value: string | null) {
    return value ? new Date(value).toLocaleString("ko-KR") : "로그인 기록 없음";
}

export default function SchoolsView({ onSelectSchool }: SchoolsViewProps) {
    const [search, setSearch] = useState("");
    const [keyword, setKeyword] = useState("");
    const [status, setStatus] = useState<
        "ALL" | ServiceAdminSchool["subscriptionStatus"]
    >("ALL");
    const [planId, setPlanId] = useState<"ALL" | number>("ALL");
    const [sort, setSort] = useState<SortOption>("NAME_ASC");
    const [page, setPage] = useState(0);
    const [plans, setPlans] = useState<ServiceAdminPlan[]>([]);
    const [result, setResult] = useState<ServiceAdminSchoolPage | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setKeyword(search.trim());
            setPage(0);
        }, 300);
        return () => window.clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        void getServiceAdminPlans()
            .then((response) => setPlans(response.plans))
            .catch((planError) => {
                console.error("Failed to load subscription plans.", planError);
            });
    }, []);

    const loadSchools = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            setResult(
                await getServiceAdminSchools({
                    page,
                    keyword: keyword || undefined,
                    subscriptionStatus: status === "ALL" ? undefined : status,
                    planId: planId === "ALL" ? undefined : planId,
                    sort,
                }),
            );
        } catch (loadError) {
            console.error("Failed to load service admin schools.", loadError);
            setError("학교 목록을 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    }, [keyword, page, planId, sort, status]);

    useEffect(() => {
        void loadSchools();
    }, [loadSchools]);

    const paginationItems = useMemo<PaginationItem[]>(() => {
        const totalPages = result?.totalPages ?? 0;
        if (totalPages <= PAGE_WINDOW_SIZE + 2) {
            return Array.from({ length: totalPages }, (_, index) => index);
        }

        const lastPage = totalPages - 1;
        const start = Math.min(
            Math.max(page - Math.floor(PAGE_WINDOW_SIZE / 2), 0),
            totalPages - PAGE_WINDOW_SIZE,
        );
        const end = start + PAGE_WINDOW_SIZE - 1;
        const items: PaginationItem[] = [];

        if (start > 0) {
            items.push(0);
            if (start > 1) items.push("ellipsis-start");
        }

        for (let pageNumber = start; pageNumber <= end; pageNumber += 1) {
            if (!items.includes(pageNumber)) items.push(pageNumber);
        }

        if (end < lastPage) {
            if (end < lastPage - 1) items.push("ellipsis-end");
            items.push(lastPage);
        }

        return items;
    }, [page, result?.totalPages]);

    const resetFilters = () => {
        setSearch("");
        setKeyword("");
        setStatus("ALL");
        setPlanId("ALL");
        setSort("NAME_ASC");
        setPage(0);
    };

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-2xl font-black tracking-tight">학교 관리</h1>
                <p className="mt-1 text-sm text-slate-500">
                    대학별 관리자, 구독 상태, 회원 수와 이번 달 결제 금액을 관리합니다.
                </p>
            </div>

            <section className="rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-sm">
                <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_180px_170px_210px]">
                    <label className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="학교 이름으로 검색"
                            className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold outline-none transition focus:border-emerald-500"
                        />
                    </label>

                    <select
                        value={status}
                        onChange={(event) => {
                            setStatus(event.target.value as typeof status);
                            setPage(0);
                        }}
                        className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-500"
                    >
                        <option value="ALL">전체 구독 상태</option>
                        <option value="ACTIVE">구독 중</option>
                        <option value="PAST_DUE">결제 지연</option>
                        <option value="PENDING">승인 대기</option>
                        <option value="CANCELED">구독 취소</option>
                        <option value="UNSUBSCRIBED">미구독</option>
                    </select>

                    <select
                        value={planId}
                        onChange={(event) => {
                            const value = event.target.value;
                            setPlanId(value === "ALL" ? "ALL" : Number(value));
                            setPage(0);
                        }}
                        className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-500"
                    >
                        <option value="ALL">전체 플랜</option>
                        {plans.map((plan) => (
                            <option key={plan.planId} value={plan.planId}>
                                {plan.planName}
                                {plan.status === "INACTIVE" ? " (비활성)" : ""}
                            </option>
                        ))}
                    </select>

                    <select
                        value={sort}
                        onChange={(event) => {
                            setSort(event.target.value as SortOption);
                            setPage(0);
                        }}
                        className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-500"
                    >
                        <option value="NAME_ASC">학교 이름순</option>
                        <option value="MEMBERS_ASC">회원 수 적은 순</option>
                        <option value="MEMBERS_DESC">회원 수 많은 순</option>
                        <option value="REVENUE_ASC">이번 달 매출 낮은 순</option>
                        <option value="REVENUE_DESC">이번 달 매출 높은 순</option>
                    </select>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
                    <p className="font-bold text-slate-500">
                        검색 결과{" "}
                        <span className="text-emerald-700">
                            {(result?.totalElements ?? 0).toLocaleString()}
                        </span>
                        개 대학
                    </p>
                    <button
                        onClick={resetFilters}
                        className="font-extrabold text-slate-500 hover:text-emerald-700"
                    >
                        필터 초기화
                    </button>
                </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-emerald-900/10 bg-white shadow-sm">
                {error ? (
                    <div className="flex min-h-72 flex-col items-center justify-center p-6 text-center">
                        <AlertTriangle className="size-7 text-rose-500" />
                        <p className="mt-3 font-black text-slate-900">{error}</p>
                        <button
                            onClick={() => void loadSchools()}
                            className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-black text-white"
                        >
                            <RefreshCw className="size-4" />
                            다시 시도
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1450px] text-left text-sm">
                                <thead className="bg-slate-50 text-xs font-extrabold text-slate-500">
                                    <tr>
                                        <th className="px-5 py-3">대학</th>
                                        <th className="px-5 py-3">학교 관리자</th>
                                        <th className="px-5 py-3">플랜</th>
                                        <th className="px-5 py-3">구독 상태</th>
                                        <th className="px-5 py-3">서비스 가입일</th>
                                        <th className="px-5 py-3">회원 수</th>
                                        <th className="px-5 py-3">이번 달 매출</th>
                                        <th className="px-5 py-3">이번 달 결제 / 다음 예정</th>
                                        <th className="px-5 py-3">다음 결제일 / 종료일</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={9} className="px-5 py-16 text-center">
                                                <RefreshCw className="mx-auto size-6 animate-spin text-emerald-700" />
                                            </td>
                                        </tr>
                                    ) : (
                                        result?.content.map((school) => (
                                            <tr
                                                key={school.univId}
                                                onClick={() => onSelectSchool(school.univId)}
                                                className="cursor-pointer align-top font-semibold text-slate-700 transition hover:bg-emerald-50/60"
                                            >
                                                <td className="px-5 py-4">
                                                    <p className="font-black text-slate-950">
                                                        {school.univName}
                                                    </p>
                                                    <p className="mt-1 text-xs text-slate-400">
                                                        {school.sido ?? "지역 미등록"}
                                                    </p>
                                                </td>
                                                <td className="px-5 py-4">
                                                    {school.admins.length === 0 ? (
                                                        <span className="text-slate-400">
                                                            등록된 ADM 없음
                                                        </span>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            {school.admins.map((admin) => (
                                                                <div key={admin.memberId}>
                                                                    <p className="font-black text-slate-900">
                                                                        {admin.loginId} · {admin.role}
                                                                    </p>
                                                                    <p className="mt-0.5 text-xs text-slate-400">
                                                                        최근 로그인 {formatDateTime(admin.logtimeAt)}
                                                                    </p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-4 font-black">
                                                    {school.planName ?? "미구독"}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex flex-wrap gap-2">
                                                        <SubscriptionBadge value={school.subscriptionStatus} />
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                                                    {formatDate(school.firstPaidAt)}
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-4">
                                                    {school.memberCount.toLocaleString()}명
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-4 font-black text-slate-950">
                                                    {formatCurrency(school.currentMonthRevenue)}
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-4">
                                                    <div className="flex flex-wrap gap-2">
                                                        <PaymentBadge
                                                            value={school.currentMonthPaymentStatus}
                                                        />
                                                        {school.pendingAction === "CANCEL" ? (
                                                            <PendingActionBadge value="CANCEL" />
                                                        ) : school.nextPaymentStatus === "READY" ? (
                                                            <PaymentBadge value="READY" />
                                                        ) : null}
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                                                    {formatDate(
                                                        school.pendingAction === "CANCEL"
                                                            ? school.cancellationEffectiveAt
                                                            : school.nextBillingAt,
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                    {!loading && result?.content.length === 0 && (
                                        <tr>
                                            <td colSpan={9} className="px-5 py-16 text-center font-bold text-slate-400">
                                                조건에 맞는 학교가 없습니다.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
                            <p className="text-sm font-bold text-slate-400">
                                {(result?.totalPages ?? 0) === 0 ? 0 : page + 1} /{" "}
                                {result?.totalPages ?? 0} 페이지
                            </p>
                            <div className="flex flex-wrap items-center justify-end gap-2">
                                <button
                                    onClick={() => setPage(0)}
                                    disabled={page === 0}
                                    className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                                    aria-label="맨 앞 페이지"
                                    title="맨 앞 페이지"
                                >
                                    <ChevronsLeft className="size-4" />
                                </button>
                                <button
                                    onClick={() => setPage((current) => current - PAGE_JUMP_SIZE)}
                                    disabled={page < PAGE_JUMP_SIZE}
                                    className="flex h-9 min-w-11 items-center justify-center rounded-lg border border-slate-200 px-2 text-xs font-black text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                                    aria-label="10페이지 앞으로"
                                    title="10페이지 앞으로"
                                >
                                    -10
                                </button>
                                <button
                                    onClick={() => setPage((current) => Math.max(0, current - 1))}
                                    disabled={result?.first ?? true}
                                    className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                                    aria-label="이전 페이지"
                                >
                                    <ChevronLeft className="size-4" />
                                </button>
                                {paginationItems.map((item) =>
                                    typeof item === "number" ? (
                                        <button
                                            key={item}
                                            onClick={() => setPage(item)}
                                            className={`size-9 rounded-lg text-sm font-black ${
                                                page === item
                                                    ? "bg-emerald-700 text-white"
                                                    : "border border-slate-200 text-slate-600"
                                            }`}
                                            aria-label={`${item + 1}페이지`}
                                            aria-current={page === item ? "page" : undefined}
                                        >
                                            {item + 1}
                                        </button>
                                    ) : (
                                        <span
                                            key={item}
                                            className="flex size-7 items-center justify-center text-sm font-black text-slate-400"
                                            aria-hidden="true"
                                        >
                                            ...
                                        </span>
                                    ),
                                )}
                                <button
                                    onClick={() =>
                                        setPage((current) =>
                                            Math.min(
                                                Math.max((result?.totalPages ?? 1) - 1, 0),
                                                current + 1,
                                            ),
                                        )
                                    }
                                    disabled={result?.last ?? true}
                                    className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                                    aria-label="다음 페이지"
                                >
                                    <ChevronRight className="size-4" />
                                </button>
                                <button
                                    onClick={() => setPage((current) => current + PAGE_JUMP_SIZE)}
                                    disabled={
                                        page + PAGE_JUMP_SIZE >= (result?.totalPages ?? 0)
                                    }
                                    className="flex h-9 min-w-11 items-center justify-center rounded-lg border border-slate-200 px-2 text-xs font-black text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                                    aria-label="10페이지 뒤로"
                                    title="10페이지 뒤로"
                                >
                                    +10
                                </button>
                                <button
                                    onClick={() =>
                                        setPage(Math.max((result?.totalPages ?? 1) - 1, 0))
                                    }
                                    disabled={result?.last ?? true}
                                    className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                                    aria-label="맨 뒤 페이지"
                                    title="맨 뒤 페이지"
                                >
                                    <ChevronsRight className="size-4" />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </section>
        </div>
    );
}
