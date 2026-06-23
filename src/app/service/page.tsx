"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
    ArrowRight,
    BookOpenCheck,
    Building2,
    CalendarDays,
    Check,
    ChevronRight,
    CircleCheckBig,
    CreditCard,
    GraduationCap,
    LayoutDashboard,
    MessageSquareText,
    ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";

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

type RoleSection = {
    number: string;
    role: string;
    title: string;
    description: string;
    icon: LucideIcon;
    menu: readonly string[];
    features: readonly string[];
    accent: string;
    panel: string;
};

const roleSections: readonly RoleSection[] = [
    {
        number: "01",
        role: "학생",
        title: "오늘의 학습과 캠퍼스 정보를\n한 화면에서 확인합니다.",
        description: "학생 LMS에는 대시보드, 수강 과목, 학습 자료, 과제 제출과 이력, 출결, 캘린더, 공지, 채팅이 구현되어 있습니다. 필요한 내용을 찾기 위해 여러 메뉴를 오갈 필요를 줄입니다.",
        icon: BookOpenCheck,
        menu: ["학습 대시보드", "수강 과목", "과제 · 출결", "캘린더", "공지 · 채팅"],
        features: ["과목별 학습 자료 확인", "과제 제출과 제출 이력", "출결 및 학사 일정 확인", "공지사항과 채팅"],
        accent: "text-amber-700",
        panel: "bg-amber-50",
    },
    {
        number: "02",
        role: "교수",
        title: "수업 운영에 필요한 기능을\n교수자의 흐름으로 정리했습니다.",
        description: "교수 LMS에는 강의 관리, 수강생 조회, 출결, 과제, 성적, 업로드, 공지, 캘린더와 채팅이 구현되어 있습니다. 강의 진행 중 필요한 관리 작업을 역할에 맞는 메뉴로 제공합니다.",
        icon: GraduationCap,
        menu: ["강의 관리", "수강생", "과제 · 성적", "출결", "공지 · 채팅"],
        features: ["강의 및 수강생 정보 조회", "과제 관리와 성적 처리", "출결 현황 관리", "자료 업로드와 공지 작성"],
        accent: "text-slate-700",
        panel: "bg-slate-100",
    },
    {
        number: "03",
        role: "학교어드민",
        title: "구성원과 강의, 결제까지\n학교 운영의 기준점을 만듭니다.",
        description: "학교어드민 대시보드에는 구성원 관리, 강의 관리·배정, 공지, 문의, 커뮤니티, 결제·구독 관리와 일괄 회원가입 기능이 구현되어 있습니다.",
        icon: Building2,
        menu: ["운영 대시보드", "구성원 관리", "강의 관리", "공지 · 문의", "결제 · 구독"],
        features: ["구성원 조회와 일괄 회원가입", "강의 관리 및 담당 교수 배정", "공지·문의·커뮤니티 관리", "구독 상태와 결제 이력 확인"],
        accent: "text-primary",
        panel: "bg-primary/5",
    },
    {
        number: "04",
        role: "서비스어드민",
        title: "여러 학교의 운영 상태를\n서비스 관점에서 관리합니다.",
        description: "서비스어드민에는 학교 관리, 구독 플랜, 결제, 사용자, 문의, 운영 로그와 학교별 일괄 회원가입 기능이 구현되어 있습니다. 서비스 전체를 관리하는 별도 운영 화면입니다.",
        icon: ShieldCheck,
        menu: ["학교 관리", "플랜 · 결제", "사용자 관리", "문의 관리", "운영 로그"],
        features: ["학교 및 구독 플랜 관리", "결제 현황과 운영 로그 확인", "사용자와 학교별 일괄 회원가입", "서비스 문의 처리"],
        accent: "text-rose-600",
        panel: "bg-rose-50",
    },
];

function RolePanel({ section }: { section: RoleSection }) {
    const Icon = section.icon;

    return (
        <div className="service-reveal relative mx-auto w-full max-w-[560px]">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-2 shadow-[0_30px_80px_-42px_rgba(15,23,42,0.35)]">
                <div className="flex h-9 items-center gap-1.5 rounded-t-2xl bg-slate-50 px-4">
                    <span className="size-2 rounded-full bg-rose-300" />
                    <span className="size-2 rounded-full bg-amber-300" />
                    <span className="size-2 rounded-full bg-sky-300" />
                    <span className="ml-3 h-3.5 w-32 rounded bg-slate-200" />
                </div>
                <div className="grid min-h-[350px] grid-cols-[126px_1fr] overflow-hidden rounded-b-2xl border border-slate-100 bg-slate-50 sm:min-h-[385px] sm:grid-cols-[148px_1fr]">
                    <aside className="border-r border-slate-100 bg-white p-3 sm:p-4">
                        <div className="flex items-center gap-2 text-xs font-black text-slate-900"><span className="flex size-6 items-center justify-center rounded-md bg-primary text-[10px] text-white">U</span>UnivUs</div>
                        <p className="mt-7 px-2 text-[9px] font-black tracking-[0.14em] text-slate-400">{section.role.toUpperCase()}</p>
                        <div className="mt-2 space-y-1">{section.menu.map((item, index) => <div key={item} className={`rounded-lg px-2 py-2 text-[10px] font-bold ${index === 0 ? "bg-slate-900 text-white" : "text-slate-400"}`}>{item}</div>)}</div>
                    </aside>
                    <div className="p-4 sm:p-5">
                        <div className="flex items-start justify-between gap-3"><div><p className={`text-[10px] font-black ${section.accent}`}>{section.role.toUpperCase()} WORKSPACE</p><h3 className="mt-1 text-lg font-black tracking-tight text-slate-900">오늘의 {section.role} 화면</h3></div><div className={`flex size-8 items-center justify-center rounded-xl ${section.panel} ${section.accent}`}><Icon className="size-4" /></div></div>
                        <div className="mt-6 grid gap-2">{section.features.slice(0, 3).map((feature, index) => <div key={feature} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 shadow-sm"><span className={`flex size-6 shrink-0 items-center justify-center rounded-lg ${section.panel} ${section.accent}`}><span className="text-[10px] font-black">{index + 1}</span></span><span className="text-[11px] font-bold leading-4 text-slate-600">{feature}</span></div>)}</div>
                        <div className="mt-3 rounded-xl bg-slate-950 p-3 text-white"><p className="text-[9px] font-black text-primary">UNIVUS FLOW</p><div className="mt-2 flex items-center gap-2 text-[10px] font-bold text-slate-200"><CircleCheckBig className="size-3.5 text-primary" />필요한 메뉴를 역할에 맞게 구성</div></div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ServicePage() {
    const router = useRouter();
    const logoutAction = useAuthStore((state) => state.logoutAction);
    const role = useAuthStore((state) => state.role);
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
    const isInitialized = useAuthStore((state) => state.isInitialized);
    const dashboardPath = getDashboardPathByRole(role);
    const shouldRedirectToHome =
        isLoggedIn && (role === "STU" || role === "PROF" || role === "ALU");

    const getStartPath = () => {
        if (!isLoggedIn) return "/login";
        return dashboardPath ?? "/subscribe";
    };

    const handleLogout = async () => {
        await logoutAction();
        router.refresh();
    };

    useEffect(() => {
        if (isInitialized && shouldRedirectToHome) {
            router.replace("/home");
        }
    }, [isInitialized, router, shouldRedirectToHome]);

    useEffect(() => {
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const targets = Array.from(document.querySelectorAll<HTMLElement>(".service-reveal"));

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
    }, []);

    if (!isInitialized || shouldRedirectToHome) {
        return null;
    }

    return (
        <main className="min-h-screen overflow-hidden bg-[#fbfcfd] pt-[72px] text-slate-950">
            <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
                <div className="mx-auto flex h-[72px] max-w-[1180px] items-center justify-between px-5 sm:px-6">
                    <Link href="/landing" className="flex items-center" aria-label="UnivUs 랜딩으로 이동"><img src="/univus-logo.svg" alt="UnivUs" className="h-12 w-auto" /></Link>
                    <nav className="flex items-center gap-4 text-sm font-bold text-slate-600 sm:gap-7">
                        <Link href="/landing" className="hidden transition-colors hover:text-primary sm:block">홈</Link>
                        <a href="#roles" className="hidden transition-colors hover:text-primary sm:block">역할별 기능</a>
                        {isLoggedIn ? (
                            <button type="button" onClick={handleLogout} className="transition-colors hover:text-primary">로그아웃</button>
                        ) : (
                            <Link href="/login" className="transition-colors hover:text-primary">로그인</Link>
                        )}
                        <Button asChild size="sm" className="h-9 rounded-lg px-4 font-bold">
                            <Link href={dashboardPath ?? getStartPath()}>
                                {dashboardPath ? "대시보드" : "시작하기"} <ArrowRight className="size-3.5" />
                            </Link>
                        </Button>
                    </nav>
                </div>
            </header>

            <section className="relative border-b border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_52%,#f3faf8_100%)]">
                <div className="absolute inset-x-0 top-0 h-full bg-[linear-gradient(90deg,rgba(15,23,42,0.045)_1px,transparent_1px),linear-gradient(180deg,rgba(15,23,42,0.04)_1px,transparent_1px)] bg-[size:56px_56px] opacity-50" />
                <div className="service-reveal relative mx-auto max-w-[1180px] px-5 py-24 sm:px-6 lg:py-32">
                    <p className="text-xs font-black tracking-[0.18em] text-primary">BUILT FROM THE PRODUCT</p>
                    <h1 className="mt-5 max-w-[860px] text-4xl font-black leading-[1.13] tracking-[-0.055em] sm:text-5xl lg:text-[4rem]">구현된 기능을,<br /><span className="text-primary">사용자의 역할</span>로 설명합니다.</h1>
                    <p className="mt-7 max-w-[690px] text-base leading-8 text-slate-600 sm:text-lg">UnivUs는 같은 화면을 모든 사용자에게 제공하지 않습니다. 현재 구현된 학생·교수·학교어드민·서비스어드민 기능을 역할별 흐름으로 소개합니다.</p>
                    <div className="mt-9 flex flex-wrap gap-3"><Button asChild size="lg" className="h-12 rounded-xl px-5 text-base font-extrabold"><a href="#roles">기능 살펴보기 <ArrowRight className="size-4" /></a></Button><Button asChild size="lg" variant="outline" className="h-12 rounded-xl border-slate-200 bg-white px-5 text-base font-extrabold hover:bg-primary/5 hover:text-primary"><Link href="/landing">랜딩으로 돌아가기</Link></Button></div>
                </div>
            </section>

            <section id="roles" className="mx-auto max-w-[1180px] px-5 py-24 sm:px-6 lg:py-32">
                <div className="service-reveal grid gap-10 border-b border-slate-200 pb-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-end"><div><p className="text-xs font-black tracking-[0.18em] text-primary">ROLE-BASED PRODUCT</p><h2 className="mt-4 text-3xl font-black leading-tight tracking-[-0.04em] sm:text-4xl">사용자가 실제로 마주하는<br />기능과 화면.</h2></div><p className="max-w-[620px] text-base leading-8 text-slate-500">추상적인 기능 나열 대신, 현재 서비스에 구현된 화면과 메뉴 기준으로 구성했습니다. 각 역할은 필요한 업무 흐름에 맞는 기능을 사용합니다.</p></div>

                <div className="mt-16 space-y-24 lg:space-y-32">
                    {roleSections.map((section, index) => {
                        const Icon = section.icon;
                        return (
                            <article key={section.role} data-reveal-delay={index * 120} className={`service-reveal grid gap-10 lg:grid-cols-2 lg:items-center ${index % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""}`}>
                                <div><div className="flex items-center gap-3"><span className="text-sm font-black text-primary">{section.number}</span><span className="h-px w-10 bg-primary/30" /><span className="text-xs font-black tracking-[0.14em] text-slate-500">{section.role.toUpperCase()}</span></div><Icon className={`mt-8 size-8 ${section.accent}`} /><h3 className="mt-6 whitespace-pre-line text-3xl font-black leading-tight tracking-[-0.045em] text-slate-950 sm:text-4xl">{section.title}</h3><p className="mt-6 max-w-[530px] text-base leading-8 text-slate-500">{section.description}</p><ul className="mt-8 grid gap-3 sm:grid-cols-2">{section.features.map((feature, featureIndex) => <li key={feature} data-reveal-delay={featureIndex * 90} className="service-reveal flex items-center gap-3 text-sm font-bold text-slate-700"><span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Check className="size-3" /></span>{feature}</li>)}</ul></div>
                                <RolePanel section={section} />
                            </article>
                        );
                    })}
                </div>
            </section>

            <section className="bg-[linear-gradient(135deg,var(--primary)_0%,#063d30_48%,#05251f_100%)] py-24 text-white shadow-inner shadow-primary/10 lg:py-32"><div className="mx-auto max-w-[1180px] px-5 sm:px-6"><div className="service-reveal grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end"><div><p className="text-xs font-black tracking-[0.18em] text-primary">SHARED OPERATIONS</p><h2 className="mt-4 text-3xl font-black leading-tight tracking-[-0.04em] sm:text-4xl">역할은 달라도,<br />운영에 필요한 흐름은 이어집니다.</h2></div><div className="grid gap-3 sm:grid-cols-3">{[[CreditCard, "구독 · 결제", "플랜, 결제 이력, 구독 상태 관리"], [MessageSquareText, "공지 · 문의", "공지와 서비스 문의 관리"], [CalendarDays, "커뮤니티 · 공간", "게시판, 중고마켓, 공간 예약과 좌석 채팅"]].map(([Icon, title, description], index) => { const CardIcon = Icon as LucideIcon; return <div key={title as string} data-reveal-delay={index * 90} className="service-reveal rounded-2xl border border-white/15 bg-white/[0.08] p-5 transition duration-300 hover:-translate-y-1 hover:bg-white/[0.12]"><CardIcon className="size-5 text-primary" /><h3 className="mt-8 text-base font-black">{title as string}</h3><p className="mt-3 text-sm leading-6 text-slate-300">{description as string}</p></div>; })}</div></div></div></section>

            <section className="mx-auto max-w-[1180px] px-5 py-24 sm:px-6 lg:py-32"><div className="service-reveal relative overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,var(--primary)_0%,#063d30_48%,#05251f_100%)] px-7 py-12 text-white shadow-2xl shadow-primary/10 sm:px-12 sm:py-14"><div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-white/30 via-primary-foreground/70 to-white/20" /><div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.12),transparent_44%,rgba(255,255,255,0.06))]" /><div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between"><div className="max-w-[680px]"><p className="text-xs font-black tracking-[0.16em] text-white/70">UNIVUS PLATFORM</p><h2 className="mt-4 text-3xl font-black leading-tight tracking-[-0.04em] sm:text-4xl">우리 학교에 필요한 운영 흐름을<br />UnivUs에서 시작하세요.</h2></div><Button asChild size="lg" variant="secondary" className="h-12 shrink-0 rounded-xl bg-white px-5 text-base font-extrabold text-slate-950 hover:bg-white/90"><Link href="/login">시작하기 <ArrowRight className="size-4" /></Link></Button></div></div></section>

            <footer className="border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-[1180px] flex-col gap-5 px-5 py-10 sm:px-6 md:flex-row md:items-center md:justify-between"><Link href="/landing" className="flex items-center"><img src="/univus-logo.svg" alt="UnivUs" className="h-10 w-auto" /></Link><p className="text-xs text-slate-500">© 2026 UnivUs. 대학 운영을 위한 통합 플랫폼.</p><Link href="/landing" className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-primary">랜딩으로 이동 <ChevronRight className="size-3.5" /></Link></div></footer>
        </main>
    );
}
