/* eslint-disable */
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { getSubscriptionStatus } from "@/lib/subscriptionApi";
import RoleGuard from "@/components/auth/RoleGuard";
import {
    Bell,
    BookPlus,
    Building2,
    CreditCard,
    Home,
    LayoutDashboard,
    Library,
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
import LectureManageView from "./_views/LectureManageView";
import LectureAssignView from "./_views/LectureAssignView";

const NAV_ITEMS: { label: string; view: View; icon: React.ComponentType<{ className?: string }> }[] = [
    { label: "??쒕낫??, view: "dashboard", icon: LayoutDashboard },
    { label: "?뚯썝 愿由?, view: "members", icon: Users },
    { label: "怨듭? 愿由?, view: "notices", icon: Megaphone },
    { label: "臾몄쓽?ы빆", view: "inquiries", icon: MessageSquareText },
    { label: "媛뺤쓽 愿由?, view: "lectureManage", icon: Library },
    { label: "媛뺤쓽 諛곗젙", view: "lectureAssign", icon: BookPlus },
    { label: "援щ룆쨌寃곗젣", view: "billing", icon: CreditCard },
    { label: "?숆탳 ?ㅼ젙", view: "settings", icon: Settings },
];

const SECTION_LABEL: Record<View, string> = {
    dashboard: "??쒕낫??,
    members: "?뚯썝 愿由?,
    notices: "怨듭? 愿由?,
    inquiries: "臾몄쓽?ы빆",
    lectureManage: "媛뺤쓽 愿由?,
    lectureAssign: "媛뺤쓽 諛곗젙",
    billing: "援щ룆쨌寃곗젣",
    settings: "?숆탳 ?ㅼ젙",
};

const VALID_VIEWS = new Set(Object.keys(SECTION_LABEL) as View[]);

function SchoolAdminDashboard() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { logoutAction, memberName, isInitialized, role } = useAuthStore();
    const [accessChecked, setAccessChecked] = useState(false);

    useEffect(() => {
        if (!isInitialized) return;
        if (role !== "ADM") {
            setAccessChecked(true);
            return;
        }

        let active = true;
        void getSubscriptionStatus()
            .then((status) => {
                if (!active) return;
                if (!status.serviceAccessible) {
                    router.replace("/subscribe");
                    return;
                }
                setAccessChecked(true);
            })
            .catch(() => {
                if (active) setAccessChecked(true);
            });

        return () => {
            active = false;
        };
    }, [isInitialized, role, router]);

    const rawView = searchParams.get("view") as View | null;
    const view: View = rawView && VALID_VIEWS.has(rawView) ? rawView : "dashboard";

    const setView = (v: View) => {
        router.push(`/dashboard/school-admin?view=${v}`);
    };

    const handleLogout = async () => {
        await logoutAction();
        router.push("/landing");
    };

    if (!accessChecked) {
        return null;
    }

    return (
        <RoleGuard allowedRoles={["ADM"]}>
            <main className="min-h-screen bg-[#f4faf7] text-slate-950">
                <aside className="fixed inset-y-0 left-0 z-30 hidden w-[220px] flex-col bg-[#064b35] px-3 py-5 text-white lg:flex">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2">
                            <img src="/univusicon.png" alt="Univ us" className="w-7 h-7 rounded-lg" />
                            <span className="text-lg font-black tracking-wide">
                                <span className="text-white">Univ</span>
                                <span className="text-white"> 쨌 </span><span className="text-teal-300">us</span>
                            </span>
                        </div>
                        <span className="rounded-full border border-white/20 px-2 py-0.5 text-[10px] font-bold text-emerald-100">
                            愿由ъ옄
                        </span>
                    </div>

                    <div className="mt-6 rounded-xl bg-white/12 p-4">
                        <div className="flex items-center gap-3">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-lg font-black">
                                {memberName?.slice(0, 1) ?? "愿"}
                            </div>
                            <div>
                                <p className="text-sm font-extrabold">{memberName ?? "愿由ъ옄"}</p>
                                <p className="mt-0.5 text-xs font-medium text-emerald-200">?숆탳 愿由ъ옄</p>
                            </div>
                        </div>
                    </div>

                    <p className="mt-6 px-2 text-[10px] font-bold uppercase tracking-widest text-emerald-100/60">?댁쁺</p>
                    <nav className="mt-2 flex-1 space-y-0.5">
                        {NAV_ITEMS.slice(0, 6).map(({ label, view: v, icon: Icon }) => (
                            <button
                                key={v}
                                onClick={() => setView(v)}
                                className={`flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-bold transition-colors ${view === v ? "bg-white/18 text-white" : "text-emerald-50/80 hover:bg-white/10"}`}
                            >
                                <Icon className="size-4 shrink-0" />
                                {label}
                            </button>
                        ))}

                        <p className="px-2 pt-4 text-[10px] font-bold uppercase tracking-widest text-emerald-100/60">?쒖뒪??/p>
                        {NAV_ITEMS.slice(6).map(({ label, view: v, icon: Icon }) => (
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
                            <Home className="size-4" /> ?숈깮 ?덉쑝濡??꾪솚
                        </button>
                        <button
                            onClick={handleLogout}
                            className="flex h-10 w-full items-center gap-3 rounded-lg bg-white/10 px-3 text-sm font-bold hover:bg-white/15"
                        >
                            <LogOut className="size-4" /> 濡쒓렇?꾩썐
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
                        {view === "lectureManage" && <LectureManageView />}
                        {view === "lectureAssign" && <LectureAssignView />}
                        {view === "billing" && <BillingView />}
                        {view === "settings" && <SettingsView />}
                    </section>
                </div>
            </main>
        </RoleGuard>
    );
}

export default function SchoolAdminDashboardPage() {
    return (
        <Suspense>
            <SchoolAdminDashboard />
        </Suspense>
    );
}

