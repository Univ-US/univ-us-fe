"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import type {
    ServiceSchool,
    SubscriptionPlan,
    SubscriptionStatus,
} from "../_types";
import {
    formatCurrency,
    getSubscriptionDuration,
    PaymentBadge,
    SubscriptionBadge,
} from "../_components";

type SortOption =
    | "name-asc"
    | "members-asc"
    | "members-desc"
    | "revenue-asc"
    | "revenue-desc";

interface SchoolsViewProps {
    schools: ServiceSchool[];
    onSelectSchool: (school: ServiceSchool) => void;
}

const PAGE_SIZE = 7;

export default function SchoolsView({ schools, onSelectSchool }: SchoolsViewProps) {
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<"ALL" | SubscriptionStatus>("ALL");
    const [plan, setPlan] = useState<"ALL" | SubscriptionPlan>("ALL");
    const [sort, setSort] = useState<SortOption>("name-asc");
    const [page, setPage] = useState(1);
    const availablePlans = useMemo(
        () =>
            Array.from(
                new Set(
                    schools
                        .map((school) => school.plan)
                        .filter((value): value is SubscriptionPlan => Boolean(value)),
                ),
            ).sort((a, b) => a.localeCompare(b, "ko-KR")),
        [schools],
    );

    const filteredSchools = useMemo(() => {
        const keyword = search.trim().toLocaleLowerCase("ko-KR");
        const result = schools.filter((school) => {
            const matchesName = !keyword || school.name.toLocaleLowerCase("ko-KR").includes(keyword);
            const matchesStatus = status === "ALL" || school.subscriptionStatus === status;
            const matchesPlan = plan === "ALL" || school.plan === plan;
            return matchesName && matchesStatus && matchesPlan;
        });

        return [...result].sort((a, b) => {
            if (sort === "members-asc") return a.memberCount - b.memberCount;
            if (sort === "members-desc") return b.memberCount - a.memberCount;
            if (sort === "revenue-asc") return a.monthlyRevenue - b.monthlyRevenue;
            if (sort === "revenue-desc") return b.monthlyRevenue - a.monthlyRevenue;
            return a.name.localeCompare(b.name, "ko-KR");
        });
    }, [plan, schools, search, sort, status]);

    const totalPages = Math.max(1, Math.ceil(filteredSchools.length / PAGE_SIZE));
    const pagedSchools = filteredSchools.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    useEffect(() => {
        setPage(1);
    }, [search, status, plan, sort]);

    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-2xl font-black tracking-tight">학교 관리</h1>
                <p className="mt-1 text-sm text-slate-500">
                    전체 기관의 구독 상태, 플랜, 회원 수와 매출을 관리합니다.
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
                        onChange={(event) => setStatus(event.target.value as "ALL" | SubscriptionStatus)}
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
                        value={plan}
                        onChange={(event) => setPlan(event.target.value as "ALL" | SubscriptionPlan)}
                        className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-500"
                    >
                        <option value="ALL">전체 플랜</option>
                        {availablePlans.map((planName) => (
                            <option key={planName} value={planName}>
                                {planName}
                            </option>
                        ))}
                    </select>

                    <select
                        value={sort}
                        onChange={(event) => setSort(event.target.value as SortOption)}
                        className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-500"
                    >
                        <option value="name-asc">학교 이름순 (ㄱㄴㄷ)</option>
                        <option value="members-asc">회원 수 적은 순</option>
                        <option value="members-desc">회원 수 많은 순</option>
                        <option value="revenue-asc">매출 낮은 순</option>
                        <option value="revenue-desc">매출 높은 순</option>
                    </select>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
                    <p className="font-bold text-slate-500">
                        검색 결과 <span className="text-emerald-700">{filteredSchools.length}</span>개 기관
                    </p>
                    <button
                        onClick={() => {
                            setSearch("");
                            setStatus("ALL");
                            setPlan("ALL");
                            setSort("name-asc");
                        }}
                        className="font-extrabold text-slate-500 hover:text-emerald-700"
                    >
                        필터 초기화
                    </button>
                </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-emerald-900/10 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1320px] table-fixed text-left text-sm">
                        <colgroup>
                            <col className="w-[220px]" />
                            <col className="w-[115px]" />
                            <col className="w-[145px]" />
                            <col className="w-[130px]" />
                            <col className="w-[120px]" />
                            <col className="w-[110px]" />
                            <col className="w-[150px]" />
                            <col className="w-[145px]" />
                            <col className="w-[135px]" />
                        </colgroup>
                        <thead className="bg-slate-50 text-xs font-extrabold text-slate-500">
                            <tr>
                                <th className="px-5 py-3">학교</th>
                                <th className="px-5 py-3">플랜</th>
                                <th className="px-5 py-3">구독 상태</th>
                                <th className="px-5 py-3">첫 구독일</th>
                                <th className="px-5 py-3">구독 기간</th>
                                <th className="px-5 py-3">회원 수</th>
                                <th className="px-5 py-3">월 매출</th>
                                <th className="px-5 py-3">결제 상태</th>
                                <th className="px-5 py-3">다음 결제일</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {pagedSchools.map((school) => (
                                <tr
                                    key={school.id}
                                    onClick={() => onSelectSchool(school)}
                                    className="cursor-pointer font-semibold text-slate-700 transition hover:bg-emerald-50/60"
                                >
                                    <td className="px-5 py-4">
                                        <p className="truncate font-black text-slate-950" title={school.name}>{school.name}</p>
                                        <p className="mt-1 truncate text-xs text-slate-400" title={school.category}>{school.category}</p>
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-4 font-black">{school.plan ?? "미구독"}</td>
                                    <td className="whitespace-nowrap px-5 py-4">
                                        <SubscriptionBadge value={school.subscriptionStatus} />
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                                        {school.firstSubscribedAt ?? "-"}
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-4">
                                        {getSubscriptionDuration(
                                            school.firstSubscribedAt,
                                            school.subscriptionEndedAt,
                                            school.subscriptionStatus,
                                        )}
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-4">{school.memberCount.toLocaleString()}명</td>
                                    <td className="whitespace-nowrap px-5 py-4 font-black text-slate-950">
                                        {formatCurrency(school.monthlyRevenue)}
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-4">
                                        <PaymentBadge value={school.paymentStatus} />
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">{school.nextBillingAt}</td>
                                </tr>
                            ))}
                            {pagedSchools.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="px-5 py-16 text-center text-sm font-bold text-slate-400">
                                        조건에 맞는 학교가 없습니다.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
                    <p className="text-sm font-bold text-slate-400">
                        {page} / {totalPages} 페이지
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage((current) => Math.max(1, current - 1))}
                            disabled={page === 1}
                            className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="이전 페이지"
                        >
                            <ChevronLeft className="size-4" />
                        </button>
                        {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                            <button
                                key={pageNumber}
                                onClick={() => setPage(pageNumber)}
                                className={`size-9 rounded-lg text-sm font-black ${
                                    page === pageNumber
                                        ? "bg-emerald-700 text-white"
                                        : "border border-slate-200 text-slate-600"
                                }`}
                            >
                                {pageNumber}
                            </button>
                        ))}
                        <button
                            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                            disabled={page === totalPages}
                            className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="다음 페이지"
                        >
                            <ChevronRight className="size-4" />
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}
