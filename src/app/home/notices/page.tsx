"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { getNotices, Notice } from "@/lib/homeApi";

export default function NoticesPage() {
    const router = useRouter();
    const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
    const isInitialized = useAuthStore((s) => s.isInitialized);
    const univName = useAuthStore((s) => s.univName);

    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);

    useEffect(() => {
        if (!isInitialized) return;
        if (!isLoggedIn) { router.replace("/home/login"); return; }
        getNotices()
            .then(setNotices)
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [isInitialized, isLoggedIn, router]);

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
    };

    return (
        <div className="min-h-screen bg-[#f4f6f8]">
            <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
                <div className="mx-auto max-w-[1180px] flex items-center h-14 px-5 gap-3">
                    <Link href="/home" className="text-slate-400 hover:text-slate-700 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="font-extrabold text-slate-900 text-sm">{univName ?? "Univ·us"} 공지사항</h1>
                </div>
            </header>

            <div className="mx-auto max-w-[1180px] px-5 py-6">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
                    {loading ? (
                        <div className="px-5 py-8 text-center text-sm text-slate-400">불러오는 중...</div>
                    ) : notices.length === 0 ? (
                        <div className="px-5 py-8 text-center text-sm text-slate-400">등록된 공지가 없어요.</div>
                    ) : (
                        notices.map((n) => (
                            <button
                                key={n.noticeId}
                                onClick={() => setSelectedNotice(n)}
                                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-800 truncate">{n.title}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">{n.memberName} · {formatDate(n.postedAt)}</p>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* 상세 모달 */}
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
                            {selectedNotice.memberName} · {formatDate(selectedNotice.postedAt)}
                        </p>
                        <div className="border-t border-slate-100 pt-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                            {selectedNotice.content}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
