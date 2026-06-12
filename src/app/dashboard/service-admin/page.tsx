"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Bell,
    Building2,
    ChartNoAxesColumn,
    CircleDollarSign,
    FileBox,
    Home,
    LayoutDashboard,
    ListChecks,
    LogOut,
    MessageSquareText,
    School,
    Settings,
    UsersRound,
} from "lucide-react";
import RoleGuard from "@/components/auth/RoleGuard";
import { useAuthStore } from "@/store/authStore";
import DashboardView from "./_views/DashboardView";
import MembersView from "./_views/MembersView";
import PaymentsView from "./_views/PaymentsView";
import SchoolDetailView from "./_views/SchoolDetailView";
import SchoolsView from "./_views/SchoolsView";
import {
    getMockMembersForSchool,
    PLAN_PRICE,
    SERVICE_PAYMENTS,
    SERVICE_SCHOOLS,
} from "./_mockData";
import type {
    AdminPaymentStatus,
    MemberStatus,
    ServiceAdminView,
    ServiceMember,
    ServicePayment,
    ServiceSchool,
    SubscriptionPlan,
} from "./_types";

interface NavItem {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    view?: ServiceAdminView;
}

const NAV_ITEMS: NavItem[] = [
    { label: "대시보드", icon: LayoutDashboard, view: "dashboard" },
    { label: "학교 관리", icon: School, view: "schools" },
    { label: "회원 관리", icon: UsersRound, view: "members" },
    { label: "결제 관리", icon: CircleDollarSign, view: "payments" },
    { label: "구독 플랜 설정", icon: Settings },
    { label: "강의 관리", icon: BookOpen, view: "lectureCodes" },
    { label: "공지 관리", icon: Bell },
    { label: "채팅 문의", icon: MessageSquareText },
    { label: "운영 로그", icon: ListChecks },
    { label: "통계 리포트", icon: ChartNoAxesColumn },
    { label: "첨부 파일", icon: FileBox },
];

const VIEW_LABEL: Record<ServiceAdminView, string> = {
    dashboard: "대시보드",
    schools: "학교 관리",
    schoolDetail: "학교 상세",
    members: "회원 관리",
    payments: "결제 관리",
    lectureCodes: "강의 관리",
};

const SERVICE_ADMIN_VIEW_BY_PARAM: Record<string, ServiceAdminView> = {
    dashboard: "dashboard",
    schools: "schools",
    "school-detail": "schoolDetail",
    members: "members",
    payments: "payments",
    "lecture-codes": "lectureCodes",
};

const SERVICE_ADMIN_PARAM_BY_VIEW: Record<ServiceAdminView, string> = {
    dashboard: "dashboard",
    schools: "schools",
    schoolDetail: "school-detail",
    members: "members",
    payments: "payments",
    lectureCodes: "lecture-codes",
};

function ServiceAdminDashboardContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { logoutAction, memberName } = useAuthStore();
    const [schools, setSchools] = useState<ServiceSchool[]>(SERVICE_SCHOOLS);
    const [members, setMembers] = useState<ServiceMember[]>(() =>
        SERVICE_SCHOOLS.flatMap(getMockMembersForSchool),
    );
    const [payments, setPayments] = useState<ServicePayment[]>(SERVICE_PAYMENTS);
    const requestedView = searchParams.get("view");
    const requestedSchoolId = Number(searchParams.get("schoolId"));
    const requestedSchool =
        Number.isInteger(requestedSchoolId) && requestedSchoolId > 0
            ? schools.find((school) => school.id === requestedSchoolId) ?? null
            : null;
    const parsedView = requestedView
        ? SERVICE_ADMIN_VIEW_BY_PARAM[requestedView]
        : "dashboard";
    const view =
        parsedView === "schoolDetail" && !requestedSchool
            ? "schools"
            : parsedView ?? "dashboard";
    const selectedSchool = view === "schoolDetail" ? requestedSchool : null;
    const selectedSchoolId = selectedSchool?.id ?? null;

    useEffect(() => {
        if (requestedView && !parsedView) {
            router.replace("/dashboard/service-admin");
            return;
        }

        if (parsedView === "schoolDetail" && !requestedSchool) {
            router.replace("/dashboard/service-admin?view=schools");
        }
    }, [parsedView, requestedSchool, requestedView, router]);

    const navigateToView = (nextView: ServiceAdminView) => {
        const viewParam = SERVICE_ADMIN_PARAM_BY_VIEW[nextView];
        router.push(
            nextView === "dashboard"
                ? "/dashboard/service-admin"
                : `/dashboard/service-admin?view=${viewParam}`,
        );
    };

    const handleLogout = async () => {
        await logoutAction();
        router.push("/landing");
    };

    const openSchool = (school: ServiceSchool) => {
        router.push(
            `/dashboard/service-admin?view=school-detail&schoolId=${school.id}`,
        );
    };

    const updateSelectedSchool = (updater: (school: ServiceSchool) => ServiceSchool) => {
        if (!selectedSchoolId) return;
        setSchools((current) =>
            current.map((school) => (school.id === selectedSchoolId ? updater(school) : school)),
        );
    };

    const changePlan = (plan: SubscriptionPlan) => {
        const todayDate = new Date();
        const today = todayDate.toLocaleDateString("en-CA");
        const nextBillingDate = new Date(todayDate);
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

        updateSelectedSchool((school) => ({
            ...school,
            plan,
            monthlyRevenue: PLAN_PRICE[plan],
            paymentStatus: "READY",
            subscriptionStatus: "ACTIVE",
            firstSubscribedAt: school.firstSubscribedAt ?? today,
            subscriptionEndedAt: null,
            nextBillingAt:
                school.nextBillingAt === "-"
                    ? nextBillingDate.toLocaleDateString("en-CA")
                    : school.nextBillingAt,
            portoneCustomerId: school.portoneCustomerId ?? `cus_mock_${school.id}`,
        }));
    };

    const cancelSubscription = () => {
        const today = new Date().toLocaleDateString("en-CA");
        updateSelectedSchool((school) => ({
            ...school,
            subscriptionStatus: "CANCELED",
            paymentStatus: "CANCELED",
            subscriptionEndedAt: today,
            monthlyRevenue: 0,
            nextBillingAt: "-",
        }));
    };

    const changeMemberStatus = (memberId: number, status: MemberStatus) => {
        setMembers((current) =>
            current.map((member) =>
                member.id === memberId ? { ...member, status } : member,
            ),
        );
    };

    const changePaymentStatus = (
        paymentId: number,
        status: AdminPaymentStatus,
    ) => {
        setPayments((current) =>
            current.map((payment) =>
                payment.id === paymentId
                    ? {
                        ...payment,
                        status,
                        failureReason: status === "PENDING" ? null : payment.failureReason,
                    }
                    : payment,
            ),
        );
    };

    return (
        <RoleGuard allowedRoles={["SUA"]}>
            <main className="min-h-screen bg-[#f4faf7] text-slate-950">
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
                    <nav className="mt-2 min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-1">
                        {NAV_ITEMS.map(({ label, icon: Icon, view: itemView }) => {
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

                <div className="lg:pl-[220px]">
                    <header className="sticky top-0 z-20 border-b border-emerald-900/10 bg-white/85 backdrop-blur">
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

                    <section className="px-6 py-8 lg:px-8">
                        {view === "dashboard" && (
                            <DashboardView
                                schools={schools}
                                onOpenSchool={openSchool}
                                onOpenSchools={() => navigateToView("schools")}
                            />
                        )}
                        {view === "schools" && (
                            <SchoolsView schools={schools} onSelectSchool={openSchool} />
                        )}
                        {view === "schoolDetail" && selectedSchool && (
                            <SchoolDetailView
                                school={selectedSchool}
                                members={members.filter((member) => member.schoolId === selectedSchool.id)}
                                onBack={() => navigateToView("schools")}
                                onChangePlan={changePlan}
                                onCancelSubscription={cancelSubscription}
                            />
                        )}
                        {view === "members" && (
                            <MembersView
                                schools={schools}
                                members={members}
                                onChangeStatus={changeMemberStatus}
                                onOpenSchool={openSchool}
                            />
                        )}
                        {view === "payments" && (
                            <PaymentsView
                                schools={schools}
                                payments={payments}
                                onChangeStatus={changePaymentStatus}
                            />
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
