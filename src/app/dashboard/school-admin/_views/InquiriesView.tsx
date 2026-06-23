"use client";

import { useEffect, useState } from "react";
import { MessageSquareText, X } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { getAdminSupports, updateSupportStatus, SUPPORT_STATUS_LABEL, type ApiSupport } from "@/lib/adminApi";

export default function InquiriesView() {
    const { univId } = useAuthStore();
    const [inquiries, setInquiries] = useState<ApiSupport[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<ApiSupport | null>(null);
    const [resolving, setResolving] = useState(false);

    const handleResolve = async () => {
        if (!selected || !univId) return;
        setResolving(true);
        try {
            await updateSupportStatus(selected.supportId, 1);
            const fresh = await getAdminSupports(univId);
            setInquiries(fresh);
            setSelected(fresh.find((i) => i.supportId === selected.supportId) ?? null);
        } catch (e) {
            console.error(e);
            alert("처리 중 오류가 발생했습니다. 다시 시도해 주세요.");
        } finally {
            setResolving(false);
        }
    };

    useEffect(() => {
        if (!univId) return;
        getAdminSupports(univId)
            .then(setInquiries)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [univId]);

    useEffect(() => {
        if (!selected) return;

        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") setSelected(null);
        };

        document.addEventListener("keydown", closeOnEscape);
        return () => document.removeEventListener("keydown", closeOnEscape);
    }, [selected]);

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <p className="text-sm text-slate-400">불러오는 중...</p>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-2xl font-black tracking-tight">문의사항</h1>
                <p className="mt-1 text-sm text-slate-500">학교 구성원이 보낸 문의를 확인합니다.</p>
            </div>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-5 py-4">
                        <h2 className="font-black">전체 문의 <span className="ml-1 text-sm font-bold text-slate-400">{inquiries.length}건</span></h2>
                    </div>
                    {inquiries.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400">
                            <MessageSquareText className="size-8" />
                            <p className="text-sm font-bold">접수된 문의가 없습니다.</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {inquiries.map((item) => {
                                const inquiryTitle = item.message.split(/\r?\n/)[0]?.trim() || "내용 없음";

                                return (
                                    <li key={item.supportId}>
                                        <button
                                            onClick={() => setSelected(item)}
                                            className={`w-full px-5 py-4 text-left transition-colors hover:bg-slate-50 ${item.status === 1 ? "opacity-60" : ""}`}
                                        >
                                            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_140px_120px_88px] items-center gap-4">
                                                <p className={`truncate text-sm font-black ${item.status === 1 ? "text-slate-400 line-through" : "text-slate-900"}`}>
                                                    {inquiryTitle}
                                                </p>
                                                <span className={`truncate text-sm font-semibold ${item.status === 1 ? "text-slate-400" : "text-slate-600"}`}>{item.memberName}</span>
                                                <span className="whitespace-nowrap text-sm font-semibold text-slate-400">
                                                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString("ko-KR") : "—"}
                                                </span>
                                                <span className="flex justify-center">
                                                    <span className={`inline-flex h-6 min-w-[72px] shrink-0 items-center justify-center rounded-full px-3 text-xs font-bold leading-none ${item.status === 1 ? "bg-slate-100 text-slate-400" : "bg-amber-100 text-amber-700"}`}>
                                                        {SUPPORT_STATUS_LABEL[item.status] ?? item.status}
                                                    </span>
                                                </span>
                                            </div>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
            </section>

            {selected && (
                <div
                    className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950/35 px-4 py-6 backdrop-blur-[2px]"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="inquiry-detail-title"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) setSelected(null);
                    }}
                >
                    <section className="w-full max-w-4xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
                            <div>
                                <h2 id="inquiry-detail-title" className="font-black text-slate-900">문의 상세</h2>
                                <p className="mt-1 text-xs font-semibold text-slate-400">
                                    문의자 정보와 접수 내용을 확인합니다.
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${selected.status === 1 ? "bg-primary/10 text-primary" : "bg-amber-100 text-amber-700"}`}>
                                    {SUPPORT_STATUS_LABEL[selected.status] ?? selected.status}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setSelected(null)}
                                    className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                                    aria-label="문의 상세 닫기"
                                >
                                    <X className="size-4" />
                                </button>
                            </div>
                        </div>
                        <div className="space-y-5 px-5 py-5">
                            <div className="grid gap-4 text-sm sm:grid-cols-3">
                                <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-3">
                                    <p className="text-xs font-bold text-slate-400">이름</p>
                                    <p className="mt-1 font-semibold text-slate-800">{selected.memberName}</p>
                                </div>
                                <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-3">
                                    <p className="text-xs font-bold text-slate-400">연락처</p>
                                    <p className="mt-1 font-semibold text-slate-800">{selected.contact}</p>
                                </div>
                                <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-3">
                                    <p className="text-xs font-bold text-slate-400">접수일</p>
                                    <p className="mt-1 font-semibold text-slate-800">
                                        {selected.createdAt ? new Date(selected.createdAt).toLocaleDateString("ko-KR") : "—"}
                                    </p>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400">내용</p>
                                <p className="mt-2 max-h-[460px] overflow-y-auto whitespace-pre-wrap rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                                    {selected.message}
                                </p>
                            </div>
                            {selected.status !== 1 && (
                                <button
                                    onClick={handleResolve}
                                    disabled={resolving}
                                    className="h-10 w-full rounded-lg bg-[var(--primary)] text-sm font-bold text-white shadow-sm shadow-primary/10 transition-colors hover:bg-primary/90 disabled:opacity-50"
                                >
                                    {resolving ? "처리 중..." : "처리완료로 변경"}
                                </button>
                            )}
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}
