"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    ArrowRight,
    Building2,
    CreditCard,
    GraduationCap,
    Headphones,
    LayoutDashboard,
    LogIn,
    ShieldCheck,
    Sparkles,
    UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";

const features = [
    {
        title: "기관 맞춤 LMS",
        description: "학교와 학원의 강의, 학생, 교수, 관리자 계정을 한 화면에서 운영합니다.",
        icon: GraduationCap,
    },
    {
        title: "구독 기반 운영",
        description: "플랜별 사용량, 결제 내역, 구독 상태를 투명하게 확인할 수 있습니다.",
        icon: CreditCard,
    },
    {
        title: "어드민 문의 채팅",
        description: "학교 관리자가 문의를 시작하면 어드민이 실시간으로 답변합니다.",
        icon: Headphones,
    },
    {
        title: "회원 통합 조회",
        description: "학생, 교수, 관리자를 역할과 상태 기준으로 빠르게 찾습니다.",
        icon: UsersRound,
    },
];

const plans = [
    {
        name: "베이직",
        price: "49,000원",
        caption: "학생 500명",
    },
    {
        name: "프로",
        price: "149,000원",
        caption: "학생 5,000명",
        featured: true,
    },
    {
        name: "엔터프라이즈",
        price: "맞춤 견적",
        caption: "무제한",
    },
];

const getDashboardPathByRole = (role: string | null) => {
    switch (role) {
        case "SUA":
            return "/dashboard/service-admin";
        case "ADM":
            return "/dashboard/school-admin";
        default:
            return null;
    }
};

const getRoleSnapshot = () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("role");
};

const subscribeRole = (onStoreChange: () => void) => {
    if (typeof window === "undefined") return () => {};

    window.addEventListener("storage", onStoreChange);
    window.addEventListener("univus-auth-change", onStoreChange);

    return () => {
        window.removeEventListener("storage", onStoreChange);
        window.removeEventListener("univus-auth-change", onStoreChange);
    };
};

export default function HomePage() {
    const router = useRouter();
    const logoutAction = useAuthStore((state) => state.logoutAction);

    const role = useSyncExternalStore(subscribeRole, getRoleSnapshot, () => null);
    const isLoggedIn = role !== null;
    const dashboardPath = getDashboardPathByRole(role);

    const handleLogout = async () => {
        await logoutAction();
        window.dispatchEvent(new Event("univus-auth-change"));
        router.refresh();
    };

    return (
        <main className="min-h-screen bg-[#f8fbfb] text-slate-950">
            <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur">
                <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between px-6">
                    <Link href="/home" className="flex items-center gap-2">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-white">
                            <Sparkles className="size-4" />
                        </div>
                        <span className="text-lg font-extrabold tracking-tight">
              Univ<span className="text-primary">Us</span>
            </span>
                    </Link>

                    <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-600 md:flex">
                        <a href="#service" className="hover:text-primary">
                            서비스 소개
                        </a>
                        <a href="#pricing" className="hover:text-primary">
                            요금제
                        </a>
                        <a href="#pricing" className="hover:text-primary">
                            구독 신청
                        </a>

                        {!isLoggedIn && (
                            <Link href="/signup" className="hover:text-primary">
                                회원가입
                            </Link>
                        )}

                        {dashboardPath && (
                            <Link href={dashboardPath} className="hover:text-primary">
                                대시보드
                            </Link>
                        )}

                        {isLoggedIn ? (
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="font-semibold hover:text-primary"
                            >
                                로그아웃
                            </button>
                        ) : (
                            <Link href="/login" className="hover:text-primary">
                                로그인
                            </Link>
                        )}
                    </nav>
                </div>
            </header>

            <section className="mx-auto max-w-[1180px] px-6 pb-24 pt-28 text-center">
                <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-extrabold text-primary">
                    <Building2 className="size-3.5" />
                    학교와 학원을 위한 SaaS LMS
                </div>

                <h1 className="text-6xl font-black tracking-tight text-slate-950">
                    UnivUs
                </h1>

                <p className="mx-auto mt-5 max-w-[860px] text-4xl font-extrabold leading-tight tracking-tight text-slate-950">
                    학교 운영과 온라인 학습을 하나로 연결합니다
                </p>

                <p className="mx-auto mt-6 max-w-[720px] text-base leading-8 text-slate-600">
                    UnivUs는 기관 관리자가 학생과 교수 계정을 운영하고, 구독 상태와 결제 정보를 확인하며,
                    어드민 문의까지 처리할 수 있는 교육 운영 플랫폼입니다.
                </p>

                <div className="mt-8 flex justify-center gap-3">
                    <Button asChild size="lg" className="h-11 px-6 text-base font-bold shadow-lg shadow-primary/20">
                        <Link href={isLoggedIn ? "/subscribe" : "/login"}>
                            구독 신청하기
                            <ArrowRight className="size-4" />
                        </Link>
                    </Button>

                    {dashboardPath ? (
                        <Button asChild variant="outline" size="lg" className="h-11 px-6 text-base font-bold">
                            <Link href={dashboardPath}>
                                <LayoutDashboard className="size-4" />
                                대시보드로 이동
                            </Link>
                        </Button>
                    ) : (
                        <Button asChild variant="outline" size="lg" className="h-11 px-6 text-base font-bold">
                            <Link href="/login">
                                <LogIn className="size-4" />
                                로그인
                            </Link>
                        </Button>
                    )}
                </div>
            </section>

            <section id="service" className="mx-auto max-w-[1180px] px-6 py-20">
                <div className="text-center">
                    <h2 className="text-3xl font-black tracking-tight">
                        학교에 필요한 운영 기능
                    </h2>
                    <p className="mx-auto mt-4 max-w-[620px] text-base leading-7 text-slate-500">
                        기관 구매 담당자가 서비스 가치를 빠르게 판단할 수 있도록 핵심 기능 중심으로 구성했습니다.
                    </p>
                </div>

                <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {features.map((feature) => {
                        const Icon = feature.icon;

                        return (
                            <article
                                key={feature.title}
                                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                            >
                                <div className="mb-5 flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <Icon className="size-5" />
                                </div>
                                <h3 className="text-lg font-extrabold tracking-tight">
                                    {feature.title}
                                </h3>
                                <p className="mt-3 text-sm leading-7 text-slate-500">
                                    {feature.description}
                                </p>
                            </article>
                        );
                    })}
                </div>
            </section>

            <section id="pricing" className="mx-auto max-w-[1180px] px-6 py-20">
                <div className="text-center">
                    <h2 className="text-3xl font-black tracking-tight">구독 플랜</h2>
                    <p className="mx-auto mt-4 max-w-[640px] text-base leading-7 text-slate-500">
                        학교 규모에 맞는 예상 플랜을 선택하고 도입 상담으로 이어질 수 있습니다.
                    </p>
                </div>

                <div className="mt-10 grid gap-4 lg:grid-cols-3">
                    {plans.map((plan) => (
                        <article
                            key={plan.name}
                            className={`rounded-xl border bg-white p-6 shadow-sm ${
                                plan.featured ? "border-primary shadow-primary/10" : "border-slate-200"
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-extrabold">{plan.name}</h3>
                                {plan.featured && (
                                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-extrabold text-primary">
                    추천
                  </span>
                                )}
                            </div>

                            <div className="mt-7">
                <span className="text-3xl font-black tracking-tight">
                  {plan.price}
                </span>
                                {plan.price.includes("원") && (
                                    <span className="ml-1 text-lg font-extrabold">/ 월</span>
                                )}
                            </div>

                            <p className="mt-5 text-sm text-slate-500">{plan.caption}</p>

                            <Button
                                asChild
                                variant={plan.featured ? "default" : "outline"}
                                className="mt-6 h-11 w-full text-base font-bold"
                            >
                                <Link href={isLoggedIn ? "/signup" : "/login"}>구독 신청</Link>
                            </Button>
                        </article>
                    ))}
                </div>
            </section>

            <section className="mx-auto max-w-[1180px] px-6 py-20">
                <div className="flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-600">
                            <ShieldCheck className="size-3.5" />
                            기관 운영자용 콘솔
                        </div>
                        <h2 className="text-2xl font-black tracking-tight">
                            로그인 후 운영 대시보드와 커뮤니티를 바로 사용할 수 있습니다.
                        </h2>
                    </div>

                    <Button asChild size="lg" className="h-11 px-6 text-base font-bold">
                        <Link href={dashboardPath ?? "/login"}>
                            <LayoutDashboard className="size-4" />
                            {dashboardPath ? "대시보드로 이동" : "시작하기"}
                        </Link>
                    </Button>
                </div>
            </section>

            <footer className="mx-auto max-w-[1180px] border-t border-slate-200 px-6 py-10">
                <div className="flex flex-col gap-4 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
                    <Link href="/home" className="flex items-center gap-2 font-extrabold text-slate-900">
                        <Sparkles className="size-4 text-primary" />
                        UnivUs
                    </Link>
                    <p>© 2026 UnivUs. 학교와 학원을 위한 LMS 운영 플랫폼.</p>
                    <div className="flex gap-5 font-semibold">
                        <a href="#">이용약관</a>
                        <a href="#">개인정보처리방침</a>
                    </div>
                </div>
            </footer>
        </main>
    );
}