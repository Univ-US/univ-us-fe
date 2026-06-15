"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    AlertTriangle,
    Banknote,
    Building2,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    CircleAlert,
    Clock3,
    CreditCard,
    RefreshCcw,
    RefreshCw,
    RotateCcw,
    Search,
    X,
} from "lucide-react";
import {
    cancelServiceAdminScheduledPayment,
    getServiceAdminPayments,
    refundServiceAdminPayment,
    retryServiceAdminPayment,
    type ServiceAdminPayment,
    type ServiceAdminPaymentMethod,
    type ServiceAdminPaymentPage,
    type ServiceAdminPaymentQuery,
    type ServiceAdminPaymentStatus,
} from "@/lib/serviceAdminApi";
import { formatCurrency } from "../_components";

interface PaymentsViewProps {
    onOpenSchool: (schoolId: number) => void;
}

type PaymentSort = NonNullable<ServiceAdminPaymentQuery["sort"]>;
type PaginationItem = number | "ellipsis-start" | "ellipsis-end";

const PAGE_WINDOW_SIZE = 5;
const PAGE_JUMP_SIZE = 10;

const STATUS_LABEL: Record<ServiceAdminPaymentStatus, string> = {
    READY: "결제 예정",
    PAID: "결제 완료",
    FAILED: "결제 실패",
    CANCELED: "결제 취소",
    REFUNDED: "환불 완료",
};

const METHOD_LABEL: Record<ServiceAdminPaymentMethod, string> = {
    CARD: "카드",
    KAKAO_PAY: "카카오페이",
};

function PaymentStatusBadge({ status }: { status: ServiceAdminPaymentStatus }) {
    const style = {
        READY: "bg-blue-100 text-blue-700",
        PAID: "bg-emerald-100 text-emerald-700",
        FAILED: "bg-rose-100 text-rose-700",
        CANCELED: "bg-slate-100 text-slate-600",
        REFUNDED: "bg-violet-100 text-violet-700",
    }[status];

    return (
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-extrabold ${style}`}>
            {STATUS_LABEL[status]}
        </span>
    );
}

function formatDateTime(value: string | null) {
    return value ? new Date(value).toLocaleString("ko-KR") : "-";
}

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="grid grid-cols-[120px_1fr] gap-3 py-3 text-sm">
            <dt className="font-bold text-slate-400">{label}</dt>
            <dd className="break-all text-right font-extrabold text-slate-700">
                {value}
            </dd>
        </div>
    );
}

export default function PaymentsView({ onOpenSchool }: PaymentsViewProps) {
    const [search, setSearch] = useState("");
    const [keyword, setKeyword] = useState("");
    const [status, setStatus] =
        useState<"ALL" | ServiceAdminPaymentStatus>("ALL");
    const [planId, setPlanId] = useState<"ALL" | number>("ALL");
    const [method, setMethod] =
        useState<"ALL" | ServiceAdminPaymentMethod>("ALL");
    const [sort, setSort] = useState<PaymentSort>("RECENT");
    const [page, setPage] = useState(0);
    const [result, setResult] = useState<ServiceAdminPaymentPage | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedPayment, setSelectedPayment] =
        useState<ServiceAdminPayment | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [processing, setProcessing] = useState(false);
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setKeyword(search.trim());
            setPage(0);
        }, 300);
        return () => window.clearTimeout(timer);
    }, [search]);

    const loadPayments = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            setResult(
                await getServiceAdminPayments({
                    page,
                    keyword: keyword || undefined,
                    status: status === "ALL" ? undefined : status,
                    planId: planId === "ALL" ? undefined : planId,
                    method: method === "ALL" ? undefined : method,
                    sort,
                }),
            );
        } catch (loadError) {
            console.error("Failed to load service admin payments.", loadError);
            setError("결제 내역을 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    }, [keyword, method, page, planId, sort, status]);

    useEffect(() => {
        void loadPayments();
    }, [loadPayments]);

    useEffect(() => {
        if (result && result.totalPages > 0 && page >= result.totalPages) {
            setPage(result.totalPages - 1);
        }
    }, [page, result]);

    useEffect(() => {
        if (!selectedPayment) return;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "";
        };
    }, [selectedPayment]);

    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape" && isDetailOpen) {
                setIsDetailOpen(false);
                closeTimerRef.current = setTimeout(() => {
                    setSelectedPayment(null);
                    closeTimerRef.current = null;
                }, 300);
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

    const openDetail = (payment: ServiceAdminPayment) => {
        if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
        setSelectedPayment(payment);
        requestAnimationFrame(() => {
            requestAnimationFrame(() => setIsDetailOpen(true));
        });
    };

    const closeDetail = () => {
        setIsDetailOpen(false);
        closeTimerRef.current = setTimeout(() => {
            setSelectedPayment(null);
            closeTimerRef.current = null;
        }, 300);
    };

    const resetFilters = () => {
        setSearch("");
        setKeyword("");
        setStatus("ALL");
        setPlanId("ALL");
        setMethod("ALL");
        setSort("RECENT");
        setPage(0);
    };

    const runOperation = async (
        operation: () => Promise<ServiceAdminPayment>,
        failureMessage: string,
    ) => {
        setProcessing(true);
        try {
            const updated = await operation();
            setSelectedPayment(updated);
            await loadPayments();
        } catch (operationError) {
            console.error(failureMessage, operationError);
            window.alert(failureMessage);
        } finally {
            setProcessing(false);
        }
    };

    const refundPayment = () => {
        if (!selectedPayment) return;
        const reason = window.prompt(
            "전액 환불 사유를 입력하세요.\n환불해도 구독과 다음 예약 결제는 자동 취소되지 않습니다.",
        );
        if (!reason?.trim()) return;
        if (!window.confirm(`${formatCurrency(selectedPayment.amount)}을 전액 환불할까요?`)) {
            return;
        }
        void runOperation(
            () => refundServiceAdminPayment(selectedPayment.historyId, reason.trim()),
            "결제 환불에 실패했습니다.",
        );
    };

    const retryPayment = () => {
        if (!selectedPayment) return;
        if (!window.confirm("등록된 정기 결제 수단으로 즉시 재결제할까요?")) return;
        void runOperation(
            () => retryServiceAdminPayment(selectedPayment.historyId),
            "재결제 요청에 실패했습니다.",
        );
    };

    const cancelScheduledPayment = () => {
        if (!selectedPayment) return;
        if (
            !window.confirm(
                "다음 예약 결제를 취소하고 구독 취소를 예약할까요?\n현재 결제 기간까지는 서비스를 계속 이용할 수 있습니다.",
            )
        ) {
            return;
        }
        void runOperation(
            () => cancelServiceAdminScheduledPayment(selectedPayment.historyId),
            "예약 결제 취소에 실패했습니다.",
        );
    };

    const currentMonthLabel = `${new Date().getMonth() + 1}월`;

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-2xl font-black tracking-tight">결제 관리</h1>
                <p className="mt-1 text-sm text-slate-500">
                    전체 학교의 결제 내역과 다음 예약 결제를 조회하고 관리합니다.
                </p>
            </div>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                    {
                        label: `${currentMonthLabel} 결제 매출`,
                        value: formatCurrency(result?.currentMonthRevenue ?? 0),
                        detail: null,
                        icon: Banknote,
                        tone: "bg-emerald-100 text-emerald-700",
                    },
                    {
                        label: `${currentMonthLabel} 결제 완료`,
                        value: `${(result?.currentMonthPaidCount ?? 0).toLocaleString()}건`,
                        detail: null,
                        icon: CheckCircle2,
                        tone: "bg-emerald-100 text-emerald-700",
                    },
                    {
                        label: `${currentMonthLabel} 결제 실패`,
                        value: `${(result?.currentMonthFailedCount ?? 0).toLocaleString()}건`,
                        detail: null,
                        icon: CircleAlert,
                        tone: "bg-rose-100 text-rose-700",
                    },
                    {
                        label: "예약 결제",
                        value: `${(result?.currentMonthReadyCount ?? 0).toLocaleString()}건`,
                        detail: formatCurrency(result?.readyPaymentAmount ?? 0),
                        icon: Clock3,
                        tone: "bg-blue-100 text-blue-700",
                    },
                ].map(({ label, value, detail, icon: Icon, tone }) => (
                    <div
                        key={label}
                        className="flex items-center justify-between rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-sm"
                    >
                        <div>
                            <p className="text-sm font-bold text-slate-500">{label}</p>
                            <div className="mt-2 flex items-baseline gap-2">
                                <p className="text-2xl font-black text-slate-950">{value}</p>
                                {detail && (
                                    <p className="text-xs font-extrabold text-slate-400">
                                        {detail}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className={`flex size-11 items-center justify-center rounded-xl ${tone}`}>
                            <Icon className="size-5" />
                        </div>
                    </div>
                ))}
            </section>

            <section className="rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-sm">
                <div className="grid gap-3 xl:grid-cols-[minmax(260px,1fr)_150px_145px_145px_175px]">
                    <label className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="학교명, 주문번호, PortOne ID 검색"
                            className="h-11 w-full rounded-lg border border-slate-200 pl-10 pr-3 text-sm font-semibold outline-none focus:border-emerald-500"
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
                        <option value="ALL">전체 결제 상태</option>
                        {Object.entries(STATUS_LABEL).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
                    <select
                        value={planId}
                        onChange={(event) => {
                            setPlanId(
                                event.target.value === "ALL"
                                    ? "ALL"
                                    : Number(event.target.value),
                            );
                            setPage(0);
                        }}
                        className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-500"
                    >
                        <option value="ALL">전체 플랜</option>
                        {result?.plans.map((plan) => (
                            <option key={plan.planId} value={plan.planId}>
                                {plan.planName}
                            </option>
                        ))}
                    </select>
                    <select
                        value={method}
                        onChange={(event) => {
                            setMethod(event.target.value as typeof method);
                            setPage(0);
                        }}
                        className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-500"
                    >
                        <option value="ALL">전체 결제 수단</option>
                        {Object.entries(METHOD_LABEL).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
                    <select
                        value={sort}
                        onChange={(event) => {
                            setSort(event.target.value as PaymentSort);
                            setPage(0);
                        }}
                        className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-500"
                    >
                        <option value="RECENT">최근 결제순</option>
                        <option value="AMOUNT_DESC">결제 금액 높은순</option>
                        <option value="AMOUNT_ASC">결제 금액 낮은순</option>
                        <option value="SCHOOL_ASC">학교 이름순</option>
                    </select>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
                    <p className="font-bold text-slate-500">
                        검색 결과{" "}
                        <span className="text-emerald-700">
                            {(result?.totalElements ?? 0).toLocaleString()}
                        </span>
                        건
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
                            onClick={() => void loadPayments()}
                            className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-black text-white"
                        >
                            <RefreshCw className="size-4" />
                            다시 시도
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1180px] table-fixed text-left text-sm">
                                <colgroup>
                                    <col className="w-[170px]" />
                                    <col className="w-[220px]" />
                                    <col className="w-[235px]" />
                                    <col className="w-[125px]" />
                                    <col className="w-[130px]" />
                                    <col className="w-[145px]" />
                                    <col className="w-[130px]" />
                                </colgroup>
                                <thead className="bg-slate-50 text-xs font-extrabold text-slate-500">
                                    <tr>
                                        <th className="px-5 py-3">요청 일시</th>
                                        <th className="px-5 py-3">학교</th>
                                        <th className="px-5 py-3">주문번호</th>
                                        <th className="px-5 py-3">플랜</th>
                                        <th className="px-5 py-3">결제 수단</th>
                                        <th className="px-5 py-3">금액</th>
                                        <th className="px-5 py-3">상태</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={7} className="px-5 py-16 text-center">
                                                <RefreshCw className="mx-auto size-6 animate-spin text-emerald-700" />
                                            </td>
                                        </tr>
                                    ) : (
                                        result?.content.map((payment) => (
                                            <tr
                                                key={payment.historyId}
                                                onClick={() => openDetail(payment)}
                                                className={`cursor-pointer font-semibold text-slate-700 transition hover:bg-emerald-50/60 ${
                                                    selectedPayment?.historyId === payment.historyId
                                                        ? "bg-emerald-50"
                                                        : ""
                                                }`}
                                            >
                                                <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                                                    {formatDateTime(payment.createdAt)}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <button
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            if (payment.univId != null) {
                                                                onOpenSchool(payment.univId);
                                                            }
                                                        }}
                                                        disabled={payment.univId == null}
                                                        className="flex w-full items-center gap-2 font-black text-slate-950 hover:text-emerald-700 disabled:cursor-default disabled:hover:text-slate-950"
                                                    >
                                                        <Building2 className="size-4 shrink-0" />
                                                        <span className="truncate">
                                                            {payment.univName ?? "-"}
                                                        </span>
                                                    </button>
                                                </td>
                                                <td className="px-5 py-4 font-mono text-xs text-slate-500">
                                                    <p className="truncate" title={payment.merchantUid}>
                                                        {payment.merchantUid}
                                                    </p>
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-4 font-bold">
                                                    {payment.planName ?? "-"}
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-4">
                                                    {METHOD_LABEL[payment.paymentMethod]}
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-4 font-black text-slate-950">
                                                    {formatCurrency(payment.amount)}
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-4">
                                                    <PaymentStatusBadge status={payment.status} />
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                    {!loading && result?.content.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-5 py-16 text-center font-bold text-slate-400">
                                                조건에 맞는 결제 내역이 없습니다.
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
                                    aria-label="첫 페이지"
                                >
                                    <ChevronsLeft className="size-4" />
                                </button>
                                <button
                                    onClick={() => setPage((current) => current - PAGE_JUMP_SIZE)}
                                    disabled={page < PAGE_JUMP_SIZE}
                                    className="flex h-9 min-w-11 items-center justify-center rounded-lg border border-slate-200 px-2 text-xs font-black text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
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
                                            aria-current={page === item ? "page" : undefined}
                                        >
                                            {item + 1}
                                        </button>
                                    ) : (
                                        <span
                                            key={item}
                                            className="flex size-7 items-center justify-center text-sm font-black text-slate-400"
                                        >
                                            ...
                                        </span>
                                    ),
                                )}
                                <button
                                    onClick={() =>
                                        setPage((current) =>
                                            Math.min(
                                                Math.max(0, (result?.totalPages ?? 1) - 1),
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
                                    disabled={page + PAGE_JUMP_SIZE >= (result?.totalPages ?? 0)}
                                    className="flex h-9 min-w-11 items-center justify-center rounded-lg border border-slate-200 px-2 text-xs font-black text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    +10
                                </button>
                                <button
                                    onClick={() => setPage(Math.max((result?.totalPages ?? 1) - 1, 0))}
                                    disabled={result?.last ?? true}
                                    className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                                    aria-label="마지막 페이지"
                                >
                                    <ChevronsRight className="size-4" />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </section>

            {selectedPayment && (
                <div
                    className={`fixed inset-0 z-50 transition ${
                        isDetailOpen ? "pointer-events-auto" : "pointer-events-none"
                    }`}
                >
                    <button
                        type="button"
                        onClick={closeDetail}
                        className={`absolute inset-0 bg-slate-950/35 backdrop-blur-[1px] transition-opacity duration-300 ${
                            isDetailOpen ? "opacity-100" : "opacity-0"
                        }`}
                        aria-label="결제 상세 닫기"
                    />
                    <aside
                        role="dialog"
                        aria-modal="true"
                        className={`absolute inset-y-0 right-0 flex w-full max-w-[640px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
                            isDetailOpen ? "translate-x-0" : "translate-x-full"
                        }`}
                    >
                        <header className="flex items-start justify-between border-b border-slate-100 px-7 py-6">
                            <div>
                                <p className="text-xs font-extrabold text-emerald-700">결제 상세</p>
                                <h2 className="mt-2 text-2xl font-black text-slate-950">
                                    {selectedPayment.univName}
                                </h2>
                                <p className="mt-1 break-all font-mono text-xs text-slate-400">
                                    {selectedPayment.merchantUid}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <PaymentStatusBadge status={selectedPayment.status} />
                                <button
                                    onClick={closeDetail}
                                    className="flex size-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
                                    aria-label="닫기"
                                >
                                    <X className="size-5" />
                                </button>
                            </div>
                        </header>

                        <div className="min-h-0 flex-1 overflow-y-auto px-7 py-6">
                            <div className="flex items-center justify-between rounded-2xl bg-emerald-50 p-5">
                                <div>
                                    <p className="text-sm font-bold text-slate-500">결제 금액</p>
                                    <p className="mt-1 text-3xl font-black text-slate-950">
                                        {formatCurrency(selectedPayment.amount)}
                                    </p>
                                </div>
                                <CreditCard className="size-8 text-emerald-700" />
                            </div>

                            <section className="mt-7">
                                <h3 className="text-sm font-black text-slate-950">결제 정보</h3>
                                <dl className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 px-4">
                                    <DetailRow label="플랜" value={selectedPayment.planName ?? "-"} />
                                    <DetailRow
                                        label="결제 유형"
                                        value={selectedPayment.paymentType === "INITIAL" ? "최초 결제" : "정기 결제"}
                                    />
                                    <DetailRow
                                        label="결제 수단"
                                        value={METHOD_LABEL[selectedPayment.paymentMethod]}
                                    />
                                    <DetailRow label="요청 일시" value={formatDateTime(selectedPayment.createdAt)} />
                                    <DetailRow label="결제 완료" value={formatDateTime(selectedPayment.paidAt)} />
                                    <DetailRow label="다음 결제일" value={formatDateTime(selectedPayment.nextBillingAt)} />
                                    <DetailRow label="구독 상태" value={selectedPayment.subscriptionStatus} />
                                </dl>
                            </section>

                            <section className="mt-7">
                                <h3 className="text-sm font-black text-slate-950">PortOne 연동 정보</h3>
                                <dl className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 px-4">
                                    <DetailRow label="주문번호" value={selectedPayment.merchantUid} />
                                    <DetailRow label="결제 ID" value={selectedPayment.portonePaymentId ?? "-"} />
                                    <DetailRow label="예약 ID" value={selectedPayment.portoneScheduleId ?? "-"} />
                                    <DetailRow label="취소 ID" value={selectedPayment.portoneCancellationId ?? "-"} />
                                </dl>
                            </section>

                            {selectedPayment.failReason && (
                                <div className="mt-7 rounded-xl border border-rose-200 bg-rose-50 p-4">
                                    <p className="text-sm font-black text-rose-700">실패 또는 취소 사유</p>
                                    <p className="mt-1 text-sm font-semibold text-rose-600">
                                        {selectedPayment.failReason}
                                    </p>
                                </div>
                            )}

                            {selectedPayment.status === "REFUNDED" && (
                                <div className="mt-7 rounded-xl border border-violet-200 bg-violet-50 p-4">
                                    <p className="text-sm font-black text-violet-700">환불 정보</p>
                                    <p className="mt-2 text-sm font-semibold text-violet-700">
                                        {formatCurrency(selectedPayment.refundAmount ?? 0)} ·{" "}
                                        {formatDateTime(selectedPayment.refundedAt)}
                                    </p>
                                    <p className="mt-1 text-sm text-violet-600">
                                        {selectedPayment.refundReason ?? "-"}
                                    </p>
                                </div>
                            )}
                        </div>

                        <footer className="space-y-3 border-t border-slate-100 p-6">
                            {selectedPayment.status === "PAID" && (
                                <button
                                    onClick={refundPayment}
                                    disabled={processing}
                                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-rose-600 text-sm font-black text-white hover:bg-rose-700 disabled:opacity-50"
                                >
                                    <RotateCcw className="size-4" />
                                    전액 환불
                                </button>
                            )}
                            {selectedPayment.status === "FAILED" && (
                                <button
                                    onClick={retryPayment}
                                    disabled={processing}
                                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 text-sm font-black text-white hover:bg-emerald-800 disabled:opacity-50"
                                >
                                    <RefreshCcw className="size-4" />
                                    재결제 요청
                                </button>
                            )}
                            {selectedPayment.status === "READY" && (
                                <button
                                    onClick={cancelScheduledPayment}
                                    disabled={processing}
                                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-800 text-sm font-black text-white hover:bg-slate-900 disabled:opacity-50"
                                >
                                    <X className="size-4" />
                                    예약 결제 취소
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    if (selectedPayment.univId != null) {
                                        onOpenSchool(selectedPayment.univId);
                                    }
                                }}
                                disabled={selectedPayment.univId == null}
                                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-100 text-sm font-black text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-slate-100"
                            >
                                <Building2 className="size-4" />
                                해당 학교 상세 보기
                            </button>
                        </footer>
                    </aside>
                </div>
            )}
        </div>
    );
}
