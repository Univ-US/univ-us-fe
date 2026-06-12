"use client";

import { useEffect, useState } from "react";
import { Bot, Building2, Check, Cloud, Database, Grid2x2, Link2, Megaphone, Play, Save, Settings } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import {
    getAdminUniversity, updateAdminUniversityLinks, type ApiUniversity,
    getHomeWidgetConfig, updateHomeWidgetConfig, DEFAULT_WIDGET_CONFIG, type HomeWidgetConfig,
    getNoticeConfig, updateNoticeConfig, DEFAULT_NOTICE_CONFIG, type NoticeConfig,
} from "@/lib/adminApi";
import { Toggle } from "../_components";

export default function SettingsView() {
    const { univId } = useAuthStore();
    const [tab, setTab] = useState<"info" | "home" | "api">("info");
    const [university, setUniversity] = useState<ApiUniversity | null>(null);
    const [loading, setLoading] = useState(true);

    const [links, setLinks] = useState({ youtubeUrl: "", clubUrl: "", snsUrl: "" });
    const [linksSaving, setLinksSaving] = useState(false);
    const [linksSaved, setLinksSaved] = useState(false);

    const [widgets, setWidgets] = useState<HomeWidgetConfig>(DEFAULT_WIDGET_CONFIG);
    const [widgetsSaving, setWidgetsSaving] = useState(false);
    const [widgetsSaved, setWidgetsSaved] = useState(false);
    const [noticeConfig, setNoticeConfig] = useState<NoticeConfig>(DEFAULT_NOTICE_CONFIG);
    const [noticeSaving, setNoticeSaving] = useState(false);
    const [noticeSaved, setNoticeSaved] = useState(false);

    useEffect(() => {
        if (!univId) return;
        getHomeWidgetConfig(univId).then(setWidgets).catch(() => {});
        getNoticeConfig(univId).then(setNoticeConfig).catch(() => {});
    }, [univId]);

    useEffect(() => {
        if (!univId) return;
        getAdminUniversity(univId)
            .then((u) => {
                setUniversity(u);
                setLinks({
                    youtubeUrl: u.youtubeUrl ?? "",
                    clubUrl: u.clubUrl ?? "",
                    snsUrl: u.snsUrl ?? "",
                });
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [univId]);

    const handleSaveLinks = async () => {
        if (!univId) return;
        setLinksSaving(true);
        try {
            await updateAdminUniversityLinks(univId, {
                youtubeUrl: links.youtubeUrl || null,
                clubUrl: links.clubUrl || null,
                snsUrl: links.snsUrl || null,
            });
            setLinksSaved(true);
            setTimeout(() => setLinksSaved(false), 2000);
        } catch (e) {
            console.error(e);
        } finally {
            setLinksSaving(false);
        }
    };

    const apis = [
        { name: "OpenWeatherMap", desc: "날씨 위젯 API", connected: true, icon: Cloud },
        { name: "LLM API", desc: "AI 챗봇 언어모델", connected: true, icon: Bot },
        { name: "벡터DB (RAG)", desc: "학사 정보 검색 도메인 내 구축", connected: true, icon: Database },
        { name: "Office 365", desc: "SSO · 메일 연동", connected: false, icon: Grid2x2 },
    ];

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-2xl font-black tracking-tight">학교 설정</h1>
                <p className="mt-1 text-sm text-slate-500">학교 기본 정보와 홈 화면 구성, 외부 서비스 연동을 관리합니다.</p>
            </div>

            <div className="flex gap-1 border-b border-slate-200">
                {([
                    { key: "info", label: "학교 정보", icon: Building2 },
                    { key: "home", label: "홈 화면 구성", icon: Grid2x2 },
                    { key: "api", label: "연동·API", icon: Link2 },
                ] as const).map(({ key, label, icon: Icon }) => (
                    <button
                        key={key}
                        onClick={() => setTab(key)}
                        className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-bold transition-colors ${tab === key ? "border-emerald-700 text-emerald-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}
                    >
                        <Icon className="size-4" /> {label}
                    </button>
                ))}
            </div>

            {tab === "info" && (
                <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
                    <div className="space-y-5">
                        <section className="rounded-2xl border border-emerald-900/10 bg-white p-6 shadow-sm">
                            <div className="flex items-center gap-2 text-sm font-extrabold text-slate-500">
                                <Building2 className="size-4" /> 기본 정보
                            </div>
                            <p className="mt-1 text-xs text-slate-400">홈-로그인 화면에 노출되는 학교 정보입니다.</p>

                            {loading ? (
                                <p className="mt-6 text-sm text-slate-400">불러오는 중...</p>
                            ) : (
                                <div className="mt-5 space-y-4">
                                    {[
                                        { label: "학교명", value: university?.univName ?? "—" },
                                        { label: "대표 전화", value: university?.schoolPhone ?? "—" },
                                        { label: "홈페이지", value: university?.homepage ?? "—" },
                                        { label: "주소", value: university?.address ?? "—" },
                                    ].map(({ label, value }) => (
                                        <div key={label}>
                                            <p className="text-xs font-black text-slate-500">{label}</p>
                                            <p className="mt-1 rounded-lg border border-border bg-slate-50 px-3 py-2.5 text-sm">{value}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <p className="mt-4 text-xs text-slate-400">
                                학교 기본 정보 변경은 서비스 관리자에게 문의해 주세요.
                            </p>
                        </section>

                        <section className="rounded-2xl border border-emerald-900/10 bg-white p-6 shadow-sm">
                            <div className="flex items-center gap-2 text-sm font-extrabold text-slate-500">
                                <Play className="size-4" /> 링크·바로가기
                            </div>
                            <p className="mt-1 text-xs text-slate-400">학생 홈 화면 바로가기 타일에 연결됩니다.</p>
                            <div className="mt-5 space-y-4">
                                {([
                                    { key: "youtubeUrl", label: "YouTube 채널", placeholder: "https://youtube.com/@..." },
                                    { key: "clubUrl", label: "동아리 사이트", placeholder: "https://..." },
                                    { key: "snsUrl", label: "학교 SNS", placeholder: "https://instagram.com/..." },
                                ] as const).map(({ key, label, placeholder }) => (
                                    <div key={key}>
                                        <p className="text-xs font-black text-slate-500">{label}</p>
                                        <input
                                            type="url"
                                            value={links[key]}
                                            onChange={(e) => setLinks({ ...links, [key]: e.target.value })}
                                            placeholder={placeholder}
                                            className="mt-1 w-full rounded-lg border border-border bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:bg-white"
                                        />
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={handleSaveLinks}
                                disabled={linksSaving}
                                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 py-2.5 text-sm font-black text-white transition-colors hover:bg-emerald-800 disabled:opacity-50"
                            >
                                <Save className="size-4" />
                                {linksSaved ? "저장됨!" : linksSaving ? "저장 중..." : "링크 저장"}
                            </button>
                        </section>
                    </div>

                    <div className="space-y-5">
                        <section className="rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-sm">
                            <div className="text-sm font-extrabold text-slate-500">운영 상태</div>
                            <div className="mt-3 space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">서비스 상태</span>
                                    <span className="font-black text-emerald-600">● 정상 구독중</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">학교 ID</span>
                                    <span className="font-black">{univId ?? "—"}</span>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            )}

            {tab === "home" && (
                <div className="grid gap-5 lg:grid-cols-2">
                    <section className="rounded-2xl border border-emerald-900/10 bg-white p-6 shadow-sm">
                        <div className="flex items-center gap-2">
                            <Grid2x2 className="size-4 text-emerald-700" />
                            <h2 className="font-black">홈 위젯 노출</h2>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">학생 홈 화면에 표시할 위젯을 켜고 끕니다.</p>
                        <div className="mt-5 divide-y divide-slate-100">
                            {([
                                { key: "weather", label: "날씨 위젯", desc: "접속 지역 기반 날씨 (OpenWeatherMap)" },
                                { key: "aiChat", label: "AI 챗봇", desc: "LLM + RAG 기반 질의응답" },
                                { key: "notice", label: "최근 공지", desc: "LMS·커뮤니티 최근 공지 노출" },
                                { key: "meal", label: "학식 메뉴", desc: "오늘의 학식 메뉴" },
                                { key: "tel", label: "교내 전화부", desc: "부서별 전화번호 검색" },
                                { key: "shortcut", label: "바로가기 타일", desc: "학교 서비스 바로가기" },
                            ] as const).map(({ key, label, desc }) => (
                                <div key={key} className="flex items-center justify-between py-3">
                                    <div>
                                        <p className="text-sm font-black">{label}</p>
                                        <p className="text-xs text-slate-400">{desc}</p>
                                    </div>
                                    <Toggle
                                        checked={widgets[key]}
                                        onChange={() => setWidgets({ ...widgets, [key]: !widgets[key] })}
                                    />
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={async () => {
                                if (!univId) return;
                                setWidgetsSaving(true);
                                try {
                                    await updateHomeWidgetConfig(univId, widgets);
                                    setWidgetsSaved(true);
                                    setTimeout(() => setWidgetsSaved(false), 2000);
                                } catch (e) {
                                    console.error(e);
                                } finally {
                                    setWidgetsSaving(false);
                                }
                            }}
                            disabled={widgetsSaving}
                            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 py-2.5 text-sm font-black text-white hover:bg-emerald-800 disabled:opacity-50"
                        >
                            {widgetsSaved ? <><Check className="size-4" /> 저장됨!</> : widgetsSaving ? "저장 중..." : <><Save className="size-4" /> 변경사항 저장</>}
                        </button>
                    </section>

                    <section className="rounded-2xl border border-emerald-900/10 bg-white p-6 shadow-sm">
                        <div className="flex items-center gap-2">
                            <Megaphone className="size-4 text-emerald-700" />
                            <h2 className="font-black">공지 기본값</h2>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">새 공지 작성 시 기본 설정.</p>

                        <div className="mt-5">
                            <p className="text-sm font-black">기본 공지 대상</p>
                            <div className="mt-2 flex gap-2 rounded-lg border border-border p-1">
                                {(["ALL", "STU", "PROF"] as const).map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => setNoticeConfig({ ...noticeConfig, defaultTarget: t })}
                                        className={`flex-1 rounded-md py-1.5 text-sm font-bold transition-colors ${noticeConfig.defaultTarget === t ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
                                    >
                                        {t === "ALL" ? "전체" : t === "STU" ? "학생" : "교수"}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mt-5 divide-y divide-slate-100">
                            {([
                                { key: "showTop", label: "홈 상단 노출", desc: "중요 공지를 홈 최근 공지에 우선 표시" },
                                { key: "pushAlert", label: "푸시 알림 발송", desc: "공지 등록 시 앱 푸시 동시 발송" },
                            ] as const).map(({ key, label, desc }) => (
                                <div key={key} className="flex items-center justify-between py-3">
                                    <div>
                                        <p className="text-sm font-black">{label}</p>
                                        <p className="text-xs text-slate-400">{desc}</p>
                                    </div>
                                    <Toggle
                                        checked={noticeConfig[key]}
                                        onChange={() => setNoticeConfig({ ...noticeConfig, [key]: !noticeConfig[key] })}
                                    />
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={async () => {
                                if (!univId) return;
                                setNoticeSaving(true);
                                try {
                                    await updateNoticeConfig(univId, noticeConfig);
                                    setNoticeSaved(true);
                                    setTimeout(() => setNoticeSaved(false), 2000);
                                } catch (e) {
                                    console.error(e);
                                } finally {
                                    setNoticeSaving(false);
                                }
                            }}
                            disabled={noticeSaving}
                            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 py-2.5 text-sm font-black text-white hover:bg-emerald-800 disabled:opacity-50"
                        >
                            {noticeSaved ? <><Check className="size-4" /> 저장됨!</> : noticeSaving ? "저장 중..." : <><Save className="size-4" /> 변경사항 저장</>}
                        </button>
                    </section>
                </div>
            )}

            {tab === "api" && (
                <section className="rounded-2xl border border-emerald-900/10 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-2">
                        <Link2 className="size-4 text-emerald-700" />
                        <h2 className="font-black">외부 서비스 연동</h2>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">홈 위젯·챗봇이 사용하는 외부 API 연동 상태입니다.</p>
                    <div className="mt-5 divide-y divide-slate-100">
                        {apis.map(({ name, desc, connected, icon: Icon }) => (
                            <div key={name} className="flex items-center gap-4 py-4">
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-slate-50">
                                    <Icon className="size-5 text-slate-500" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-black">{name}</span>
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${connected ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                                            {connected ? "연결됨" : "미연결"}
                                        </span>
                                    </div>
                                    <p className="mt-0.5 text-xs text-slate-500">{desc}</p>
                                </div>
                                {connected ? (
                                    <button className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:bg-slate-50">
                                        <Settings className="size-3" /> 설정
                                    </button>
                                ) : (
                                    <button className="flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-black text-white hover:bg-emerald-800">
                                        <Link2 className="size-3" /> 연결
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
