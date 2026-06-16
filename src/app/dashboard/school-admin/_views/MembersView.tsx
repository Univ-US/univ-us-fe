/* eslint-disable */
"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Search, Users } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import {
    getAdminMembers,
    updateMemberStatus,
    ROLE_LABEL,
    STATUS_LABEL,
    STATUS_TO_API,
    type ApiMember,
} from "@/lib/adminApi";
import { Avatar, StatusBadge } from "../_components";

const PAGE_SIZE = 10;

export default function MembersView() {
    const { univId } = useAuthStore();
    const [allMembers, setAllMembers] = useState<ApiMember[]>([]);
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("?꾩껜");
    const [statusFilter, setStatusFilter] = useState("?꾩껜");
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchMembers = () => {
        if (!univId) return;
        setLoading(true);
        getAdminMembers()
            .then((data) => {
                // BE媛 univId ?꾪꽣瑜?吏?먰븯吏 ?딆븘 ?대씪?댁뼵?몄뿉???꾪꽣留?
                const mine = data.list.filter((m) => m.univId === univId);
                setAllMembers(mine);
            })
            .catch(() => setError("?뚯썝 紐⑸줉??遺덈윭?ㅼ? 紐삵뻽?듬땲??"))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchMembers(); }, [univId]);

    const filtered = allMembers.filter((m) => {
        const matchSearch = !search || m.memberName.includes(search) || String(m.memberId).includes(search);
        const matchRole = roleFilter === "?꾩껜" || (ROLE_LABEL[m.role] ?? m.role) === roleFilter;
        const matchStatus = statusFilter === "?꾩껜" || (STATUS_LABEL[m.status] ?? m.status) === statusFilter;
        return matchSearch && matchRole && matchStatus;
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const stats = {
        total: allMembers.length,
        active: allMembers.filter((m) => m.status === "ACTIVE").length,
        suspended: allMembers.filter((m) => m.status === "SUSPENDED").length,
        withdrawn: allMembers.filter((m) => m.status === "WITHDRAWN").length,
    };

    const toggleSelect = (id: number) => {
        const next = new Set(selected);
        next.has(id) ? next.delete(id) : next.add(id);
        setSelected(next);
    };

    const toggleAll = () => {
        if (selected.size === paginated.length) setSelected(new Set());
        else setSelected(new Set(paginated.map((m) => m.memberId)));
    };

    const handleBulkStatus = async (label: string) => {
        const apiStatus = STATUS_TO_API[label];
        if (!apiStatus) return;
        try {
            await Promise.all([...selected].map((id) => updateMemberStatus(id, apiStatus)));
            setSelected(new Set());
            fetchMembers();
        } catch {
            alert("?곹깭 蹂寃쎌뿉 ?ㅽ뙣?덉뒿?덈떎.");
        }
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <p className="text-sm text-slate-400">遺덈윭?ㅻ뒗 以?..</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-64 items-center justify-center">
                <p className="text-sm text-rose-500">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-black tracking-tight">?뚯썝 愿由?/h1>
                    <p className="mt-1 text-sm text-slate-500">?뚯냽 ?숆탳 ?뚯썝??議고쉶?섍퀬 ?곹깭瑜?蹂寃쏀빀?덈떎.</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-bold shadow-sm hover:bg-slate-50">
                        <Download className="size-4" /> ?대낫?닿린
                    </button>
                    <button className="flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-black text-white hover:bg-emerald-800">
                        <Users className="size-4" /> ?쇨큵 ?뚯썝媛??
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                    { label: "?꾩껜 ?뚯썝", value: stats.total, color: "text-slate-700" },
                    { label: "?쒖꽦", value: stats.active, color: "text-emerald-700" },
                    { label: "?뺤?", value: stats.suspended, color: "text-amber-600" },
                    { label: "?덊눜", value: stats.withdrawn, color: "text-rose-500" },
                ].map((s) => (
                    <div key={s.label} className="rounded-xl border border-border bg-white px-4 py-3 shadow-sm">
                        <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                        <p className="mt-1 text-xs font-bold text-slate-500">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <div className="relative min-w-[200px] flex-1">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        placeholder="?대쫫 ?먮뒗 ?뚯썝踰덊샇 寃??
                        className="h-10 w-full rounded-lg border border-border bg-white pl-9 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                </div>
                {[
                    { label: "援щ텇", options: ["?꾩껜", "?숈깮", "援먯닔", "愿由ъ옄"], value: roleFilter, set: setRoleFilter },
                    { label: "?곹깭", options: ["?꾩껜", "?쒖꽦", "?뺤?", "?덊눜"], value: statusFilter, set: setStatusFilter },
                ].map(({ label, options, value, set }) => (
                    <select
                        key={label}
                        value={value}
                        onChange={(e) => { set(e.target.value); setPage(1); }}
                        className="h-10 rounded-lg border border-border bg-white px-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                        {options.map((o) => <option key={o}>{o}</option>)}
                    </select>
                ))}
            </div>

            {/* Bulk action bar */}
            {selected.size > 0 && (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                    <span className="text-sm font-black text-emerald-800">{selected.size}紐??좏깮??/span>
                    <div className="ml-auto flex gap-2">
                        <button onClick={() => handleBulkStatus("?쒖꽦")} className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-black text-emerald-700 hover:bg-emerald-100">?쒖꽦??/button>
                        <button onClick={() => handleBulkStatus("?뺤?")} className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-black text-amber-700 hover:bg-amber-100">?뺤?</button>
                        <button onClick={() => handleBulkStatus("?덊눜")} className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-black text-rose-600 hover:bg-rose-100">?덊눜 泥섎━</button>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="overflow-hidden rounded-2xl border border-emerald-900/10 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-left text-sm">
                        <thead className="bg-slate-50 text-xs font-extrabold text-slate-500">
                            <tr>
                                <th className="px-4 py-3">
                                    <input
                                        type="checkbox"
                                        checked={selected.size === paginated.length && paginated.length > 0}
                                        onChange={toggleAll}
                                        className="rounded"
                                    />
                                </th>
                                <th className="px-4 py-3">?뚯썝踰덊샇</th>
                                <th className="px-4 py-3">?대쫫</th>
                                <th className="px-4 py-3">援щ텇</th>
                                <th className="px-4 py-3">?곹깭</th>
                                <th className="px-4 py-3">媛?낆씪</th>
                                <th className="px-4 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginated.map((m) => (
                                <tr
                                    key={m.memberId}
                                    className={`font-semibold text-slate-700 transition-colors ${selected.has(m.memberId) ? "bg-emerald-50" : "hover:bg-slate-50"}`}
                                >
                                    <td className="px-4 py-3">
                                        <input type="checkbox" checked={selected.has(m.memberId)} onChange={() => toggleSelect(m.memberId)} className="rounded" />
                                    </td>
                                    <td className="px-4 py-3 text-slate-400">{m.memberId}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <Avatar name={m.memberName} />
                                            <span className="font-black text-slate-950">{m.memberName}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">{ROLE_LABEL[m.role] ?? m.role}</td>
                                    <td className="px-4 py-3">
                                        <StatusBadge value={STATUS_LABEL[m.status] ?? m.status} />
                                    </td>
                                    <td className="px-4 py-3 text-slate-400">
                                        {m.createdAt ? new Date(m.createdAt).toLocaleDateString("ko-KR") : "??}
                                    </td>
                                    <td className="px-4 py-3">
                                        <select
                                            defaultValue=""
                                            onChange={async (e) => {
                                                if (!e.target.value) return;
                                                try {
                                                    await updateMemberStatus(m.memberId, e.target.value);
                                                    fetchMembers();
                                                } catch { alert("?곹깭 蹂寃쎌뿉 ?ㅽ뙣?덉뒿?덈떎."); }
                                                e.target.value = "";
                                            }}
                                            className="rounded border border-border bg-white px-2 py-1 text-xs font-bold text-slate-500 focus:outline-none"
                                        >
                                            <option value="">쨌쨌쨌</option>
                                            <option value="ACTIVE">?쒖꽦??/option>
                                            <option value="SUSPENDED">?뺤?</option>
                                            <option value="WITHDRAWN">?덊눜</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                            {paginated.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-5 py-8 text-center text-sm text-slate-400">
                                        {search || roleFilter !== "?꾩껜" || statusFilter !== "?꾩껜"
                                            ? "寃??寃곌낵媛 ?놁뒿?덈떎."
                                            : "?깅줉???뚯썝???놁뒿?덈떎."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
                    <p className="text-xs font-bold text-slate-500">
                        {filtered.length > 0
                            ? `${(page - 1) * PAGE_SIZE + 1}??{Math.min(page * PAGE_SIZE, filtered.length)} / ${filtered.length}`
                            : "0嫄?}
                    </p>
                    <div className="flex gap-1">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="flex size-8 items-center justify-center rounded-lg border border-border disabled:opacity-30 hover:bg-slate-50"
                        >
                            <ChevronLeft className="size-4" />
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPage(p)}
                                className={`flex size-8 items-center justify-center rounded-lg border text-sm font-bold ${p === page ? "border-emerald-600 bg-emerald-600 text-white" : "border-border hover:bg-slate-50"}`}
                            >
                                {p}
                            </button>
                        ))}
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="flex size-8 items-center justify-center rounded-lg border border-border disabled:opacity-30 hover:bg-slate-50"
                        >
                            <ChevronRight className="size-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

