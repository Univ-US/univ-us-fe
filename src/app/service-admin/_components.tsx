import type {
    PaymentStatus,
    SubscriptionStatus,
} from "./_types";

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
    ACTIVE: "bg-emerald-100 text-emerald-700",
    PAID: "bg-emerald-100 text-emerald-700",
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
