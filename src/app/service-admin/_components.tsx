"use client";

import { useEffect, useRef, useState } from "react";
import {
    Check,
    ChevronDown,
} from "lucide-react";
import type {
    PaymentStatus,
    SubscriptionStatus,
} from "./_types";

export type SelectDropdownOption<T extends string | number> = {
    value: T;
    label: string;
    className?: string;
    disabled?: boolean;
};

export function SelectDropdown<T extends string | number>({
    label,
    options,
    value,
    onChange,
    disabled = false,
    className = "w-full",
    menuClassName = "w-full",
}: {
    label?: string;
    options: SelectDropdownOption<T>[];
    value: T;
    onChange: (value: T) => void;
    disabled?: boolean;
    className?: string;
    menuClassName?: string;
}) {
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement | null>(null);
    const selected = options.find((option) => option.value === value) ?? options[0];

    useEffect(() => {
        if (!open) return;

        const closeOnOutsideClick = (event: MouseEvent) => {
            if (!dropdownRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        document.addEventListener("mousedown", closeOnOutsideClick);
        return () => document.removeEventListener("mousedown", closeOnOutsideClick);
    }, [open]);

    return (
        <div ref={dropdownRef} className={`relative ${className}`}>
            <button
                type="button"
                onClick={() => setOpen((current) => !current)}
                disabled={disabled}
                className={`flex h-11 w-full items-center justify-between gap-3 rounded-lg border px-3 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-300 ${
                    open
                        ? "border-primary bg-white text-primary ring-2 ring-primary/15"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-primary/20 hover:bg-white"
                }`}
                aria-expanded={open}
            >
                <span className="flex min-w-0 items-center gap-2">
                    {label && <span className="shrink-0 text-xs font-black text-slate-400">{label}</span>}
                    <span className="truncate">{selected?.label}</span>
                </span>
                <ChevronDown
                    className={`size-4 shrink-0 text-slate-400 transition-transform ${
                        open ? "rotate-180 text-primary" : ""
                    }`}
                />
            </button>

            {open && !disabled && (
                <div className={`absolute left-0 top-12 z-30 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10 animate-in fade-in slide-in-from-top-1 duration-150 ${menuClassName}`}>
                    {options.map((option) => {
                        const isSelected = option.value === value;

                        return (
                            <button
                                key={String(option.value)}
                                type="button"
                                disabled={option.disabled}
                                onClick={() => {
                                    if (option.disabled) return;
                                    onChange(option.value);
                                    setOpen(false);
                                }}
                                className={`flex h-9 w-full items-center justify-between rounded-lg px-2.5 text-left text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:text-slate-300 ${
                                    isSelected
                                        ? "bg-primary/10 text-primary"
                                        : option.className ?? "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                                }`}
                            >
                                <span className="truncate">{option.label}</span>
                                {isSelected && <Check className="size-4 shrink-0" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export function ServiceAdminPagination({
    page,
    totalPages,
    paginationItems,
    onChange,
}: {
    page: number;
    totalPages: number;
    first: boolean;
    last: boolean;
    paginationItems: Array<number | string>;
    onChange: (page: number) => void;
    jumpSize?: number;
    totalElements?: number;
}) {
    const lastPage = Math.max(totalPages - 1, 0);

    return (
        <div className="flex items-center justify-center border-t border-slate-100 px-5 py-3">
            <div className="flex flex-wrap items-center justify-center gap-1">
                <button
                    type="button"
                    onClick={() => onChange(Math.max(0, page - 1))}
                    disabled={page <= 0}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-200"
                    aria-label="이전 페이지"
                >
                    ‹
                </button>

                {paginationItems.map((item, index) =>
                    typeof item === "number" ? (
                        <button
                            key={item}
                            type="button"
                            onClick={() => onChange(item)}
                            className={`h-8 w-8 rounded-lg text-xs font-bold ${
                                page === item
                                    ? "bg-primary text-white"
                                    : "text-slate-500 hover:bg-slate-50"
                            }`}
                            aria-label={`${item + 1}페이지`}
                            aria-current={page === item ? "page" : undefined}
                        >
                            {item + 1}
                        </button>
                    ) : (
                        <span
                            key={`${item}-${index}`}
                            className="flex h-8 w-8 items-center justify-center text-xs font-bold text-slate-400"
                            aria-hidden="true"
                        >
                            ...
                        </span>
                    ),
                )}

                <button
                    type="button"
                    onClick={() => onChange(Math.min(lastPage, page + 1))}
                    disabled={page >= lastPage}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-200"
                    aria-label="다음 페이지"
                >
                    ›
                </button>
            </div>
        </div>
    );
}

const SUBSCRIPTION_LABEL: Record<SubscriptionStatus, string> = {
    ACTIVE: "구독 중",
    PAST_DUE: "결제 지연",
    PENDING: "승인 대기",
    CANCELED: "구독 취소",
    UNSUBSCRIBED: "미구독",
};

const PAYMENT_LABEL: Record<PaymentStatus, string> = {
    PAID: "결제 완료",
    READY: "결제 예정",
    FAILED: "결제 실패",
    CANCELED: "결제 취소",
    NONE: "결제 정보 없음",
};

const BADGE_STYLE: Record<SubscriptionStatus | PaymentStatus, string> = {
    ACTIVE: "bg-primary/10 text-primary",
    PAID: "bg-primary/10 text-primary",
    PAST_DUE: "bg-rose-100 text-rose-600",
    FAILED: "bg-rose-100 text-rose-600",
    PENDING: "bg-amber-100 text-amber-700",
    READY: "bg-amber-100 text-amber-700",
    CANCELED: "bg-slate-100 text-slate-500",
    UNSUBSCRIBED: "bg-slate-100 text-slate-500",
    NONE: "bg-slate-100 text-slate-500",
};

export function SubscriptionBadge({ value }: { value: SubscriptionStatus }) {
    return (
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-extrabold ${BADGE_STYLE[value]}`}>
            {SUBSCRIPTION_LABEL[value]}
        </span>
    );
}

export function PaymentBadge({ value }: { value: PaymentStatus }) {
    return (
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-extrabold ${BADGE_STYLE[value]}`}>
            {PAYMENT_LABEL[value]}
        </span>
    );
}

export function PendingActionBadge({
    value,
}: {
    value: "PLAN_CHANGE" | "CANCEL";
}) {
    const label = value === "PLAN_CHANGE" ? "플랜 변경 예정" : "구독 취소 예정";
    const style =
        value === "PLAN_CHANGE"
            ? "bg-sky-100 text-sky-700"
            : "bg-amber-100 text-amber-700";

    return (
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-extrabold ${style}`}>
            {label}
        </span>
    );
}

export function formatCurrency(value: number) {
    return `${value.toLocaleString("ko-KR")}원`;
}

export function getSubscriptionDuration(
    firstSubscribedAt: string | null,
    subscriptionEndedAt: string | null = null,
    subscriptionStatus?: SubscriptionStatus,
) {
    if (!firstSubscribedAt) {
        return subscriptionStatus === "PENDING" ? "구독 시작 전" : "미구독";
    }

    const start = new Date(`${firstSubscribedAt}T00:00:00`);
    const end = subscriptionEndedAt
        ? new Date(`${subscriptionEndedAt}T00:00:00`)
        : new Date();

    let months =
        (end.getFullYear() - start.getFullYear()) * 12 +
        end.getMonth() -
        start.getMonth();

    if (end.getDate() < start.getDate()) months -= 1;

    if (months < 1) return "1개월 미만";
    return `${months}개월`;
}
