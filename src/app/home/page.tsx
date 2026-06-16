/* eslint-disable */
"use client";

import { useEffect, useRef, useState } from "react";
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
    Play,
    Sun,
    Users,
    Utensils,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { getUniversities, streamChatMessage, getNotices, getHomeConfig, Notice, type HomeWidgetConfig } from "@/lib/homeApi";
import api from "@/lib/api";
import { ROLE } from "@/lib/rolecode";

const DEFAULT_CONFIG: HomeWidgetConfig = {
    weather: true, aiChat: true, notice: true, meal: true, tel: true, shortcut: true,
};

const BASE_SHORTCUTS = [
    { label: "?꾩꽌愿", icon: BookOpen, bg: "bg-primary" },
    { label: "利앸챸?쒕컻湲?, icon: FileText, bg: "bg-teal-600", href: "https://www.certpia.com" },
    { label: "?숆탳??, icon: GraduationCap, bg: "bg-slate-700" },
    { label: "?붾㈃?덉빟", icon: Monitor, bg: "bg-teal-500" },
    { label: "罹좏띁?ㅼ빋", icon: Smartphone, bg: "bg-slate-700", href: "/home" },
    { label: "Office 365", icon: Cloud, bg: "bg-red-500", href: "https://www.office.com" },
    { label: "?숆탳 SNS", icon: Hash, bg: "bg-teal-500" },
    { label: "YouTube", icon: Play, bg: "bg-red-600" },
    { label: "?숈븘由?, icon: Users, bg: "bg-amber-500" },
    { label: "而ㅻ??덊떚", icon: MessageSquare, bg: "bg-primary", href: "/community" },
    { label: "LMS", icon: LayoutDashboard, bg: "bg-indigo-500", href: "#" },
];

const EXTRA_SHORTCUTS = [
    { label: "痍⑥뾽?뺣낫", icon: Briefcase, bg: "bg-orange-500", href: "https://www.jobkorea.co.kr" },
];


const WEEKDAYS = ["??, "??, "??, "??, "紐?, "湲?, "??];

//mock data
const MOCK_MEALS = [
    { type: "議곗떇", time: "07:30 ~ 09:00", items: ["?쒖옣李뚭컻", "怨듦린諛?, "怨꾨??꾨씪??, "源띾몢湲?, "諛곗텛源移?] },
    { type: "以묒떇", time: "11:30 ~ 13:30", items: ["遺?李뚭컻", "怨듦린諛?, "?≪콈", "誘몄뿭援?, "諛곗텛源移?, "怨쇱씪"]},
    { type: "?앹떇", time: "17:30 ~ 19:00", items: ["源移섏컡媛?, "怨듦린諛?, "?먮?議곕┝", "肄⑸굹臾쇰Т移?, "諛곗텛源移?] },
];

function useNow() {
    const [now, setNow] = useState<Date | null>(null);
    useEffect(() => {
        setNow(new Date());
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
    youtubeUrl: string | null;
    clubUrl: string | null;
    snsUrl: string | null;
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
                    setInfo({
                        schoolName: univ.univName,
                        schoolPhone: univ.schoolPhone,
                        homepage,
                        address: univ.address ?? null,
                        youtubeUrl: univ.youtubeUrl ?? null,
                        clubUrl: univ.clubUrl ?? null,
                        snsUrl: univ.snsUrl ?? null,
                    });
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
                const { latitude: lat, longitude: lon } = coords;
                const res = await api.get<WeatherData>(`/api/weather`, { params: { lat, lon } });
                setWeather(res.data);
            } catch {}
        });
    }, []);

    return weather;
}

export default function CampusHomePage() {
    const router = useRouter();
    const isInitialized = useAuthStore((s) => s.isInitialized);
    const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
    const role = useAuthStore((s) => s.role);
    const memberName = useAuthStore((s) => s.memberName);
    const univId = useAuthStore((s) => s.univId);
    const univName = useAuthStore((s) => s.univName);
    const logoutAction = useAuthStore((s) => s.logoutAction);

    const now = useNow();
    const weather = useWeather();
    const schoolInfo = useSchoolInfo(isLoggedIn, univId);
    const [homeConfig, setHomeConfig] = useState<HomeWidgetConfig>(DEFAULT_CONFIG);
    const [notices, setNotices] = useState<Notice[]>([]);
    const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
    const [chatInput, setChatInput] = useState("");
    const [chatMessages, setChatMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);
    const [chatLoading, setChatLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const [showExtra, setShowExtra] = useState(false);
    useEffect(() => {
        if (!isLoggedIn) return;
        getNotices().then(setNotices).catch(() => {});
        getHomeConfig().then(setHomeConfig).catch(() => {});
    }, [isLoggedIn]);

    // LMS 諛붾줈媛湲? role???곕씪 援먯닔(PLM)/?숈깮쨌議몄뾽??SLM) 吏꾩엯?먯쑝濡?遺꾧린 (洹?????븷? LMS ?섏씠吏 ?놁쓬)
    const lmsHref =
        role === ROLE.PROF ? "/lms/professor/profile"
        : role === ROLE.STU || role === ROLE.ALU ? "/lms/student/profile"
        : undefined;

    const timeStr = now ? now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: true }) : "";
    const dateStr = now ? `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}` : "";
    const dayStr = now ? `${now.getMonth() + 1}/${now.getDate()} (${WEEKDAYS[now.getDay()]})` : "";

    const handleLogout = async () => {
        await logoutAction();
        router.refresh();
    };

    // 濡쒓렇???꾩슂??湲곕뒫 ?대┃ ??
    const requireLogin = (e: React.MouseEvent) => {
        if (!isLoggedIn) {
            e.preventDefault();
            router.push("/home/login");
        }
    };

    const handleChatSend = async () => {
        const msg = chatInput.trim();
        if (!msg || chatLoading) return;
        setChatMessages((prev) => [...prev, { role: "user", text: msg }, { role: "ai", text: "" }]);
        setChatInput("");
        setChatLoading(true);
        try {
            for await (const token of streamChatMessage(msg)) {
                setChatMessages((prev) => {
                    const last = prev[prev.length - 1];
                    return [...prev.slice(0, -1), { ...last, text: last.text + token }];
                });
            }
        } catch (e) {
            if (e instanceof Error && e.message === "UNAUTHORIZED") {
                router.push("/home/login");
                return;
            }
            setChatMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last.role === "ai" && last.text.length > 0) return prev;
                console.error("[AI stream error]", e);
                return [...prev.slice(0, -1), { ...last, text: "二꾩넚?댁슂, ?듬???媛?몄삤吏 紐삵뻽?댁슂." }];
            });
        } finally {
            setChatLoading(false);
        }
    };

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatMessages, chatLoading]);

    return (
        <div className="min-h-screen bg-slate-50">
            {/* ?ㅻ뜑 */}
            <header className="sticky top-0 z-40 border-b border-border bg-white/95 shadow-sm backdrop-blur">
                <div className="mx-auto max-w-[1180px] flex items-center justify-between h-14 px-5">
                    <div className="flex items-center gap-2">
                        <Link href="/home" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="font-extrabold text-slate-900 tracking-tight hover:opacity-75 transition-opacity">
                            {univName ?? 'Univ쨌us'}
                        </Link>
                    </div>

                    {isInitialized && isLoggedIn && (
                        <div className="flex items-center gap-4 text-sm">
                            <span className="text-slate-500 hidden sm:inline">{memberName}??/span>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                <span className="hidden sm:inline">濡쒓렇?꾩썐</span>
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* ?덉뼱濡?諛곕꼫 */}
            <div className="bg-slate-50 px-5 pt-5">
                <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 rounded-2xl border border-primary/10 bg-gradient-to-r from-primary/5 via-teal-50 to-blue-50 px-5 py-7 text-slate-900 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md sm:px-8">
                    <div>
                        <p className="mb-1.5 text-xs font-bold text-primary/80">{univName ?? 'Univ쨌us'} ?듯빀 ?ы꽭</p>
                        <h1 className="text-xl sm:text-2xl font-extrabold leading-tight">
                            ?ㅻ뒛??罹좏띁?ㅼ쓽 紐⑤뱺 寃껋쓣 ??怨녹뿉???몝
                        </h1>
                    </div>
                    <div className="text-right hidden md:block shrink-0">
                        {homeConfig.weather && (weather ? (
                            <div className="mb-1 flex items-center justify-end gap-2 text-sm text-slate-500">
                                <img
                                    src={`https://openweathermap.org/img/wn/${weather.icon}.png`}
                                    alt={weather.description}
                                    className="w-6 h-6"
                                />
                                <span className="font-bold text-primary">{weather.temp}째</span>
                                <span className="text-slate-300">|</span>
                                <span>{weather.description} 쨌 {weather.city}</span>
                            </div>
                        ) : (
                            <div className="mb-1 flex items-center justify-end gap-2 text-sm text-slate-500">
                                <Sun className="w-4 h-4 text-amber-400" />
                                <span>?좎뵪 遺덈윭?ㅻ뒗 以?..</span>
                            </div>
                        ))}
                        <p className="text-2xl font-black tracking-tight">{timeStr}</p>
                        <p className="mt-0.5 text-xs text-slate-400">{dateStr}</p>
                    </div>
                </div>
            </div>

            {/* 硫붿씤 而⑦뀗痢?*/}
            <div className="mx-auto grid max-w-[1180px] grid-cols-1 gap-5 px-5 py-5 lg:grid-cols-3">

                {/* ?쇱そ 而щ읆 */}
                <div className="lg:col-span-2 flex flex-col gap-5">

                    {/* 諛붾줈媛湲?*/}
                    {homeConfig.shortcut && <section className="rounded-2xl border border-border bg-white p-5 shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-md">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-extrabold text-slate-800 text-sm">諛붾줈媛湲?/h2>
                            <button
                                onClick={() => { if (!isLoggedIn) { router.push("/home/login"); return; } setShowExtra((v) => !v); }}
                                className={`text-xs transition-colors ${showExtra ? "text-primary font-semibold" : "text-slate-400 hover:text-slate-600"}`}
                            >
                                {showExtra ? "?リ린" : "More"}
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

                                const resolvedHref =
                                    s.label === "?숆탳?? ? (schoolInfo?.homepage ?? undefined)
                                    : s.label === "LMS" ? lmsHref
                                    : s.label === "?숆탳 SNS" ? (schoolInfo?.snsUrl ?? undefined)
                                    : s.label === "YouTube" ? (schoolInfo?.youtubeUrl ?? undefined)
                                    : s.label === "?숈븘由? ? (schoolInfo?.clubUrl ?? undefined)
                                    : s.href;
                                const handleClick = () => {
                                    if (!isLoggedIn) { router.push("/home/login"); return; }
                                    // LMS????븷 ?놁쑝硫?援먯닔쨌?숈깮쨌議몄뾽???? 媛?쒖? ?숈씪 臾멸뎄濡??덈궡 ??臾대컲??諛⑹?
                                    if (s.label === "LMS" && !resolvedHref) {
                                        window.alert("LMS ?묎렐 沅뚰븳???놁뒿?덈떎.");
                                        return;
                                    }
                                    if (!resolvedHref) return;
                                    if (resolvedHref.startsWith("http")) {
                                        window.open(resolvedHref, "_blank", "noopener,noreferrer");
                                    } else {
                                        router.push(resolvedHref);
                                    }
                                };
                                return (
                                    <button key={s.label} onClick={handleClick} className="flex flex-col items-center gap-2 group">
                                        {iconEl}{labelEl}
                                    </button>
                                );
                            })}
                        </div>
                    </section>}

                    {/* AI 梨쀫큸 */}
                    {homeConfig.aiChat && <section className="rounded-2xl border border-border bg-white p-5 shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-md">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="font-extrabold text-slate-800 text-sm">AI 梨쀫큸</h2>
                            <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
                                Groq 쨌 llama-3.1
                            </span>
                        </div>

                        {/* 硫붿떆吏 ?곸뿭 */}
                        <div className="flex flex-col gap-2 mb-3 max-h-64 overflow-y-auto">
                            {chatMessages.length === 0 && (
                                <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600 leading-relaxed">
                                    ?덈뀞?섏꽭?? ?좊땲踰꾩뒪 AI ?꾩슦誘몄뿉?? 沅곴툑??嫄?臾쇱뼱蹂댁꽭???쨺
                                </div>
                            )}
                            {chatMessages.map((m, i) => (
                                <div
                                    key={i}
                                    className={`rounded-lg px-3 py-2 text-sm leading-relaxed max-w-[85%] ${
                                        m.role === "user"
                                            ? "bg-primary text-white self-end"
                                            : "bg-slate-50 text-slate-700 self-start"
                                    }`}
                                >
                                    {m.text}
                                </div>
                            ))}
                            {chatLoading && chatMessages[chatMessages.length - 1]?.text === "" && (
                                <div className="bg-slate-50 rounded-lg px-3 py-2 text-sm text-slate-400 self-start animate-pulse">
                                    ?듬? ?앹꽦 以?..
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* 異붿쿇 吏덈Ц */}
                        {chatMessages.length === 0 && (
                            <div className="flex gap-2 mb-3 flex-wrap">
                                {["?ㅻ뒛 ?좎뵪 ?대븣?", "理쒓렐 怨듭??ы빆 ?뚮젮以?, "?숆탳 ???踰덊샇媛 萸먯빞?"].map((q) => (
                                    <button
                                        key={q}
                                        onClick={(e) => {
                                            if (!isLoggedIn) { requireLogin(e); return; }
                                            setChatInput(q);
                                        }}
                                        className="text-xs border border-slate-200 rounded-full px-3 py-1 hover:bg-slate-50 text-slate-600 transition-colors"
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* ?낅젰李?*/}
                        <div className="flex gap-2">
                            <input
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (isLoggedIn) handleChatSend(); } }}
                                onFocus={(e) => { if (!isLoggedIn) { e.target.blur(); router.push("/home/login"); } }}
                                placeholder={isLoggedIn ? "臾댁뾿??沅곴툑?섏떊媛??" : "濡쒓렇?????댁슜?????덉뼱??}
                                readOnly={!isLoggedIn}
                                disabled={chatLoading}
                                className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary/30 transition disabled:opacity-50"
                            />
                            <button
                                onClick={() => { if (isLoggedIn) handleChatSend(); else router.push("/home/login"); }}
                                disabled={chatLoading || !chatInput.trim()}
                                className="bg-primary text-white rounded-lg px-3 py-2 hover:opacity-90 transition disabled:opacity-40"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </section>}

                    {/* 援먮궡 ?꾪솕踰덊샇 */}
                    {homeConfig.tel && <section className="rounded-2xl border border-border bg-white p-5 shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-md">
                        <h2 className="font-extrabold text-slate-800 text-sm mb-4">援먮궡 ?꾪솕踰덊샇</h2>
                        {schoolInfo ? (
                            <a
                                href={`tel:${schoolInfo.schoolPhone}`}
                                className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 hover:bg-slate-100 transition-colors"
                            >
                                <span className="text-sm font-semibold text-slate-700">{schoolInfo.schoolName} ??쒕쾲??/span>
                                <span className="text-sm text-primary font-bold">{schoolInfo.schoolPhone}</span>
                            </a>
                        ) : (
                            <div className="rounded-lg bg-slate-50 px-4 py-3">
                                <span className="text-sm text-slate-400">
                                    {isLoggedIn ? "?꾪솕踰덊샇 ?뺣낫瑜?遺덈윭?ㅻ뒗 以?.." : "濡쒓렇?????뺤씤?????덉뼱??"}
                                </span>
                            </div>
                        )}
                        <p className="text-[11px] text-slate-400 mt-3">???몃? ?꾪솕踰덊샇???숆탳 ?덊럹?댁?瑜??뺤씤?섏꽭??</p>
                    </section>}

                    {/* ?숆탳 ?좏뒠釉?쨌 ?숈븘由?*/}
                    <div className="grid grid-cols-2 gap-3">
                        <a
                            href={isLoggedIn && schoolInfo?.youtubeUrl ? schoolInfo.youtubeUrl : undefined}
                            onClick={!isLoggedIn ? requireLogin : undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex flex-col gap-2 rounded-2xl border border-border bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                        >
                            <div className="w-9 h-9 rounded-xl bg-red-500 flex items-center justify-center text-white">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                            </div>
                            <span className="text-xs font-extrabold text-slate-800">?숆탳 ?좏뒠釉?/span>
                            <span className="text-[11px] font-semibold text-primary">諛붾줈媛湲???/span>
                        </a>
                        <a
                            href={isLoggedIn && schoolInfo?.clubUrl ? schoolInfo.clubUrl : undefined}
                            onClick={!isLoggedIn ? requireLogin : undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex flex-col gap-2 rounded-2xl border border-border bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                        >
                            <div className="w-9 h-9 rounded-xl bg-violet-500 flex items-center justify-center text-white">
                                <GraduationCap className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-extrabold text-slate-800">?숈븘由?/span>
                            <span className="text-[11px] font-semibold text-primary">諛붾줈媛湲???/span>
                        </a>
                    </div>
                </div>

                {/* ?ㅻⅨ履?而щ읆 */}
                <div className="flex flex-col gap-5">

                    {/* 濡쒓렇??移대뱶 */}
                    {isInitialized && !isLoggedIn && (
                        <section className="rounded-2xl border border-border bg-white p-5 shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-md">
                            <p className="text-xs text-slate-500 mb-4">
                                濡쒓렇?명븯硫?罹좏띁?ㅼ쓽 紐⑤뱺 ?쒕퉬?ㅻ? ?댁슜?????덉뼱??
                            </p>
                            <Link
                                href="/home/login"
                                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-bold text-white transition hover:opacity-90"
                            >
                                <LogIn className="w-4 h-4" />
                                濡쒓렇??/ ?뚯썝媛??
                            </Link>
                        </section>
                    )}

                    {/* 愿由ъ옄 ??쒕낫??諛붾줈媛湲?*/}
                    {isInitialized && isLoggedIn && role === "ADM" && (
                        <Link
                            href="/dashboard/school-admin"
                            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-teal-700 px-5 py-3.5 shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
                        >
                            <div className="absolute -right-5 -top-5 size-28 rounded-full bg-white/5" />
                            <div className="absolute -right-3 -bottom-8 size-36 rounded-full bg-white/5" />
                            <div className="relative">
                                <div className="flex items-center justify-between mb-2.5">
                                    <span className="text-[10px] font-black tracking-widest text-emerald-300/60 uppercase">School Admin</span>
                                    <div className="flex size-7 items-center justify-center rounded-lg bg-white/10">
                                        <LayoutDashboard className="w-3.5 h-3.5 text-white" />
                                    </div>
                                </div>
                                <p className="text-white font-black text-base leading-snug">愿由ъ옄<br />??쒕낫??/p>
                                <p className="mt-2 flex items-center gap-1 text-emerald-300 text-xs font-bold">
                                    ?대룞?섍린
                                    <span className="inline-block group-hover:translate-x-1 transition-transform">??/span>
                                </p>
                            </div>
                        </Link>
                    )}

                    {/* 理쒓렐 怨듭? */}
                    {homeConfig.notice && <section className="rounded-2xl border border-border bg-white p-5 shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-md">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="font-extrabold text-slate-800 text-sm">理쒓렐 怨듭?</h2>
                            {isLoggedIn && (
                                <Link href="/home/notices" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
                                    ?붾낫湲?
                                </Link>
                            )}
                        </div>
                        {!isLoggedIn ? (
                            <p className="text-sm text-slate-400">濡쒓렇?????뺤씤?????덉뼱??</p>
                        ) : notices.length === 0 ? (
                            <p className="text-sm text-slate-400">?깅줉??怨듭?媛 ?놁뼱??</p>
                        ) : (
                            <ul className="divide-y divide-slate-100">
                                {notices.slice(0, 6).map((n) => (
                                    <li
                                        key={n.noticeId}
                                        onClick={() => setSelectedNotice(n)}
                                        className="flex items-center gap-2 py-2 text-xs cursor-pointer hover:bg-slate-50 rounded transition-colors"
                                    >
                                        <span className="shrink-0 bg-slate-100 text-slate-500 rounded px-1.5 py-0.5 font-semibold">
                                            怨듭?
                                        </span>
                                        <span className="flex-1 text-slate-700 truncate">{n.title}</span>
                                        <span className="shrink-0 text-slate-400">
                                            {(() => { const d = new Date(n.postedAt); return `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`; })()}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>}

                    {/* ?ㅻ뒛???숈떇 */}
                    {homeConfig.meal && <section className="rounded-2xl border border-border bg-white p-5 shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-md">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Utensils className="w-4 h-4 text-primary" />
                                <h2 className="font-extrabold text-slate-800 text-sm">?ㅻ뒛???숈떇</h2>
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
                                        {meal.items.join(" 쨌 ")}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>}
                </div>
            </div>


            {/* 怨듭? ?곸꽭 紐⑤떖 */}
            {selectedNotice && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
                    onClick={() => setSelectedNotice(null)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 flex flex-col gap-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <h3 className="font-extrabold text-slate-800 text-base leading-snug">{selectedNotice.title}</h3>
                            <button onClick={() => setSelectedNotice(null)} className="shrink-0 text-slate-400 hover:text-slate-700 transition-colors text-lg leading-none">??/button>
                        </div>
                        <p className="text-xs text-slate-400">
                            {selectedNotice.memberName} 쨌 {(() => { const d = new Date(selectedNotice.postedAt); return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`; })()}
                        </p>
                        <div className="border-t border-slate-100 pt-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                            {selectedNotice.content}
                        </div>
                    </div>
                </div>
            )}

            {/* ?명꽣 */}
            {schoolInfo?.address && (
                <footer className="border-t border-slate-200 bg-white mt-2">
                    <div className="mx-auto max-w-[1180px] px-5 py-4 text-center text-[11px] text-slate-400">
                        {univName ?? schoolInfo.schoolName} 쨌 {schoolInfo.address}
                    </div>
                </footer>
            )}
        </div>
    );
}

