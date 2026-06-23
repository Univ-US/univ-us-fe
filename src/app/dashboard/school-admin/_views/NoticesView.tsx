"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import {
    getAdminNotices,
    createAdminNotice,
    updateAdminNotice,
    deleteAdminNotice,
    getNoticeConfig,
    DEFAULT_NOTICE_CONFIG,
    type ApiNotice,
} from "@/lib/adminApi";

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
}

type EditTarget = { noticeId: number; title: string; content: string } | null;

export default function NoticesView() {
    const { memberId, univId } = useAuthStore();
    const [notices, setNotices] = useState<ApiNotice[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editTarget, setEditTarget] = useState<EditTarget>(null);
    const [defaultTarget, setDefaultTarget] = useState<"ALL" | "STU" | "PROF">(DEFAULT_NOTICE_CONFIG.defaultTarget);
    const [form, setForm] = useState({ title: "", content: "", target: "ALL" as "ALL" | "STU" | "PROF" });
    const [submitting, setSubmitting] = useState(false);
    const [viewNotice, setViewNotice] = useState<ApiNotice | null>(null);

    const fetchNotices = () => {
        getAdminNotices()
            .then(setNotices)
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchNotices();
        if (univId) {
            getNoticeConfig(univId).then((c) => setDefaultTarget(c.defaultTarget)).catch(() => {});
        }
    }, [univId]);

    const openCreate = () => {
        setEditTarget(null);
        setForm({ title: "", content: "", target: defaultTarget });
        setShowModal(true);
    };

    const openEdit = (n: ApiNotice) => {
        setEditTarget({ noticeId: n.noticeId, title: n.title, content: n.content });
        setForm({ title: n.title, content: n.content, target: n.target });
        setShowModal(true);
    };

    const submit = async () => {
        if (!form.title.trim() || !memberId) return;
        setSubmitting(true);
        try {
            if (editTarget) {
                await updateAdminNotice(editTarget.noticeId, {
                    memberId,
                    title: form.title,
                    content: form.content,
                    target: form.target,
                });
            } else {
                await createAdminNotice({ memberId, title: form.title, content: form.content, target: form.target });
            }
            setShowModal(false);
            setForm({ title: "", content: "", target: "ALL" });
            setEditTarget(null);
            fetchNotices();
        } catch {
            alert("저장에 실패했습니다.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (noticeId: number) => {
        if (!confirm("공지를 삭제하시겠습니까?")) return;
        try {
            await deleteAdminNotice(noticeId);
            fetchNotices();
        } catch {
            alert("삭제에 실패했습니다.");
        }
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <p className="text-sm text-slate-400">불러오는 중...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black tracking-tight">공지 관리</h1>
                    <p className="mt-1 text-sm text-slate-500">소속 학교 구성원 대상 공지를 작성·수정·삭제합니다.</p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-black text-white shadow-sm shadow-primary/10 transition-all hover:bg-primary/90"
                >
                    + 공지 작성
                </button>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead className="border-b border-slate-100 bg-slate-50/80 text-xs font-extrabold text-slate-500">
                        <tr>
                            <th className="px-5 py-3">제목</th>
                            <th className="px-5 py-3">대상</th>
                            <th className="px-5 py-3">작성일</th>
                            <th className="px-5 py-3">수정일</th>
                            <th className="px-5 py-3">관리</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {notices.map((n) => (
                            <tr key={n.noticeId} className="font-semibold text-slate-700 hover:bg-slate-50">
                                <td
                                    className="px-5 py-4 font-black text-slate-950 cursor-pointer hover:text-primary transition-colors"
                                    onClick={() => setViewNotice(n)}
                                >
                                    {n.title}
                                </td>
                                <td className="px-5 py-4">
                                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                                        n.target === "ALL" ? "bg-slate-100 text-slate-500" :
                                        n.target === "STU" ? "bg-primary/10 text-primary" :
                                        "bg-violet-100 text-violet-600"
                                    }`}>
                                        {n.target === "ALL" ? "전체" : n.target === "STU" ? "학생" : "교수"}
                                    </span>
                                </td>
                                <td className="px-5 py-4 text-slate-500">{formatDate(n.postedAt)}</td>
                                <td className="px-5 py-4 text-slate-400">
                                    {n.updatedAt ? formatDate(n.updatedAt) : "—"}
                                </td>
                                <td className="px-5 py-4">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => openEdit(n)}
                                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                        >
                                            <Pencil className="size-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(n.noticeId)}
                                            className="rounded p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-500"
                                        >
                                            <Trash2 className="size-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {notices.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-400">
                                    등록된 공지가 없습니다.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* 공지 내용 보기 모달 */}
            {viewNotice && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                    onClick={() => setViewNotice(null)}
                >
                    <div
                        className="flex w-full max-w-lg flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <h2 className="text-base font-black text-slate-900 leading-snug">{viewNotice.title}</h2>
                            <button onClick={() => setViewNotice(null)} className="shrink-0 text-slate-400 hover:text-slate-700 text-lg leading-none">✕</button>
                        </div>
                        <p className="text-xs text-slate-400">{formatDate(viewNotice.postedAt)}</p>
                        <div className="border-t border-slate-100 pt-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                            {viewNotice.content || <span className="text-slate-400">내용 없음</span>}
                        </div>
                        <div className="flex justify-end">
                            <button
                                onClick={() => { setViewNotice(null); openEdit(viewNotice); }}
                                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                            >
                                <Pencil className="size-3" /> 수정
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-2xl">
                        <h2 className="text-lg font-black">{editTarget ? "공지 수정" : "공지 작성"}</h2>
                        <p className="mt-1 text-xs text-slate-500">작성된 공지는 홈-LMS의 최근 공지에 노출됩니다.</p>

                        <div className="mt-5 space-y-4">
                            <div>
                                <label className="text-sm font-black">대상</label>
                                <select
                                    value={form.target}
                                    onChange={(e) => setForm((prev) => ({ ...prev, target: e.target.value as "ALL" | "STU" | "PROF" }))}
                                    className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
                                >
                                    <option value="ALL">전체</option>
                                    <option value="STU">학생</option>
                                    <option value="PROF">교수</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-black">
                                    제목 <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    placeholder="예) 2026-1학기 기말고사 안내"
                                    className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-black">내용</label>
                                <textarea
                                    value={form.content}
                                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                                    placeholder="공지 내용을 입력하세요."
                                    rows={5}
                                    className="mt-2 w-full resize-none rounded-lg border border-slate-200 p-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setShowModal(false)}
                                className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
                            >
                                취소
                            </button>
                            <button
                                onClick={submit}
                                disabled={submitting || !form.title.trim()}
                                className="flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-black text-white shadow-sm shadow-primary/10 hover:bg-primary/90 disabled:opacity-50"
                            >
                                {submitting ? "저장 중..." : editTarget ? "수정 완료" : "▶ 공지 등록"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
