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
import SubscriptionPlansView, {
    type PlanForm,
} from "./_views/SubscriptionPlansView";
import UsersView from "./_views/UsersView";
import {
    getMockMembersForSchool,
    SERVICE_INQUIRIES,
    SERVICE_PAYMENTS,
    SERVICE_SCHOOLS,
    SERVICE_SUBSCRIPTION_PLANS,
} from "./_mockData";
import type {
    AdminPaymentStatus,
    InquiryStatus,
    MemberStatus,
    ServiceAdminView,
    ServiceInquiry,
    ServiceMember,
    ServicePayment,
    ServiceSchool,
    ServiceSubscriptionPlan,
    SubscriptionPlan,
} from "./_types";

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
    const [schools, setSchools] = useState<ServiceSchool[]>(SERVICE_SCHOOLS);
    const [members, setMembers] = useState<ServiceMember[]>(() =>
        SERVICE_SCHOOLS.flatMap(getMockMembersForSchool),
    );
    const [payments, setPayments] = useState<ServicePayment[]>(SERVICE_PAYMENTS);
    const [plans, setPlans] = useState<ServiceSubscriptionPlan[]>(
        SERVICE_SUBSCRIPTION_PLANS,
    );
    const [inquiries, setInquiries] =
        useState<ServiceInquiry[]>(SERVICE_INQUIRIES);
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
            router.replace("/service-admin");
            return;
        }

        if (parsedView === "schoolDetail" && !requestedSchool) {
            router.replace("/service-admin?view=schools");
        }
    }, [parsedView, requestedSchool, requestedView, router]);

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

    const openSchool = (school: ServiceSchool) => {
        router.push(
            `/service-admin?view=school-detail&schoolId=${school.id}`,
        );
    };

    const updateSelectedSchool = (updater: (school: ServiceSchool) => ServiceSchool) => {
        if (!selectedSchoolId) return;
        setSchools((current) =>
            current.map((school) => (school.id === selectedSchoolId ? updater(school) : school)),
        );
    };

    const changePlan = (plan: SubscriptionPlan) => {
        const selectedPlan = plans.find(
            (candidate) => candidate.name === plan && candidate.status === "ACTIVE",
        );
        if (!selectedPlan) return;

        const todayDate = new Date();
        const today = todayDate.toLocaleDateString("en-CA");
        const nextBillingDate = new Date(todayDate);
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

        updateSelectedSchool((school) => ({
            ...school,
            plan,
            monthlyRevenue: selectedPlan.price,
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

    const createPlan = (form: PlanForm) => {
        const today = new Date().toLocaleDateString("en-CA");
        setPlans((current) => [
            ...current,
            {
                id: Math.max(0, ...current.map((plan) => plan.id)) + 1,
                name: form.name,
                price: Number(form.price),
                description: form.description,
                maxMemberCount: form.maxMemberCount
                    ? Number(form.maxMemberCount)
                    : null,
                status: "ACTIVE",
                createdAt: today,
                updatedAt: today,
            },
        ]);
    };

    const updatePlan = (planId: number, form: PlanForm) => {
        const currentPlan = plans.find((plan) => plan.id === planId);
        if (!currentPlan) return;

        const today = new Date().toLocaleDateString("en-CA");
        const price = Number(form.price);
        setPlans((current) =>
            current.map((plan) =>
                plan.id === planId
                    ? {
                        ...plan,
                        name: form.name,
                        price,
                        description: form.description,
                        maxMemberCount: form.maxMemberCount
                            ? Number(form.maxMemberCount)
                            : null,
                        updatedAt: today,
                    }
                    : plan,
            ),
        );
        setSchools((current) =>
            current.map((school) =>
                school.plan === currentPlan.name
                    ? {
                        ...school,
                        plan: form.name,
                        monthlyRevenue:
                            school.subscriptionStatus === "UNSUBSCRIBED" ||
                            school.subscriptionStatus === "CANCELED"
                                ? 0
                                : price,
                    }
                    : school,
            ),
        );
        setPayments((current) =>
            current.map((payment) =>
                payment.plan === currentPlan.name
                    ? { ...payment, plan: form.name, amount: price }
                    : payment,
            ),
        );
    };

    const togglePlanStatus = (planId: number) => {
        const today = new Date().toLocaleDateString("en-CA");
        setPlans((current) =>
            current.map((plan) =>
                plan.id === planId
                    ? {
                        ...plan,
                        status:
                            plan.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                        updatedAt: today,
                    }
                    : plan,
            ),
        );
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

    const readInquiry = useCallback((inquiryId: number) => {
        setInquiries((current) => {
            const target = current.find((inquiry) => inquiry.id === inquiryId);
            if (!target || target.unreadCount === 0) return current;
            return current.map((inquiry) =>
                inquiry.id === inquiryId
                    ? { ...inquiry, unreadCount: 0 }
                    : inquiry,
            );
        });
    }, []);

    const sendInquiryMessage = (
        inquiryId: number,
        payload: {
            text: string;
            imageUrl: string | null;
            imageName: string | null;
        },
    ) => {
        const now = new Date();
        const sentAt = `${now.toLocaleDateString("en-CA")} ${now
            .toTimeString()
            .slice(0, 5)}`;
        setInquiries((current) =>
            current.map((inquiry) =>
                inquiry.id === inquiryId
                    ? {
                        ...inquiry,
                        status:
                            inquiry.status === "WAITING"
                                ? "IN_PROGRESS"
                                : inquiry.status,
                        updatedAt: sentAt,
                        unreadCount: 0,
                        messages: [
                            ...inquiry.messages,
                            {
                                id: Date.now(),
                                senderRole: "SUA",
                                senderName: memberName ?? "서비스 관리자",
                                text: payload.text,
                                imageUrl: payload.imageUrl,
                                imageName: payload.imageName,
                                sentAt,
                            },
                        ],
                    }
                    : inquiry,
            ),
        );
    };

    const changeInquiryStatus = (
        inquiryId: number,
        status: InquiryStatus,
    ) => {
        const now = new Date();
        const updatedAt = `${now.toLocaleDateString("en-CA")} ${now
            .toTimeString()
            .slice(0, 5)}`;
        setInquiries((current) =>
            current.map((inquiry) =>
                inquiry.id === inquiryId
                    ? { ...inquiry, status, updatedAt }
                    : inquiry,
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
                                dashboard={dashboard}
                                loading={dashboardLoading}
                                error={dashboardError}
                                onRetry={loadDashboard}
                                onOpenSchools={() => navigateToView("schools")}
                            />
                        )}
                        {view === "schools" && (
                            <SchoolsView schools={schools} onSelectSchool={openSchool} />
                        )}
                        {view === "schoolDetail" && selectedSchool && (
                            <SchoolDetailView
                                school={selectedSchool}
                                plans={plans}
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
                        {view === "users" && (
                            <UsersView
                                schools={schools}
                                members={members.filter((member) => member.role !== "ADM")}
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
                        {view === "plans" && (
                            <SubscriptionPlansView
                                plans={plans}
                                schools={schools}
                                onCreate={createPlan}
                                onUpdate={updatePlan}
                                onToggleStatus={togglePlanStatus}
                            />
                        )}
                        {view === "inquiries" && (
                            <InquiriesView
                                inquiries={inquiries}
                                schools={schools}
                                adminName={memberName ?? "서비스 관리자"}
                                onRead={readInquiry}
                                onSendMessage={sendInquiryMessage}
                                onChangeStatus={changeInquiryStatus}
                            />
                        )}
                        {view === "logs" && (
                            <OperationsLogsView
                                schools={schools}
                                members={members}
                                payments={payments}
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
