"use client";

import {
    AlertTriangle,
    ArrowRight,
    Building2,
    CircleDollarSign,
    MessageSquareText,
    UsersRound,
} from "lucide-react";
import type { ServiceSchool } from "../_types";
import {
    formatCurrency,
    getSubscriptionDuration,
    SubscriptionBadge,
} from "../_components";
import { getMockMembersForSchool } from "../_mockData";

interface DashboardViewProps {
    schools: ServiceSchool[];
    onOpenSchool: (school: ServiceSchool) => void;
    onOpenSchools: () => void;
}

export default function DashboardView({
    schools,
    onOpenSchool,
    onOpenSchools,
}: DashboardViewProps) {
    const activeSchools = schools.filter((school) => school.subscriptionStatus === "ACTIVE");
    const monthlyRevenue = schools.reduce((sum, school) => sum + school.monthlyRevenue, 0);
    const totalMembers = schools.reduce((sum, school) => sum + school.memberCount, 0);
    const visibleMembers = schools
        .flatMap((school) =>
            getMockMembersForSchool(school)
                .filter((member) => member.role !== "ADM")
                .slice(0, 2)
                .map((member) => ({
                    ...member,
                    schoolName: school.name,
                })),
        )
        .slice(0, 18);

    const summaryCards = [
        {
            label: "이번 달 매출",
            value: formatCurrency(monthlyRevenue),
            note: "전월 대비 8.4% 증가",
            icon: CircleDollarSign,
        },
        {
            label: "구독 기관",
            value: `${activeSchools.length}곳`,
            note: `전체 ${schools.length}곳`,
            icon: Building2,
        },
        {
            label: "전체 회원",
            value: `${totalMembers.toLocaleString("ko-KR")}명`,
            note: "이번 달 326명 증가",
            icon: UsersRound,
        },
        {
            label: "미처리 문의",
            value: "11건",
            note: "긴급 문의 3건",
            icon: MessageSquareText,
        },
    ];

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-2xl font-black tracking-tight">서비스 관리자 대시보드</h1>
                <p className="mt-1 text-sm text-slate-500">
                    전체 기관의 구독, 매출, 회원과 운영 이슈를 확인합니다.
                </p>
            </div>

            <section className="overflow-hidden rounded-2xl bg-[#064b35] p-6 text-white shadow-sm">
                <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                    <div>
                        <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-extrabold">
                            2026년 6월 운영 현황
                        </span>
                        <p className="mt-5 text-sm font-bold text-emerald-100">월간 반복 매출</p>
                        <p className="mt-2 text-4xl font-black">{formatCurrency(monthlyRevenue)}</p>
                        <p className="mt-2 text-sm font-semibold text-emerald-200">
                            정상 구독 {activeSchools.length}곳 · 결제 확인 필요 2곳
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
                            <p className="mt-1 text-xs text-slate-400">최근 확인이 필요한 기관부터 표시합니다.</p>
                        </div>
                        <button onClick={onOpenSchools} className="text-xs font-extrabold text-emerald-700">
                            전체 보기
                        </button>
                    </div>
                    <div className="max-h-[340px] overflow-y-auto">
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
                                    <tr
                                        key={school.id}
                                        onClick={() => onOpenSchool(school)}
                                        className="cursor-pointer font-semibold text-slate-700 transition hover:bg-emerald-50/60"
                                    >
                                        <td className="px-5 py-3 font-black text-slate-950">
                                            <p className="truncate" title={school.name}>{school.name}</p>
                                        </td>
                                        <td className="whitespace-nowrap px-5 py-3">{school.plan ?? "미구독"}</td>
                                        <td className="whitespace-nowrap px-5 py-3">
                                            {getSubscriptionDuration(
                                                school.firstSubscribedAt,
                                                school.subscriptionEndedAt,
                                                school.subscriptionStatus,
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap px-5 py-3">{school.memberCount.toLocaleString()}명</td>
                                        <td className="whitespace-nowrap px-5 py-3">
                                            <SubscriptionBadge value={school.subscriptionStatus} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="overflow-hidden rounded-2xl border border-emerald-900/10 bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-5 py-4">
                        <h2 className="font-black">최근 이용자 조회</h2>
                        <p className="mt-1 text-xs text-slate-400">학교 관리자를 제외한 기관별 최근 이용자를 일부 표시합니다.</p>
                    </div>
                    <div className="max-h-[340px] overflow-y-auto">
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
                                {visibleMembers.map((member) => (
                                    <tr key={member.id} className="font-semibold text-slate-700">
                                        <td className="px-5 py-3">
                                            <p className="truncate font-black text-slate-950" title={member.name}>{member.name}</p>
                                            <p className="mt-0.5 truncate text-xs text-slate-400" title={member.loginId}>{member.loginId}</p>
                                        </td>
                                        <td className="px-5 py-3">
                                            <p className="truncate" title={member.schoolName}>{member.schoolName}</p>
                                        </td>
                                        <td className="whitespace-nowrap px-5 py-3">
                                            {member.role === "STU"
                                                ? "학생"
                                                : member.role === "PROF"
                                                    ? "교수"
                                                    : "졸업생"}
                                        </td>
                                        <td className="whitespace-nowrap px-5 py-3 text-slate-400">{member.joinedAt}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            <section className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 size-5 text-amber-600" />
                    <div>
                        <p className="font-black text-amber-900">운영 확인 필요</p>
                        <p className="mt-1 text-sm font-semibold text-amber-800">
                            결제 실패 2건, 승인 대기 기관 2곳, 답변 대기 문의 3건이 있습니다.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}
