"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Bell,
    Building2,
    CircleDollarSign,
    Home,
    LayoutDashboard,
    ListChecks,
    LogOut,
    MessageSquareText,
    PanelLeftClose,
    PanelLeftOpen,
    School,
    Settings,
    UserRoundCog,
    UsersRound,
} from "lucide-react";
import RoleGuard from "@/components/auth/RoleGuard";
import {
    getServiceAdminDashboard,
    type ServiceAdminDashboardResponse,
} from "@/lib/serviceAdminApi";
import { useAuthStore } from "@/store/authStore";
import DashboardView from "./_views/DashboardView";
import InquiriesView from "./_views/InquiriesView";
import MembersView from "./_views/MembersView";
import OperationsLogsView from "./_views/OperationsLogsView";
import PaymentsView from "./_views/PaymentsView";
import SchoolDetailView from "./_views/SchoolDetailView";
import SchoolsView from "./_views/SchoolsView";
import SubscriptionPlansView from "./_views/SubscriptionPlansView";
import UsersView from "./_views/UsersView";
import type { ServiceAdminView } from "./_types";

interface NavItem {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    view?: ServiceAdminView;
}

const PLATFORM_NAV_ITEMS: NavItem[] = [
    { label: "대시보드", icon: LayoutDashboard, view: "dashboard" },
    { label: "학교 관리", icon: School, view: "schools" },
    { label: "회원 관리", icon: UserRoundCog, view: "members" },
    { label: "결제 관리", icon: CircleDollarSign, view: "payments" },
    { label: "구독 플랜 설정", icon: Settings, view: "plans" },
    { label: "채팅 문의", icon: MessageSquareText, view: "inquiries" },
    { label: "운영 로그", icon: ListChecks, view: "logs" },
];

const DETAIL_NAV_ITEMS: NavItem[] = [
    { label: "이용자 관리", icon: UsersRound, view: "users" },
];

const VIEW_LABEL: Record<ServiceAdminView, string> = {
    dashboard: "대시보드",
    schools: "학교 관리",
    schoolDetail: "학교 상세",
    members: "회원 관리",
    payments: "결제 관리",
    plans: "구독 플랜 설정",
    inquiries: "채팅 문의",
    logs: "운영 로그",
    users: "이용자 관리",
};

const SERVICE_ADMIN_VIEW_BY_PARAM: Record<string, ServiceAdminView> = {
    dashboard: "dashboard",
    schools: "schools",
    "school-detail": "schoolDetail",
    members: "members",
    payments: "payments",
    plans: "plans",
    inquiries: "inquiries",
    logs: "logs",
    users: "users",
};

const SERVICE_ADMIN_PARAM_BY_VIEW: Record<ServiceAdminView, string> = {
    dashboard: "dashboard",
    schools: "schools",
    schoolDetail: "school-detail",
    members: "members",
    payments: "payments",
    plans: "plans",
    inquiries: "inquiries",
    logs: "logs",
    users: "users",
};

function ServiceAdminDashboardContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const {
        logoutAction,
        memberName,
        isInitialized,
        isLoggedIn,
        role,
    } = useAuthStore();
    const [dashboard, setDashboard] =
        useState<ServiceAdminDashboardResponse | null>(null);
    const [dashboardLoading, setDashboardLoading] = useState(true);
    const [dashboardError, setDashboardError] = useState("");
    const [isOperationsAlertOpen, setIsOperationsAlertOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const loadDashboard = useCallback(async () => {
        setDashboardLoading(true);
        setDashboardError("");

        try {
            setDashboard(await getServiceAdminDashboard());
        } catch {            setDashboardError("대시보드 정보를 불러오지 못했습니다.");
        } finally {
            setDashboardLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!isInitialized || !isLoggedIn || role !== "SUA") return;
        void loadDashboard();
    }, [isInitialized, isLoggedIn, loadDashboard, role]);

    const requestedView = searchParams.get("view");
    const requestedSchoolId = Number(searchParams.get("schoolId"));
    const hasValidRequestedSchoolId =
        Number.isInteger(requestedSchoolId) && requestedSchoolId > 0;
    const parsedView = requestedView
        ? SERVICE_ADMIN_VIEW_BY_PARAM[requestedView]
        : "dashboard";
    const view =
        parsedView === "schoolDetail" && !hasValidRequestedSchoolId
            ? "schools"
            : parsedView ?? "dashboard";
    const selectedSchoolId =
        view === "schoolDetail" && hasValidRequestedSchoolId
            ? requestedSchoolId
            : null;

    useEffect(() => {
        if (requestedView && !parsedView) {
            router.replace("/service-admin");
            return;
        }

        if (parsedView === "schoolDetail" && !hasValidRequestedSchoolId) {
            router.replace("/service-admin?view=schools");
        }
    }, [hasValidRequestedSchoolId, parsedView, requestedView, router]);

    const navigateToView = (nextView: ServiceAdminView) => {
        const viewParam = SERVICE_ADMIN_PARAM_BY_VIEW[nextView];
        router.push(
            nextView === "dashboard"
                ? "/service-admin"
                : `/service-admin?view=${viewParam}`,
        );
    };

    const handleLogout = async () => {
        await logoutAction();
        router.push("/landing");
    };

    const openSchoolById = (schoolId: number) => {
        router.push(
            `/service-admin?view=school-detail&schoolId=${schoolId}`,
        );
    };

    const operationAlerts = dashboard
        ? [
            {
                id: "failed-payments",
                title: "결제 확인 필요",
                description: `결제 실패 학교 ${dashboard.summary.failedPaymentSchoolCount.toLocaleString("ko-KR")}곳`,
                count: dashboard.summary.failedPaymentSchoolCount,
                view: "payments" as const,
                tone: "bg-rose-50 text-rose-600",
            },
            {
                id: "pending-schools",
                title: "구독 승인 대기",
                description: `승인 대기 학교 ${dashboard.summary.pendingSchoolCount.toLocaleString("ko-KR")}곳`,
                count: dashboard.summary.pendingSchoolCount,
                view: "schools" as const,
                tone: "bg-amber-50 text-amber-700",
            },
            {
                id: "unresolved-inquiries",
                title: "미처리 문의",
                description: `답변 또는 처리가 필요한 문의 ${dashboard.summary.unresolvedInquiryCount.toLocaleString("ko-KR")}건`,
                count: dashboard.summary.unresolvedInquiryCount,
                view: "inquiries" as const,
                tone: "bg-sky-50 text-sky-700",
            },
        ].filter((alert) => alert.count > 0)
        : [];
    const operationAlertCount = operationAlerts.reduce(
        (total, alert) => total + alert.count,
        0,
    );

    const openAlertView = (nextView: ServiceAdminView) => {
        setIsOperationsAlertOpen(false);
        navigateToView(nextView);
    };

    const sidebarOffsetClass = sidebarCollapsed ? "md:pl-[104px]" : "md:pl-[256px]";

    return (
        <RoleGuard allowedRoles={["SUA"]}>
            <main className={view === "inquiries" ? "h-screen overflow-hidden bg-[#f7f8fb] text-slate-950" : "min-h-screen bg-[#f7f8fb] text-slate-950"}>
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
                        <Link
                            href="/landing"
                            className={`group flex h-12 items-center overflow-hidden rounded-2xl border border-white/15 bg-white/[0.1] shadow-sm shadow-black/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.14] ${sidebarCollapsed ? "mx-auto w-12 justify-center p-0" : "flex-1 px-3"}`}
                        >
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                                <Image src="/univusicon.png" alt="UnivUs" width={24} height={24} className="size-6 rounded-lg object-contain" />
                            </span>
                            <span className={`min-w-0 text-left transition-all duration-200 ${sidebarCollapsed ? "ml-0 w-0 opacity-0" : "ml-2 w-auto opacity-100"}`}>
                                <span className="block text-sm font-black leading-4 text-white">UnivUs</span>
                                <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">Platform</span>
                            </span>
                        </Link>
                        {!sidebarCollapsed && (
                            <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-200">
                                SUA
                            </span>
                        )}
                    </div>

                    <div className={`mt-6 rounded-2xl border border-white/15 bg-white/[0.08] shadow-sm transition-all duration-300 ${sidebarCollapsed ? "p-2" : "p-4"}`}>
                        <div className={`flex items-center ${sidebarCollapsed ? "justify-center" : "gap-3"}`}>
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-lg font-black text-slate-950">
                                {memberName?.slice(0, 1) ?? "\uC11C"}
                            </div>
                            {!sidebarCollapsed && (
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-extrabold">{memberName ?? "서비스 관리자"}</p>
                                    <p className="mt-0.5 text-xs font-medium text-slate-300">플랫폼 최고 관리자</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {!sidebarCollapsed && (
                        <p className="mt-5 px-2 text-[10px] font-bold uppercase tracking-widest text-emerald-100/65">
                            플랫폼 운영
                        </p>
                    )}
                    <nav className={`mt-2 min-h-0 flex-1 overflow-y-auto ${sidebarCollapsed ? "space-y-2 pr-0" : "pr-1"}`}>
                        <div className={sidebarCollapsed ? "space-y-2" : "space-y-0.5"}>
                        {PLATFORM_NAV_ITEMS.map(({ label, icon: Icon, view: itemView }) => {
                            const isActive =
                                itemView === "schools"
                                    ? view === "schools" || view === "schoolDetail"
                                    : itemView === view;
                            const isReady = Boolean(itemView);

                            return (
                                <button
                                    key={label}
                                    onClick={() => itemView && navigateToView(itemView)}
                                    disabled={!isReady}
                                    title={label}
                                    className={`flex h-10 w-full items-center rounded-xl text-sm font-bold transition-all duration-200 ${sidebarCollapsed ? "justify-center px-0" : "w-[calc(100%_-_2.75rem)] max-w-[calc(100%_-_2.75rem)] gap-3 px-3 text-left"} ${
                                        isActive
                                            ? "bg-white text-primary shadow-sm"
                                            : isReady
                                                ? "text-emerald-50/80 hover:translate-x-0.5 hover:bg-white/12 hover:text-white"
                                                : "cursor-not-allowed text-slate-600"
                                    }`}
                                >
                                    <Icon className="size-4 shrink-0" />
                                    <span className={sidebarCollapsed ? "sr-only" : "truncate"}>{label}</span>
                                </button>
                            );
                        })}
                        </div>

                        {!sidebarCollapsed && (
                            <p className="mt-5 px-2 text-[10px] font-bold uppercase tracking-widest text-emerald-100/65">
                                상세 관리
                            </p>
                        )}
                        <div className={sidebarCollapsed ? "mt-2 space-y-2" : "mt-2 space-y-0.5"}>
                            {DETAIL_NAV_ITEMS.map(({ label, icon: Icon, view: itemView }) => {
                                const isReady = Boolean(itemView);
                                return (
                                    <button
                                        key={label}
                                        onClick={() => itemView && navigateToView(itemView)}
                                        disabled={!isReady}
                                        title={label}
                                        className={`flex h-10 w-full items-center rounded-xl text-sm font-bold transition-all duration-200 ${sidebarCollapsed ? "justify-center px-0" : "w-[calc(100%_-_2.75rem)] max-w-[calc(100%_-_2.75rem)] gap-3 px-3 text-left"} ${
                                            itemView === view
                                                ? "bg-white text-primary shadow-sm"
                                                : isReady
                                                    ? "text-emerald-50/80 hover:translate-x-0.5 hover:bg-white/12 hover:text-white"
                                                    : "cursor-not-allowed text-slate-600"
                                        }`}
                                    >
                                        <Icon className="size-4 shrink-0" />
                                        <span className={sidebarCollapsed ? "sr-only" : "truncate"}>{label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </nav>

                    <div className="mt-4 space-y-1.5">
                        <Link
                            href="/landing"
                            title="서비스 홈"
                            className={`flex h-10 w-full items-center rounded-xl border border-white/15 bg-white/[0.08] text-sm font-bold text-emerald-50 transition-all duration-200 hover:translate-x-0.5 hover:bg-white/12 hover:text-white ${sidebarCollapsed ? "justify-center px-0" : "gap-3 px-3"}`}
                        >
                            <Home className="size-4" />
                            <span className={sidebarCollapsed ? "sr-only" : "truncate"}>서비스 홈</span>
                        </Link>
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

                <div className={view === "inquiries" ? `flex h-full min-h-0 flex-col ${sidebarOffsetClass}` : sidebarOffsetClass}>
                    <header className={view === "inquiries" ? "shrink-0 border-b border-slate-200 bg-white/90 backdrop-blur" : "sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur"}>
                        <div className="flex h-16 items-center justify-between px-6 lg:px-8">
                            <div className="flex items-center gap-2 text-sm font-extrabold text-slate-500">
                                <Building2 className="size-4" />
                                <span>UnivUs 플랫폼</span>
                                <span className="text-slate-300">/</span>
                                <span className="text-slate-900">{VIEW_LABEL[view]}</span>
                            </div>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setIsOperationsAlertOpen((open) => !open)}
                                    className="relative flex size-9 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition hover:border-primary/30 hover:text-primary"
                                    aria-label="운영 알림"
                                    aria-expanded={isOperationsAlertOpen}
                                >
                                    <Bell className="size-4 text-slate-500" />
                                    {operationAlertCount > 0 && (
                                        <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black leading-4 text-white">
                                            {operationAlertCount > 99 ? "99+" : operationAlertCount}
                                        </span>
                                    )}
                                </button>

                                {isOperationsAlertOpen && (
                                    <section className="absolute right-0 top-11 z-50 w-[320px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
                                        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                                            <div>
                                                <p className="text-sm font-black text-slate-900">운영 알림</p>
                                                <p className="mt-0.5 text-xs text-slate-400">확인이 필요한 실제 운영 이슈입니다.</p>
                                            </div>
                                            {operationAlertCount > 0 && (
                                                <span className="rounded-full bg-rose-50 px-2 py-1 text-[10px] font-black text-rose-600">
                                                    {operationAlertCount > 99 ? "99+" : operationAlertCount}건
                                                </span>
                                            )}
                                        </div>

                                        {dashboardError ? (
                                            <p className="px-4 py-6 text-center text-sm font-medium text-slate-500">운영 알림을 불러오지 못했습니다.</p>
                                        ) : dashboardLoading ? (
                                            <p className="px-4 py-6 text-center text-sm font-medium text-slate-500">운영 알림을 불러오는 중입니다.</p>
                                        ) : operationAlerts.length === 0 ? (
                                            <div className="px-4 py-7 text-center">
                                                <p className="text-sm font-black text-slate-800">현재 확인이 필요한 이슈가 없습니다.</p>
                                                <p className="mt-1 text-xs leading-5 text-slate-400">결제, 구독 승인, 문의 상태를 계속 확인합니다.</p>
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-slate-100">
                                                {operationAlerts.map((alert) => (
                                                    <button
                                                        key={alert.id}
                                                        type="button"
                                                        onClick={() => openAlertView(alert.view)}
                                                        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50"
                                                    >
                                                        <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl text-xs font-black ${alert.tone}`}>
                                                            {alert.count}
                                                        </span>
                                                        <span className="min-w-0 flex-1">
                                                            <span className="block text-sm font-black text-slate-800">{alert.title}</span>
                                                            <span className="mt-0.5 block truncate text-xs text-slate-500">{alert.description}</span>
                                                        </span>
                                                        <span className="text-xs font-black text-primary">보기</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </section>
                                )}
                            </div>
                        </div>
                    </header>

                    <section key={view} className={view === "inquiries" ? "min-h-0 flex-1 overflow-hidden px-6 py-6 animate-in fade-in slide-in-from-bottom-2 duration-300 lg:px-8" : "px-6 py-8 animate-in fade-in slide-in-from-bottom-2 duration-300 lg:px-8"}>
                        {view === "dashboard" && (
                            <DashboardView
                                dashboard={dashboard}
                                loading={dashboardLoading}
                                error={dashboardError}
                                onRetry={loadDashboard}
                                onOpenSchools={() => navigateToView("schools")}
                            />
                        )}
                        {view === "schools" && (
                            <SchoolsView onSelectSchool={openSchoolById} />
                        )}
                        {view === "schoolDetail" && selectedSchoolId && (
                            <SchoolDetailView
                                schoolId={selectedSchoolId}
                                onBack={() => navigateToView("schools")}
                            />
                        )}
                        {view === "members" && (
                            <MembersView
                                onOpenSchool={openSchoolById}
                            />
                        )}
                        {view === "users" && (
                            <UsersView />
                        )}
                        {view === "payments" && (
                            <PaymentsView
                                onOpenSchool={openSchoolById}
                            />
                        )}
                        {view === "plans" && (
                            <SubscriptionPlansView />
                        )}
                        {view === "inquiries" && (
                            <InquiriesView />
                        )}
                        {view === "logs" && (
                            <OperationsLogsView />
                        )}
                    </section>
                </div>
            </main>
        </RoleGuard>
    );
}

export default function ServiceAdminDashboardPage() {
    return (
        <Suspense fallback={null}>
            <ServiceAdminDashboardContent />
        </Suspense>
    );
}
