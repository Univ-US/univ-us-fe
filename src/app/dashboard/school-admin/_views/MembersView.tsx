"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Download, Search, UserCheck, UserX, Users } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import {
    getAdminMembers,
    updateMemberStatus,
    ROLE_LABEL,
    STATUS_LABEL,
    STATUS_TO_API,
    isSuspendedStatus,
    type ApiMember,
    type BulkSignupResponse,
} from "@/lib/adminApi";
import { getSubscriptionStatus } from "@/lib/subscriptionApi";
import { exportMembersToExcel, MEMBER_EXPORT_COLUMNS, type MemberExportColumnKey } from "@/lib/memberExportExcel";
import { Avatar, StatusBadge } from "../_components";
import BulkSignupModal from "./BulkSignupModal";

const PAGE_SIZE = 10;
const ALL_EXPORT_COLUMN_KEYS = MEMBER_EXPORT_COLUMNS.map((c) => c.key);

function FilterDropdown({
    label,
    options,
    value,
    open,
    onToggle,
    onChange,
}: {
    label: string;
    options: string[];
    value: string;
    open: boolean;
    onToggle: () => void;
    onChange: (value: string) => void;
}) {
    return (
        <div className="relative w-full sm:w-36" data-filter-dropdown>
            <button
                type="button"
                onClick={onToggle}
                className={`flex h-10 w-full items-center justify-between gap-3 rounded-lg border px-3 text-sm font-bold transition-all ${
                    open
                        ? "border-primary bg-white text-primary ring-2 ring-primary/15"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-primary/20 hover:bg-white"
                }`}
                aria-expanded={open}
            >
                <span className="flex min-w-0 items-center gap-2">
                    <span className="text-xs font-black text-slate-400">{label}</span>
                    <span className="truncate">{value}</span>
                </span>
                <ChevronDown className={`size-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180 text-primary" : ""}`} />
            </button>

            {open && (
                <div className="absolute left-0 top-12 z-30 w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10 animate-in fade-in slide-in-from-top-1 duration-150">
                    {options.map((option) => {
                        const selected = option === value;
                        return (
                            <button
                                key={option}
                                type="button"
                                onClick={() => onChange(option)}
                                className={`flex h-9 w-full items-center justify-between rounded-lg px-2.5 text-left text-sm font-bold transition-colors ${
                                    selected
                                        ? "bg-primary/10 text-primary"
                                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                                }`}
                            >
                                <span>{option}</span>
                                {selected && <Check className="size-4" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function MemberStatusDropdown({
    open,
    onToggle,
    onChange,
}: {
    open: boolean;
    onToggle: () => void;
    onChange: (value: string) => void;
}) {
    const options = [
        { label: "활성화", value: "ACTIVE", className: "text-primary hover:bg-primary/10" },
        { label: "정지", value: "SUSPENDED", className: "text-amber-700 hover:bg-amber-50" },
        { label: "탈퇴 처리", value: "WITHDRAWN", className: "text-rose-600 hover:bg-rose-50" },
    ];

    return (
        <div className="relative inline-flex" data-member-action-dropdown>
            <button
                type="button"
                onClick={onToggle}
                className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-black transition-all ${
                    open
                        ? "border-primary bg-white text-primary ring-2 ring-primary/15"
                        : "border-slate-200 bg-white text-slate-500 hover:border-primary/30 hover:text-primary"
                }`}
                aria-expanded={open}
            >
                ...
                <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <div className="absolute right-0 top-10 z-30 w-28 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10 animate-in fade-in slide-in-from-top-1 duration-150">
                    {options.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => onChange(option.value)}
                            className={`flex h-8 w-full items-center rounded-lg px-2.5 text-left text-xs font-black transition-colors ${option.className}`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function MembersView() {
    const { univId, univName } = useAuthStore();
    const [allMembers, setAllMembers] = useState<ApiMember[]>([]);
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("전체");
    const [statusFilter, setStatusFilter] = useState("전체");
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [subscriptionActive, setSubscriptionActive] = useState(false);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkSuccessMessage, setBulkSuccessMessage] = useState<string | null>(null);
    const [showExportPanel, setShowExportPanel] = useState(false);
    const [exportColumns, setExportColumns] = useState<Set<MemberExportColumnKey>>(new Set(ALL_EXPORT_COLUMN_KEYS));
    const [openFilter, setOpenFilter] = useState<"role" | "status" | null>(null);
    const [openMemberAction, setOpenMemberAction] = useState<number | null>(null);

    const toggleExportColumn = (key: MemberExportColumnKey) => {
        const next = new Set(exportColumns);
        next.has(key) ? next.delete(key) : next.add(key);
        setExportColumns(next);
    };

    const handleExport = () => {
        if (exportColumns.size === 0) return;
        exportMembersToExcel(filtered, { univName, columns: [...exportColumns] });
        setShowExportPanel(false);
    };

    const fetchMembers = () => {
        if (!univId) return;
        setLoading(true);
        getAdminMembers()
            .then((data) => {
                // BE가 univId 필터를 지원하지 않아 클라이언트에서 필터링
                const mine = data.list.filter((m) => m.univId === univId);
                setAllMembers(mine);
            })
            .catch(() => setError("회원 목록을 불러오지 못했습니다."))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchMembers(); }, [univId]);

    useEffect(() => {
        getSubscriptionStatus()
            .then((s) => setSubscriptionActive(s.accessStatus === "ACTIVE"))
            .catch(() => setSubscriptionActive(false));
    }, []);

    useEffect(() => {
        if (!bulkSuccessMessage) return;
        const timer = setTimeout(() => setBulkSuccessMessage(null), 5000);
        return () => clearTimeout(timer);
    }, [bulkSuccessMessage]);

    useEffect(() => {
        if (!openFilter) return;

        const closeFilterOnOutsideClick = (event: MouseEvent) => {
            if ((event.target as HTMLElement).closest("[data-filter-dropdown]")) return;
            setOpenFilter(null);
        };

        document.addEventListener("mousedown", closeFilterOnOutsideClick);
        return () => document.removeEventListener("mousedown", closeFilterOnOutsideClick);
    }, [openFilter]);

    useEffect(() => {
        if (!openMemberAction) return;

        const closeActionOnOutsideClick = (event: MouseEvent) => {
            if ((event.target as HTMLElement).closest("[data-member-action-dropdown]")) return;
            setOpenMemberAction(null);
        };

        document.addEventListener("mousedown", closeActionOnOutsideClick);
        return () => document.removeEventListener("mousedown", closeActionOnOutsideClick);
    }, [openMemberAction]);

    const handleBulkSignupCompleted = (result: BulkSignupResponse) => {
        fetchMembers();
        // 필터에 가려져 새로 추가된 회원이 안 보이는 일이 없도록 목록을 초기 상태로 되돌립니다.
        setSearch("");
        setRoleFilter("전체");
        setStatusFilter("전체");
        setPage(1);
        if (result.successCount > 0) {
            setBulkSuccessMessage(
                result.failCount > 0
                    ? `회원가입이 완료되었습니다. ${result.successCount}명 추가, ${result.failCount}명 실패했습니다.`
                    : `회원가입이 완료되었습니다. ${result.successCount}명이 추가되었습니다.`,
            );
        } else {
            alert(`등록된 회원이 없습니다. ${result.failCount}건 모두 실패했습니다.`);
        }
    };

    const filtered = allMembers.filter((m) => {
        const matchSearch = !search || m.memberName.includes(search) || String(m.memberId).includes(search);
        const matchRole = roleFilter === "전체" || (ROLE_LABEL[m.role] ?? m.role) === roleFilter;
        const matchStatus = statusFilter === "전체" || (STATUS_LABEL[m.status] ?? m.status) === statusFilter;
        return matchSearch && matchRole && matchStatus;
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const stats = {
        total: allMembers.length,
        active: allMembers.filter((m) => m.status === "ACTIVE").length,
        suspended: allMembers.filter((m) => isSuspendedStatus(m.status)).length,
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
            alert("상태 변경에 실패했습니다.");
        }
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <p className="text-sm text-slate-400">불러오는 중...</p>
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
        <div className="space-y-6">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div>
                    <h1 className="text-2xl font-black tracking-tight">회원 관리</h1>
                    <p className="mt-1 text-sm text-slate-500">소속 학교 회원을 조회하고 상태를 변경합니다.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <div className="relative">
                        <button
                            onClick={() => setShowExportPanel((v) => !v)}
                            disabled={filtered.length === 0}
                            className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm transition-all hover:border-primary/20 hover:bg-slate-50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Download className="size-4" /> 내보내기
                        </button>

                        {showExportPanel && (
                            <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                                <p className="px-1 text-xs font-black text-slate-500">내보낼 항목 선택</p>
                                <div className="mt-2 space-y-1">
                                    {MEMBER_EXPORT_COLUMNS.map((c) => (
                                        <label key={c.key} className="flex items-center gap-2 rounded-lg px-1 py-1 text-sm font-semibold hover:bg-slate-50">
                                            <input
                                                type="checkbox"
                                                checked={exportColumns.has(c.key)}
                                                onChange={() => toggleExportColumn(c.key)}
                                                className="rounded"
                                            />
                                            {c.label}
                                        </label>
                                    ))}
                                </div>
                                <button
                                    onClick={handleExport}
                                    disabled={exportColumns.size === 0}
                                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-black text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <Download className="size-3.5" /> 엑셀로 내보내기
                                </button>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => setShowBulkModal(true)}
                        disabled={!subscriptionActive}
                        title={subscriptionActive ? undefined : "구독이 활성 상태일 때 이용할 수 있습니다."}
                        className="flex h-10 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-black text-white shadow-sm shadow-primary/10 transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                    >
                        <Users className="size-4" /> 일괄 회원가입
                    </button>
                </div>
            </div>

            {!subscriptionActive && (
                <p className="text-xs font-medium text-amber-600">
                    일괄 회원가입은 구독이 활성 상태일 때 이용할 수 있습니다.
                </p>
            )}

            {bulkSuccessMessage && (
                <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-black text-primary">
                    <span>{bulkSuccessMessage}</span>
                    <button onClick={() => setBulkSuccessMessage(null)} className="text-primary hover:text-primary">✕</button>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                    { label: "전체 회원", value: stats.total, color: "text-slate-700", icon: Users, tone: "bg-slate-50 text-slate-500" },
                    { label: "활성", value: stats.active, color: "text-primary", icon: UserCheck, tone: "bg-primary/10 text-primary" },
                    { label: "정지", value: stats.suspended, color: "text-amber-600", icon: UserX, tone: "bg-amber-50 text-amber-600" },
                    { label: "탈퇴", value: stats.withdrawn, color: "text-rose-500", icon: UserX, tone: "bg-rose-50 text-rose-500" },
                ].map(({ label, value, color, icon: Icon, tone }) => (
                    <div key={label} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-bold text-slate-500">{label}</p>
                            <span className={`flex size-8 items-center justify-center rounded-lg ${tone}`}>
                                <Icon className="size-4" />
                            </span>
                        </div>
                        <p className={`mt-3 text-2xl font-black leading-none ${color}`}>{value}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap gap-3">
                <div className="relative min-w-[200px] flex-1">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        placeholder="이름 또는 회원번호 검색"
                        className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm font-medium outline-none transition-colors placeholder:text-slate-400 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15"
                    />
                </div>
                <FilterDropdown
                    label="구분"
                    options={["전체", "학생", "교수", "관리자"]}
                    value={roleFilter}
                    open={openFilter === "role"}
                    onToggle={() => setOpenFilter((current) => current === "role" ? null : "role")}
                    onChange={(nextValue) => {
                        setRoleFilter(nextValue);
                        setPage(1);
                        setOpenFilter(null);
                    }}
                />
                <FilterDropdown
                    label="상태"
                    options={["전체", "활성", "정지", "탈퇴"]}
                    value={statusFilter}
                    open={openFilter === "status"}
                    onToggle={() => setOpenFilter((current) => current === "status" ? null : "status")}
                    onChange={(nextValue) => {
                        setStatusFilter(nextValue);
                        setPage(1);
                        setOpenFilter(null);
                    }}
                />
                </div>
            </div>

            {/* Bulk action bar */}
            {selected.size > 0 && (
                <div className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center">
                    <span className="text-sm font-black text-primary">{selected.size}명 선택됨</span>
                    <div className="flex flex-wrap gap-2 sm:ml-auto">
                        <button onClick={() => handleBulkStatus("활성")} className="rounded-lg border border-primary/30 bg-white px-3 py-1.5 text-xs font-black text-primary hover:bg-primary/15">활성화</button>
                        <button onClick={() => handleBulkStatus("정지")} className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-black text-amber-700 hover:bg-amber-100">정지</button>
                        <button onClick={() => handleBulkStatus("탈퇴")} className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-black text-rose-600 hover:bg-rose-100">탈퇴 처리</button>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] table-fixed text-left text-sm">
                        <colgroup>
                            <col className="w-[4%]" />
                            <col className="w-[9%]" />
                            <col className="w-[35%]" />
                            <col className="w-[13%]" />
                            <col className="w-[13%]" />
                            <col className="w-[14%]" />
                            <col className="w-[12%]" />
                        </colgroup>
                        <thead className="border-b border-slate-100 bg-slate-50/80 text-xs font-extrabold text-slate-500">
                            <tr>
                                <th className="px-4 py-3">
                                    <input
                                        type="checkbox"
                                        checked={selected.size === paginated.length && paginated.length > 0}
                                        onChange={toggleAll}
                                        className="rounded"
                                    />
                                </th>
                                <th className="px-4 py-3">회원번호</th>
                                <th className="px-4 py-3">이름</th>
                                <th className="px-4 py-3">구분</th>
                                <th className="px-4 py-3">상태</th>
                                <th className="px-4 py-3">가입일</th>
                                <th className="px-3 py-3 text-center" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginated.map((m) => (
                                <tr
                                    key={m.memberId}
                                    className={`font-semibold text-slate-700 transition-colors ${selected.has(m.memberId) ? "bg-primary/5" : "hover:bg-slate-50/80"}`}
                                >
                                    <td className="px-4 py-3">
                                        <input type="checkbox" checked={selected.has(m.memberId)} onChange={() => toggleSelect(m.memberId)} className="rounded" />
                                    </td>
                                    <td className="px-4 py-3 text-slate-400">{m.memberId}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <Avatar name={m.memberName} />
                                            <span className="truncate font-black text-slate-950">{m.memberName}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">{ROLE_LABEL[m.role] ?? m.role}</td>
                                    <td className="px-4 py-3">
                                        <StatusBadge value={STATUS_LABEL[m.status] ?? m.status} />
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 text-slate-400">
                                        {m.createdAt ? new Date(m.createdAt).toLocaleDateString("ko-KR") : "—"}
                                    </td>
                                    <td className="px-3 py-3">
                                        <div className="flex justify-center">
                                            <MemberStatusDropdown
                                                open={openMemberAction === m.memberId}
                                                onToggle={() => {
                                                    setOpenFilter(null);
                                                    setOpenMemberAction((current) => current === m.memberId ? null : m.memberId);
                                                }}
                                                onChange={async (nextStatus) => {
                                                    try {
                                                        await updateMemberStatus(m.memberId, nextStatus);
                                                        setOpenMemberAction(null);
                                                        fetchMembers();
                                                    } catch {
                                                        alert("상태 변경에 실패했습니다.");
                                                    }
                                                }}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {paginated.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-5 py-8 text-center text-sm text-slate-400">
                                        {search || roleFilter !== "전체" || statusFilter !== "전체"
                                            ? "검색 결과가 없습니다."
                                            : "등록된 회원이 없습니다."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs font-bold text-slate-500">
                        {filtered.length > 0
                            ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} / ${filtered.length}`
                            : "0건"}
                    </p>
                    <div className="flex gap-1">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="flex size-8 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-slate-50"
                        >
                            <ChevronLeft className="size-4" />
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPage(p)}
                                className={`flex size-8 items-center justify-center rounded-lg border text-sm font-bold ${p === page ? "border-primary bg-primary text-white" : "border-slate-200 hover:bg-slate-50"}`}
                            >
                                {p}
                            </button>
                        ))}
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="flex size-8 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-slate-50"
                        >
                            <ChevronRight className="size-4" />
                        </button>
                    </div>
                </div>
            </div>

            {showBulkModal && univId && (
                <BulkSignupModal
                    univId={univId}
                    onClose={() => setShowBulkModal(false)}
                    onCompleted={handleBulkSignupCompleted}
                />
            )}
        </div>
    );
}
