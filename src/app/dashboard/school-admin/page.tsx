"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { getSubscriptionStatus } from "@/lib/subscriptionApi";
import { getAdminSupports, type ApiSupport } from "@/lib/adminApi";
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
    MessageCircle,
    MessageSquareText,
    PanelLeftClose,
    PanelLeftOpen,
    ScrollText,
    ShieldAlert,
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
import ChatView from "./_views/ChatView";
import PenaltyManagementView from "./_views/PenaltyManagementView";
import CommunityView from "./_views/CommunityView";

const NAV_ITEMS: { label: string; view: View; icon: React.ComponentType<{ className?: string }> }[] = [
    { label: "대시보드", view: "dashboard", icon: LayoutDashboard },
    { label: "회원 관리", view: "members", icon: Users },
    { label: "공지 관리", view: "notices", icon: Megaphone },
    { label: "문의사항", view: "inquiries", icon: MessageSquareText },
    { label: "강의 관리", view: "lectureManage", icon: Library },
    { label: "강의 배정", view: "lectureAssign", icon: BookPlus },
    { label: "노쇼 페널티 관리", view: "penalties", icon: ShieldAlert },
    { label: "커뮤니티 관리", view: "community", icon: ScrollText },
    { label: "구독·결제", view: "billing", icon: CreditCard },
    { label: "학교 설정", view: "settings", icon: Settings },
    { label: "채팅", view: "chat", icon: MessageCircle },
];

const SECTION_LABEL: Record<View, string> = {
    dashboard: "대시보드",
    members: "회원 관리",
    notices: "공지 관리",
    inquiries: "문의사항",
    lectureManage: "강의 관리",
    lectureAssign: "강의 배정",
    penalties: "노쇼 페널티 관리",
    community: "커뮤니티 관리",
    billing: "구독·결제",
    settings: "학교 설정",
    chat: "채팅",
};

const VALID_VIEWS = new Set(Object.keys(SECTION_LABEL) as View[]);

function SchoolAdminDashboard() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { logoutAction, memberName, isInitialized, role, univId } = useAuthStore();
    const [accessChecked, setAccessChecked] = useState(false);
    const [pendingInquiries, setPendingInquiries] = useState<ApiSupport[]>([]);
    const [seenInquiryIds, setSeenInquiryIds] = useState<Set<number>>(new Set());
    const [notificationOpen, setNotificationOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const notificationRef = useRef<HTMLDivElement>(null);
    const hasUnseenInquiry = pendingInquiries.some((i) => !seenInquiryIds.has(i.supportId));

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

    useEffect(() => {
        if (!univId) return;

        let active = true;
        const checkPendingInquiries = () => {
            getAdminSupports(univId)
                .then((supports) => {
                    if (active) setPendingInquiries(supports.filter((s) => s.status === 0));
                })
                .catch(() => {});
        };

        checkPendingInquiries();
        const interval = setInterval(checkPendingInquiries, 10000);

        return () => {
            active = false;
            clearInterval(interval);
        };
    }, [univId, searchParams]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
                setNotificationOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

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

    const sidebarOffsetClass = sidebarCollapsed ? "md:pl-[104px]" : "md:pl-[256px]";

    return (
        <RoleGuard allowedRoles={["ADM"]}>
            <main className={view === "chat" ? "h-screen overflow-hidden bg-[#f7f8fb] text-slate-950" : "min-h-screen bg-[#f7f8fb] text-slate-950"}>
                <aside className={`fixed inset-y-0 left-0 z-30 hidden animate-in fade-in slide-in-from-left-2 flex-col overflow-visible border-r border-primary/30 bg-[linear-gradient(180deg,var(--primary)_0%,#063d30_48%,#05251f_100%)] py-5 text-white shadow-2xl shadow-primary/10 transition-[width,padding] duration-300 ease-out md:flex ${sidebarCollapsed ? "w-[104px] px-4" : "w-[256px] px-4"}`}>
                    <button
                        type="button"
                        onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
                        className="absolute -right-4 top-1/2 z-40 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border border-primary/20 bg-white text-primary shadow-lg shadow-primary/15 transition-all duration-200 hover:-translate-y-1/2 hover:scale-105 hover:bg-primary hover:text-white"
                        aria-label={sidebarCollapsed ? "???? ???" : "???? ??"}
                    >
                        {sidebarCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
                    </button>

                    <div className={`flex items-center gap-2 ${sidebarCollapsed ? "justify-center" : "justify-between"}`}>
                        <button
                            type="button"
                            onClick={() => router.push("/landing")}
                            className={`group flex h-12 items-center overflow-hidden rounded-2xl border border-white/15 bg-white/[0.1] shadow-sm shadow-black/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.14] ${sidebarCollapsed ? "mx-auto w-12 justify-center p-0" : "flex-1 px-3"}`}
                        >
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                                <img src="/univusicon.png" alt="UnivUs" className="size-6 rounded-lg object-contain" />
                            </span>
                            <span className={`min-w-0 text-left transition-all duration-200 ${sidebarCollapsed ? "ml-0 w-0 opacity-0" : "ml-2 w-auto opacity-100"}`}>
                                <span className="block text-sm font-black leading-4 text-white">UnivUs</span>
                                <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">Admin</span>
                            </span>
                        </button>
                        {!sidebarCollapsed && (
                            <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-200">
                                관리자
                            </span>
                        )}
                    </div>

                    <div className={`mt-6 rounded-2xl border border-white/15 bg-white/[0.08] shadow-sm transition-all duration-300 ${sidebarCollapsed ? "p-2" : "p-4"}`}>
                        <div className={`flex items-center ${sidebarCollapsed ? "justify-center" : "gap-3"}`}>
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-lg font-black text-slate-950">
                                {memberName?.slice(0, 1) ?? "\uAD00"}
                            </div>
                            {!sidebarCollapsed && (
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-extrabold">{memberName ?? "관리자"}</p>
                                    <p className="mt-0.5 text-xs font-medium text-slate-300">학교 관리자</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {!sidebarCollapsed && <p className="mt-6 px-2 text-[10px] font-bold uppercase tracking-widest text-emerald-100/65">운영</p>}
                    <nav className={`mt-2 flex-1 ${sidebarCollapsed ? "space-y-2" : "space-y-0.5"}`}>
                        {NAV_ITEMS.slice(0, 8).map(({ label, view: v, icon: Icon }) => (
                            <button
                                key={v}
                                onClick={() => setView(v)}
                                title={label}
                                className={`flex h-10 items-center rounded-xl text-sm font-bold transition-all duration-200 ${sidebarCollapsed ? "mx-auto w-10 justify-center px-0" : "w-[calc(100%_-_2.75rem)] max-w-[calc(100%_-_2.75rem)] gap-3 px-3 text-left"} ${view === v ? "bg-white text-primary shadow-sm" : "text-emerald-50/80 hover:translate-x-0.5 hover:bg-white/12 hover:text-white"}`}
                            >
                                <Icon className="size-4 shrink-0" />
                                <span className={sidebarCollapsed ? "sr-only" : "truncate"}>{label}</span>
                            </button>
                        ))}

                        {!sidebarCollapsed && <p className="px-2 pt-4 text-[10px] font-bold uppercase tracking-widest text-emerald-100/65">시스템</p>}
                        {NAV_ITEMS.slice(8).map(({ label, view: v, icon: Icon }) => (
                            <button
                                key={v}
                                onClick={() => setView(v)}
                                title={label}
                                className={`flex h-10 items-center rounded-xl text-sm font-bold transition-all duration-200 ${sidebarCollapsed ? "mx-auto w-10 justify-center px-0" : "w-[calc(100%_-_2.75rem)] max-w-[calc(100%_-_2.75rem)] gap-3 px-3 text-left"} ${view === v ? "bg-white text-primary shadow-sm" : "text-emerald-50/80 hover:translate-x-0.5 hover:bg-white/12 hover:text-white"}`}
                            >
                                <Icon className="size-4 shrink-0" />
                                <span className={sidebarCollapsed ? "sr-only" : "truncate"}>{label}</span>
                            </button>
                        ))}
                    </nav>

                    <div className={`space-y-1.5 ${sidebarCollapsed ? "pb-1" : ""}`}>
                        <button
                            onClick={() => router.push("/home")}
                            title="학생 홈으로 전환"
                            className={`flex h-10 w-full items-center rounded-xl border border-white/15 bg-white/[0.08] text-sm font-bold text-emerald-50 transition-all duration-200 hover:translate-x-0.5 hover:bg-white/12 hover:text-white ${sidebarCollapsed ? "justify-center px-0" : "gap-3 px-3"}`}
                        >
                            <Home className="size-4" />
                            <span className={sidebarCollapsed ? "sr-only" : "truncate"}>학생 홈으로 전환</span>
                        </button>
                        <button
                            onClick={handleLogout}
                            title="로그아웃"
                            className={`flex h-10 w-full items-center rounded-xl border border-white/15 bg-white/[0.08] text-sm font-bold text-emerald-50 transition-all duration-200 hover:translate-x-0.5 hover:bg-white/12 hover:text-white ${sidebarCollapsed ? "justify-center px-0" : "gap-3 px-3"}`}
                        >
                            <LogOut className="size-4" />
                            <span className={sidebarCollapsed ? "sr-only" : "truncate"}>로그아웃</span>
                        </button>
                    </div>
                </aside>

                <div className={view === "chat" ? `flex h-full min-h-0 flex-col ${sidebarOffsetClass}` : sidebarOffsetClass}>
                    <header className={view === "chat" ? "shrink-0 border-b border-slate-200 bg-white/90 backdrop-blur" : "sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur"}>
                        <div className="flex h-16 items-center justify-between px-6 lg:px-8">
                            <div className="flex items-center gap-2 text-sm font-extrabold text-slate-500">
                                <Building2 className="size-4" />
                                <span className="text-slate-900">{SECTION_LABEL[view]}</span>
                            </div>
                            <div className="relative" ref={notificationRef}>
                                <button
                                    onClick={() => {
                                        setNotificationOpen((prev) => !prev);
                                        setSeenInquiryIds((prev) => {
                                            const next = new Set(prev);
                                            pendingInquiries.forEach((i) => next.add(i.supportId));
                                            return next;
                                        });
                                    }}
                                    className="relative flex size-9 items-center justify-center rounded-full border border-border bg-white shadow-sm"
                                >
                                    <Bell className="size-4 text-slate-500" />
                                    {hasUnseenInquiry && (
                                        <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-red-500" />
                                    )}
                                </button>

                                {notificationOpen && (
                                    <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                                        <div className="border-b border-slate-100 px-4 py-3">
                                            <p className="text-sm font-black text-slate-900">알림</p>
                                        </div>
                                        {pendingInquiries.length === 0 ? (
                                            <p className="px-4 py-8 text-center text-sm text-slate-400">새로운 알림이 없습니다.</p>
                                        ) : (
                                            <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
                                                {pendingInquiries.slice(0, 5).map((item) => (
                                                    <li key={item.supportId}>
                                                        <button
                                                            onClick={() => {
                                                                setNotificationOpen(false);
                                                                setView("inquiries");
                                                            }}
                                                            className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50"
                                                        >
                                                            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                                                                <MessageSquareText className="size-4" />
                                                            </span>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-sm font-bold text-slate-800">{item.memberName}님의 문의</p>
                                                                <p className="mt-0.5 truncate text-xs text-slate-500">{item.message}</p>
                                                            </div>
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                        <button
                                            onClick={() => {
                                                setNotificationOpen(false);
                                                setView("inquiries");
                                            }}
                                            className="block w-full border-t border-slate-100 px-4 py-2.5 text-center text-xs font-bold text-primary hover:bg-primary/10"
                                        >
                                            문의사항 전체보기
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </header>

                    <section key={view} className={view === "chat" ? "min-h-0 flex-1 overflow-hidden px-6 py-6 animate-in fade-in slide-in-from-bottom-2 duration-300 lg:px-8" : "px-6 py-8 animate-in fade-in slide-in-from-bottom-2 duration-300 lg:px-8"}>
                        {view === "dashboard" && <DashboardView onNavigate={(v) => setView(v as View)} />}
                        {view === "members" && <MembersView />}
                        {view === "notices" && <NoticesView />}
                        {view === "inquiries" && <InquiriesView />}
                        {view === "lectureManage" && <LectureManageView />}
                        {view === "lectureAssign" && <LectureAssignView />}
                        {view === "penalties" && <PenaltyManagementView />}
                        {view === "community" && <CommunityView />}
                        {view === "billing" && <BillingView onNavigate={(v) => setView(v as View)} />}
                        {view === "settings" && <SettingsView />}
                        {view === "chat" && <ChatView />}
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
