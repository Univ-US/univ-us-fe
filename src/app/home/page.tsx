"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    BookOpen,
    Briefcase,
    Cloud,
    FileText,
    GraduationCap,
    Hash,
    LayoutDashboard,
    LogIn,
    LogOut,
    MessageSquare,
    Monitor,
    Send,
    Smartphone,
    Sun,
    Utensils,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { getUniversities } from "@/lib/homeApi";

const BASE_SHORTCUTS = [
    { label: "도서관", icon: BookOpen, bg: "bg-blue-500" },
    { label: "증명서발급", icon: FileText, bg: "bg-emerald-500", href: "https://www.certpia.com" },
    { label: "학교홈", icon: GraduationCap, bg: "bg-violet-500" },
    { label: "화면예약", icon: Monitor, bg: "bg-teal-500" },
    { label: "캠퍼스앱", icon: Smartphone, bg: "bg-slate-700", href: "/home" },
    { label: "Office 365", icon: Cloud, bg: "bg-red-500", href: "https://www.office.com" },
    { label: "학교 SNS", icon: Hash, bg: "bg-pink-500" },
    { label: "커뮤니티", icon: MessageSquare, bg: "bg-sky-500", href: "/community" },
    { label: "LMS", icon: LayoutDashboard, bg: "bg-indigo-500", href: "#" },
];

const EXTRA_SHORTCUTS = [
    { label: "취업정보", icon: Briefcase, bg: "bg-orange-500", href: "https://www.jobkorea.co.kr" },
];

const NOTICE_TABS = ["전체", "LMS", "커뮤니티"] as const;
type NoticeTab = (typeof NOTICE_TABS)[number];

// TODO(HOM-005): 관리자 공지 API 연동으로 교체
const MOCK_NOTICES = [
    { tag: "학사", title: "[교고] 2025학년도 후기(2026년 8월) 졸업예정자 학위...", date: "05.18", type: "LMS" },
    { tag: "취업", title: "[취업] 2026년 2월(2025년 전기) 졸업예정자 학위수여...", date: "05.13", type: "LMS" },
    { tag: "학사", title: "2026-1학기 국가장학금 2차 신청 마감D-3 안내", date: "05.09", type: "LMS" },
    { tag: "카뉴", title: "[고교마켓] 자료구조 재시험 이수 수칙 변경", date: "05.07", type: "커뮤니티" },
    { tag: "학사", title: "[수입] 2026-1학기 기말고사 강의실 배정 및 유의사항", date: "05.02", type: "LMS" },
    { tag: "D-3", title: "2026 봄 대동제 '유니버스 페스티벌' 버스 운행 신청", date: "04.26", type: "커뮤니티" },
];

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

//mock data
const MOCK_MEALS = [
    { type: "조식", time: "07:30 ~ 09:00", items: ["된장찌개", "공기밥", "계란후라이", "깍두기", "배추김치"] },
    { type: "중식", time: "11:30 ~ 13:30", items: ["부대찌개", "공기밥", "잡채", "미역국", "배추김치", "과일"]},
    { type: "석식", time: "17:30 ~ 19:00", items: ["김치찌개", "공기밥", "두부조림", "콩나물무침", "배추김치"] },
];

function useNow() {
    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, []);
    return now;
}

interface WeatherData {
    temp: number;
    description: string;
    city: string;
    icon: string;
}

interface SchoolInfo {
    schoolName: string;
    schoolPhone: string;
    homepage: string | null;
    address: string | null;
}

function useSchoolInfo(isLoggedIn: boolean, univId: number | null) {
    const [info, setInfo] = useState<SchoolInfo | null>(null);

    useEffect(() => {
        if (!isLoggedIn || univId == null) return;
        getUniversities()
            .then((univs) => {
                const univ = univs.find((u) => u.univId === univId);
                if (univ) {
                    const hp = univ.homepage;
                    const homepage = hp ? (hp.startsWith("http") ? hp : `https://${hp}`) : null;
                    setInfo({ schoolName: univ.univName, schoolPhone: univ.schoolPhone, homepage, address: univ.address ?? null });
                }
            })
            .catch(() => {});
    }, [isLoggedIn, univId]);

    return info;
}

function useWeather() {
    const [weather, setWeather] = useState<WeatherData | null>(null);

    useEffect(() => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(async ({ coords }) => {
            try {
                const key = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
                const { latitude: lat, longitude: lon } = coords;

                const [weatherRes, geoRes] = await Promise.all([
                    fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${key}&units=metric&lang=kr`),
                    fetch(`https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${key}`),
                ]);

                if (!weatherRes.ok) return;
                const data = await weatherRes.json();
                const geoData = geoRes.ok ? await geoRes.json() : [];
                const cityKo = geoData[0]?.local_names?.ko ?? geoData[0]?.name ?? data.name;

                setWeather({
                    temp: Math.round(data.main.temp),
                    description: data.weather[0].description,
                    city: cityKo,
                    icon: data.weather[0].icon,
                });
            } catch {}
        });
    }, []);

    return weather;
}

export default function CampusHomePage() {
    const router = useRouter();
    const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
    const memberName = useAuthStore((s) => s.memberName);
    const univId = useAuthStore((s) => s.univId);
    const univName = useAuthStore((s) => s.univName);
    const logoutAction = useAuthStore((s) => s.logoutAction);

    const now = useNow();
    const weather = useWeather();
    const schoolInfo = useSchoolInfo(isLoggedIn, univId);
    const [activeTab, setActiveTab] = useState<NoticeTab>("전체");
    const [chatInput, setChatInput] = useState("");
    const [showExtra, setShowExtra] = useState(false);


    const timeStr = now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: true });
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`;
    const dayStr = `${now.getMonth() + 1}/${now.getDate()} (${WEEKDAYS[now.getDay()]})`;

    const filteredNotices =
        activeTab === "전체" ? MOCK_NOTICES : MOCK_NOTICES.filter((n) => n.type === activeTab);

    const handleLogout = async () => {
        await logoutAction();
        router.refresh();
    };

    // 로그인 필요한 기능 클릭 시
    const requireLogin = (e: React.MouseEvent) => {
        if (!isLoggedIn) {
            e.preventDefault();
            router.push("/home/login");
        }
    };

    return (
        <div className="min-h-screen bg-[#f4f6f8]">
            {/* 헤더 */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
                <div className="mx-auto max-w-[1180px] flex items-center justify-between h-14 px-5">
                    <div className="flex items-center gap-2">
                        <Link href="/home" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="font-extrabold text-slate-900 tracking-tight hover:opacity-75 transition-opacity">
                            {univName ?? 'Univ·us'}
                        </Link>
                    </div>

                    {isLoggedIn && (
                        <div className="flex items-center gap-4 text-sm">
                            <span className="text-slate-500 hidden sm:inline">{memberName}님</span>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                <span className="hidden sm:inline">로그아웃</span>
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* 히어로 배너 */}
            <div className="bg-[#11302a] text-white">
                <div className="mx-auto max-w-[1180px] px-5 py-8 flex items-center justify-between gap-4">
                    <div>
                        <p className="text-xs text-white/50 mb-1.5">{univName ?? 'Univ·us'} 통합 포털</p>
                        <h1 className="text-xl sm:text-2xl font-extrabold leading-tight">
                            오늘도 캠퍼스의 모든 것을 한 곳에서 👋
                        </h1>
                    </div>
                    <div className="text-right hidden md:block shrink-0">
                        {weather ? (
                            <div className="flex items-center gap-2 justify-end text-white/70 text-sm mb-1">
                                <img
                                    src={`https://openweathermap.org/img/wn/${weather.icon}.png`}
                                    alt={weather.description}
                                    className="w-6 h-6"
                                />
                                <span className="font-bold text-white">{weather.temp}°</span>
                                <span className="text-white/40">|</span>
                                <span>{weather.description} · {weather.city}</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 justify-end text-white/70 text-sm mb-1">
                                <Sun className="w-4 h-4 text-yellow-300" />
                                <span className="text-white/40">날씨 불러오는 중...</span>
                            </div>
                        )}
                        <p className="text-2xl font-black tracking-tight">{timeStr}</p>
                        <p className="text-white/40 text-xs mt-0.5">{dateStr}</p>
                    </div>
                </div>
            </div>

            {/* 메인 컨텐츠 */}
            <div className="mx-auto max-w-[1180px] px-5 py-6 grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* 왼쪽 컬럼 */}
                <div className="lg:col-span-2 flex flex-col gap-5">

                    {/* 바로가기 */}
                    <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-extrabold text-slate-800 text-sm">바로가기</h2>
                            <button
                                onClick={() => { if (!isLoggedIn) { router.push("/home/login"); return; } setShowExtra((v) => !v); }}
                                className={`text-xs transition-colors ${showExtra ? "text-primary font-semibold" : "text-slate-400 hover:text-slate-600"}`}
                            >
                                {showExtra ? "닫기" : "More"}
                            </button>
                        </div>
                        <div className="grid grid-cols-5 sm:grid-cols-9 gap-3">
                            {[...BASE_SHORTCUTS, ...(showExtra ? EXTRA_SHORTCUTS : [])].map((s) => {
                                const Icon = s.icon;
                                const iconEl = (
                                    <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                );
                                const labelEl = <span className="text-[10px] text-slate-600 text-center leading-tight">{s.label}</span>;

                                const resolvedHref = s.label === "학교홈" ? (schoolInfo?.homepage ?? undefined) : s.href;
                                if (resolvedHref && isLoggedIn) {
                                    const isExternal = resolvedHref.startsWith("http");
                                    return (
                                        <a key={s.label} href={resolvedHref} target={isExternal ? "_blank" : undefined} rel={isExternal ? "noopener noreferrer" : undefined} className="flex flex-col items-center gap-2 group">
                                            {iconEl}{labelEl}
                                        </a>
                                    );
                                }
                                return (
                                    <button key={s.label} onClick={() => { if (!isLoggedIn) router.push("/home/login"); }} className="flex flex-col items-center gap-2 group">
                                        {iconEl}{labelEl}
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    {/* AI 챗봇 */}
                    {/* TODO(HOM-003): LLM API + RAG 벡터DB 연동 */}
                    <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="font-extrabold text-slate-800 text-sm">AI 챗봇</h2>
                            <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
                                RAG 연동
                            </span>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3 mb-3 text-sm text-slate-600 leading-relaxed">
                            안녕하세요! 유니버스 AI 도우미에요. 학교 도서관 직원 등 궁금한 걸 물어보세요 🤔
                        </div>
                        <div className="flex gap-2 mb-3 flex-wrap">
                            {["도서관 운영시간", "오늘 학식 메뉴", "스터디룸 예약 방법"].map((q) => (
                                <button
                                    key={q}
                                    onClick={(e) => { requireLogin(e); if (isLoggedIn) setChatInput(q); }}
                                    className="text-xs border border-slate-200 rounded-full px-3 py-1 hover:bg-slate-50 text-slate-600 transition-colors"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onFocus={(e) => { if (!isLoggedIn) { e.target.blur(); router.push("/home/login"); } }}
                                placeholder={isLoggedIn ? "무엇이 궁금하신가요?" : "로그인 후 이용할 수 있어요"}
                                readOnly={!isLoggedIn}
                                className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary/30 transition cursor-pointer"
                            />
                            <button
                                onClick={requireLogin}
                                className="bg-primary text-white rounded-lg px-3 py-2 hover:opacity-90 transition"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </section>

                    {/* 교내 전화번호 */}
                    <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                        <h2 className="font-extrabold text-slate-800 text-sm mb-4">교내 전화번호</h2>
                        {schoolInfo ? (
                            <a
                                href={`tel:${schoolInfo.schoolPhone}`}
                                className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 hover:bg-slate-100 transition-colors"
                            >
                                <span className="text-sm font-semibold text-slate-700">{schoolInfo.schoolName} 대표번호</span>
                                <span className="text-sm text-primary font-bold">{schoolInfo.schoolPhone}</span>
                            </a>
                        ) : (
                            <div className="rounded-lg bg-slate-50 px-4 py-3">
                                <span className="text-sm text-slate-400">
                                    {isLoggedIn ? "전화번호 정보를 불러오는 중..." : "로그인 후 확인할 수 있어요."}
                                </span>
                            </div>
                        )}
                        <p className="text-[11px] text-slate-400 mt-3">※ 세부 전화번호는 학교 홈페이지를 확인하세요.</p>
                    </section>

                    {/* 학교 유튜브 · 동아리 */}
                    <div className="grid grid-cols-2 gap-3">
                        <a
                            href="#"
                            onClick={requireLogin}
                            className="group bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-2"
                        >
                            <div className="w-9 h-9 rounded-xl bg-red-500 flex items-center justify-center text-white">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                            </div>
                            <span className="text-xs font-extrabold text-slate-800">학교 유튜브</span>
                            <span className="text-[11px] font-semibold text-primary">바로가기 →</span>
                        </a>
                        <a
                            href="#"
                            onClick={requireLogin}
                            className="group bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-2"
                        >
                            <div className="w-9 h-9 rounded-xl bg-violet-500 flex items-center justify-center text-white">
                                <GraduationCap className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-extrabold text-slate-800">동아리</span>
                            <span className="text-[11px] font-semibold text-primary">바로가기 →</span>
                        </a>
                    </div>
                </div>

                {/* 오른쪽 컬럼 */}
                <div className="flex flex-col gap-5">

                    {/* 로그인 카드 */}
                    {!isLoggedIn && (
                        <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                            <p className="text-xs text-slate-500 mb-4">
                                로그인하면 캠퍼스의 모든 서비스를 이용할 수 있어요.
                            </p>
                            <Link
                                href="/home/login"
                                className="flex items-center justify-center gap-2 w-full bg-[#11302a] text-white text-sm font-bold py-2.5 rounded-lg hover:opacity-90 transition"
                            >
                                <LogIn className="w-4 h-4" />
                                로그인 / 회원가입
                            </Link>
                        </section>
                    )}

                    {/* 최근 공지 */}
                    {/* TODO(HOM-005): 관리자 공지 API 연동 */}
                    <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="font-extrabold text-slate-800 text-sm">최근 공지</h2>
                            <button
                                onClick={requireLogin}
                                className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                더보기
                            </button>
                        </div>
                        <div className="flex gap-1 mb-3">
                            {NOTICE_TABS.map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`text-xs px-3 py-1 rounded-full font-semibold transition-colors ${
                                        activeTab === tab
                                            ? "bg-primary text-white"
                                            : "text-slate-500 hover:bg-slate-100"
                                    }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                        <ul className="divide-y divide-slate-100">
                            {filteredNotices.map((n, i) => (
                                <li key={i} className="flex items-center gap-2 py-2 text-xs">
                                    <span className="shrink-0 bg-slate-100 text-slate-500 rounded px-1.5 py-0.5 font-semibold">
                                        {n.tag}
                                    </span>
                                    <span className="flex-1 text-slate-700 truncate">{n.title}</span>
                                    <span className="shrink-0 text-slate-400">{n.date}</span>
                                </li>
                            ))}
                        </ul>
                    </section>

                    {/* 오늘의 학식 */}
                    {/* TODO(HOM-011): 학식 API 연동 */}
                    <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Utensils className="w-4 h-4 text-primary" />
                                <h2 className="font-extrabold text-slate-800 text-sm">오늘의 학식</h2>
                            </div>
                            <span className="text-xs text-slate-400">{dayStr}</span>
                        </div>
                        <div className="flex flex-col gap-3">
                            {MOCK_MEALS.map((meal) => (
                                <div key={meal.type} className="rounded-lg bg-slate-50 p-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-extrabold text-slate-700">{meal.type}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-slate-400">{meal.time}</span>
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-slate-500 leading-relaxed">
                                        {meal.items.join(" · ")}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>


            {/* 푸터 */}
            {schoolInfo?.address && (
                <footer className="border-t border-slate-200 bg-white mt-2">
                    <div className="mx-auto max-w-[1180px] px-5 py-4 text-center text-[11px] text-slate-400">
                        {univName ?? schoolInfo.schoolName} · {schoolInfo.address}
                    </div>
                </footer>
            )}
        </div>
    );
}
