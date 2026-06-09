"use client";

import { useEffect, useState } from "react";
import { ChevronRight, Megaphone, Users, X } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { getAdminMembers, getAdminUniversity, ROLE_LABEL, STATUS_LABEL, type ApiMember, type ApiUniversity } from "@/lib/adminApi";
import { Avatar } from "../_components";

export default function DashboardView() {
    const { univId } = useAuthStore();
    const [members, setMembers] = useState<ApiMember[]>([]);
    const [university, setUniversity] = useState<ApiUniversity | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!univId) return;

        Promise.all([
            getAdminMembers(),
            getAdminUniversity(univId),
        ]).then(([memberData, univData]) => {
            const mine = memberData.list.filter((m) => m.univId === univId);
            setMembers(mine);
            setUniversity(univData);
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
        <div className="space-y-5">
            <div>
                <h1 className="text-2xl font-black tracking-tight">대시보드</h1>
                <p className="mt-1 text-sm text-slate-500">구동 현황을 확인합니다.</p>
            </div>

            {/* School + seat usage */}
            <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
                <section className="overflow-hidden rounded-2xl bg-[#064b35] p-6 text-white shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-extrabold">정상 구동중</span>
                        <span className="text-xs font-bold text-emerald-100">Campus Pro · 월간</span>
                    </div>
                    <div className="mt-6">
                        {university?.univName && (
                            <p className="text-xl font-black">{university.univName}</p>
                        )}
                        {university?.address && (
                            <p className="mt-2 text-sm text-emerald-300">{university.address}</p>
                        )}
                        {university?.schoolPhone && (
                            <p className="mt-1 text-xs text-emerald-300">{university.schoolPhone}</p>
                        )}
                    </div>
                </section>

                <section className="rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-sm">
                    <h2 className="font-black">전체 회원</h2>
                    <p className="mt-3 text-4xl font-black">{members.length}<span className="text-base font-bold text-slate-400">명</span></p>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                        {[
                            { label: "활성", count: activeCount, color: "text-emerald-700" },
                            { label: "정지", count: members.filter((m) => m.status === "SUSPENDED").length, color: "text-amber-600" },
                            { label: "탈퇴", count: members.filter((m) => m.status === "WITHDRAWN").length, color: "text-rose-500" },
                        ].map((s) => (
                            <div key={s.label} className="rounded-lg bg-slate-50 py-2">
                                <p className={`text-lg font-black ${s.color}`}>{s.count}</p>
                                <p className="font-bold text-slate-500">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
                {/* Recent members table */}
                <section className="overflow-hidden rounded-2xl border border-emerald-900/10 bg-white shadow-sm">
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
                    <section className="rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-sm">
                        <h2 className="font-black">바로 처리</h2>
                        <div className="mt-4 space-y-2">
                            {[
                                { label: "일괄 회원가입", icon: Users },
                                { label: "공지 작성", icon: Megaphone },
                                { label: "회원 상태 변경", icon: X },
                            ].map(({ label, icon: Icon }) => (
                                <button
                                    key={label}
                                    className="flex h-10 w-full items-center gap-3 rounded-lg bg-slate-50 px-4 text-left text-sm font-bold transition-colors hover:bg-emerald-50 hover:text-emerald-800"
                                >
                                    <Icon className="size-4 text-slate-400" />
                                    {label}
                                    <ChevronRight className="ml-auto size-4 text-slate-300" />
                                </button>
                            ))}
                        </div>
                    </section>

                    <section className="rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-sm">
                        <h2 className="font-black">최근 활성 회원</h2>
                        <div className="mt-3 space-y-3">
                            {recentMembers.map((m) => (
                                <div key={m.memberId} className="flex items-center gap-3">
                                    <Avatar name={m.memberName} />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-black">{m.memberName}</p>
                                        <p className="truncate text-xs text-slate-500">
                                            {ROLE_LABEL[m.role] ?? m.role}
                                        </p>
                                    </div>
                                    <p className="text-xs text-slate-400">
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
