"use client";

import { useEffect, useState } from "react";
import { ChevronRight, Megaphone, Users, X } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { getAdminMembers, getAdminUniversity, ROLE_LABEL, STATUS_LABEL, type ApiMember, type ApiUniversity } from "@/lib/adminApi";
import { BILLING_CYCLE_LABEL, getSubscriptionStatus, SUBSCRIPTION_ACCESS_LABEL } from "@/lib/subscriptionApi";
import type { SubscriptionAccessStatus } from "@/types/subscription";
import { Avatar } from "../_components";

export default function DashboardView({ onNavigate }: { onNavigate: (view: string) => void }) {
    const { univId } = useAuthStore();
    const [members, setMembers] = useState<ApiMember[]>([]);
    const [university, setUniversity] = useState<ApiUniversity | null>(null);
    const [subscription, setSubscription] = useState<SubscriptionAccessStatus | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!univId) return;

        Promise.all([
            getAdminMembers(),
            getAdminUniversity(univId),
            getSubscriptionStatus(),
        ]).then(([memberData, univData, subscriptionData]) => {
            const mine = memberData.list.filter((m) => m.univId === univId);
            setMembers(mine);
            setUniversity(univData);
            setSubscription(subscriptionData);
        }).catch(console.error).finally(() => setLoading(false));
    }, [univId]);

    const activeCount = members.filter((m) => m.status === "ACTIVE").length;
    const recentMembers = members.filter((m) => m.status === "ACTIVE").slice(0, 3);

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <p className="text-sm text-slate-400">불러오는 중...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-black tracking-tight">대시보드</h1>
                <p className="mt-1 text-sm text-slate-500">구동 현황을 확인합니다.</p>
            </div>

            {/* School + seat usage */}
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                <section className="overflow-hidden rounded-xl bg-[var(--primary)] p-6 text-white shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-extrabold">
                            {subscription ? SUBSCRIPTION_ACCESS_LABEL[subscription.accessStatus] : "상태 확인 불가"}
                        </span>
                        {subscription?.planName && (
                            <span className="text-xs font-bold text-primary-foreground">
                                {subscription.planName}
                                {subscription.billingCycle ? ` · ${BILLING_CYCLE_LABEL[subscription.billingCycle] ?? subscription.billingCycle}` : ""}
                            </span>
                        )}
                    </div>
                    <div className="mt-6">
                        {university?.univName && (
                            <p className="text-xl font-black">{university.univName}</p>
                        )}
                        {university?.address && (
                            <p className="mt-2 text-sm text-primary/40">{university.address}</p>
                        )}
                        {university?.schoolPhone && (
                            <p className="mt-1 text-xs text-primary/40">{university.schoolPhone}</p>
                        )}
                    </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="text-sm font-black text-slate-900">전체 회원</h2>
                    <p className="mt-3 flex items-end gap-1 text-4xl font-black leading-none text-slate-950">
                        {members.length}
                        <span className="pb-1 text-sm font-bold text-slate-400">명</span>
                    </p>
                    <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
                        {[
                            { label: "활성", count: activeCount, color: "text-primary" },
                            { label: "정지", count: members.filter((m) => m.status === "SUSPENDED").length, color: "text-amber-600" },
                            { label: "탈퇴", count: members.filter((m) => m.status === "WITHDRAWN").length, color: "text-rose-500" },
                        ].map((s) => (
                            <div key={s.label} className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-2.5">
                                <p className={`text-lg font-black leading-none ${s.color}`}>{s.count}</p>
                                <p className="mt-1 font-bold text-slate-500">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                {/* Recent members table */}
                <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                        <h2 className="font-black">최근 가입 회원</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[480px] text-left text-sm">
                            <thead className="bg-slate-50 text-xs font-extrabold text-slate-500">
                                <tr>
                                    <th className="px-5 py-3">이름</th>
                                    <th className="px-5 py-3">역할</th>
                                    <th className="px-5 py-3">상태</th>
                                    <th className="px-5 py-3">가입일</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {members.slice(0, 5).map((m) => (
                                    <tr key={m.memberId} className="font-semibold text-slate-700">
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-2">
                                                <Avatar name={m.memberName} />
                                                <span className="font-black text-slate-950">{m.memberName}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3">{ROLE_LABEL[m.role] ?? m.role}</td>
                                        <td className="px-5 py-3">{STATUS_LABEL[m.status] ?? m.status}</td>
                                        <td className="px-5 py-3 text-slate-400">
                                            {m.createdAt ? new Date(m.createdAt).toLocaleDateString("ko-KR") : "—"}
                                        </td>
                                    </tr>
                                ))}
                                {members.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-5 py-8 text-center text-sm text-slate-400">
                                            등록된 회원이 없습니다.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                <div className="space-y-5">
                    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-black text-slate-900">바로 처리</h2>
                            <span className="text-[11px] font-bold text-slate-400">QUICK</span>
                        </div>
                        <div className="mt-4 space-y-2.5">
                            {[
                                { label: "일괄 회원가입", icon: Users, view: "members" },
                                { label: "공지 작성", icon: Megaphone, view: "notices" },
                                { label: "회원 상태 변경", icon: X, view: "members" },
                            ].map(({ label, icon: Icon, view }) => (
                                <button
                                    key={label}
                                    onClick={() => onNavigate(view)}
                                    className="group flex h-11 w-full items-center gap-3 rounded-lg border border-slate-100 bg-white px-3 text-left text-sm font-bold text-slate-700 shadow-sm transition-all hover:border-primary/20 hover:bg-primary/[0.03] hover:text-primary hover:shadow-md"
                                >
                                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400 transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                                        <Icon className="size-4" />
                                    </span>
                                    <span className="min-w-0 flex-1 truncate">{label}</span>
                                    <ChevronRight className="size-4 shrink-0 text-slate-300 transition-colors group-hover:text-primary" />
                                </button>
                            ))}
                        </div>
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="text-sm font-black text-slate-900">최근 활성 회원</h2>
                        <div className="mt-4 space-y-3">
                            {recentMembers.map((m) => (
                                <div key={m.memberId} className="flex min-h-10 items-center gap-3">
                                    <Avatar name={m.memberName} />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-black">{m.memberName}</p>
                                        <p className="truncate text-xs text-slate-500">
                                            {ROLE_LABEL[m.role] ?? m.role}
                                        </p>
                                    </div>
                                    <p className="shrink-0 text-xs font-semibold text-slate-400">
                                        {m.createdAt ? new Date(m.createdAt).toLocaleDateString("ko-KR") : "—"}
                                    </p>
                                </div>
                            ))}
                            {recentMembers.length === 0 && (
                                <p className="text-sm text-slate-400">활성 회원이 없습니다.</p>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
