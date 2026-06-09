"use client";

import { useEffect, useState } from "react";
import { MessageSquareText } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { getAdminSupports, updateSupportStatus, SUPPORT_STATUS_LABEL, type ApiSupport } from "@/lib/adminApi";

export default function InquiriesView() {
    const { univId } = useAuthStore();
    const [inquiries, setInquiries] = useState<ApiSupport[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<ApiSupport | null>(null);
    const [resolving, setResolving] = useState(false);

    const handleResolve = async () => {
        if (!selected) return;
        setResolving(true);
        try {
            await updateSupportStatus(selected.supportId, 1);
            const updated = { ...selected, status: 1 };
            setInquiries((prev) => prev.map((i) => i.supportId === selected.supportId ? updated : i));
            setSelected(updated);
        } catch (e) {
            console.error(e);
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

            <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
                <section className="overflow-hidden rounded-2xl border border-emerald-900/10 bg-white shadow-sm">
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
                            {inquiries.map((item) => (
                                <li key={item.supportId}>
                                    <button
                                        onClick={() => setSelected(item)}
                                        className={`w-full px-5 py-4 text-left transition-colors hover:bg-slate-50 ${selected?.supportId === item.supportId ? "bg-emerald-50" : ""} ${item.status === 1 ? "opacity-50" : ""}`}
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <span className={`font-black truncate ${item.status === 1 ? "text-slate-400 line-through" : "text-slate-900"}`}>{item.memberName}</span>
                                            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${item.status === 1 ? "bg-slate-100 text-slate-400" : "bg-amber-100 text-amber-700"}`}>
                                                {SUPPORT_STATUS_LABEL[item.status] ?? item.status}
                                            </span>
                                        </div>
                                        <p className={`mt-1 truncate text-sm ${item.status === 1 ? "text-slate-400" : "text-slate-500"}`}>{item.message}</p>
                                        <p className="mt-1 text-xs text-slate-400">
                                            {item.createdAt ? new Date(item.createdAt).toLocaleDateString("ko-KR") : "—"}
                                        </p>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section className="rounded-2xl border border-emerald-900/10 bg-white p-6 shadow-sm">
                    {selected ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="font-black text-slate-900">문의 상세</h2>
                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${selected.status === 1 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                    {SUPPORT_STATUS_LABEL[selected.status] ?? selected.status}
                                </span>
                            </div>
                            <div className="space-y-3 text-sm">
                                <div>
                                    <p className="text-xs font-bold text-slate-400">이름</p>
                                    <p className="mt-0.5 font-semibold text-slate-800">{selected.memberName}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400">연락처</p>
                                    <p className="mt-0.5 font-semibold text-slate-800">{selected.contact}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400">접수일</p>
                                    <p className="mt-0.5 font-semibold text-slate-800">
                                        {selected.createdAt ? new Date(selected.createdAt).toLocaleDateString("ko-KR") : "—"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400">내용</p>
                                    <p className="mt-1 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 leading-relaxed text-slate-700">{selected.message}</p>
                                </div>
                            </div>
                            {selected.status !== 1 && (
                                <button
                                    onClick={handleResolve}
                                    disabled={resolving}
                                    className="mt-2 w-full rounded-lg bg-[#064b35] py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-800 disabled:opacity-50"
                                >
                                    {resolving ? "처리 중..." : "처리완료로 변경"}
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 text-slate-400">
                            <MessageSquareText className="size-8" />
                            <p className="text-sm font-bold">문의를 선택하면 상세 내용이 표시됩니다.</p>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
