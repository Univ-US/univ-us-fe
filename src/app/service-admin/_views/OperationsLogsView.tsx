"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    CircleAlert,
    Clock3,
    CreditCard,
    LogIn,
    Search,
    X,
} from "lucide-react";
import { formatCurrency } from "../_components";
import { getMockMemberActivity } from "../_mockData";
import type {
    AdminPaymentStatus,
    MemberAccessLog,
    ServiceMember,
    ServicePayment,
    ServiceSchool,
} from "../_types";

type LogCategory = "ACCESS" | "PAYMENT";
type LogResult = "SUCCESS" | "FAILURE" | "IN_PROGRESS";
type LogPeriod = "7" | "30" | "90" | "ALL";

interface BaseOperationLog {
    id: string;
    category: LogCategory;
    action: string;
    result: LogResult;
    occurredAt: string;
    failureReason: string | null;
    searchableText: string;
}

interface AccessOperationLog extends BaseOperationLog {
    category: "ACCESS";
    accessType: MemberAccessLog["type"];
    member: ServiceMember;
    school: ServiceSchool;
    device: string;
    ipAddress: string;
}

interface PaymentOperationLog extends BaseOperationLog {
    category: "PAYMENT";
    payment: ServicePayment;
    school: ServiceSchool;
}

type OperationLog = AccessOperationLog | PaymentOperationLog;

interface OperationsLogsViewProps {
    schools: ServiceSchool[];
    members: ServiceMember[];
    payments: ServicePayment[];
}

const PAGE_SIZE = 12;

const RESULT_LABEL: Record<LogResult, string> = {
    SUCCESS: "성공",
    FAILURE: "실패",
    IN_PROGRESS: "진행 중",
};

const RESULT_STYLE: Record<LogResult, string> = {
    SUCCESS: "bg-emerald-100 text-emerald-700",
    FAILURE: "bg-rose-100 text-rose-700",
    IN_PROGRESS: "bg-blue-100 text-blue-700",
};

const ROLE_LABEL: Record<ServiceMember["role"], string> = {
    STU: "학생",
    PROF: "교수",
    ALU: "졸업생",
    ADM: "학교 관리자",
};

const PAYMENT_STATUS_LABEL: Record<AdminPaymentStatus, string> = {
    PAID: "결제 완료",
    PENDING: "결제 대기",
    FAILED: "결제 실패",
    CANCELED: "결제 취소",
    REFUNDED: "환불 완료",
};

const PAYMENT_METHOD_LABEL: Record<ServicePayment["method"], string> = {
    CARD: "카드",
    VIRTUAL_ACCOUNT: "가상계좌",
};

function getPaymentLogMetadata(payment: ServicePayment) {
    switch (payment.status) {
        case "PAID":
            return {
                action: "결제 완료",
                result: "SUCCESS" as const,
                occurredAt: payment.paidAt ?? payment.requestedAt,
                failureReason: null,
            };
        case "FAILED":
            return {
                action: "결제 실패",
                result: "FAILURE" as const,
                occurredAt: payment.requestedAt,
                failureReason: payment.failureReason ?? "결제 승인 실패",
            };
        case "PENDING":
            return {
                action: "결제 요청",
                result: "IN_PROGRESS" as const,
                occurredAt: payment.requestedAt,
                failureReason: null,
            };
        case "CANCELED":
            return {
                action: "결제 취소",
                result: "SUCCESS" as const,
                occurredAt: payment.requestedAt,
                failureReason: null,
            };
        case "REFUNDED":
            return {
                action: "결제 환불",
                result: "SUCCESS" as const,
                occurredAt: payment.paidAt ?? payment.requestedAt,
                failureReason: null,
            };
    }
}

function getAccessLogMetadata(log: MemberAccessLog) {
    switch (log.type) {
        case "LOGIN":
            return { action: "로그인", result: "SUCCESS" as const };
        case "LOGOUT":
            return { action: "로그아웃", result: "SUCCESS" as const };
        case "LOGIN_FAILED":
            return { action: "로그인 실패", result: "FAILURE" as const };
    }
}

export default function OperationsLogsView({
    schools,
    members,
    payments,
}: OperationsLogsViewProps) {
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState<"ALL" | LogCategory>("ALL");
    const [result, setResult] = useState<"ALL" | LogResult>("ALL");
    const [period, setPeriod] = useState<LogPeriod>("30");
    const [page, setPage] = useState(1);
    const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const schoolMap = useMemo(
        () => new Map(schools.map((school) => [school.id, school])),
        [schools],
    );

    const logs = useMemo<OperationLog[]>(() => {
        const accessLogs: AccessOperationLog[] = members.flatMap((member) => {
            const school = schoolMap.get(member.schoolId);
            if (!school) return [];

            return getMockMemberActivity(member).accessLogs.map((log) => {
                const metadata = getAccessLogMetadata(log);
                return {
                    id: `access-${log.id}`,
                    category: "ACCESS",
                    action: metadata.action,
                    result: metadata.result,
                    occurredAt: log.occurredAt,
                    failureReason: log.failReason,
                    searchableText: [
                        member.name,
                        member.loginId,
                        member.email,
                        school.name,
                        log.ipAddress,
                        log.device,
                    ]
                        .join(" ")
                        .toLocaleLowerCase("ko-KR"),
                    accessType: log.type,
                    member,
                    school,
                    device: log.device,
                    ipAddress: log.ipAddress,
                };
            });
        });

        const paymentLogs: PaymentOperationLog[] = payments.flatMap((payment) => {
            const school = schoolMap.get(payment.schoolId);
            if (!school) return [];
            const metadata = getPaymentLogMetadata(payment);
            return [
                {
                    id: `payment-${payment.id}`,
                    category: "PAYMENT",
                    action: metadata.action,
                    result: metadata.result,
                    occurredAt: metadata.occurredAt,
                    failureReason: metadata.failureReason,
                    searchableText: [
                        school.name,
                        payment.merchantUid,
                        payment.portonePaymentId ?? "",
                        payment.plan,
                    ]
                        .join(" ")
                        .toLocaleLowerCase("ko-KR"),
                    payment,
                    school,
                },
            ];
        });

        return [...accessLogs, ...paymentLogs].sort((a, b) =>
            b.occurredAt.localeCompare(a.occurredAt),
        );
    }, [members, payments, schoolMap]);

    const latestLogDate = useMemo(() => {
        const latest = logs[0]?.occurredAt;
        return latest ? new Date(latest.replace(" ", "T")) : new Date();
    }, [logs]);

    const filteredLogs = useMemo(() => {
        const keyword = search.trim().toLocaleLowerCase("ko-KR");
        const cutoff =
            period === "ALL"
                ? null
                : new Date(
                    latestLogDate.getTime() -
                        Number(period) * 24 * 60 * 60 * 1000,
                );

        return logs.filter((log) => {
            const occurredAt = new Date(log.occurredAt.replace(" ", "T"));
            const matchesSearch =
                !keyword || log.searchableText.includes(keyword);
            const matchesCategory =
                category === "ALL" || log.category === category;
            const matchesResult = result === "ALL" || log.result === result;
            const matchesPeriod = !cutoff || occurredAt >= cutoff;
            return (
                matchesSearch &&
                matchesCategory &&
                matchesResult &&
                matchesPeriod
            );
        });
    }, [category, latestLogDate, logs, period, result, search]);

    const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
    const pagedLogs = filteredLogs.slice(
        (page - 1) * PAGE_SIZE,
        page * PAGE_SIZE,
    );
    const selectedLog =
        logs.find((log) => log.id === selectedLogId) ?? null;

    const summary = {
        total: logs.length,
        success: logs.filter((log) => log.result === "SUCCESS").length,
        failure: logs.filter((log) => log.result === "FAILURE").length,
        inProgress: logs.filter((log) => log.result === "IN_PROGRESS").length,
    };

    useEffect(() => {
        setPage(1);
    }, [category, period, result, search]);

    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    useEffect(() => {
        if (!selectedLog) return;
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setIsDetailOpen(false);
                closeTimerRef.current = setTimeout(
                    () => setSelectedLogId(null),
                    300,
                );
            }
        };
        window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    }, [selectedLog]);

    useEffect(() => {
        return () => {
            if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        };
    }, []);

    const openDetail = (logId: string) => {
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        setSelectedLogId(logId);
        requestAnimationFrame(() => setIsDetailOpen(true));
    };

    const closeDetail = () => {
        setIsDetailOpen(false);
        closeTimerRef.current = setTimeout(() => {
            setSelectedLogId(null);
            closeTimerRef.current = null;
        }, 300);
    };

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-2xl font-black tracking-tight">운영 로그</h1>
                <p className="mt-1 text-sm text-slate-500">
                    접속 로그와 결제 로그를 동일한 기준으로 통합 조회합니다.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                {[
                    {
                        label: "전체 로그",
                        value: summary.total,
                        icon: Clock3,
                        color: "text-slate-700",
                    },
                    {
                        label: "성공",
                        value: summary.success,
                        icon: CheckCircle2,
                        color: "text-emerald-700",
                    },
                    {
                        label: "실패",
                        value: summary.failure,
                        icon: CircleAlert,
                        color: "text-rose-600",
                    },
                    {
                        label: "진행 중",
                        value: summary.inProgress,
                        icon: CreditCard,
                        color: "text-blue-700",
                    },
                ].map(({ label, value, icon: Icon, color }) => (
                    <section
                        key={label}
                        className="rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-sm"
                    >
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-extrabold text-slate-500">
                                {label}
                            </p>
                            <Icon className={`size-5 ${color}`} />
                        </div>
                        <p className={`mt-3 text-2xl font-black ${color}`}>
                            {value.toLocaleString()}건
                        </p>
                    </section>
                ))}
            </div>

            <section className="rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-sm">
                <div className="grid gap-3 xl:grid-cols-[minmax(260px,1fr)_160px_160px_160px]">
                    <label className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="회원, 학교, 주문번호, IP 검색"
                            className="h-11 w-full rounded-lg border border-slate-200 pl-10 pr-3 text-sm font-semibold outline-none focus:border-emerald-500"
                        />
                    </label>
                    <select
                        value={category}
                        onChange={(event) =>
                            setCategory(
                                event.target.value as "ALL" | LogCategory,
                            )
                        }
                        className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-500"
                    >
                        <option value="ALL">전체 로그 종류</option>
                        <option value="ACCESS">접속 로그</option>
                        <option value="PAYMENT">결제 로그</option>
                    </select>
                    <select
                        value={result}
                        onChange={(event) =>
                            setResult(event.target.value as "ALL" | LogResult)
                        }
                        className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-500"
                    >
                        <option value="ALL">전체 처리 결과</option>
                        <option value="SUCCESS">성공</option>
                        <option value="FAILURE">실패</option>
                        <option value="IN_PROGRESS">진행 중</option>
                    </select>
                    <select
                        value={period}
                        onChange={(event) =>
                            setPeriod(event.target.value as LogPeriod)
                        }
                        className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-500"
                    >
                        <option value="7">최근 7일</option>
                        <option value="30">최근 30일</option>
                        <option value="90">최근 90일</option>
                        <option value="ALL">전체 기간</option>
                    </select>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
                    <p className="font-bold text-slate-500">
                        검색 결과{" "}
                        <span className="text-emerald-700">
                            {filteredLogs.length.toLocaleString()}
                        </span>
                        건
                    </p>
                    <button
                        onClick={() => {
                            setSearch("");
                            setCategory("ALL");
                            setResult("ALL");
                            setPeriod("30");
                        }}
                        className="font-extrabold text-slate-500 hover:text-emerald-700"
                    >
                        필터 초기화
                    </button>
                </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-emerald-900/10 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] table-fixed text-left text-sm">
                        <colgroup>
                            <col className="w-[230px]" />
                            <col className="w-[150px]" />
                            <col className="w-[190px]" />
                            <col className="w-[330px]" />
                        </colgroup>
                        <thead className="bg-slate-50 text-xs font-extrabold text-slate-500">
                            <tr>
                                <th className="px-5 py-3">로그 종류</th>
                                <th className="px-5 py-3">처리 결과</th>
                                <th className="px-5 py-3">발생 시간</th>
                                <th className="px-5 py-3">실패 사유</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {pagedLogs.map((log) => (
                                <tr
                                    key={log.id}
                                    onClick={() => openDetail(log.id)}
                                    className="cursor-pointer font-semibold text-slate-700 transition hover:bg-emerald-50/60"
                                >
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                                                    log.category === "ACCESS"
                                                        ? "bg-sky-100 text-sky-700"
                                                        : "bg-violet-100 text-violet-700"
                                                }`}
                                            >
                                                {log.category === "ACCESS" ? (
                                                    <LogIn className="size-4" />
                                                ) : (
                                                    <CreditCard className="size-4" />
                                                )}
                                            </span>
                                            <div className="min-w-0">
                                                <p className="font-black text-slate-950">
                                                    {log.category === "ACCESS"
                                                        ? "접속 로그"
                                                        : "결제 로그"}
                                                </p>
                                                <p className="mt-0.5 text-xs text-slate-400">
                                                    {log.action}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-4">
                                        <span
                                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${RESULT_STYLE[log.result]}`}
                                        >
                                            {RESULT_LABEL[log.result]}
                                        </span>
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                                        {log.occurredAt}
                                    </td>
                                    <td className="px-5 py-4">
                                        <p
                                            className={`truncate ${
                                                log.failureReason
                                                    ? "font-bold text-rose-600"
                                                    : "text-slate-400"
                                            }`}
                                            title={log.failureReason ?? "-"}
                                        >
                                            {log.failureReason ?? "-"}
                                        </p>
                                    </td>
                                </tr>
                            ))}
                            {pagedLogs.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={4}
                                        className="px-5 py-16 text-center font-bold text-slate-400"
                                    >
                                        조건에 맞는 운영 로그가 없습니다.
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
                            onClick={() =>
                                setPage((current) => Math.max(1, current - 1))
                            }
                            disabled={page === 1}
                            className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40"
                            aria-label="이전 페이지"
                        >
                            <ChevronLeft className="size-4" />
                        </button>
                        <button
                            onClick={() =>
                                setPage((current) =>
                                    Math.min(totalPages, current + 1),
                                )
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

            {selectedLog && (
                <div className="fixed inset-0 z-50">
                    <button
                        type="button"
                        onClick={closeDetail}
                        aria-label="로그 상세 닫기"
                        className={`absolute inset-0 bg-slate-950/35 transition-opacity duration-300 ${
                            isDetailOpen ? "opacity-100" : "opacity-0"
                        }`}
                    />
                    <aside
                        className={`absolute inset-y-0 right-0 flex w-full max-w-[560px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
                            isDetailOpen
                                ? "translate-x-0"
                                : "translate-x-full"
                        }`}
                    >
                        <header className="flex items-start justify-between border-b border-slate-100 px-7 py-6">
                            <div>
                                <p className="text-xs font-extrabold text-emerald-700">
                                    운영 로그 상세
                                </p>
                                <h2 className="mt-2 text-2xl font-black text-slate-950">
                                    {selectedLog.action}
                                </h2>
                                <p className="mt-1 text-sm font-semibold text-slate-400">
                                    {selectedLog.category === "ACCESS"
                                        ? "접속 로그"
                                        : "결제 로그"}{" "}
                                    · {selectedLog.occurredAt}
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
                            <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-5">
                                <div>
                                    <p className="text-sm font-bold text-slate-500">
                                        처리 결과
                                    </p>
                                    <p className="mt-1 text-lg font-black text-slate-950">
                                        {selectedLog.action}
                                    </p>
                                </div>
                                <span
                                    className={`rounded-full px-3 py-1.5 text-sm font-black ${RESULT_STYLE[selectedLog.result]}`}
                                >
                                    {RESULT_LABEL[selectedLog.result]}
                                </span>
                            </div>

                            {selectedLog.category === "ACCESS" ? (
                                <section className="mt-7">
                                    <h3 className="text-sm font-black text-slate-950">
                                        접속 정보
                                    </h3>
                                    <dl className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 px-4">
                                        {[
                                            ["회원", selectedLog.member.name],
                                            [
                                                "로그인 ID",
                                                selectedLog.member.loginId,
                                            ],
                                            [
                                                "역할",
                                                ROLE_LABEL[
                                                    selectedLog.member.role
                                                ],
                                            ],
                                            ["학교", selectedLog.school.name],
                                            ["기기", selectedLog.device],
                                            ["IP 주소", selectedLog.ipAddress],
                                            ["발생 시간", selectedLog.occurredAt],
                                        ].map(([label, value]) => (
                                            <div
                                                key={label}
                                                className="grid grid-cols-[110px_1fr] gap-3 py-3 text-sm"
                                            >
                                                <dt className="font-bold text-slate-400">
                                                    {label}
                                                </dt>
                                                <dd className="text-right font-extrabold text-slate-700">
                                                    {value}
                                                </dd>
                                            </div>
                                        ))}
                                    </dl>
                                </section>
                            ) : (
                                <>
                                    <section className="mt-7">
                                        <h3 className="text-sm font-black text-slate-950">
                                            결제 정보
                                        </h3>
                                        <dl className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 px-4">
                                            {[
                                                [
                                                    "학교",
                                                    selectedLog.school.name,
                                                ],
                                                [
                                                    "주문번호",
                                                    selectedLog.payment
                                                        .merchantUid,
                                                ],
                                                [
                                                    "포트원 ID",
                                                    selectedLog.payment
                                                        .portonePaymentId ?? "-",
                                                ],
                                                [
                                                    "플랜",
                                                    selectedLog.payment.plan,
                                                ],
                                                [
                                                    "금액",
                                                    formatCurrency(
                                                        selectedLog.payment
                                                            .amount,
                                                    ),
                                                ],
                                                [
                                                    "결제 수단",
                                                    PAYMENT_METHOD_LABEL[
                                                        selectedLog.payment
                                                            .method
                                                    ],
                                                ],
                                                [
                                                    "결제 상태",
                                                    PAYMENT_STATUS_LABEL[
                                                        selectedLog.payment
                                                            .status
                                                    ],
                                                ],
                                                [
                                                    "발생 시간",
                                                    selectedLog.occurredAt,
                                                ],
                                            ].map(([label, value]) => (
                                                <div
                                                    key={label}
                                                    className="grid grid-cols-[110px_1fr] gap-3 py-3 text-sm"
                                                >
                                                    <dt className="font-bold text-slate-400">
                                                        {label}
                                                    </dt>
                                                    <dd className="break-all text-right font-extrabold text-slate-700">
                                                        {value}
                                                    </dd>
                                                </div>
                                            ))}
                                        </dl>
                                    </section>
                                </>
                            )}

                            {selectedLog.failureReason && (
                                <div className="mt-7 rounded-xl border border-rose-200 bg-rose-50 p-4">
                                    <p className="text-sm font-black text-rose-700">
                                        실패 사유
                                    </p>
                                    <p className="mt-1 text-sm font-semibold text-rose-600">
                                        {selectedLog.failureReason}
                                    </p>
                                </div>
                            )}
                        </div>
                    </aside>
                </div>
            )}
        </div>
    );
}
