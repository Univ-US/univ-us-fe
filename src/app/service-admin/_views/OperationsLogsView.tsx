"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    CircleAlert,
    Clock3,
    CreditCard,
    LogIn,
    RefreshCw,
    Search,
    X,
} from "lucide-react";
import {
    getServiceAdminOperationLogs,
    type ServiceAdminOperationLog,
    type ServiceAdminOperationLogAction,
    type ServiceAdminOperationLogCategory,
    type ServiceAdminOperationLogPage,
    type ServiceAdminOperationLogPeriod,
    type ServiceAdminOperationLogQuery,
    type ServiceAdminOperationLogResult,
} from "@/lib/serviceAdminApi";
import { formatCurrency } from "../_components";

type PaginationItem = number | "ellipsis-start" | "ellipsis-end";

const PAGE_WINDOW_SIZE = 5;
const PAGE_JUMP_SIZE = 10;

const CATEGORY_LABEL: Record<ServiceAdminOperationLogCategory, string> = {
    ACCESS: "접근",
    PAYMENT: "구독결제",
};

const RESULT_LABEL: Record<ServiceAdminOperationLogResult, string> = {
    SUCCESS: "성공",
    FAILURE: "실패",
    SCHEDULED: "예정",
};

const RESULT_STYLE: Record<ServiceAdminOperationLogResult, string> = {
    SUCCESS: "bg-emerald-100 text-emerald-700",
    FAILURE: "bg-rose-100 text-rose-700",
    SCHEDULED: "bg-blue-100 text-blue-700",
};

const ACTION_LABEL: Record<ServiceAdminOperationLogAction, string> = {
    LOGIN_SUCCESS: "로그인 성공",
    LOGOUT: "로그아웃",
    LOGIN_FAILED: "로그인 실패",
    PAYMENT_PAID: "결제완료",
    PAYMENT_FAILED: "결제실패",
    PAYMENT_READY: "결제예정",
    PAYMENT_CANCELED: "결제취소",
    PAYMENT_REFUNDED: "환불완료",
    PAYMENT: "결제",
};

const ACTION_STYLE: Record<ServiceAdminOperationLogAction, string> = {
    LOGIN_SUCCESS: "bg-emerald-100 text-emerald-700",
    LOGOUT: "bg-slate-100 text-slate-600",
    LOGIN_FAILED: "bg-rose-100 text-rose-700",
    PAYMENT_PAID: "bg-emerald-100 text-emerald-700",
    PAYMENT_FAILED: "bg-rose-100 text-rose-700",
    PAYMENT_READY: "bg-blue-100 text-blue-700",
    PAYMENT_CANCELED: "bg-amber-100 text-amber-700",
    PAYMENT_REFUNDED: "bg-violet-100 text-violet-700",
    PAYMENT: "bg-slate-100 text-slate-600",
};

const ROLE_LABEL: Record<string, string> = {
    SUA: "서비스 관리자",
    ADM: "학교 관리자",
    PROF: "교수",
    STU: "학생",
    ALU: "졸업생",
    GUEST: "신청자",
};

const STATUS_LABEL: Record<string, string> = {
    ACTIVE: "활성",
    SUSPENDED: "정지",
    READY: "결제예정",
    PAID: "결제완료",
    FAILED: "결제실패",
    CANCELED: "결제취소",
    REFUNDED: "환불완료",
};

function formatDateTime(value: string | null) {
    if (!value) return "확인불가";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("ko-KR");
}

function display(value: string | number | null | undefined) {
    if (value === null || value === undefined || value === "") {
        return "확인불가";
    }
    return String(value);
}

function formatOptionalCurrency(value: number | null) {
    return value === null ? "확인불가" : formatCurrency(value);
}

function DetailRow({
    label,
    value,
}: {
    label: string;
    value: string | number | null | undefined;
}) {
    return (
        <div className="grid grid-cols-[120px_1fr] gap-3 border-b border-slate-100 py-3 text-sm">
            <dt className="font-bold text-slate-400">{label}</dt>
            <dd className="break-all text-right font-extrabold text-slate-700">
                {display(value)}
            </dd>
        </div>
    );
}

function Badge({
    label,
    className,
    widthClass = "min-w-[64px]",
}: {
    label: string;
    className: string;
    widthClass?: string;
}) {
    return (
        <span className={`inline-flex h-7 items-center justify-center whitespace-nowrap rounded-full px-3 text-xs font-black ${widthClass} ${className}`}>
            {label}
        </span>
    );
}

function getMemberLabel(log: ServiceAdminOperationLog) {
    return log.memberName ?? log.loginId ?? "확인불가";
}

function getSchoolLabel(log: ServiceAdminOperationLog) {
    return log.univName ?? "확인불가";
}

function getIdentifierLabel(log: ServiceAdminOperationLog) {
    if (log.category === "PAYMENT") return log.merchantUid ?? "확인불가";
    return log.loginId ?? "확인불가";
}

export default function OperationsLogsView() {
    const [search, setSearch] = useState("");
    const [keyword, setKeyword] = useState("");
    const [category, setCategory] =
        useState<"ALL" | ServiceAdminOperationLogCategory>("ALL");
    const [result, setResult] =
        useState<"ALL" | ServiceAdminOperationLogResult>("ALL");
    const [period, setPeriod] =
        useState<ServiceAdminOperationLogPeriod>("30");
    const [page, setPage] = useState(0);
    const [data, setData] = useState<ServiceAdminOperationLogPage | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedLog, setSelectedLog] =
        useState<ServiceAdminOperationLog | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setKeyword(search.trim());
            setPage(0);
        }, 300);
        return () => window.clearTimeout(timer);
    }, [search]);

    const loadLogs = useCallback(async () => {
        setLoading(true);
        setError("");

        const params: ServiceAdminOperationLogQuery = {
            page,
            keyword: keyword || undefined,
            category: category === "ALL" ? undefined : category,
            result: result === "ALL" ? undefined : result,
            period,
        };

        try {
            setData(await getServiceAdminOperationLogs(params));
        } catch (loadError) {
            console.error("Failed to load service admin operation logs.", loadError);
            setError("운영 로그를 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    }, [category, keyword, page, period, result]);

    useEffect(() => {
        void loadLogs();
    }, [loadLogs]);

    useEffect(() => {
        if (data && data.totalPages > 0 && page >= data.totalPages) {
            setPage(data.totalPages - 1);
        }
    }, [data, page]);

    useEffect(() => {
        if (!selectedLog) return;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "";
        };
    }, [selectedLog]);

    const closeDetail = () => {
        setIsDetailOpen(false);
        closeTimerRef.current = setTimeout(() => {
            setSelectedLog(null);
            closeTimerRef.current = null;
        }, 300);
    };

    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape" && isDetailOpen) {
                closeDetail();
            }
        };
        window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    });

    useEffect(() => {
        return () => {
            if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
            document.body.style.overflow = "";
        };
    }, []);

    const paginationItems = useMemo<PaginationItem[]>(() => {
        const totalPages = data?.totalPages ?? 0;
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
    }, [data?.totalPages, page]);

    const openDetail = (log: ServiceAdminOperationLog) => {
        if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
        setSelectedLog(log);
        requestAnimationFrame(() => {
            requestAnimationFrame(() => setIsDetailOpen(true));
        });
    };

    const resetFilters = () => {
        setSearch("");
        setKeyword("");
        setCategory("ALL");
        setResult("ALL");
        setPeriod("30");
        setPage(0);
    };

    const logs = data?.content ?? [];
    const totalPages = data?.totalPages ?? 0;

    return (
        <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight">운영 로그</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        로그인/로그아웃과 구독 결제 이력을 같은 기준으로 조회합니다.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => void loadLogs()}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                    <RefreshCw className="size-4" />
                    새로고침
                </button>
            </div>

            <div className="flex flex-wrap gap-3">
                {[
                    {
                        label: "전체",
                        value: data?.totalCount ?? 0,
                        icon: Clock3,
                        color: "text-slate-700",
                    },
                    {
                        label: "성공",
                        value: data?.successCount ?? 0,
                        icon: CheckCircle2,
                        color: "text-emerald-700",
                    },
                    {
                        label: "실패",
                        value: data?.failureCount ?? 0,
                        icon: CircleAlert,
                        color: "text-rose-600",
                    },
                    {
                        label: "예정",
                        value: data?.scheduledCount ?? 0,
                        icon: CreditCard,
                        color: "text-blue-700",
                    },
                ].map(({ label, value, icon: Icon, color }) => (
                    <section
                        key={label}
                        className="flex h-16 min-w-[170px] flex-1 items-center justify-between rounded-xl border border-emerald-900/10 bg-white px-5 shadow-sm"
                    >
                        <div>
                            <p className="text-xs font-extrabold text-slate-400">{label}</p>
                            <p className={`mt-1 text-xl font-black ${color}`}>
                                {value.toLocaleString("ko-KR")}
                            </p>
                        </div>
                        <Icon className={`size-4 ${color}`} />
                    </section>
                ))}
            </div>

            <section className="rounded-xl border border-emerald-900/10 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                    <label className="relative min-w-[320px] flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="회원명, 로그인ID, 학교명, 주문번호, 결제ID 검색"
                            className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-semibold outline-none focus:border-emerald-500 focus:bg-white"
                        />
                    </label>

                    <select
                        value={category}
                        onChange={(event) => {
                            setCategory(event.target.value as typeof category);
                            setPage(0);
                        }}
                        className="h-11 w-[140px] rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"
                    >
                        <option value="ALL">전체 종류</option>
                        <option value="ACCESS">접근</option>
                        <option value="PAYMENT">구독결제</option>
                    </select>

                    <select
                        value={result}
                        onChange={(event) => {
                            setResult(event.target.value as typeof result);
                            setPage(0);
                        }}
                        className="h-11 w-[140px] rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"
                    >
                        <option value="ALL">전체 결과</option>
                        <option value="SUCCESS">성공</option>
                        <option value="FAILURE">실패</option>
                        <option value="SCHEDULED">예정</option>
                    </select>

                    <select
                        value={period}
                        onChange={(event) => {
                            setPeriod(event.target.value as ServiceAdminOperationLogPeriod);
                            setPage(0);
                        }}
                        className="h-11 w-[150px] rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"
                    >
                        <option value="1">최근 1일</option>
                        <option value="7">최근 7일</option>
                        <option value="30">최근 30일</option>
                        <option value="90">최근 90일</option>
                        <option value="ALL">전체</option>
                    </select>

                    <button
                        type="button"
                        onClick={resetFilters}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-600 hover:bg-slate-50"
                    >
                        <X className="size-4" />
                        초기화
                    </button>
                </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-emerald-900/10 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1080px] table-fixed text-left text-sm">
                        <colgroup>
                            <col className="w-[190px]" />
                            <col className="w-[120px]" />
                            <col className="w-[140px]" />
                            <col className="w-[110px]" />
                            <col className="w-[150px]" />
                            <col className="w-[190px]" />
                            <col />
                        </colgroup>
                        <thead className="bg-slate-50 text-xs font-black uppercase text-slate-400">
                            <tr>
                                <th className="px-5 py-3">시간</th>
                                <th className="px-5 py-3">종류</th>
                                <th className="px-5 py-3">작업</th>
                                <th className="px-5 py-3">결과</th>
                                <th className="px-5 py-3">회원</th>
                                <th className="px-5 py-3">학교</th>
                                <th className="px-5 py-3">식별값</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading && (
                                <tr>
                                    <td colSpan={7} className="px-5 py-12 text-center text-sm font-bold text-slate-400">
                                        운영 로그를 불러오는 중입니다.
                                    </td>
                                </tr>
                            )}
                            {!loading && error && (
                                <tr>
                                    <td colSpan={7} className="px-5 py-12 text-center">
                                        <p className="text-sm font-bold text-rose-600">{error}</p>
                                        <button
                                            type="button"
                                            onClick={() => void loadLogs()}
                                            className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-extrabold text-white"
                                        >
                                            다시 시도
                                        </button>
                                    </td>
                                </tr>
                            )}
                            {!loading && !error && logs.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-5 py-12 text-center text-sm font-bold text-slate-400">
                                        조건에 맞는 운영 로그가 없습니다.
                                    </td>
                                </tr>
                            )}
                            {!loading && !error && logs.map((log) => (
                                <tr
                                    key={log.id}
                                    onClick={() => openDetail(log)}
                                    className="cursor-pointer hover:bg-emerald-50/50"
                                >
                                    <td className="whitespace-nowrap px-5 py-4 font-bold text-slate-700">
                                        {formatDateTime(log.occurredAt)}
                                    </td>
                                    <td className="px-5 py-4">
                                        <Badge
                                            label={CATEGORY_LABEL[log.category]}
                                            widthClass="min-w-[76px]"
                                            className={
                                                log.category === "ACCESS"
                                                    ? "bg-slate-100 text-slate-700"
                                                    : "bg-indigo-100 text-indigo-700"
                                            }
                                        />
                                    </td>
                                    <td className="px-5 py-4">
                                        <Badge
                                            label={ACTION_LABEL[log.action]}
                                            widthClass="min-w-[92px]"
                                            className={ACTION_STYLE[log.action]}
                                        />
                                    </td>
                                    <td className="px-5 py-4">
                                        <Badge
                                            label={RESULT_LABEL[log.result]}
                                            widthClass="min-w-[64px]"
                                            className={RESULT_STYLE[log.result]}
                                        />
                                    </td>
                                    <td className="px-5 py-4 font-extrabold text-slate-800">
                                        {getMemberLabel(log)}
                                    </td>
                                    <td className="px-5 py-4 font-bold text-slate-600">
                                        {getSchoolLabel(log)}
                                    </td>
                                    <td className="max-w-[260px] truncate px-5 py-4 font-mono text-xs font-bold text-slate-500">
                                        {getIdentifierLabel(log)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 md:flex-row md:items-center md:justify-between">
                    <p className="text-sm font-bold text-slate-500">
                        {(data?.totalPages ?? 0) === 0 ? 0 : page + 1} /{" "}
                        {data?.totalPages ?? 0} 페이지 · 총{" "}
                        {(data?.totalElements ?? 0).toLocaleString("ko-KR")}건
                    </p>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setPage(0)}
                            disabled={page === 0}
                            className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="맨 앞 페이지"
                            title="맨 앞 페이지"
                        >
                            <ChevronsLeft className="size-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setPage((current) => current - PAGE_JUMP_SIZE)}
                            disabled={page < PAGE_JUMP_SIZE}
                            className="flex h-9 min-w-11 items-center justify-center rounded-lg border border-slate-200 px-2 text-xs font-black text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="10페이지 앞으로"
                            title="10페이지 앞으로"
                        >
                            -10
                        </button>
                        <button
                            type="button"
                            onClick={() => setPage(Math.max(page - 1, 0))}
                            disabled={data?.first ?? true}
                            className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="이전 페이지"
                        >
                            <ChevronLeft className="size-4" />
                        </button>
                        {paginationItems.map((item) =>
                            typeof item === "number" ? (
                                <button
                                    key={item}
                                    type="button"
                                    onClick={() => setPage(item)}
                                    className={`size-9 rounded-lg text-sm font-black ${
                                        item === page
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
                            type="button"
                            onClick={() =>
                                setPage((current) =>
                                    Math.min(Math.max(0, totalPages - 1), current + 1),
                                )
                            }
                            disabled={data?.last ?? true}
                            className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="다음 페이지"
                        >
                            <ChevronRight className="size-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() =>
                                setPage((current) =>
                                    Math.min(Math.max(0, totalPages - 1), current + PAGE_JUMP_SIZE),
                                )
                            }
                            disabled={page + PAGE_JUMP_SIZE >= totalPages}
                            aria-label="10페이지 다음"
                            title="10페이지 다음"
                            className="flex h-9 min-w-11 items-center justify-center rounded-lg border border-slate-200 px-2 text-xs font-black text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            +10
                        </button>
                        <button
                            type="button"
                            onClick={() => setPage(Math.max(totalPages - 1, 0))}
                            disabled={data?.last ?? true}
                            className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="맨 뒤 페이지"
                            title="맨 뒤 페이지"
                        >
                            <ChevronsRight className="size-4" />
                        </button>
                    </div>
                </div>
            </section>

            {selectedLog && (
                <div
                    className={`fixed inset-0 z-50 transition ${
                        isDetailOpen ? "pointer-events-auto" : "pointer-events-none"
                    }`}
                    aria-hidden={!isDetailOpen}
                >
                    <button
                        type="button"
                        className={`absolute inset-0 bg-slate-950/35 backdrop-blur-[1px] transition-opacity duration-300 ${
                            isDetailOpen ? "opacity-100" : "opacity-0"
                        }`}
                        onClick={closeDetail}
                        aria-label="상세 닫기"
                    />
                    <aside
                        role="dialog"
                        aria-modal="true"
                        aria-label={`${ACTION_LABEL[selectedLog.action]} 운영 로그 상세`}
                        className={`absolute inset-y-0 right-0 flex w-full max-w-[640px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
                            isDetailOpen ? "translate-x-0" : "translate-x-full"
                        }`}
                    >
                        <div className="flex items-start justify-between border-b border-slate-100 px-7 py-6">
                            <div>
                                <p className="text-xs font-extrabold text-emerald-700">
                                    운영 로그 상세
                                </p>
                                <h2 className="mt-2 text-2xl font-black">
                                    {ACTION_LABEL[selectedLog.action]}
                                </h2>
                                <p className="mt-1 text-sm font-semibold text-slate-400">
                                    {formatDateTime(selectedLog.occurredAt)}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <Badge
                                    label={RESULT_LABEL[selectedLog.result]}
                                    className={RESULT_STYLE[selectedLog.result]}
                                />
                                <button
                                    type="button"
                                    onClick={closeDetail}
                                    className="flex size-10 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                    aria-label="닫기"
                                >
                                    <X className="size-5" />
                                </button>
                            </div>
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto px-7 py-6">
                            <section className="rounded-2xl bg-[#f4faf7] p-5">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-xs font-extrabold text-emerald-800">
                                        기본 정보
                                    </p>
                                    <div className="flex flex-wrap justify-end gap-2">
                                        <Badge
                                            label={CATEGORY_LABEL[selectedLog.category]}
                                            className={
                                                selectedLog.category === "ACCESS"
                                                    ? "bg-slate-100 text-slate-700"
                                                    : "bg-indigo-100 text-indigo-700"
                                            }
                                        />
                                        <Badge
                                            label={ACTION_LABEL[selectedLog.action]}
                                            className={ACTION_STYLE[selectedLog.action]}
                                        />
                                    </div>
                                </div>
                                <dl className="mt-5 grid gap-x-6 gap-y-5 sm:grid-cols-2">
                                    {[
                                        ["로그 ID", selectedLog.id],
                                        ["원천 ID", selectedLog.sourceId],
                                        ["회원명", selectedLog.memberName],
                                        ["로그인 ID", selectedLog.loginId],
                                        [
                                            "역할",
                                            selectedLog.role
                                                ? ROLE_LABEL[selectedLog.role] ?? selectedLog.role
                                                : null,
                                        ],
                                        [
                                            "회원 상태",
                                            selectedLog.memberStatus
                                                ? STATUS_LABEL[selectedLog.memberStatus] ?? selectedLog.memberStatus
                                                : null,
                                        ],
                                        ["학교 ID", selectedLog.univId],
                                        ["학교명", selectedLog.univName],
                                    ].map(([label, value]) => (
                                        <div key={label}>
                                            <dt className="text-xs font-extrabold text-slate-400">
                                                {label}
                                            </dt>
                                            <dd className="mt-1.5 break-all text-sm font-black text-slate-800">
                                                {display(value)}
                                            </dd>
                                        </div>
                                    ))}
                                </dl>
                            </section>

                            {selectedLog.category === "ACCESS" && (
                                <section className="mt-6 rounded-2xl border border-slate-200 p-5">
                                    <h3 className="text-sm font-black text-slate-900">접근 정보</h3>
                                    <dl className="mt-2">
                                        <DetailRow label="작업" value={ACTION_LABEL[selectedLog.action]} />
                                        <DetailRow label="결과" value={RESULT_LABEL[selectedLog.result]} />
                                        <DetailRow label="실패 사유" value={selectedLog.failReasonLabel} />
                                        <DetailRow label="원본 코드" value={selectedLog.failReason} />
                                    </dl>
                                </section>
                            )}

                            {selectedLog.category === "PAYMENT" && (
                                <section className="mt-6 rounded-2xl border border-slate-200 p-5">
                                    <h3 className="text-sm font-black text-slate-900">결제 정보</h3>
                                    <dl className="mt-2">
                                        <DetailRow label="구독 ID" value={selectedLog.subscriptionId} />
                                        <DetailRow
                                            label="결제 상태"
                                            value={
                                                selectedLog.paymentStatus
                                                    ? STATUS_LABEL[selectedLog.paymentStatus] ?? selectedLog.paymentStatus
                                                    : null
                                            }
                                        />
                                        <DetailRow label="주문번호" value={selectedLog.merchantUid} />
                                        <DetailRow label="PortOne 결제 ID" value={selectedLog.portonePaymentId} />
                                        <DetailRow label="PortOne 예약 ID" value={selectedLog.portoneScheduleId} />
                                        <DetailRow label="금액" value={formatOptionalCurrency(selectedLog.amount)} />
                                        <DetailRow label="플랜" value={selectedLog.planName} />
                                        <DetailRow label="결제 완료 시각" value={formatDateTime(selectedLog.paidAt)} />
                                        <DetailRow label="다음 결제 예정일" value={formatDateTime(selectedLog.nextBillingAt)} />
                                        <DetailRow label="실패 사유" value={selectedLog.failReasonLabel} />
                                        <DetailRow label="원본 실패 사유" value={selectedLog.failReason} />
                                        <DetailRow label="환불 시각" value={formatDateTime(selectedLog.refundedAt)} />
                                        <DetailRow label="환불 금액" value={formatOptionalCurrency(selectedLog.refundAmount)} />
                                        <DetailRow label="환불 사유" value={selectedLog.refundReason} />
                                        <DetailRow label="PortOne 취소 ID" value={selectedLog.portoneCancellationId} />
                                    </dl>
                                </section>
                            )}
                        </div>

                        <div className="border-t border-slate-100 px-7 py-5">
                            <button
                                type="button"
                                onClick={closeDetail}
                                className="flex h-11 w-full items-center justify-center rounded-lg bg-slate-100 text-sm font-black text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-800"
                            >
                                닫기
                            </button>
                        </div>
                    </aside>
                </div>
            )}
        </div>
    );
}
