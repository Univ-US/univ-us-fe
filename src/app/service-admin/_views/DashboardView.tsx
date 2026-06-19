"use client";

import {
    AlertTriangle,
    ArrowRight,
    Building2,
    CircleDollarSign,
    MessageSquareText,
    RefreshCw,
    UsersRound,
} from "lucide-react";
import type {
    ServiceAdminDashboardResponse,
    ServiceAdminDashboardSchool,
} from "@/lib/serviceAdminApi";
import {
    formatCurrency,
    SubscriptionBadge,
} from "../_components";

interface DashboardViewProps {
    dashboard: ServiceAdminDashboardResponse | null;
    loading: boolean;
    error: string;
    onRetry: () => void;
    onOpenSchools: () => void;
}

const ROLE_LABEL = {
    GUEST: "게스트",
    STU: "학생",
    PROF: "교수",
    ALU: "졸업생",
    ADM: "학교 관리자",
} as const;

function formatChangeRate(rate: number | null) {
    if (rate === null) return "전월 비교 데이터 없음";
    if (rate === 0) return "전월과 동일";
    return `전월 대비 ${Math.abs(rate).toLocaleString("ko-KR")}% ${rate > 0 ? "증가" : "감소"}`;
}

function formatDate(value: string) {
    return new Date(value).toLocaleDateString("ko-KR");
}

function getSubscriptionDuration(school: ServiceAdminDashboardSchool) {
    if (!school.startedAt) {
        return school.subscriptionStatus === "PENDING" ? "구독 시작 전" : "미구독";
    }

    const start = new Date(school.startedAt);
    const end = school.endedAt ? new Date(school.endedAt) : new Date();
    let months =
        (end.getFullYear() - start.getFullYear()) * 12 +
        end.getMonth() -
        start.getMonth();

    if (end.getDate() < start.getDate()) months -= 1;
    return months < 1 ? "1개월 미만" : `${months}개월`;
}

export default function DashboardView({
    dashboard,
    loading,
    error,
    onRetry,
    onOpenSchools,
}: DashboardViewProps) {
    const monthLabel = new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "long",
    }).format(new Date());

    if (loading) {
        return (
            <div className="space-y-5">
                <DashboardHeader />
                <section className="flex min-h-72 items-center justify-center rounded-2xl border border-emerald-900/10 bg-white shadow-sm">
                    <RefreshCw className="size-6 animate-spin text-emerald-700" />
                    <span className="ml-3 text-sm font-bold text-slate-500">
                        대시보드 정보를 불러오는 중입니다.
                    </span>
                </section>
            </div>
        );
    }

    if (error || !dashboard) {
        return (
            <div className="space-y-5">
                <DashboardHeader />
                <section className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm">
                    <AlertTriangle className="size-7 text-rose-500" />
                    <p className="mt-3 font-black text-slate-900">
                        {error || "대시보드 정보가 없습니다."}
                    </p>
                    <button
                        onClick={onRetry}
                        className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-black text-white hover:bg-emerald-800"
                    >
                        <RefreshCw className="size-4" />
                        다시 시도
                    </button>
                </section>
            </div>
        );
    }

    const { summary, schools, recentMembers } = dashboard;
    const issueCount =
        summary.failedPaymentSchoolCount +
        summary.pendingSchoolCount +
        summary.unresolvedInquiryCount;
    const summaryCards = [
        {
            label: "이번 달 매출",
            value: formatCurrency(summary.currentMonthRevenue),
            note: formatChangeRate(summary.revenueChangeRate),
            icon: CircleDollarSign,
        },
        {
            label: "구독 기관",
            value: `${summary.activeSchoolCount.toLocaleString("ko-KR")}곳`,
            note: `노출 학교 ${summary.totalSchoolCount.toLocaleString("ko-KR")}곳`,
            icon: Building2,
        },
        {
            label: "전체 회원",
            value: `${summary.totalMemberCount.toLocaleString("ko-KR")}명`,
            note: `이번 달 ${summary.currentMonthNewMemberCount.toLocaleString("ko-KR")}명 · ${formatChangeRate(summary.newMemberChangeRate)}`,
            icon: UsersRound,
        },
        {
            label: "미처리 문의",
            value: `${summary.unresolvedInquiryCount.toLocaleString("ko-KR")}건`,
            note: "답변 또는 처리가 필요한 문의",
            icon: MessageSquareText,
        },
    ];

    return (
        <div className="space-y-5">
            <DashboardHeader />

            <section className="overflow-hidden rounded-2xl bg-[#064b35] p-6 text-white shadow-sm">
                <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                    <div>
                        <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-extrabold">
                            {monthLabel} 운영 현황
                        </span>
                        <p className="mt-5 text-sm font-bold text-emerald-100">
                            이번 달 결제 완료 매출
                        </p>
                        <p className="mt-2 text-4xl font-black">
                            {formatCurrency(summary.currentMonthRevenue)}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-emerald-200">
                            정상 구독 {summary.activeSchoolCount.toLocaleString("ko-KR")}곳 ·
                            결제 확인 필요 {summary.failedPaymentSchoolCount.toLocaleString("ko-KR")}곳
                        </p>
                    </div>
                    <button
                        onClick={onOpenSchools}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-black text-emerald-900 transition hover:bg-emerald-50"
                    >
                        학교 관리 바로가기
                        <ArrowRight className="size-4" />
                    </button>
                </div>
            </section>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {summaryCards.map(({ label, value, note, icon: Icon }) => (
                    <section
                        key={label}
                        className="rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-sm"
                    >
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-extrabold text-slate-500">{label}</p>
                            <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                                <Icon className="size-4" />
                            </span>
                        </div>
                        <p className="mt-4 text-2xl font-black">{value}</p>
                        <p className="mt-2 text-xs font-bold text-slate-400">{note}</p>
                    </section>
                ))}
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
                <section className="overflow-hidden rounded-2xl border border-emerald-900/10 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                        <div>
                            <h2 className="font-black">구독 기관 현황</h2>
                            <p className="mt-1 text-xs text-slate-400">
                                구독 이력 또는 회원이 있는 학교만 표시합니다.
                            </p>
                        </div>
                        <button onClick={onOpenSchools} className="text-xs font-extrabold text-emerald-700">
                            전체 보기
                        </button>
                    </div>
                    <div className="max-h-[340px] overflow-auto">
                        <table className="w-full min-w-[760px] table-fixed text-left text-sm">
                            <colgroup>
                                <col className="w-[230px]" />
                                <col className="w-[110px]" />
                                <col className="w-[130px]" />
                                <col className="w-[110px]" />
                                <col className="w-[150px]" />
                            </colgroup>
                            <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-extrabold text-slate-500">
                                <tr>
                                    <th className="px-5 py-3">기관명</th>
                                    <th className="px-5 py-3">플랜</th>
                                    <th className="px-5 py-3">구독 기간</th>
                                    <th className="px-5 py-3">회원</th>
                                    <th className="px-5 py-3">상태</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {schools.map((school) => (
                                    <tr key={school.univId} className="font-semibold text-slate-700">
                                        <td className="px-5 py-3 font-black text-slate-950">
                                            <p className="truncate" title={school.univName}>
                                                {school.univName}
                                            </p>
                                        </td>
                                        <td className="whitespace-nowrap px-5 py-3">
                                            {school.planName ?? "미구독"}
                                        </td>
                                        <td className="whitespace-nowrap px-5 py-3">
                                            {getSubscriptionDuration(school)}
                                        </td>
                                        <td className="whitespace-nowrap px-5 py-3">
                                            {school.memberCount.toLocaleString("ko-KR")}명
                                        </td>
                                        <td className="whitespace-nowrap px-5 py-3">
                                            <SubscriptionBadge value={school.subscriptionStatus} />
                                        </td>
                                    </tr>
                                ))}
                                {schools.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-5 py-12 text-center font-bold text-slate-400">
                                            표시할 학교가 없습니다.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="overflow-hidden rounded-2xl border border-emerald-900/10 bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-5 py-4">
                        <h2 className="font-black">최근 이용자</h2>
                        <p className="mt-1 text-xs text-slate-400">
                            최근 가입한 학생, 교수, 졸업생을 표시합니다.
                        </p>
                    </div>
                    <div className="max-h-[340px] overflow-auto">
                        <table className="w-full min-w-[620px] table-fixed text-left text-sm">
                            <colgroup>
                                <col className="w-[160px]" />
                                <col className="w-[230px]" />
                                <col className="w-[90px]" />
                                <col className="w-[140px]" />
                            </colgroup>
                            <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-extrabold text-slate-500">
                                <tr>
                                    <th className="px-5 py-3">회원</th>
                                    <th className="px-5 py-3">기관</th>
                                    <th className="px-5 py-3">역할</th>
                                    <th className="px-5 py-3">가입일</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {recentMembers.map((member) => (
                                    <tr key={member.memberId} className="font-semibold text-slate-700">
                                        <td className="px-5 py-3">
                                            <p className="truncate font-black text-slate-950" title={member.memberName}>
                                                {member.memberName}
                                            </p>
                                            <p className="mt-0.5 truncate text-xs text-slate-400" title={member.loginId}>
                                                {member.loginId}
                                            </p>
                                        </td>
                                        <td className="px-5 py-3">
                                            <p className="truncate" title={member.univName ?? "-"}>
                                                {member.univName ?? "-"}
                                            </p>
                                        </td>
                                        <td className="whitespace-nowrap px-5 py-3">
                                            {ROLE_LABEL[member.role]}
                                        </td>
                                        <td className="whitespace-nowrap px-5 py-3 text-slate-400">
                                            {formatDate(member.createdAt)}
                                        </td>
                                    </tr>
                                ))}
                                {recentMembers.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-5 py-12 text-center font-bold text-slate-400">
                                            최근 가입한 이용자가 없습니다.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            <section
                className={`rounded-2xl border px-5 py-4 ${
                    issueCount > 0
                        ? "border-amber-200 bg-amber-50"
                        : "border-emerald-200 bg-emerald-50"
                }`}
            >
                <div className="flex items-start gap-3">
                    <AlertTriangle
                        className={`mt-0.5 size-5 ${
                            issueCount > 0 ? "text-amber-600" : "text-emerald-600"
                        }`}
                    />
                    <div>
                        <p className={issueCount > 0 ? "font-black text-amber-900" : "font-black text-emerald-900"}>
                            운영 확인 필요
                        </p>
                        <p className={issueCount > 0 ? "mt-1 text-sm font-semibold text-amber-800" : "mt-1 text-sm font-semibold text-emerald-800"}>
                            {issueCount > 0
                                ? `결제 실패 학교 ${summary.failedPaymentSchoolCount.toLocaleString("ko-KR")}곳, 승인 대기 학교 ${summary.pendingSchoolCount.toLocaleString("ko-KR")}곳, 미처리 문의 ${summary.unresolvedInquiryCount.toLocaleString("ko-KR")}건이 있습니다.`
                                : "현재 확인이 필요한 운영 이슈가 없습니다."}
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}

function DashboardHeader() {
    return (
        <div>
            <h1 className="text-2xl font-black tracking-tight">서비스 관리자 대시보드</h1>
            <p className="mt-1 text-sm text-slate-500">
                전체 기관의 구독, 매출, 회원과 운영 이슈를 확인합니다.
            </p>
        </div>
    );
}
