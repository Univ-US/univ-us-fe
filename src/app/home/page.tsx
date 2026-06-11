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
    Sun,
    Utensils,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { getUniversities, getNotices, Notice, sendChatMessage } from "@/lib/homeApi";
import api from "@/lib/api";

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
    const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
    const role = useAuthStore((s) => s.role);
    const memberName = useAuthStore((s) => s.memberName);
    const univId = useAuthStore((s) => s.univId);
    const univName = useAuthStore((s) => s.univName);
    const logoutAction = useAuthStore((s) => s.logoutAction);

    const now = useNow();
    const weather = useWeather();
    const schoolInfo = useSchoolInfo(isLoggedIn, univId);
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
    }, [isLoggedIn]);

    // LMS 바로가기: role에 따라 교수(PLM)/학생(SLM) 진입점으로 분기 (그 외 역할은 LMS 페이지 없음)
    const lmsHref =
        role === "PROF" ? "/lms/professor/profile" : role === "STU" ? "/lms/student/profile" : undefined;

    const timeStr = now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: true });
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`;
    const dayStr = `${now.getMonth() + 1}/${now.getDate()} (${WEEKDAYS[now.getDay()]})`;

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
        setChatMessages((prev) => [...prev, { role: "user", text: msg }]);
        setChatInput("");
        setChatLoading(true);
        try {
            const answer = await sendChatMessage(msg);
            setChatMessages((prev) => [...prev, { role: "ai", text: answer }]);
        } catch {
            setChatMessages((prev) => [...prev, { role: "ai", text: "죄송해요, 답변을 가져오지 못했어요." }]);
        } finally {
            setChatLoading(false);
        }
    };

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatMessages, chatLoading]);

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

                                const resolvedHref =
                                    s.label === "학교홈" ? (schoolInfo?.homepage ?? undefined)
                                    : s.label === "LMS" ? lmsHref
                                    : s.href;
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
                    <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
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
                            {chatLoading && (
                                <div className="bg-slate-50 rounded-lg px-3 py-2 text-sm text-slate-400 self-start animate-pulse">
                                    답변 생성 중...
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* 추천 질문 */}
                        {chatMessages.length === 0 && (
                            <div className="flex gap-2 mb-3 flex-wrap">
                                {["도서관 운영시간", "오늘 학식 메뉴", "스터디룸 예약 방법"].map((q) => (
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
                    <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="font-extrabold text-slate-800 text-sm">최근 공지</h2>
                            {isLoggedIn && (
                                <Link href="/home/notices" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
                                    더보기
                                </Link>
                            )}
                        </div>
                        {!isLoggedIn ? (
                            <p className="text-sm text-slate-400">로그인 후 확인할 수 있어요.</p>
                        ) : notices.length === 0 ? (
                            <p className="text-sm text-slate-400">등록된 공지가 없어요.</p>
                        ) : (
                            <ul className="divide-y divide-slate-100">
                                {notices.slice(0, 6).map((n) => (
                                    <li
                                        key={n.noticeId}
                                        onClick={() => setSelectedNotice(n)}
                                        className="flex items-center gap-2 py-2 text-xs cursor-pointer hover:bg-slate-50 rounded transition-colors"
                                    >
                                        <span className="shrink-0 bg-slate-100 text-slate-500 rounded px-1.5 py-0.5 font-semibold">
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
