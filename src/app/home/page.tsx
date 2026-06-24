"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    BookOpen,
    Briefcase,
    ClipboardList,
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
import { getStudentCalendar } from "@/lib/lmsStudentCalendarApi";
import type { CalendarEvent } from "@/types/lmsStudentCalendar";
import { getProfessorCalendar } from "@/lib/lmsProfessorCalendarApi";
import api from "@/lib/api";
import { ROLE } from "@/lib/rolecode";
import PolicyModal, { type PolicyType } from "@/components/common/PolicyModal";

const DEFAULT_CONFIG: HomeWidgetConfig = {
    weather: true, aiChat: true, notice: true, meal: true, tel: true, shortcut: true,
};

const BASE_SHORTCUTS = [
    { label: "도서관", icon: BookOpen, bg: "bg-gradient-to-br from-teal-400 to-teal-600" },
    { label: "증명서발급", icon: FileText, bg: "bg-gradient-to-br from-sky-400 to-sky-600", href: "https://www.certpia.com" },
    { label: "학교홈", icon: GraduationCap, bg: "bg-gradient-to-br from-slate-600 to-slate-800" },
    { label: "시설 이용", icon: Monitor, bg: "bg-gradient-to-br from-violet-400 to-violet-600" },
    { label: "캠퍼스앱", icon: Smartphone, bg: "bg-gradient-to-br from-emerald-400 to-emerald-600", href: "/home" },
    { label: "Office 365", icon: Cloud, bg: "bg-gradient-to-br from-red-400 to-red-600", href: "https://www.office.com" },
    { label: "학교 SNS", icon: Hash, bg: "bg-gradient-to-br from-fuchsia-400 to-fuchsia-600" },
    { label: "YouTube", icon: Play, bg: "bg-gradient-to-br from-rose-500 to-red-600" },
    { label: "동아리", icon: Users, bg: "bg-gradient-to-br from-amber-400 to-orange-500" },
    { label: "커뮤니티", icon: MessageSquare, bg: "bg-gradient-to-br from-cyan-400 to-cyan-600", href: "/community" },
    { label: "LMS", icon: LayoutDashboard, bg: "bg-gradient-to-br from-indigo-400 to-indigo-600", href: "#" },
    { label: "수강신청", icon: ClipboardList, bg: "bg-gradient-to-br from-lime-400 to-green-600", href: "#" },
];

const EXTRA_SHORTCUTS = [
    { label: "취업정보", icon: Briefcase, bg: "bg-gradient-to-br from-orange-400 to-orange-600", href: "https://www.jobkorea.co.kr" },
];


const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

//mock data
const MOCK_MEALS = [
    { type: "조식", time: "07:30 ~ 09:00", items: ["된장찌개", "공기밥", "계란후라이", "깍두기", "배추김치"] },
    { type: "중식", time: "11:30 ~ 13:30", items: ["부대찌개", "공기밥", "잡채", "미역국", "배추김치", "과일"]},
    { type: "석식", time: "17:30 ~ 19:00", items: ["김치찌개", "공기밥", "두부조림", "콩나물무침", "배추김치"] },
];

function toYMD(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const TIMETABLE_DAYS = ["월", "화", "수", "목", "금"];
const TIMETABLE_SLOT_MIN = 30;
const TIMETABLE_COLORS = [
    "bg-primary/15 text-primary",
    "bg-amber-100 text-amber-700",
    "bg-violet-100 text-violet-700",
    "bg-rose-100 text-rose-700",
    "bg-primary/10 text-primary",
    "bg-sky-100 text-sky-700",
];

function getWeekRange(base: Date) {
    const day = base.getDay(); // 0=일 ~ 6=토
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(base);
    monday.setDate(base.getDate() + mondayOffset);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    return { monday, friday };
}

function parseTimeToMinutes(t: string): number {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
}

function dateToWeekdayIndex(dateStr: string): number | null {
    const day = new Date(dateStr).getDay(); // 0=일 ~ 6=토
    if (day < 1 || day > 5) return null;
    return day - 1; // 0=월 ~ 4=금
}

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
    const [policyModal, setPolicyModal] = useState<PolicyType | null>(null);
    const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
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

    // LMS 바로가기: role에 따라 교수(PLM)/학생·졸업생(SLM) 진입점으로 분기 (그 외 역할은 LMS 페이지 없음)
    // 교수 진입점 = 강의 내역(PLM-002) — 프로필이 아닌 LMS 메인 화면으로 진입
    const lmsHref =
        role === ROLE.PROF ? "/lms/professor/courses"
        : role === ROLE.STU || role === ROLE.ALU ? "/lms/student/dashboard"
        : undefined;

    const isLmsRole = role === ROLE.STU || role === ROLE.ALU || role === ROLE.PROF;

    useEffect(() => {
        if (!isLoggedIn || !isLmsRole) return;
        const { monday, friday } = getWeekRange(new Date());
        const params = { from: toYMD(monday), to: toYMD(friday) };
        const fetcher = role === ROLE.PROF ? getProfessorCalendar : getStudentCalendar;
        fetcher(params).then(setCalendarEvents).catch(() => {});
    }, [isLoggedIn, isLmsRole, role]);

    const lectures = calendarEvents.filter((e) => e.type === "LECTURE" && e.time);

    const { startHour, endHour } = (() => {
        if (lectures.length === 0) return { startHour: 9, endHour: 18 };
        let minMin = Infinity, maxMin = -Infinity;
        lectures.forEach((e) => {
            const s = parseTimeToMinutes(e.time!);
            const en = e.endTime ? parseTimeToMinutes(e.endTime) : s + 60;
            minMin = Math.min(minMin, s);
            maxMin = Math.max(maxMin, en);
        });
        return {
            startHour: Math.min(9, Math.floor(minMin / 60)),
            endHour: Math.max(18, Math.ceil(maxMin / 60)),
        };
    })();
    const totalSlots = ((endHour - startHour) * 60) / TIMETABLE_SLOT_MIN;
    const hourLabels = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
    const todayColIdx = isLoggedIn ? dateToWeekdayIndex(toYMD(new Date())) : null;

    const timeStr = now ? now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: true }) : "";
    const dateStr = now ? `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}` : "";
    const dayStr = now ? `${now.getMonth() + 1}/${now.getDate()} (${WEEKDAYS[now.getDay()]})` : "";

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
                return [...prev.slice(0, -1), { ...last, text: "죄송해요, 답변을 가져오지 못했어요." }];
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
            {/* 헤더 */}
            <header className="sticky top-0 z-40 border-b border-border bg-white/95 shadow-sm backdrop-blur">
                <div className="mx-auto max-w-[1180px] flex items-center justify-between h-14 px-5">
                    <div className="flex items-center gap-2">
                        <Link href="/home" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="font-extrabold text-slate-900 tracking-tight hover:opacity-75 transition-opacity">
                            {univName ?? 'Univ·us'}
                        </Link>
                    </div>

                    {isInitialized && isLoggedIn && (
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
            <div className="mx-auto max-w-[1180px] bg-slate-50 px-5 pt-5">
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-primary/15 bg-[linear-gradient(135deg,rgba(15,168,150,0.16)_0%,rgba(255,255,255,0.92)_44%,rgba(204,251,241,0.32)_100%)] px-5 py-8 text-slate-900 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md sm:px-8">
                    <div>
                        <p className="mb-1.5 text-xs font-bold text-primary/80">{univName ?? 'Univ·us'} 통합 포털</p>
                        <h1 className="text-xl sm:text-2xl font-extrabold leading-tight">
                            오늘의 캠퍼스 일정을 한눈에 확인하세요
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
                                <span className="font-bold text-primary">{weather.temp}°</span>
                                <span className="text-slate-300">|</span>
                                <span>{weather.description} · {weather.city}</span>
                            </div>
                        ) : (
                            <div className="mb-1 flex items-center justify-end gap-2 text-sm text-slate-500">
                                <Sun className="w-4 h-4 text-amber-400" />
                                <span>날씨 불러오는 중...</span>
                            </div>
                        ))}
                        <p className="text-2xl font-black tracking-tight">{timeStr}</p>
                        <p className="mt-0.5 text-xs text-slate-400">{dateStr}</p>
                    </div>
                </div>
            </div>

            {/* 메인 컨텐츠 */}
            <div className="mx-auto grid max-w-[1180px] grid-cols-1 gap-5 px-5 py-5 lg:grid-cols-3">

                {/* 왼쪽 컬럼 */}
                <div className="lg:col-span-2 flex flex-col gap-5">

                    {/* 바로가기 */}
                    {homeConfig.shortcut && <section className="rounded-2xl border border-border bg-white p-5 shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-md">
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
                                    <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center text-white shadow-[0_10px_18px_rgba(15,23,42,0.16),inset_0_1px_0_rgba(255,255,255,0.28)] ring-1 ring-white/40 transition-transform group-hover:-translate-y-0.5 group-hover:scale-105`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                );
                                const labelEl = <span className="text-[10px] text-slate-600 text-center leading-tight">{s.label}</span>;

                                const resolvedHref =
                                    s.label === "학교홈" ? (schoolInfo?.homepage ?? undefined)
                                    : s.label === "LMS" ? lmsHref
                                    : s.label === "수강신청" ? (role === ROLE.STU || role === ROLE.ALU ? "/home/enroll" : undefined)
                                    : s.label === "시설 이용" ? "/community/reservation/"
                                    : s.label === "학교 SNS" ? (schoolInfo?.snsUrl ?? undefined)
                                    : s.label === "YouTube" ? (schoolInfo?.youtubeUrl ?? undefined)
                                    : s.label === "동아리" ? (schoolInfo?.clubUrl ?? undefined)
                                    : s.href;
                                const handleClick = () => {
                                    if (!isLoggedIn) { router.push("/home/login"); return; }
                                    // LMS는 역할 없으면(교수·학생·졸업생 외) 가드와 동일 문구로 안내 — 무반응 방지
                                    if (s.label === "LMS" && !resolvedHref) {
                                        window.alert("LMS 접근 권한이 없습니다.");
                                        return;
                                    }
                                    if (s.label === "수강신청" && !resolvedHref) {
                                        window.alert("수강신청은 학생만 이용할 수 있습니다.");
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

                    {/* AI 챗봇 */}
                    {homeConfig.aiChat && <section className="rounded-2xl border border-border bg-white p-5 shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-md">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="font-extrabold text-slate-800 text-sm">AI 챗봇</h2>
                            <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
                                Groq · llama-3.1
                            </span>
                        </div>

                        {/* 메시지 영역 */}
                        <div className="flex flex-col gap-2 mb-3 max-h-64 overflow-y-auto">
                            {chatMessages.length === 0 && (
                                <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600 leading-relaxed">
                                    안녕하세요! 유니버스 AI 도우미에요. 궁금한 걸 물어보세요 🤔
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
                                    답변 생성 중...
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* 추천 질문 */}
                        {chatMessages.length === 0 && (
                            <div className="flex gap-2 mb-3 flex-wrap">
                                {["오늘 날씨 어때?", "최근 공지사항 알려줘", "학교 대표 번호가 뭐야?"].map((q) => (
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

                        {/* 입력창 */}
                        <div className="flex gap-2">
                            <input
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (isLoggedIn) handleChatSend(); } }}
                                onFocus={(e) => { if (!isLoggedIn) { e.target.blur(); router.push("/home/login"); } }}
                                placeholder={isLoggedIn ? "무엇이 궁금하신가요?" : "로그인 후 이용할 수 있어요"}
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

                    {/* 교내 전화번호 */}
                    {homeConfig.tel && <section className="rounded-2xl border border-border bg-white p-5 shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-md">
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
                    </section>}

                    {/* 학교 유튜브 · 동아리 */}
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
                            <span className="text-xs font-extrabold text-slate-800">학교 유튜브</span>
                            <span className="text-[11px] font-semibold text-primary">바로가기 →</span>
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
                            <span className="text-xs font-extrabold text-slate-800">동아리</span>
                            <span className="text-[11px] font-semibold text-primary">바로가기 →</span>
                        </a>
                    </div>
                </div>

                {/* 오른쪽 컬럼 */}
                <div className="flex flex-col gap-5">

                    {/* 로그인 카드 */}
                    {isInitialized && !isLoggedIn && (
                        <section className="rounded-2xl border border-border bg-white p-5 shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-md">
                            <p className="text-xs text-slate-500 mb-4">
                                로그인하면 캠퍼스의 모든 서비스를 이용할 수 있어요.
                            </p>
                            <Link
                                href="/home/login"
                                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-bold text-white transition hover:opacity-90"
                            >
                                <LogIn className="w-4 h-4" />
                                로그인 / 회원가입
                            </Link>
                        </section>
                    )}

                    {/* 관리자 대시보드 바로가기 */}
                    {isInitialized && isLoggedIn && role === "ADM" && (
                        <Link
                            href="/dashboard/school-admin"
                            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/90 px-5 py-3.5 shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
                        >
                            <div className="absolute -right-5 -top-5 size-28 rounded-full bg-white/5" />
                            <div className="absolute -right-3 -bottom-8 size-36 rounded-full bg-white/5" />
                            <div className="relative">
                                <div className="flex items-center justify-between mb-2.5">
                                    <span className="text-[10px] font-black tracking-widest text-primary-foreground/60 uppercase">School Admin</span>
                                    <div className="flex size-7 items-center justify-center rounded-lg bg-white/10">
                                        <LayoutDashboard className="w-3.5 h-3.5 text-white" />
                                    </div>
                                </div>
                                <p className="text-white font-black text-base leading-snug">관리자<br />대시보드</p>
                                <p className="mt-2 flex items-center gap-1 text-primary/40 text-xs font-bold">
                                    이동하기
                                    <span className="inline-block group-hover:translate-x-1 transition-transform">→</span>
                                </p>
                            </div>
                        </Link>
                    )}

                    {/* 미니 시간표 (학생/졸업생/교수 전용, 항상 노출) */}
                    {isLoggedIn && isLmsRole && (
                        <section className="rounded-2xl border border-border bg-white p-5 shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-md">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="font-extrabold text-slate-800 text-sm">이번 주 시간표</h2>
                                <Link
                                    href={role === ROLE.PROF ? "/lms/professor/calendar" : "/lms/student/calendar"}
                                    className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    더보기
                                </Link>
                            </div>
                            {lectures.length === 0 ? (
                                <p className="text-sm text-slate-400">등록된 강의가 없어요.</p>
                            ) : (
                                <div
                                    className="grid text-[10px]"
                                    style={{
                                        gridTemplateColumns: "28px repeat(5, 1fr)",
                                        gridTemplateRows: `16px repeat(${totalSlots}, 14px)`,
                                    }}
                                >
                                    {/* 요일 헤더 */}
                                    <div />
                                    {TIMETABLE_DAYS.map((d, i) => (
                                        <div
                                            key={d}
                                            className={`flex items-center justify-center font-bold ${todayColIdx === i ? "text-primary" : "text-slate-500"}`}
                                            style={{ gridColumn: i + 2, gridRow: 1 }}
                                        >
                                            {d}
                                        </div>
                                    ))}

                                    {/* 시간 라벨 + 가로 구분선 */}
                                    {hourLabels.map((h) => {
                                        const rowStart = ((h - startHour) * 60) / TIMETABLE_SLOT_MIN + 2;
                                        return (
                                            <Fragment key={h}>
                                                <div
                                                    className="border-t border-slate-100 pr-1 text-right text-slate-400 leading-none"
                                                    style={{ gridColumn: 1, gridRow: rowStart }}
                                                >
                                                    {h}
                                                </div>
                                                <div
                                                    className="border-t border-slate-100"
                                                    style={{ gridColumn: "2 / span 5", gridRow: rowStart }}
                                                />
                                            </Fragment>
                                        );
                                    })}

                                    {/* 오늘 컬럼 배경 */}
                                    {todayColIdx !== null && (
                                        <div
                                            className="bg-primary/5 rounded"
                                            style={{ gridColumn: todayColIdx + 2, gridRow: `2 / span ${totalSlots}` }}
                                        />
                                    )}

                                    {/* 강의 블록 */}
                                    {lectures.map((e, i) => {
                                        const dayIdx = dateToWeekdayIndex(e.date);
                                        if (dayIdx === null) return null;
                                        const start = parseTimeToMinutes(e.time!);
                                        const end = e.endTime ? parseTimeToMinutes(e.endTime) : start + 60;
                                        const rowStart = (start - startHour * 60) / TIMETABLE_SLOT_MIN + 2;
                                        const span = Math.max(1, (end - start) / TIMETABLE_SLOT_MIN);
                                        return (
                                            <div
                                                key={`${e.lecId}-${e.date}-${i}`}
                                                className={`m-px overflow-hidden rounded px-1 py-0.5 font-semibold leading-tight ${TIMETABLE_COLORS[e.lecId % TIMETABLE_COLORS.length]}`}
                                                style={{ gridColumn: dayIdx + 2, gridRow: `${rowStart} / span ${span}` }}
                                                title={`${e.title}${e.lecSection ? ` ${e.lecSection}반` : ""} ${e.time}~${e.endTime ?? ""}`}
                                            >
                                                <span className="block truncate">{e.title}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    )}

                    {/* 최근 공지 */}
                    {homeConfig.notice && <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-md">
                        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                            <h2 className="font-extrabold text-slate-800 text-sm">최근 공지</h2>
                            {isLoggedIn && (
                                <Link href="/home/notices" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
                                    더보기
                                </Link>
                            )}
                        </div>
                        {!isLoggedIn ? (
                            <p className="px-5 py-4 text-sm text-slate-400">로그인 후 확인할 수 있어요.</p>
                        ) : notices.length === 0 ? (
                            <p className="px-5 py-4 text-sm text-slate-400">등록된 공지가 없어요.</p>
                        ) : (
                            <ul className="divide-y divide-slate-100">
                                {notices.slice(0, 6).map((n) => (
                                    <li
                                        key={n.noticeId}
                                        onClick={() => setSelectedNotice(n)}
                                        className="flex min-h-9 cursor-pointer items-center gap-2 px-5 text-xs transition-colors hover:bg-slate-50"
                                    >
                                        <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-500">
                                            공지
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

                    {/* 오늘의 학식 */}
                    {homeConfig.meal && <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-md">
                        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                            <div className="flex items-center gap-2">
                                <Utensils className="w-4 h-4 text-amber-500" />
                                <h2 className="font-extrabold text-slate-800 text-sm">오늘의 학식</h2>
                            </div>
                            <span className="text-xs text-slate-400">{dayStr}</span>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {MOCK_MEALS.map((meal) => (
                                <div key={meal.type} className="px-5 py-3">
                                    <div className="mb-1.5 flex items-center justify-between gap-3">
                                        <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-extrabold text-amber-600">{meal.type}</span>
                                        <span className="shrink-0 text-[10px] font-semibold text-slate-400">{meal.time}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 leading-relaxed">
                                        {meal.items.join(" · ")}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>}
                </div>
            </div>


            {/* 공지 상세 모달 */}
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
                            <button onClick={() => setSelectedNotice(null)} className="shrink-0 text-slate-400 hover:text-slate-700 transition-colors text-lg leading-none">✕</button>
                        </div>
                        <p className="text-xs text-slate-400">
                            {selectedNotice.memberName} · {(() => { const d = new Date(selectedNotice.postedAt); return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`; })()}
                        </p>
                        <div className="border-t border-slate-100 pt-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                            {selectedNotice.content}
                        </div>
                    </div>
                </div>
            )}

            {/* 푸터 */}
            <footer className="border-t border-slate-200 bg-white mt-2">
                <div className="mx-auto max-w-[1180px] px-5 py-4 flex flex-col items-center gap-2 text-center text-[11px] text-slate-400">
                    {schoolInfo?.address && (
                        <span>{univName ?? schoolInfo.schoolName} · {schoolInfo.address}</span>
                    )}
                    <div className="flex gap-3 font-semibold text-slate-400">
                        <button type="button" onClick={() => setPolicyModal("terms")} className="hover:text-slate-600">
                            이용약관
                        </button>
                        <button type="button" onClick={() => setPolicyModal("privacy")} className="hover:text-slate-600">
                            개인정보처리방침
                        </button>
                    </div>
                </div>
            </footer>

            {policyModal && (
                <PolicyModal type={policyModal} onClose={() => setPolicyModal(null)} />
            )}
        </div>
    );
}
