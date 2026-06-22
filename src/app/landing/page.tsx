"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
    ArrowRight,
    BellRing,
    BookOpenCheck,
    Building2,
    CalendarDays,
    Check,
    CircleCheckBig,
    CreditCard,
    GraduationCap,
    LayoutDashboard,
    LogIn,
    Menu,
    MessageSquareText,
    ShieldCheck,
    Sparkles,
    UsersRound,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSubscriptionPlans } from "@/lib/subscriptionApi";
import { useAuthStore } from "@/store/authStore";
import type { SubscriptionPlan } from "@/types/subscription";

const capabilities = [
    {
        eyebrow: "LEARNING",
        title: "수업의 모든 맥락을 한 곳에",
        description: "강의, 과제, 출결, 자료를 학생과 교수 모두가 같은 흐름에서 확인합니다.",
        icon: BookOpenCheck,
        tone: "bg-amber-50 text-amber-700",
    },
    {
        eyebrow: "OPERATIONS",
        title: "운영은 더 단순하고 선명하게",
        description: "구성원, 공지, 문의, 구독 상태를 역할에 맞는 화면에서 관리합니다.",
        icon: LayoutDashboard,
        tone: "bg-slate-100 text-slate-700",
    },
    {
        eyebrow: "CAMPUS LIFE",
        title: "수업 밖의 캠퍼스 경험까지",
        description: "일정, 시설 예약, 커뮤니티를 연결해 캠퍼스의 일상을 이어갑니다.",
        icon: CalendarDays,
        tone: "bg-rose-50 text-rose-600",
    },
];

const getDashboardPathByRole = (role: string | null) => {
    switch (role) {
        case "SUA":
            return "/service-admin";
        case "ADM":
            return "/dashboard/school-admin";
        default:
            return null;
    }
};

const formatPlanPrice = (price: number) => `${price.toLocaleString("ko-KR")}원`;

const formatPlanCaption = (plan: SubscriptionPlan) => {
    if (plan.description) {
        return plan.description;
    }

    if (plan.maxMemberCount == null) {
        return "회원 수 제한 없음";
    }

    return `최대 ${plan.maxMemberCount.toLocaleString("ko-KR")}명`;
};

function ProductPreview() {
    return (
        <div className="landing-float relative mx-auto w-full max-w-[650px]" aria-label="UnivUs 운영 화면 예시">
            <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-2 shadow-[0_34px_90px_-34px_rgba(15,23,42,0.32)]">
                <div className="flex h-9 items-center gap-1.5 rounded-t-[1.25rem] bg-slate-50 px-4">
                    <span className="size-2 rounded-full bg-rose-300" />
                    <span className="size-2 rounded-full bg-amber-300" />
                    <span className="size-2 rounded-full bg-sky-300" />
                    <span className="ml-3 h-4 w-36 rounded bg-slate-200/80" />
                </div>
                <div className="grid min-h-[350px] grid-cols-[132px_1fr] overflow-hidden rounded-b-[1.25rem] border border-slate-100 bg-slate-50 sm:min-h-[410px] sm:grid-cols-[156px_1fr]">
                    <aside className="hidden border-r border-slate-100 bg-white p-4 sm:block">
                        <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                            <span className="flex size-6 items-center justify-center rounded-md bg-primary text-xs text-white">U</span>
                            UnivUs
                        </div>
                        <div className="mt-7 space-y-2">
                            {["대시보드", "구성원 관리", "강의 관리", "공지사항"].map((item, index) => (
                                <div
                                    key={item}
                                    className={`rounded-lg px-3 py-2 text-[11px] font-bold ${index === 0 ? "bg-slate-900 text-white" : "text-slate-400"}`}
                                >
                                    {item}
                                </div>
                            ))}
                        </div>
                        <div className="mt-10 rounded-xl bg-slate-50 p-3">
                            <div className="h-2 w-10 rounded bg-slate-200" />
                            <div className="mt-2 h-2 w-full rounded bg-slate-100" />
                            <div className="mt-1.5 h-2 w-4/5 rounded bg-slate-100" />
                        </div>
                    </aside>

                    <div className="p-4 sm:p-6">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-[11px] font-bold text-primary">GOOD MORNING, UNIVUS</p>
                                <h3 className="mt-1 text-lg font-black tracking-tight text-slate-900 sm:text-xl">오늘의 운영 현황</h3>
                            </div>
                            <div className="flex size-8 items-center justify-center rounded-full border border-slate-100 bg-white text-primary shadow-sm">
                                <BellRing className="size-3.5" />
                            </div>
                        </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-3">
                            {[
                                ["구성원", "관리", UsersRound],
                                ["강의", "운영", BookOpenCheck],
                                ["문의", "확인", MessageSquareText],
                            ].map(([label, value, Icon]) => {
                                const CardIcon = Icon as typeof UsersRound;
                                return (
                                    <div key={label as string} className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                                        <CardIcon className="size-4 text-primary" />
                                        <p className="mt-4 text-[10px] font-semibold text-slate-400">{label as string}</p>
                                        <p className="mt-0.5 text-sm font-black text-slate-800">{value as string}</p>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-black text-slate-800">최근 운영 항목</p>
                                    <p className="mt-1 text-[10px] text-slate-400">흐름을 놓치지 않고 확인하세요.</p>
                                </div>
                                <span className="rounded-full bg-amber-100 px-2 py-1 text-[9px] font-black text-amber-700">LIVE</span>
                            </div>
                            <div className="mt-4 space-y-3">
                                {["공지사항을 확인할 수 있습니다.", "구성원 정보를 관리할 수 있습니다.", "문의 내역을 확인할 수 있습니다."].map((item) => (
                                    <div key={item} className="flex items-center gap-2.5">
                                        <CircleCheckBig className="size-3.5 shrink-0 text-primary" />
                                        <span className="text-[10px] font-medium text-slate-500">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="absolute -bottom-4 -left-3 hidden items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-xl shadow-slate-200/60 sm:flex">
                <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <ShieldCheck className="size-4" />
                </div>
                <div>
                    <p className="text-[10px] font-bold text-slate-400">ONE PLATFORM</p>
                    <p className="text-xs font-black text-slate-800">역할에 맞는 운영 경험</p>
                </div>
            </div>
        </div>
    );
}

export default function LandingPage() {
    const router = useRouter();
    const logoutAction = useAuthStore((state) => state.logoutAction);
    const role = useAuthStore((state) => state.role);
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
    const dashboardPath = getDashboardPathByRole(role);
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [plansLoading, setPlansLoading] = useState(true);
    const [plansError, setPlansError] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        let active = true;

        getSubscriptionPlans()
            .then((response) => {
                if (active) {
                    setPlans(response);
                    setPlansError(false);
                }
            })
            .catch(() => {
                if (active) {
                    setPlansError(true);
                }
            })
            .finally(() => {
                if (active) {
                    setPlansLoading(false);
                }
            });

        return () => {
            active = false;
        };
    }, []);

    const getSubscriptionPath = (planId?: number) => {
        if (!isLoggedIn) {
            return "/login";
        }

        if (dashboardPath) {
            return dashboardPath;
        }

        return planId ? `/subscribe?planId=${planId}` : "/subscribe";
    };

    const handleLogout = async () => {
        await logoutAction();
        router.refresh();
    };

    useEffect(() => {
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const targets = Array.from(document.querySelectorAll<HTMLElement>(".landing-scroll-reveal"));

        if (reduceMotion) {
            targets.forEach((target) => target.classList.add("is-visible"));
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) {
                        return;
                    }

                    const target = entry.target as HTMLElement;
                    const delay = Number(target.dataset.revealDelay ?? "0");

                    window.setTimeout(() => {
                        target.classList.add("is-visible");
                    }, delay);

                    observer.unobserve(target);
                });
            },
            { threshold: 0.08, rootMargin: "0px 0px -4% 0px" },
        );

        const frame = window.requestAnimationFrame(() => {
            targets.forEach((target) => {
                if (!target.classList.contains("is-visible")) {
                    observer.observe(target);
                }
            });
        });

        return () => {
            window.cancelAnimationFrame(frame);
            observer.disconnect();
        };
    }, [plansLoading, plansError, plans.length]);

    return (
        <main className="min-h-screen overflow-hidden bg-[#fbfcfd] pt-[72px] text-slate-950">
            <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
                <div className="mx-auto flex h-[72px] max-w-[1180px] items-center justify-between px-5 sm:px-6">
                    <Link href="/landing" className="flex items-center" aria-label="UnivUs 랜딩으로 이동">
                        <img src="/univus-logo.svg" alt="UnivUs" className="h-12 w-auto" />
                    </Link>

                    <nav className="hidden items-center gap-7 text-sm font-bold text-slate-600 md:flex">
                        <Link href="/service" className="transition-colors hover:text-primary">서비스 소개</Link>
                        <a href="#experience" className="transition-colors hover:text-primary">주요 기능</a>
                        <a href="#pricing" className="transition-colors hover:text-primary">요금제</a>
                        {!isLoggedIn && <Link href="/signup" className="transition-colors hover:text-primary">회원가입</Link>}
                        {dashboardPath && <Link href={dashboardPath} className="transition-colors hover:text-primary">대시보드</Link>}
                        {isLoggedIn ? (
                            <button type="button" onClick={handleLogout} className="transition-colors hover:text-primary">로그아웃</button>
                        ) : (
                            <Link href="/login" className="transition-colors hover:text-primary">로그인</Link>
                        )}
                        <Button asChild size="sm" className="h-9 rounded-lg px-4 font-bold">
                            <Link href={getSubscriptionPath()}>도입 문의 <ArrowRight className="size-3.5" /></Link>
                        </Button>
                    </nav>

                    <button
                        type="button"
                        onClick={() => setMobileMenuOpen((open) => !open)}
                        className="flex size-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 md:hidden"
                        aria-label="메뉴 열기"
                        aria-expanded={mobileMenuOpen}
                    >
                        {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
                    </button>
                </div>
                {mobileMenuOpen && (
                    <div className="border-t border-slate-100 bg-white px-5 py-4 shadow-lg md:hidden">
                        <nav className="mx-auto flex max-w-[1180px] flex-col gap-1 text-sm font-bold text-slate-700">
                            <Link onClick={() => setMobileMenuOpen(false)} href="/service" className="rounded-lg px-3 py-3 hover:bg-primary/5 hover:text-primary">서비스 소개</Link>
                            <a onClick={() => setMobileMenuOpen(false)} href="#experience" className="rounded-lg px-3 py-3 hover:bg-primary/5 hover:text-primary">주요 기능</a>
                            <a onClick={() => setMobileMenuOpen(false)} href="#pricing" className="rounded-lg px-3 py-3 hover:bg-primary/5 hover:text-primary">요금제</a>
                            <Link onClick={() => setMobileMenuOpen(false)} href={getSubscriptionPath()} className="rounded-lg bg-primary px-3 py-3 text-white">도입 문의</Link>
                        </nav>
                    </div>
                )}
            </header>

            <section className="relative bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_52%,#f3faf8_100%)]">
                <div className="absolute inset-x-0 top-0 h-full bg-[linear-gradient(90deg,rgba(15,23,42,0.045)_1px,transparent_1px),linear-gradient(180deg,rgba(15,23,42,0.04)_1px,transparent_1px)] bg-[size:56px_56px] opacity-50" />
                <div className="relative mx-auto grid max-w-[1180px] gap-14 px-5 pb-24 pt-20 sm:px-6 lg:grid-cols-[0.93fr_1.07fr] lg:items-center lg:pb-32 lg:pt-28">
                    <div className="landing-scroll-reveal max-w-[600px]">
                        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3.5 py-2 text-xs font-extrabold text-slate-700 shadow-sm">
                            <span className="flex size-5 items-center justify-center rounded-full bg-primary/10"><Building2 className="size-3" /></span>
                            대학 운영을 하나의 흐름으로
                        </div>
                        <h1 className="mt-7 text-4xl font-black leading-[1.12] tracking-[-0.055em] text-slate-950 sm:text-5xl lg:text-[4.15rem]">
                            캠퍼스의 오늘을<br />
                            <span className="text-primary">더 선명하게</span> 연결하다.
                        </h1>
                        <p className="mt-7 max-w-[540px] text-base leading-8 text-slate-600 sm:text-lg">
                            UnivUs는 강의와 구성원 관리, 일정과 커뮤니티를 하나의 경험으로 연결하는 대학 운영 플랫폼입니다.
                        </p>
                        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                            <Button asChild size="lg" className="h-12 rounded-xl px-5 text-base font-extrabold shadow-xl shadow-primary/20">
                                <Link href={getSubscriptionPath()}>우리 학교에 도입하기 <ArrowRight className="size-4" /></Link>
                            </Button>
                            <Button asChild variant="outline" size="lg" className="h-12 rounded-xl border-slate-200 bg-white px-5 text-base font-extrabold hover:bg-primary/5 hover:text-primary">
                                <Link href="/service">서비스 둘러보기</Link>
                            </Button>
                        </div>
                        <div className="mt-10 flex flex-wrap gap-x-5 gap-y-3 text-xs font-bold text-slate-500">
                            {["역할별 맞춤 환경", "대학 운영 통합 관리", "명확한 정보 흐름"].map((item) => (
                                <span key={item} className="flex items-center gap-1.5"><Check className="size-3.5 text-primary" />{item}</span>
                            ))}
                        </div>
                    </div>
                    <ProductPreview />
                </div>
            </section>

            <section className="border-y border-slate-200 bg-white">
                <div className="mx-auto grid max-w-[1180px] gap-6 px-5 py-8 sm:grid-cols-3 sm:px-6">
                    {[
                        ["수업에서 운영까지", "분리된 도구 대신 하나의 플랫폼"],
                        ["역할에 맞는 경험", "운영자, 교수자, 학습자의 각기 다른 흐름"],
                        ["더 분명한 정보", "필요한 사람에게 필요한 내용을 빠르게"],
                    ].map(([title, description]) => (
                        <div key={title} data-reveal-delay={title.length * 12} className="landing-scroll-reveal border-slate-200 sm:border-l sm:pl-6 first:border-l-0 first:pl-0">
                            <p className="text-sm font-black text-slate-900">{title}</p>
                            <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section id="experience" className="mx-auto max-w-[1180px] px-5 py-24 sm:px-6 lg:py-32">
                <div className="max-w-[680px]">
                    <p className="text-xs font-black tracking-[0.18em] text-primary">ONE CONNECTED EXPERIENCE</p>
                    <h2 className="mt-4 text-3xl font-black leading-tight tracking-[-0.04em] text-slate-950 sm:text-4xl">각각의 업무가 아니라,<br />하나로 이어지는 운영 경험.</h2>
                    <p className="mt-5 max-w-[600px] text-base leading-8 text-slate-500">필요한 기능을 단순히 모으는 데서 그치지 않습니다. 캠퍼스 안에서 정보가 움직이는 방식을 더 자연스럽게 설계합니다.</p>
                </div>

                <div className="mt-12 grid gap-4 lg:grid-cols-3">
                    {capabilities.map((capability, index) => {
                        const Icon = capability.icon;
                        return (
                            <article key={capability.title} data-reveal-delay={index * 120} className={`landing-scroll-reveal group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-7 transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/70 ${index === 0 ? "lg:col-span-2" : ""}`}>
                                <div className={`flex size-12 items-center justify-center rounded-2xl ${capability.tone}`}><Icon className="size-5" /></div>
                                <p className="mt-10 text-[11px] font-black tracking-[0.15em] text-primary">{capability.eyebrow}</p>
                                <h3 className="mt-3 text-2xl font-black tracking-[-0.035em] text-slate-900">{capability.title}</h3>
                                <p className="mt-4 max-w-[430px] text-sm leading-7 text-slate-500">{capability.description}</p>
                                {index === 0 && (
                                    <div className="mt-8 grid max-w-[450px] grid-cols-3 gap-2">
                                        {["강의", "과제", "출결"].map((item) => <div key={item} className="rounded-xl bg-slate-50 p-3 text-center text-xs font-black text-slate-600">{item}</div>)}
                                    </div>
                                )}
                                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-primary via-amber-300 to-rose-300 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                            </article>
                        );
                    })}
                </div>
            </section>

            <section id="pricing" className="mx-auto max-w-[1180px] px-5 py-24 sm:px-6 lg:py-32">
                <div className="text-center">
                    <p className="text-xs font-black tracking-[0.18em] text-primary">FLEXIBLE PLANS</p>
                    <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-slate-950 sm:text-4xl">학교의 규모에 맞게 시작하세요.</h2>
                    <p className="mx-auto mt-5 max-w-[610px] text-base leading-8 text-slate-500">학교 환경에 맞는 플랜을 확인하고, 도입에 필요한 내용을 함께 논의할 수 있습니다.</p>
                </div>

                <div className="landing-scroll-reveal mt-12 rounded-[2rem] border border-slate-200 bg-white px-5 py-8 shadow-[0_28px_80px_-46px_rgba(15,23,42,0.35)] sm:px-8 sm:py-10 lg:px-12">
                {plansLoading ? (
                    <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">구독 플랜을 불러오는 중입니다.</div>
                ) : plansError ? (
                    <div className="mx-auto max-w-[780px] rounded-3xl border border-primary/15 bg-white p-7 text-left shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-9">
                        <div>
                            <p className="text-sm font-black text-slate-900">우리 학교에 맞는 플랜을 함께 설계합니다.</p>
                            <p className="mt-2 text-sm leading-6 text-slate-500">구성원 규모와 필요한 운영 범위를 기준으로 도입 플랜을 안내해드립니다.</p>
                        </div>
                        <Button asChild className="mt-5 h-11 shrink-0 rounded-xl font-extrabold sm:mt-0">
                            <Link href={getSubscriptionPath()}>도입 문의하기 <ArrowRight className="size-4" /></Link>
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-4 lg:grid-cols-3">
                        {plans.map((plan, index) => {
                            const featured = plan.planName.toUpperCase() === "PRO" || (plans.length > 1 && index === 1);
                            return (
                                <article key={plan.planId} data-reveal-delay={index * 100} className={`landing-scroll-reveal relative rounded-3xl border p-7 transition duration-300 hover:-translate-y-1 ${featured ? "border-primary bg-white shadow-xl shadow-slate-200/80" : "border-slate-200 bg-white/95 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/70"}`}>
                                    {featured && <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-[11px] font-black text-white">추천 플랜</span>}
                                    <h3 className="text-xl font-black text-slate-900">{plan.planName}</h3>
                                    <div className="mt-7"><span className="text-3xl font-black tracking-[-0.04em] text-slate-950">{formatPlanPrice(plan.price)}</span><span className="ml-1 text-sm font-bold text-slate-400">/ 월</span></div>
                                    <p className="mt-5 min-h-12 text-sm leading-6 text-slate-500">{formatPlanCaption(plan)}</p>
                                    <div className="my-6 h-px bg-slate-100" />
                                    <p className="flex items-center gap-2 text-sm font-bold text-slate-600"><Check className="size-4 text-primary" />도입 상담 및 구독 신청</p>
                                    <Button asChild variant={featured ? "default" : "outline"} className="mt-7 h-11 w-full rounded-xl font-extrabold">
                                        <Link href={getSubscriptionPath(plan.planId)}>{dashboardPath ? "대시보드로 이동" : "플랜 문의하기"}</Link>
                                    </Button>
                                </article>
                            );
                        })}
                    </div>
                )}
                </div>
            </section>

            <section className="mx-auto max-w-[1180px] px-5 pb-24 sm:px-6 lg:pb-32">
                <div className="landing-scroll-reveal relative overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,var(--primary)_0%,#063d30_48%,#05251f_100%)] px-7 py-12 text-white shadow-2xl shadow-primary/10 sm:px-12 sm:py-14">
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-white/30 via-primary-foreground/70 to-white/20" />
                    <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.12),transparent_44%,rgba(255,255,255,0.06))]" />
                    <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-[680px]">
                            <p className="text-xs font-black tracking-[0.16em] text-white/70">LET&apos;S BUILD A BETTER CAMPUS</p>
                            <h2 className="mt-4 text-3xl font-black leading-tight tracking-[-0.04em] sm:text-4xl">더 나은 대학 운영 경험을<br />UnivUs와 시작하세요.</h2>
                        </div>
                        <Button asChild size="lg" variant="secondary" className="h-12 shrink-0 rounded-xl bg-white px-5 text-base font-extrabold text-slate-950 hover:bg-white/90">
                            <Link href={getSubscriptionPath()}>{dashboardPath ? "대시보드로 이동" : "도입 문의하기"} <ArrowRight className="size-4" /></Link>
                        </Button>
                    </div>
                </div>
            </section>

            <footer className="border-t border-slate-200 bg-white">
                <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-5 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
                    <Link href="/landing" className="flex items-center gap-2 font-black text-slate-900"><Sparkles className="size-4 text-primary" />UnivUs</Link>
                    <p className="text-xs leading-5 text-slate-500">© 2026 UnivUs. 대학 운영을 위한 통합 플랫폼.</p>
                    <div className="flex gap-5 text-xs font-bold text-slate-500">
                        <Link href="/signup" className="hover:text-primary">이용약관</Link>
                        <Link href="/privacy" className="hover:text-primary">개인정보처리방침</Link>
                    </div>
                </div>
            </footer>
        </main>
    );
}
