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

const NAV_ITEMS: { label: string; view: View; icon: React.ComponentType<{ className?: string }> }[] = [
    { label: "대시보드", view: "dashboard", icon: LayoutDashboard },
    { label: "회원 관리", view: "members", icon: Users },
    { label: "공지 관리", view: "notices", icon: Megaphone },
    { label: "문의사항", view: "inquiries", icon: MessageSquareText },
    { label: "강의 관리", view: "lectureManage", icon: Library },
    { label: "강의 배정", view: "lectureAssign", icon: BookPlus },
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

    return (
        <RoleGuard allowedRoles={["ADM"]}>
            <main className="min-h-screen bg-[#f4faf7] text-slate-950">
                <aside className="fixed inset-y-0 left-0 z-30 hidden w-[220px] flex-col bg-[#064b35] px-3 py-5 text-white lg:flex">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2">
                            <img src="/univusicon.png" alt="Univ us" className="w-7 h-7 rounded-lg" />
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

                        <p className="px-2 pt-4 text-[10px] font-bold uppercase tracking-widest text-emerald-100/60">시스템</p>
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
                                    <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-80 overflow-hidden rounded-xl border border-emerald-900/10 bg-white shadow-lg">
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
                                            className="block w-full border-t border-slate-100 px-4 py-2.5 text-center text-xs font-bold text-emerald-700 hover:bg-emerald-50"
                                        >
                                            문의사항 전체보기
                                        </button>
                                    </div>
                                )}
                            </div>
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
