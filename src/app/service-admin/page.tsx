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
    ScrollText,
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
    { label: "커뮤니티 관리", icon: ScrollText },
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

    const loadDashboard = useCallback(async () => {
        setDashboardLoading(true);
        setDashboardError("");

        try {
            setDashboard(await getServiceAdminDashboard());
        } catch (error) {
            console.error("Failed to load service admin dashboard.", error);
            setDashboardError("대시보드 정보를 불러오지 못했습니다.");
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

    return (
        <RoleGuard allowedRoles={["SUA"]}>
            <main className={view === "inquiries" ? "h-screen overflow-hidden bg-[#f4faf7] text-slate-950" : "min-h-screen bg-[#f4faf7] text-slate-950"}>
                <aside className="fixed inset-y-0 left-0 z-30 hidden w-[220px] flex-col bg-[#064b35] px-3 py-5 text-white lg:flex">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2">
                            <Image
                                src="/univusicon.png"
                                alt="Univ us"
                                width={28}
                                height={28}
                                className="size-7 rounded-lg"
                            />
                            <span className="text-lg font-black tracking-wide">Univ · us</span>
                        </div>
                        <span className="rounded-full border border-white/20 px-2 py-0.5 text-[10px] font-bold text-emerald-100">
                            SUA
                        </span>
                    </div>

                    <div className="mt-6 rounded-xl bg-white/12 p-4">
                        <div className="flex items-center gap-3">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-lg font-black">
                                {memberName?.slice(0, 1) ?? "서"}
                            </div>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-extrabold">{memberName ?? "서비스 관리자"}</p>
                                <p className="mt-0.5 text-xs font-medium text-emerald-200">플랫폼 최고 관리자</p>
                            </div>
                        </div>
                    </div>

                    <p className="mt-5 px-2 text-[10px] font-bold uppercase tracking-widest text-emerald-100/60">
                        플랫폼 운영
                    </p>
                    <nav className="mt-2 min-h-0 flex-1 overflow-y-auto pr-1">
                        <div className="space-y-0.5">
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
                                    title={isReady ? label : `${label} 화면은 다음 구현 범위입니다.`}
                                    className={`flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-bold transition-colors ${
                                        isActive
                                            ? "bg-white/18 text-white"
                                            : isReady
                                                ? "text-emerald-50/80 hover:bg-white/10"
                                                : "cursor-not-allowed text-emerald-100/35"
                                    }`}
                                >
                                    <Icon className="size-4 shrink-0" />
                                    {label}
                                </button>
                            );
                        })}
                        </div>

                        <p className="mt-5 px-2 text-[10px] font-bold uppercase tracking-widest text-emerald-100/60">
                            상세 관리
                        </p>
                        <div className="mt-2 space-y-0.5">
                            {DETAIL_NAV_ITEMS.map(({ label, icon: Icon, view: itemView }) => {
                                const isReady = Boolean(itemView);
                                return (
                                    <button
                                        key={label}
                                        onClick={() => itemView && navigateToView(itemView)}
                                        disabled={!isReady}
                                        title={isReady ? label : `${label} 화면은 다음 구현 범위입니다.`}
                                        className={`flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-bold transition-colors ${
                                            itemView === view
                                                ? "bg-white/18 text-white"
                                                : isReady
                                                    ? "text-emerald-50/80 hover:bg-white/10"
                                                    : "cursor-not-allowed text-emerald-100/35"
                                        }`}
                                    >
                                        <Icon className="size-4 shrink-0" />
                                        {label}
                                    </button>
                                );
                            })}
                        </div>
                    </nav>

                    <div className="mt-4 space-y-1.5">
                        <Link
                            href="/landing"
                            className="flex h-10 w-full items-center gap-3 rounded-lg bg-white/10 px-3 text-sm font-bold hover:bg-white/15"
                        >
                            <Home className="size-4" />
                            서비스 홈
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="flex h-10 w-full items-center gap-3 rounded-lg bg-white/10 px-3 text-sm font-bold hover:bg-white/15"
                        >
                            <LogOut className="size-4" />
                            로그아웃
                        </button>
                    </div>
                </aside>

                <div className={view === "inquiries" ? "flex h-full min-h-0 flex-col lg:pl-[220px]" : "lg:pl-[220px]"}>
                    <header className={view === "inquiries" ? "shrink-0 border-b border-emerald-900/10 bg-white/85 backdrop-blur" : "sticky top-0 z-20 border-b border-emerald-900/10 bg-white/85 backdrop-blur"}>
                        <div className="flex h-16 items-center justify-between px-6 lg:px-8">
                            <div className="flex items-center gap-2 text-sm font-extrabold text-slate-500">
                                <Building2 className="size-4" />
                                <span>UnivUs 플랫폼</span>
                                <span className="text-slate-300">/</span>
                                <span className="text-slate-900">{VIEW_LABEL[view]}</span>
                            </div>
                            <button className="flex size-9 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm">
                                <Bell className="size-4 text-slate-500" />
                            </button>
                        </div>
                    </header>

                    <section className={view === "inquiries" ? "min-h-0 flex-1 overflow-hidden px-6 py-6 lg:px-8" : "px-6 py-8 lg:px-8"}>
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
