"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    Search,
    ShieldAlert,
    ShieldCheck,
} from "lucide-react";
import {
    createAdminPenalty,
    getAdminMemberPenaltyStatus,
    getAdminPenalties,
    releaseAdminPenalty,
    type AdminMemberPenaltyStatus,
    type AdminPenalty,
    type AdminPenaltyPage,
    type AdminPenaltyStatus,
} from "@/lib/adminPenaltyApi";

type PaginationItem = number | "ellipsis";

const STATUS_LABEL: Record<AdminPenaltyStatus, string> = {
    ACTIVE: "진행중",
    PLEDGED: "서약 해소",
    ADMIN_RELEASED: "관리자 면제",
};

const STATUS_STYLE: Record<AdminPenaltyStatus, string> = {
    ACTIVE: "bg-rose-100 text-rose-600",
    PLEDGED: "bg-sky-100 text-sky-700",
    ADMIN_RELEASED: "bg-primary/10 text-primary",
};

const TYPE_LABEL: Record<AdminPenalty["penaltyType"], string> = {
    NO_SHOW: "자동(노쇼)",
    MANUAL: "수동 부과",
};

function buildPaginationItems(page: number, totalPages: number): PaginationItem[] {
    const WINDOW = 5;
    if (totalPages <= WINDOW + 2) {
        return Array.from({ length: totalPages }, (_, index) => index);
    }

    const lastPage = totalPages - 1;
    const start = Math.min(Math.max(page - Math.floor(WINDOW / 2), 0), totalPages - WINDOW);
    const end = start + WINDOW - 1;
    const items: PaginationItem[] = [];

    if (start > 0) {
        items.push(0);
        if (start > 1) items.push("ellipsis");
    }
    for (let pageNumber = start; pageNumber <= end; pageNumber += 1) {
        items.push(pageNumber);
    }
    if (end < lastPage) {
        if (end < lastPage - 1) items.push("ellipsis");
        items.push(lastPage);
    }

    return items;
}

function formatDateTime(value: string) {
    return new Date(value).toLocaleString("ko-KR");
}

export default function PenaltyManagementView() {
    const [search, setSearch] = useState("");
    const [keyword, setKeyword] = useState("");
    const [status, setStatus] = useState<"ALL" | AdminPenaltyStatus>("ALL");
    const [page, setPage] = useState(0);
    const [result, setResult] = useState<AdminPenaltyPage | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [processingPenaltyId, setProcessingPenaltyId] = useState<number | null>(null);
    const [creating, setCreating] = useState(false);

    const [lookupMemberId, setLookupMemberId] = useState("");
    const [lookupResult, setLookupResult] = useState<AdminMemberPenaltyStatus | null>(null);
    const [lookupLoading, setLookupLoading] = useState(false);
    const [lookupError, setLookupError] = useState("");

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setKeyword(search.trim());
            setPage(0);
        }, 300);
        return () => window.clearTimeout(timer);
    }, [search]);

    const loadPenalties = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            setResult(
                await getAdminPenalties({
                    page,
                    keyword: keyword || undefined,
                    status: status === "ALL" ? undefined : status,
                }),
            );
        } catch (loadError) {
            console.error("Failed to load penalties.", loadError);
            setError("페널티 목록을 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    }, [keyword, page, status]);

    useEffect(() => {
        void loadPenalties();
    }, [loadPenalties]);

    const paginationItems = useMemo(
        () => buildPaginationItems(page, result?.totalPages ?? 0),
        [page, result?.totalPages],
    );

    const release = async (penalty: AdminPenalty) => {
        if (
            !window.confirm(
                `${penalty.memberName}님의 페널티를 면제할까요?\n\n` +
                    "면제 후 해당 회원은 즉시 예약 제한이 해제됩니다.",
            )
        ) {
            return;
        }

        setProcessingPenaltyId(penalty.penaltyId);
        try {
            await releaseAdminPenalty(penalty.penaltyId);
            await loadPenalties();
        } catch (releaseError) {
            console.error("Failed to release penalty.", releaseError);
            window.alert("페널티를 면제하지 못했습니다.");
        } finally {
            setProcessingPenaltyId(null);
        }
    };

    const createPenalty = async () => {
        const memberIdInput = window.prompt("페널티를 부과할 회원 ID를 입력하세요.");
        if (!memberIdInput?.trim()) return;

        const memberId = Number(memberIdInput.trim());
        if (!Number.isInteger(memberId) || memberId <= 0) {
            window.alert("올바른 회원 ID를 입력하세요.");
            return;
        }

        const reason = window.prompt("페널티 부과 사유를 입력하세요.");
        if (!reason?.trim()) return;

        setCreating(true);
        try {
            await createAdminPenalty(memberId, reason.trim());
            await loadPenalties();
        } catch (createError) {
            console.error("Failed to create penalty.", createError);
            window.alert("페널티를 부과하지 못했습니다.");
        } finally {
            setCreating(false);
        }
    };

    const lookupMemberStatus = async () => {
        if (!lookupMemberId.trim()) return;

        const memberId = Number(lookupMemberId.trim());
        if (!Number.isInteger(memberId) || memberId <= 0) {
            setLookupError("올바른 회원 ID를 입력하세요.");
            setLookupResult(null);
            return;
        }

        setLookupLoading(true);
        setLookupError("");
        try {
            setLookupResult(await getAdminMemberPenaltyStatus(memberId));
        } catch (lookupErr) {
            console.error("Failed to load member penalty status.", lookupErr);
            setLookupError("회원의 차단 상태를 불러오지 못했습니다.");
            setLookupResult(null);
        } finally {
            setLookupLoading(false);
        }
    };

    return (
        <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight">노쇼 페널티 관리</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        시설 예약 노쇼 페널티 현황을 조회하고 수동으로 부과·면제할 수 있습니다.
                    </p>
                </div>
                <button
                    onClick={() => void createPenalty()}
                    disabled={creating}
                    className="h-11 shrink-0 rounded-lg bg-primary px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                    {creating ? "처리 중" : "페널티 수동 부과"}
                </button>
            </div>

            <section className="rounded-2xl border border-primary/10 bg-white p-5 shadow-sm">
                <p className="text-sm font-black text-slate-800">회원별 현재 차단 상태 조회</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
                    <input
                        value={lookupMemberId}
                        onChange={(event) =>
                            setLookupMemberId(event.target.value.replace(/[^0-9]/g, ""))
                        }
                        placeholder="회원 ID 입력"
                        inputMode="numeric"
                        className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-primary"
                    />
                    <button
                        onClick={() => void lookupMemberStatus()}
                        disabled={lookupLoading || !lookupMemberId.trim()}
                        className="h-11 rounded-lg border border-slate-200 px-5 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {lookupLoading ? "조회 중" : "조회"}
                    </button>
                </div>
                {lookupError && (
                    <p className="mt-3 text-sm font-bold text-rose-600">{lookupError}</p>
                )}
                {lookupResult && (
                    <div
                        className={`mt-4 flex items-center gap-3 rounded-xl p-4 ${
                            lookupResult.blocked ? "bg-rose-50" : "bg-primary/5"
                        }`}
                    >
                        {lookupResult.blocked ? (
                            <ShieldAlert className="size-6 shrink-0 text-rose-600" />
                        ) : (
                            <ShieldCheck className="size-6 shrink-0 text-primary" />
                        )}
                        <div>
                            <p className="font-black text-slate-900">{lookupResult.memberName}</p>
                            <p className="mt-0.5 text-sm font-semibold text-slate-600">
                                활성 페널티 {lookupResult.activePenaltyCount} /{" "}
                                {lookupResult.blockThreshold}건
                                {lookupResult.blocked ? " · 예약 차단 중" : " · 정상 이용 가능"}
                            </p>
                        </div>
                    </div>
                )}
            </section>

            <section className="rounded-2xl border border-primary/10 bg-white p-5 shadow-sm">
                <div className="grid gap-3 lg:grid-cols-[1fr_180px]">
                    <label className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="회원명, 로그인 ID 검색"
                            className="h-11 w-full rounded-lg border border-slate-200 pl-10 pr-3 text-sm font-semibold outline-none focus:border-primary"
                        />
                    </label>
                    <select
                        value={status}
                        onChange={(event) => {
                            setStatus(event.target.value as typeof status);
                            setPage(0);
                        }}
                        className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-primary"
                    >
                        <option value="ALL">전체 상태</option>
                        <option value="ACTIVE">진행중</option>
                        <option value="PLEDGED">서약 해소</option>
                        <option value="ADMIN_RELEASED">관리자 면제</option>
                    </select>
                </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-primary/10 bg-white shadow-sm">
                {error ? (
                    <div className="flex min-h-72 flex-col items-center justify-center p-6 text-center">
                        <AlertTriangle className="size-7 text-rose-500" />
                        <p className="mt-3 font-black text-slate-900">{error}</p>
                        <button
                            onClick={() => void loadPenalties()}
                            className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-black text-white"
                        >
                            <RefreshCw className="size-4" />
                            다시 시도
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1080px] table-fixed text-left text-sm">
                                <colgroup>
                                    <col className="w-[140px]" />
                                    <col className="w-[150px]" />
                                    <col className="w-[110px]" />
                                    <col className="w-[260px]" />
                                    <col className="w-[110px]" />
                                    <col className="w-[260px]" />
                                    <col className="w-[120px]" />
                                </colgroup>
                                <thead className="bg-slate-50 text-xs font-extrabold text-slate-500">
                                    <tr>
                                        <th className="px-5 py-3">회원</th>
                                        <th className="px-5 py-3">로그인 ID</th>
                                        <th className="px-5 py-3">유형</th>
                                        <th className="px-5 py-3">사유</th>
                                        <th className="px-5 py-3">상태</th>
                                        <th className="px-5 py-3">기간</th>
                                        <th className="px-5 py-3">관리</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={7} className="px-5 py-16 text-center">
                                                <RefreshCw className="mx-auto size-6 animate-spin text-primary" />
                                            </td>
                                        </tr>
                                    ) : (
                                        result?.content.map((penalty) => (
                                            <tr key={penalty.penaltyId} className="font-semibold text-slate-700">
                                                <td className="px-5 py-4 font-black text-slate-950">
                                                    {penalty.memberName}
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-4">
                                                    {penalty.loginId}
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                                                    {TYPE_LABEL[penalty.penaltyType]}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className="line-clamp-2">{penalty.reason}</span>
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-4">
                                                    <span
                                                        className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${STATUS_STYLE[penalty.status]}`}
                                                    >
                                                        {STATUS_LABEL[penalty.status]}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 text-xs text-slate-500">
                                                    {formatDateTime(penalty.startTime)}
                                                    <br />~ {formatDateTime(penalty.endTime)}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <button
                                                        onClick={() => void release(penalty)}
                                                        disabled={
                                                            penalty.status !== "ACTIVE" ||
                                                            processingPenaltyId === penalty.penaltyId
                                                        }
                                                        className="h-9 whitespace-nowrap rounded-lg border border-primary/20 px-3 text-xs font-black text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                                                    >
                                                        {processingPenaltyId === penalty.penaltyId
                                                            ? "처리 중"
                                                            : "면제 처리"}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                    {!loading && result?.content.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-5 py-12 text-center font-bold text-slate-400">
                                                조건에 맞는 페널티가 없습니다.
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
                                    onClick={() => setPage((current) => Math.max(0, current - 1))}
                                    disabled={result?.first ?? true}
                                    className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                                    aria-label="이전 페이지"
                                >
                                    <ChevronLeft className="size-4" />
                                </button>
                                {paginationItems.map((item, index) =>
                                    typeof item === "number" ? (
                                        <button
                                            key={item}
                                            onClick={() => setPage(item)}
                                            className={`size-9 rounded-lg text-sm font-black ${
                                                page === item
                                                    ? "bg-primary text-white"
                                                    : "border border-slate-200 text-slate-600"
                                            }`}
                                            aria-current={page === item ? "page" : undefined}
                                        >
                                            {item + 1}
                                        </button>
                                    ) : (
                                        <span
                                            key={`ellipsis-${index}`}
                                            className="flex size-7 items-center justify-center text-sm font-black text-slate-400"
                                        >
                                            ...
                                        </span>
                                    ),
                                )}
                                <button
                                    onClick={() =>
                                        setPage((current) =>
                                            Math.min(Math.max(0, (result?.totalPages ?? 1) - 1), current + 1),
                                        )
                                    }
                                    disabled={result?.last ?? true}
                                    className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                                    aria-label="다음 페이지"
                                >
                                    <ChevronRight className="size-4" />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </section>
        </div>
    );
}
