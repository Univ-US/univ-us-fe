"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    Check,
    ChevronDown,
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

function FilterDropdown<T extends string>({
    label,
    options,
    value,
    open,
    onToggle,
    onChange,
}: {
    label: string;
    options: { label: string; value: T }[];
    value: T;
    open: boolean;
    onToggle: () => void;
    onChange: (value: T) => void;
}) {
    const selectedLabel = options.find((option) => option.value === value)?.label ?? label;

    return (
        <div className="relative" data-penalty-filter-dropdown>
            <button
                type="button"
                onClick={onToggle}
                className={`flex h-10 w-full items-center justify-between gap-3 rounded-lg border px-3 text-sm font-bold transition-all ${
                    open
                        ? "border-primary bg-white text-primary ring-2 ring-primary/15"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-primary/20 hover:bg-white"
                }`}
                aria-expanded={open}
            >
                <span className="flex min-w-0 items-center gap-2">
                    <span className="text-xs font-black text-slate-400">{label}</span>
                    <span className="truncate">{selectedLabel}</span>
                </span>
                <ChevronDown className={`size-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180 text-primary" : ""}`} />
            </button>

            {open && (
                <div className="absolute left-0 top-12 z-30 w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10 animate-in fade-in slide-in-from-top-1 duration-150">
                    {options.map((option) => {
                        const selected = option.value === value;
                        return (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => onChange(option.value)}
                                className={`flex h-9 w-full items-center justify-between rounded-lg px-2.5 text-left text-sm font-bold transition-colors ${
                                    selected
                                        ? "bg-primary/10 text-primary"
                                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                                }`}
                            >
                                <span>{option.label}</span>
                                {selected && <Check className="size-4" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

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
    const [statusFilterOpen, setStatusFilterOpen] = useState(false);

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

    useEffect(() => {
        if (!statusFilterOpen) return;

        const closeOnOutsideClick = (event: MouseEvent) => {
            if ((event.target as HTMLElement).closest("[data-penalty-filter-dropdown]")) return;
            setStatusFilterOpen(false);
        };

        document.addEventListener("mousedown", closeOnOutsideClick);
        return () => document.removeEventListener("mousedown", closeOnOutsideClick);
    }, [statusFilterOpen]);

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
        <div className="space-y-6">
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
                    className="h-10 shrink-0 rounded-lg bg-primary px-5 text-sm font-black text-white shadow-sm shadow-primary/10 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                >
                    {creating ? "처리 중" : "페널티 수동 부과"}
                </button>
            </div>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-black text-slate-800">회원별 현재 차단 상태 조회</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
                    <input
                        value={lookupMemberId}
                        onChange={(event) =>
                            setLookupMemberId(event.target.value.replace(/[^0-9]/g, ""))
                        }
                        placeholder="회원 ID 입력"
                        inputMode="numeric"
                        className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none transition-colors focus:border-primary focus:bg-white"
                    />
                    <button
                        onClick={() => void lookupMemberStatus()}
                        disabled={lookupLoading || !lookupMemberId.trim()}
                        className="h-10 rounded-lg border border-slate-200 px-5 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
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

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="grid gap-3 lg:grid-cols-[1fr_180px]">
                    <label className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="회원명, 로그인 ID 검색"
                            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-semibold outline-none transition-colors focus:border-primary focus:bg-white"
                        />
                    </label>
                    <FilterDropdown
                        label="상태"
                        value={status}
                        open={statusFilterOpen}
                        onToggle={() => setStatusFilterOpen((open) => !open)}
                        onChange={(nextStatus) => {
                            setStatus(nextStatus);
                            setPage(0);
                            setStatusFilterOpen(false);
                        }}
                        options={[
                            { label: "전체 상태", value: "ALL" },
                            { label: STATUS_LABEL.ACTIVE, value: "ACTIVE" },
                            { label: STATUS_LABEL.PLEDGED, value: "PLEDGED" },
                            { label: STATUS_LABEL.ADMIN_RELEASED, value: "ADMIN_RELEASED" },
                        ]}
                    />
                </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
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
                                <thead className="border-b border-slate-100 bg-slate-50/80 text-xs font-extrabold text-slate-500">
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

                        <div className="flex items-center justify-center border-t border-slate-100 px-5 py-3">
                            <div className="flex flex-wrap items-center justify-center gap-1">
                                <button
                                    onClick={() => setPage((current) => Math.max(0, current - 1))}
                                    disabled={result?.first ?? true}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-200"
                                    aria-label="이전 페이지"
                                >
                                    ‹
                                </button>
                                {paginationItems.map((item, index) =>
                                    typeof item === "number" ? (
                                        <button
                                            key={item}
                                            onClick={() => setPage(item)}
                                            className={`h-8 w-8 rounded-lg text-xs font-bold ${
                                                page === item
                                                    ? "bg-primary text-white"
                                                    : "text-slate-500 hover:bg-slate-50"
                                            }`}
                                            aria-current={page === item ? "page" : undefined}
                                        >
                                            {item + 1}
                                        </button>
                                    ) : (
                                        <span
                                            key={`ellipsis-${index}`}
                                            className="flex h-8 w-8 items-center justify-center text-xs font-bold text-slate-400"
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
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-200"
                                    aria-label="다음 페이지"
                                >
                                    ›
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </section>
        </div>
    );
}
