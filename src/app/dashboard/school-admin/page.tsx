"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuthStore } from "@/store/authStore";
import RoleGuard from "@/components/auth/RoleGuard";
import {
    Bell,
    BookOpen,
    Building2,
    CreditCard,
    Home,
    LayoutDashboard,
    LogOut,
    Megaphone,
    MessageSquareText,
    Settings,
    Users,
} from "lucide-react";
import type { View } from "./_types";
import DashboardView from "./_views/DashboardView";
import MembersView from "./_views/MembersView";
import NoticesView from "./_views/NoticesView";
import BillingView from "./_views/BillingView";
import SettingsView from "./_views/SettingsView";
import InquiriesView from "./_views/InquiriesView";
import LectureCodesView from "./_views/LectureCodesView";

const NAV_ITEMS: { label: string; view: View; icon: React.ComponentType<{ className?: string }> }[] = [
    { label: "대시보드", view: "dashboard", icon: LayoutDashboard },
    { label: "회원 관리", view: "members", icon: Users },
    { label: "공지 관리", view: "notices", icon: Megaphone },
    { label: "문의사항", view: "inquiries", icon: MessageSquareText },
    { label: "강의코드 관리", view: "lectureCodes", icon: BookOpen },
    { label: "구독·결제", view: "billing", icon: CreditCard },
    { label: "학교 설정", view: "settings", icon: Settings },
];

const SECTION_LABEL: Record<View, string> = {
    dashboard: "대시보드",
    members: "회원 관리",
    notices: "공지 관리",
    inquiries: "문의사항",
    lectureCodes: "강의코드 관리",
    billing: "구독·결제",
    settings: "학교 설정",
};

export default function SchoolAdminDashboardPage() {
    const router = useRouter();
    const { logoutAction, memberName } = useAuthStore();
    const [view, setView] = useState<View>("dashboard");

    const handleLogout = async () => {
        await logoutAction();
        router.push("/landing");
    };

    return (
        <RoleGuard allowedRoles={["ADM"]}>
            <main className="min-h-screen bg-[#f4faf7] text-slate-950">
                <aside className="fixed inset-y-0 left-0 z-30 hidden w-[220px] flex-col bg-[#064b35] px-3 py-5 text-white lg:flex">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2">
                            <Image src="/univusicon.png" alt="Univ us" width={28} height={28} className="rounded-lg" />
                            <span className="text-lg font-black tracking-wide">
                                <span className="text-white">Univ</span>
                                <span className="text-white"> · </span><span className="text-teal-300">us</span>
                            </span>
                        </div>
                        <span className="rounded-full border border-white/20 px-2 py-0.5 text-[10px] font-bold text-emerald-100">
                            관리자
                        </span>
                    </div>

                    <div className="mt-6 rounded-xl bg-white/12 p-4">
                        <div className="flex items-center gap-3">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-lg font-black">
                                {memberName?.slice(0, 1) ?? "관"}
                            </div>
                            <div>
                                <p className="text-sm font-extrabold">{memberName ?? "관리자"}</p>
                                <p className="mt-0.5 text-xs font-medium text-emerald-200">학교 관리자</p>
                            </div>
                        </div>
                    </div>

                    <p className="mt-6 px-2 text-[10px] font-bold uppercase tracking-widest text-emerald-100/60">운영</p>
                    <nav className="mt-2 flex-1 space-y-0.5">
                        {NAV_ITEMS.slice(0, 5).map(({ label, view: v, icon: Icon }) => (
                            <button
                                key={v}
                                onClick={() => setView(v)}
                                className={`flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-bold transition-colors ${view === v ? "bg-white/18 text-white" : "text-emerald-50/80 hover:bg-white/10"}`}
                            >
                                <Icon className="size-4 shrink-0" />
                                {label}
                            </button>
                        ))}

                        <p className="px-2 pt-4 text-[10px] font-bold uppercase tracking-widest text-emerald-100/60">시스템</p>
                        {NAV_ITEMS.slice(5).map(({ label, view: v, icon: Icon }) => (
                            <button
                                key={v}
                                onClick={() => setView(v)}
                                className={`flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-bold transition-colors ${view === v ? "bg-white/18 text-white" : "text-emerald-50/80 hover:bg-white/10"}`}
                            >
                                <Icon className="size-4 shrink-0" />
                                {label}
                            </button>
                        ))}
                    </nav>

                    <div className="space-y-1.5">
                        <button
                            onClick={() => router.push("/home")}
                            className="flex h-10 w-full items-center gap-3 rounded-lg bg-white/10 px-3 text-sm font-bold hover:bg-white/15"
                        >
                            <Home className="size-4" /> 학생 홈으로 전환
                        </button>
                        <button
                            onClick={handleLogout}
                            className="flex h-10 w-full items-center gap-3 rounded-lg bg-white/10 px-3 text-sm font-bold hover:bg-white/15"
                        >
                            <LogOut className="size-4" /> 로그아웃
                        </button>
                    </div>
                </aside>

                <div className="lg:pl-[220px]">
                    <header className="sticky top-0 z-20 border-b border-emerald-900/10 bg-white/85 backdrop-blur">
                        <div className="flex h-16 items-center justify-between px-6 lg:px-8">
                            <div className="flex items-center gap-2 text-sm font-extrabold text-slate-500">
                                <Building2 className="size-4" />
                                <span className="text-slate-900">{SECTION_LABEL[view]}</span>
                            </div>
                            <button className="flex size-9 items-center justify-center rounded-full border border-border bg-white shadow-sm">
                                <Bell className="size-4 text-slate-500" />
                            </button>
                        </div>
                    </header>

                    <section className="px-6 py-8 lg:px-8">
                        {view === "dashboard" && <DashboardView onNavigate={(v) => setView(v as View)} />}
                        {view === "members" && <MembersView />}
                        {view === "notices" && <NoticesView />}
                        {view === "inquiries" && <InquiriesView />}
                        {view === "lectureCodes" && <LectureCodesView />}
                        {view === "billing" && <BillingView />}
                        {view === "settings" && <SettingsView />}
                    </section>
                </div>
            </main>
        </RoleGuard>
    );
}
