"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
    Banknote,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    CircleAlert,
    Clock3,
    CreditCard,
    RefreshCcw,
    RotateCcw,
    Search,
    X,
} from "lucide-react";
import { formatCurrency } from "../_components";
import type {
    AdminPaymentMethod,
    AdminPaymentStatus,
    ServicePayment,
    ServiceSchool,
    SubscriptionPlan,
} from "../_types";

type PaymentSort = "recent" | "amount-desc" | "amount-asc" | "school-asc";

interface PaymentsViewProps {
    schools: ServiceSchool[];
    payments: ServicePayment[];
    onChangeStatus: (paymentId: number, status: AdminPaymentStatus) => void;
}

const PAGE_SIZE = 9;

const STATUS_LABEL: Record<AdminPaymentStatus, string> = {
    PAID: "결제 완료",
    PENDING: "결제 대기",
    FAILED: "결제 실패",
    CANCELED: "결제 취소",
    REFUNDED: "환불 완료",
};

const METHOD_LABEL: Record<AdminPaymentMethod, string> = {
    CARD: "카드",
    VIRTUAL_ACCOUNT: "가상계좌",
};

function PaymentStatusBadge({ status }: { status: AdminPaymentStatus }) {
    const style = {
        PAID: "bg-emerald-100 text-emerald-700",
        PENDING: "bg-blue-100 text-blue-700",
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

export default function PaymentsView({
    schools,
    payments,
    onChangeStatus,
}: PaymentsViewProps) {
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<"ALL" | AdminPaymentStatus>("ALL");
    const [plan, setPlan] = useState<"ALL" | SubscriptionPlan>("ALL");
    const [method, setMethod] = useState<"ALL" | AdminPaymentMethod>("ALL");
    const [sort, setSort] = useState<PaymentSort>("recent");
    const [page, setPage] = useState(1);
    const [selectedPaymentId, setSelectedPaymentId] = useState<number | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const schoolMap = useMemo(
        () => new Map(schools.map((school) => [school.id, school])),
        [schools],
    );
    const availablePlans = useMemo(
        () =>
            Array.from(new Set(payments.map((payment) => payment.plan))).sort(
                (a, b) => a.localeCompare(b, "ko-KR"),
            ),
        [payments],
    );

    const summary = useMemo(() => {
        const junePayments = payments.filter((payment) =>
            payment.requestedAt.startsWith("2026-06"),
        );
        return {
            revenue: junePayments
                .filter((payment) => payment.status === "PAID")
                .reduce((sum, payment) => sum + payment.amount, 0),
            paid: junePayments.filter((payment) => payment.status === "PAID").length,
            failed: junePayments.filter((payment) => payment.status === "FAILED").length,
            pending: junePayments.filter((payment) => payment.status === "PENDING").length,
        };
    }, [payments]);

    const filteredPayments = useMemo(() => {
        const keyword = search.trim().toLocaleLowerCase("ko-KR");
        const result = payments.filter((payment) => {
            const schoolName = schoolMap.get(payment.schoolId)?.name ?? "";
            const matchesSearch =
                !keyword ||
                schoolName.toLocaleLowerCase("ko-KR").includes(keyword) ||
                payment.merchantUid.toLocaleLowerCase("ko-KR").includes(keyword) ||
                payment.portonePaymentId?.toLocaleLowerCase("ko-KR").includes(keyword);

            return (
                matchesSearch &&
                (status === "ALL" || payment.status === status) &&
                (plan === "ALL" || payment.plan === plan) &&
                (method === "ALL" || payment.method === method)
            );
        });

        return [...result].sort((a, b) => {
            if (sort === "amount-desc") return b.amount - a.amount;
            if (sort === "amount-asc") return a.amount - b.amount;
            if (sort === "school-asc") {
                const schoolA = schoolMap.get(a.schoolId)?.name ?? "";
                const schoolB = schoolMap.get(b.schoolId)?.name ?? "";
                return schoolA.localeCompare(schoolB, "ko-KR");
            }
            return b.requestedAt.localeCompare(a.requestedAt);
        });
    }, [method, payments, plan, schoolMap, search, sort, status]);

    const totalPages = Math.max(1, Math.ceil(filteredPayments.length / PAGE_SIZE));
    const pagedPayments = filteredPayments.slice(
        (page - 1) * PAGE_SIZE,
        page * PAGE_SIZE,
    );
    const selectedPayment =
        payments.find((payment) => payment.id === selectedPaymentId) ?? null;
    const selectedSchool = selectedPayment
        ? schoolMap.get(selectedPayment.schoolId) ?? null
        : null;

    const closeDetail = () => {
        setIsDetailOpen(false);
        closeTimerRef.current = setTimeout(() => {
            setSelectedPaymentId(null);
        }, 300);
    };

    useEffect(() => {
        setPage(1);
    }, [method, plan, search, sort, status]);

    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    useEffect(() => {
        if (!selectedPayment) return;
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") closeDetail();
        };
        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    });

    useEffect(() => {
        return () => {
            if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        };
    }, []);

    const openDetail = (paymentId: number) => {
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        setSelectedPaymentId(paymentId);
        requestAnimationFrame(() => setIsDetailOpen(true));
    };

    const resetFilters = () => {
        setSearch("");
        setStatus("ALL");
        setPlan("ALL");
        setMethod("ALL");
        setSort("recent");
    };

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-2xl font-black tracking-tight">결제 관리</h1>
                <p className="mt-1 text-sm text-slate-500">
                    전체 학교의 정기 결제, 실패 내역, 환불 상태를 통합 조회합니다.
                </p>
            </div>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                    {
                        label: "6월 결제 매출",
                        value: formatCurrency(summary.revenue),
                        icon: Banknote,
                        tone: "bg-emerald-100 text-emerald-700",
                    },
                    {
                        label: "결제 완료",
                        value: `${summary.paid}건`,
                        icon: CheckCircle2,
                        tone: "bg-emerald-100 text-emerald-700",
                    },
                    {
                        label: "결제 실패",
                        value: `${summary.failed}건`,
                        icon: CircleAlert,
                        tone: "bg-rose-100 text-rose-700",
                    },
                    {
                        label: "결제 대기",
                        value: `${summary.pending}건`,
                        icon: Clock3,
                        tone: "bg-blue-100 text-blue-700",
                    },
                ].map(({ label, value, icon: Icon, tone }) => (
                    <div
                        key={label}
                        className="flex items-center justify-between rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-sm"
                    >
                        <div>
                            <p className="text-sm font-bold text-slate-500">{label}</p>
                            <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
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
                            placeholder="학교명, 주문번호, 포트원 ID 검색"
                            className="h-11 w-full rounded-lg border border-slate-200 pl-10 pr-3 text-sm font-semibold outline-none focus:border-emerald-500"
                        />
                    </label>
                    <select
                        value={status}
                        onChange={(event) =>
                            setStatus(event.target.value as "ALL" | AdminPaymentStatus)
                        }
                        className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-500"
                    >
                        <option value="ALL">전체 결제 상태</option>
                        {Object.entries(STATUS_LABEL).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
                    <select
                        value={plan}
                        onChange={(event) =>
                            setPlan(event.target.value as "ALL" | SubscriptionPlan)
                        }
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
                        value={method}
                        onChange={(event) =>
                            setMethod(event.target.value as "ALL" | AdminPaymentMethod)
                        }
                        className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-500"
                    >
                        <option value="ALL">전체 결제 수단</option>
                        {Object.entries(METHOD_LABEL).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
                    <select
                        value={sort}
                        onChange={(event) => setSort(event.target.value as PaymentSort)}
                        className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-500"
                    >
                        <option value="recent">최근 결제순</option>
                        <option value="amount-desc">결제 금액 높은순</option>
                        <option value="amount-asc">결제 금액 낮은순</option>
                        <option value="school-asc">학교 이름순</option>
                    </select>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
                    <p className="font-bold text-slate-500">
                        검색 결과 <span className="text-emerald-700">{filteredPayments.length}</span>건
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
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1180px] table-fixed text-left text-sm">
                        <colgroup>
                            <col className="w-[170px]" />
                            <col className="w-[220px]" />
                            <col className="w-[210px]" />
                            <col className="w-[110px]" />
                            <col className="w-[130px]" />
                            <col className="w-[150px]" />
                            <col className="w-[150px]" />
                        </colgroup>
                        <thead className="bg-slate-50 text-xs font-extrabold text-slate-500">
                            <tr>
                                <th className="px-5 py-3">결제 요청일</th>
                                <th className="px-5 py-3">학교</th>
                                <th className="px-5 py-3">주문번호</th>
                                <th className="px-5 py-3">플랜</th>
                                <th className="px-5 py-3">결제 수단</th>
                                <th className="px-5 py-3">금액</th>
                                <th className="px-5 py-3">상태</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {pagedPayments.map((payment) => (
                                <tr
                                    key={payment.id}
                                    onClick={() => openDetail(payment.id)}
                                    className="cursor-pointer font-semibold text-slate-700 transition hover:bg-emerald-50/60"
                                >
                                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">{payment.requestedAt}</td>
                                    <td className="px-5 py-4 font-black text-slate-950">
                                        <p
                                            className="truncate"
                                            title={schoolMap.get(payment.schoolId)?.name ?? "-"}
                                        >
                                            {schoolMap.get(payment.schoolId)?.name ?? "-"}
                                        </p>
                                    </td>
                                    <td className="px-5 py-4 font-mono text-xs text-slate-500">
                                        <p className="truncate" title={payment.merchantUid}>
                                            {payment.merchantUid}
                                        </p>
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-4 font-bold">{payment.plan}</td>
                                    <td className="whitespace-nowrap px-5 py-4">{METHOD_LABEL[payment.method]}</td>
                                    <td className="whitespace-nowrap px-5 py-4 font-black text-slate-950">
                                        {formatCurrency(payment.amount)}
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-4">
                                        <PaymentStatusBadge status={payment.status} />
                                    </td>
                                </tr>
                            ))}
                            {pagedPayments.length === 0 && (
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
                        {page} / {totalPages} 페이지
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage((current) => Math.max(1, current - 1))}
                            disabled={page === 1}
                            className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40"
                            aria-label="이전 페이지"
                        >
                            <ChevronLeft className="size-4" />
                        </button>
                        {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                            (pageNumber) => (
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
                            ),
                        )}
                        <button
                            onClick={() =>
                                setPage((current) => Math.min(totalPages, current + 1))
                            }
                            disabled={page === totalPages}
                            className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40"
                            aria-label="다음 페이지"
                        >
                            <ChevronRight className="size-4" />
                        </button>
                    </div>
                </div>
            </section>

            {selectedPayment && (
                <div className="fixed inset-0 z-50">
                    <button
                        type="button"
                        onClick={closeDetail}
                        aria-label="결제 상세 닫기"
                        className={`absolute inset-0 bg-slate-950/35 transition-opacity duration-300 ${
                            isDetailOpen ? "opacity-100" : "opacity-0"
                        }`}
                    />
                    <aside
                        className={`absolute inset-y-0 right-0 flex w-full max-w-[620px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
                            isDetailOpen ? "translate-x-0" : "translate-x-full"
                        }`}
                    >
                        <header className="flex items-start justify-between border-b border-slate-100 px-7 py-6">
                            <div>
                                <p className="text-xs font-extrabold text-emerald-700">결제 상세</p>
                                <h2 className="mt-2 text-2xl font-black text-slate-950">
                                    {selectedSchool?.name ?? "-"}
                                </h2>
                                <p className="mt-1 font-mono text-xs text-slate-400">
                                    {selectedPayment.merchantUid}
                                </p>
                            </div>
                            <button
                                onClick={closeDetail}
                                className="flex size-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
                                aria-label="닫기"
                            >
                                <X className="size-5" />
                            </button>
                        </header>

                        <div className="flex-1 overflow-y-auto px-7 py-6">
                            <div className="flex items-center justify-between rounded-2xl bg-emerald-50 p-5">
                                <div>
                                    <p className="text-sm font-bold text-slate-500">결제 금액</p>
                                    <p className="mt-1 text-3xl font-black text-slate-950">
                                        {formatCurrency(selectedPayment.amount)}
                                    </p>
                                </div>
                                <PaymentStatusBadge status={selectedPayment.status} />
                            </div>

                            <section className="mt-7">
                                <h3 className="text-sm font-black text-slate-950">결제 정보</h3>
                                <dl className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 px-4">
                                    {[
                                        ["플랜", selectedPayment.plan],
                                        ["결제 유형", selectedPayment.type === "INITIAL" ? "최초 결제" : "정기 결제"],
                                        ["결제 수단", METHOD_LABEL[selectedPayment.method]],
                                        ["카드 정보", selectedPayment.cardName ? `${selectedPayment.cardName} · ${selectedPayment.cardLast4}` : "-"],
                                        ["이용 기간", selectedPayment.billingPeriod],
                                        ["결제 요청", selectedPayment.requestedAt],
                                        ["결제 완료", selectedPayment.paidAt ?? "-"],
                                    ].map(([label, value]) => (
                                        <div key={label} className="grid grid-cols-[120px_1fr] gap-3 py-3 text-sm">
                                            <dt className="font-bold text-slate-400">{label}</dt>
                                            <dd className="text-right font-extrabold text-slate-700">{value}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </section>

                            <section className="mt-7">
                                <h3 className="text-sm font-black text-slate-950">연동 식별 정보</h3>
                                <dl className="mt-3 space-y-3 rounded-xl border border-slate-200 p-4">
                                    <div>
                                        <dt className="text-xs font-bold text-slate-400">주문번호</dt>
                                        <dd className="mt-1 break-all font-mono text-xs font-bold text-slate-700">
                                            {selectedPayment.merchantUid}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs font-bold text-slate-400">포트원 결제 ID</dt>
                                        <dd className="mt-1 break-all font-mono text-xs font-bold text-slate-700">
                                            {selectedPayment.portonePaymentId ?? "-"}
                                        </dd>
                                    </div>
                                </dl>
                            </section>

                            {selectedPayment.failureReason && (
                                <div className="mt-7 rounded-xl border border-rose-200 bg-rose-50 p-4">
                                    <p className="text-sm font-black text-rose-700">결제 실패 사유</p>
                                    <p className="mt-1 text-sm font-semibold text-rose-600">
                                        {selectedPayment.failureReason}
                                    </p>
                                </div>
                            )}
                        </div>

                        <footer className="border-t border-slate-100 p-6">
                            {selectedPayment.status === "PAID" && (
                                <button
                                    onClick={() => onChangeStatus(selectedPayment.id, "REFUNDED")}
                                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-rose-600 text-sm font-black text-white hover:bg-rose-700"
                                >
                                    <RotateCcw className="size-4" />
                                    환불 처리
                                </button>
                            )}
                            {selectedPayment.status === "FAILED" && (
                                <button
                                    onClick={() => onChangeStatus(selectedPayment.id, "PENDING")}
                                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 text-sm font-black text-white hover:bg-emerald-800"
                                >
                                    <RefreshCcw className="size-4" />
                                    재결제 요청
                                </button>
                            )}
                            {selectedPayment.status === "PENDING" && (
                                <button
                                    onClick={() => onChangeStatus(selectedPayment.id, "CANCELED")}
                                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-800 text-sm font-black text-white hover:bg-slate-900"
                                >
                                    <X className="size-4" />
                                    결제 요청 취소
                                </button>
                            )}
                            {(selectedPayment.status === "REFUNDED" ||
                                selectedPayment.status === "CANCELED") && (
                                <div className="flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-100 text-sm font-black text-slate-500">
                                    <CreditCard className="size-4" />
                                    처리가 완료된 결제입니다
                                </div>
                            )}
                        </footer>
                    </aside>
                </div>
            )}
        </div>
    );
}
