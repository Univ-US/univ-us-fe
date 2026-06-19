"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    AlertTriangle,
    Ban,
    Building2,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    FileText,
    LogIn,
    Megaphone,
    MessageSquareText,
    RefreshCw,
    Search,
    ShieldCheck,
    UserRoundCheck,
    UserRoundX,
    X,
} from "lucide-react";
import {
    changeServiceAdminMemberStatus,
    forceLogoutServiceAdminMember,
    getServiceAdminMemberActivities,
    getServiceAdminMemberDetail,
    getServiceAdminMemberLoginLogs,
    getServiceAdminMembers,
    type ServiceAdminMember,
    type ServiceAdminMemberActivitySummary,
    type ServiceAdminMemberActivityType,
    type ServiceAdminMemberPage,
    type ServiceAdminMemberQuery,
    type ServiceAdminUserActivityItem,
    type ServiceAdminUserActivityItemPage,
    type ServiceAdminUserLoginLog,
    type ServiceAdminUserLoginLogPage,
} from "@/lib/serviceAdminApi";
import type { MemberStatus } from "../_types";

interface MembersViewProps {
    onOpenSchool: (schoolId: number) => void;
}

type AdminSort = NonNullable<ServiceAdminMemberQuery["sort"]>;
type PaginationItem = number | "ellipsis-start" | "ellipsis-end";
type MemberActivitySection = "login" | ServiceAdminMemberActivityType;

const PAGE_WINDOW_SIZE = 5;
const PAGE_JUMP_SIZE = 10;
const DETAIL_PAGE_SIZE = 10;

const ACTIVITY_SECTION_LABEL: Record<MemberActivitySection, string> = {
    login: "로그인 로그",
    notices: "공지",
    posts: "게시글",
    comments: "댓글",
    inquiries: "문의",
};

const STATUS_LABEL: Record<MemberStatus, string> = {
    ACTIVE: "활성",
    SUSPENDED: "정지",
    WITHDRAWN: "탈퇴",
};

function StatusBadge({ status }: { status: MemberStatus }) {
    const style =
        status === "ACTIVE"
            ? "bg-emerald-100 text-emerald-700"
            : status === "SUSPENDED"
                ? "bg-amber-100 text-amber-700"
                : "bg-slate-100 text-slate-500";

    return (
        <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${style}`}>
            {STATUS_LABEL[status]}
        </span>
    );
}

function formatDate(value: string) {
    return new Date(value).toLocaleDateString("ko-KR");
}

function formatDateTime(value: string | null) {
    return value ? new Date(value).toLocaleString("ko-KR") : "로그인 기록 없음";
}

function formatPhoneNumber(value: number | null) {
    if (value == null) return "-";

    const digits = String(value);
    const normalized = digits.length === 10 ? `0${digits}` : digits;
    if (normalized.length === 11) {
        return normalized.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3");
    }
    return normalized;
}

function LoginLogList({ logs }: { logs: ServiceAdminUserLoginLog[] }) {
    if (logs.length === 0) {
        return (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm font-bold text-slate-400">
                로그인 로그가 없습니다.
            </div>
        );
    }

    return (
        <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
            {logs.map((log) => (
                <div key={log.logId} className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_160px]">
                    <div>
                        <p className="text-sm font-black text-slate-800">{log.result}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-400">
                            {log.failReason ?? "성공"}
                        </p>
                    </div>
                    <p className="text-left text-xs text-slate-400 sm:text-right">
                        {formatDateTime(log.logTime)}
                    </p>
                </div>
            ))}
        </div>
    );
}

function ActivityList({
    items,
    empty,
}: {
    items: ServiceAdminUserActivityItem[];
    empty: string;
}) {
    if (items.length === 0) {
        return (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm font-bold text-slate-400">
                {empty}
            </div>
        );
    }

    return (
        <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
            {items.map((item) => (
                <div key={item.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_130px]">
                    <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-800">
                            {item.title || item.type}
                        </p>
                        <p className="mt-1 truncate text-xs font-semibold text-slate-400">
                            {item.description || item.type}
                        </p>
                    </div>
                    <div className="text-left sm:text-right">
                        <p className="text-xs font-extrabold text-slate-500">
                            {item.status || "-"}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                            {formatDateTime(item.occurredAt)}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}

function DetailPagination({
    page,
    onPageChange,
}: {
    page: ServiceAdminUserLoginLogPage | ServiceAdminUserActivityItemPage | null;
    onPageChange: (page: number) => void;
}) {
    if (!page || page.totalPages <= 1) return null;

    const lastPage = page.totalPages - 1;
    const start = Math.min(
        Math.max(page.page - Math.floor(PAGE_WINDOW_SIZE / 2), 0),
        Math.max(page.totalPages - PAGE_WINDOW_SIZE, 0),
    );
    const end = Math.min(start + PAGE_WINDOW_SIZE - 1, lastPage);
    const pages: PaginationItem[] = [];

    for (let pageNumber = start; pageNumber <= end; pageNumber += 1) {
        pages.push(pageNumber);
    }
    if (end < lastPage) {
        if (end < lastPage - 1) pages.push("ellipsis-end");
        pages.push(lastPage);
    }

    return (
        <div className="mt-3 flex justify-end">
            <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                    onClick={() => onPageChange(0)}
                    disabled={page.first}
                    className="flex size-9 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40"
                    aria-label="첫 페이지"
                >
                    <ChevronsLeft className="size-4" />
                </button>
                <button
                    onClick={() => onPageChange(Math.max(0, page.page - PAGE_JUMP_SIZE))}
                    disabled={page.first}
                    className="flex h-9 min-w-9 items-center justify-center rounded-lg border border-slate-200 px-2 text-xs font-black disabled:opacity-40"
                >
                    -{PAGE_JUMP_SIZE}
                </button>
                <button
                    onClick={() => onPageChange(Math.max(0, page.page - 1))}
                    disabled={page.first}
                    className="flex size-9 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40"
                    aria-label="이전 페이지"
                >
                    <ChevronLeft className="size-4" />
                </button>
                {pages.map((item) =>
                    typeof item === "number" ? (
                        <button
                            key={item}
                            onClick={() => onPageChange(item)}
                            className={`size-9 rounded-lg text-sm font-black ${
                                page.page === item
                                    ? "bg-emerald-700 text-white"
                                    : "border border-slate-200 text-slate-600"
                            }`}
                        >
                            {item + 1}
                        </button>
                    ) : (
                        <span key={item} className="px-1 text-sm font-black text-slate-300">...</span>
                    ),
                )}
                <button
                    onClick={() => onPageChange(Math.min(page.totalPages - 1, page.page + 1))}
                    disabled={page.last}
                    className="flex size-9 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40"
                    aria-label="다음 페이지"
                >
                    <ChevronRight className="size-4" />
                </button>
                <button
                    onClick={() => onPageChange(Math.min(lastPage, page.page + PAGE_JUMP_SIZE))}
                    disabled={page.last}
                    className="flex h-9 min-w-9 items-center justify-center rounded-lg border border-slate-200 px-2 text-xs font-black disabled:opacity-40"
                >
                    +{PAGE_JUMP_SIZE}
                </button>
                <button
                    onClick={() => onPageChange(lastPage)}
                    disabled={page.last}
                    className="flex size-9 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40"
                    aria-label="마지막 페이지"
                >
                    <ChevronsRight className="size-4" />
                </button>
            </div>
        </div>
    );
}

export default function MembersView({ onOpenSchool }: MembersViewProps) {
    const [search, setSearch] = useState("");
    const [keyword, setKeyword] = useState("");
    const [status, setStatus] = useState<"ALL" | MemberStatus>("ALL");
    const [sort, setSort] = useState<AdminSort>("SCHOOL_ASC");
    const [page, setPage] = useState(0);
    const [result, setResult] = useState<ServiceAdminMemberPage | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [changingMemberId, setChangingMemberId] = useState<number | null>(null);
    const [loggingOutMemberId, setLoggingOutMemberId] = useState<number | null>(null);
    const [selectedMember, setSelectedMember] =
        useState<ServiceAdminMember | null>(null);
    const [selectedSummary, setSelectedSummary] =
        useState<ServiceAdminMemberActivitySummary | null>(null);
    const [activeActivitySection, setActiveActivitySection] =
        useState<MemberActivitySection>("login");
    const [selectedLoginLogs, setSelectedLoginLogs] = useState<ServiceAdminUserLoginLog[]>([]);
    const [loginLogPage, setLoginLogPage] =
        useState<ServiceAdminUserLoginLogPage | null>(null);
    const [loginLogPageNumber, setLoginLogPageNumber] = useState(0);
    const [loginLogLoading, setLoginLogLoading] = useState(false);
    const [activityItems, setActivityItems] = useState<ServiceAdminUserActivityItem[]>([]);
    const [activityItemPage, setActivityItemPage] =
        useState<ServiceAdminUserActivityItemPage | null>(null);
    const [activityPage, setActivityPage] = useState(0);
    const [activityLoading, setActivityLoading] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setKeyword(search.trim());
            setPage(0);
        }, 300);
        return () => window.clearTimeout(timer);
    }, [search]);

    const loadMembers = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            setResult(
                await getServiceAdminMembers({
                    page,
                    keyword: keyword || undefined,
                    status: status === "ALL" ? undefined : status,
                    sort,
                }),
            );
        } catch (loadError) {
            console.error("Failed to load service admin members.", loadError);
            setError("학교 관리자 목록을 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    }, [keyword, page, sort, status]);

    useEffect(() => {
        void loadMembers();
    }, [loadMembers]);

    useEffect(() => {
        if (result && result.totalPages > 0 && page >= result.totalPages) {
            setPage(result.totalPages - 1);
        }
    }, [page, result]);

    useEffect(() => {
        if (!selectedMember) return;

        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "";
        };
    }, [selectedMember]);

    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape" && isDetailOpen) {
                setIsDetailOpen(false);
                closeTimerRef.current = setTimeout(() => {
                    setSelectedMember(null);
                    closeTimerRef.current = null;
                }, 300);
            }
        };

        window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    }, [isDetailOpen]);

    useEffect(() => {
        return () => {
            if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
            document.body.style.overflow = "";
        };
    }, []);

    const paginationItems = useMemo<PaginationItem[]>(() => {
        const totalPages = result?.totalPages ?? 0;
        if (totalPages <= PAGE_WINDOW_SIZE + 2) {
            return Array.from({ length: totalPages }, (_, index) => index);
        }

        const lastPage = totalPages - 1;
        const start = Math.min(
            Math.max(page - Math.floor(PAGE_WINDOW_SIZE / 2), 0),
            totalPages - PAGE_WINDOW_SIZE,
        );
        const end = start + PAGE_WINDOW_SIZE - 1;
        const items: PaginationItem[] = [];

        if (start > 0) {
            items.push(0);
            if (start > 1) items.push("ellipsis-start");
        }

        for (let pageNumber = start; pageNumber <= end; pageNumber += 1) {
            if (!items.includes(pageNumber)) items.push(pageNumber);
        }

        if (end < lastPage) {
            if (end < lastPage - 1) items.push("ellipsis-end");
            items.push(lastPage);
        }

        return items;
    }, [page, result?.totalPages]);

    const openMemberDetail = async (member: ServiceAdminMember) => {
        if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }

        setSelectedMember(member);
        setSelectedSummary(null);
        setActiveActivitySection("login");
        setSelectedLoginLogs([]);
        setLoginLogPage(null);
        setLoginLogPageNumber(0);
        setActivityItems([]);
        setActivityItemPage(null);
        setActivityPage(0);
        setDetailLoading(true);
        requestAnimationFrame(() => {
            requestAnimationFrame(() => setIsDetailOpen(true));
        });

        try {
            const detail = await getServiceAdminMemberDetail(member.memberId);
            setSelectedMember(detail.member);
            setSelectedSummary(detail.summary);
            setSelectedLoginLogs(detail.loginLogs);
        } catch (detailError) {
            console.error("Failed to load service admin member detail.", detailError);
            setError("학교 관리자 상세 정보를 불러오지 못했습니다.");
        } finally {
            setDetailLoading(false);
        }
    };

    const closeMemberDetail = () => {
        setIsDetailOpen(false);
        closeTimerRef.current = setTimeout(() => {
            setSelectedMember(null);
            setSelectedSummary(null);
            setActiveActivitySection("login");
            setSelectedLoginLogs([]);
            setLoginLogPage(null);
            setLoginLogPageNumber(0);
            setActivityItems([]);
            setActivityItemPage(null);
            setActivityPage(0);
            closeTimerRef.current = null;
        }, 300);
    };

    const loadLoginLogs = useCallback(async () => {
        if (!selectedMember) return;

        setLoginLogLoading(true);
        try {
            const pageData = await getServiceAdminMemberLoginLogs(
                selectedMember.memberId,
                {
                    page: loginLogPageNumber,
                    size: DETAIL_PAGE_SIZE,
                },
            );
            setLoginLogPage(pageData);
            setSelectedLoginLogs(pageData.content);
        } catch (loadError) {
            console.error("Failed to load service admin member login logs.", loadError);
            setError("학교 관리자 로그인 로그를 불러오지 못했습니다.");
        } finally {
            setLoginLogLoading(false);
        }
    }, [loginLogPageNumber, selectedMember]);

    useEffect(() => {
        void loadLoginLogs();
    }, [loadLoginLogs]);

    const loadMemberActivity = useCallback(async () => {
        if (!selectedMember || activeActivitySection === "login") return;

        setActivityLoading(true);
        try {
            const pageData = await getServiceAdminMemberActivities(
                selectedMember.memberId,
                activeActivitySection,
                {
                    page: activityPage,
                    size: DETAIL_PAGE_SIZE,
                },
            );
            setActivityItemPage(pageData);
            setActivityItems(pageData.content);
        } catch (loadError) {
            console.error("Failed to load service admin member activities.", loadError);
            setError("학교 관리자 활동 내역을 불러오지 못했습니다.");
        } finally {
            setActivityLoading(false);
        }
    }, [activeActivitySection, activityPage, selectedMember]);

    useEffect(() => {
        void loadMemberActivity();
    }, [loadMemberActivity]);

    const changeStatus = async (member: ServiceAdminMember) => {
        const nextStatus =
            member.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";

        if (
            nextStatus === "SUSPENDED" &&
            !window.confirm(
                `${member.univName}의 유일한 관리자 계정을 정지합니다.\n\n` +
                "해당 관리자의 현재 세션은 로그아웃 처리됩니다. " +
                "대학교 정보, 구독, 자동 결제와 학생·교수 서비스는 그대로 유지됩니다.",
            )
        ) {
            return;
        }

        setChangingMemberId(member.memberId);
        try {
            const updatedMember = await changeServiceAdminMemberStatus(
                member.memberId,
                nextStatus,
            );
            if (selectedMember?.memberId === updatedMember.memberId) {
                setSelectedMember(updatedMember);
            }
            await loadMembers();
        } catch (changeError) {
            console.error("Failed to change service admin member status.", changeError);
            window.alert("학교 관리자 계정 상태를 변경하지 못했습니다.");
        } finally {
            setChangingMemberId(null);
        }
    };

    const forceLogout = async () => {
        if (!selectedMember) return;

        if (!window.confirm(`${selectedMember.memberName} 관리자 계정의 모든 기기 세션을 로그아웃하시겠습니까?`)) {
            return;
        }

        setLoggingOutMemberId(selectedMember.memberId);
        try {
            const response = await forceLogoutServiceAdminMember(selectedMember.memberId);
            window.alert(`${response.revokedSessionCount}개 세션을 로그아웃 처리했습니다.`);
        } catch (logoutError) {
            console.error("Failed to force logout service admin member.", logoutError);
            setError("학교 관리자 세션을 로그아웃 처리하지 못했습니다.");
        } finally {
            setLoggingOutMemberId(null);
        }
    };

    const detailActivityPage =
        activeActivitySection === "login" ? loginLogPage : activityItemPage;
    const detailLoginLogs = loginLogPage?.content ?? selectedLoginLogs;
    const detailActivityItems = activityItemPage?.content ?? activityItems;

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-black tracking-tight">회원 관리</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        학교 관리자 계정을 조회하고 상태와 세션을 관리합니다.
                    </p>
                </div>
                <button
                    onClick={() => void loadMembers()}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 hover:border-emerald-200 hover:text-emerald-700"
                >
                    <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
                    새로고침
                </button>
            </div>

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                {[
                    {
                        label: "전체 학교 관리자",
                        value: result?.totalCount ?? 0,
                        icon: ShieldCheck,
                        color: "text-sky-700",
                    },
                    {
                        label: "활성 관리자",
                        value: result?.activeCount ?? 0,
                        icon: UserRoundCheck,
                        color: "text-emerald-700",
                    },
                    {
                        label: "정지 관리자",
                        value: result?.suspendedCount ?? 0,
                        icon: UserRoundX,
                        color: "text-amber-600",
                    },
                    {
                        label: "탈퇴 관리자",
                        value: result?.withdrawnCount ?? 0,
                        icon: Ban,
                        color: "text-slate-500",
                    },
                ].map(({ label, value, icon: Icon, color }) => (
                    <section
                        key={label}
                        className="rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-sm"
                    >
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-extrabold text-slate-500">{label}</p>
                            <Icon className={`size-5 ${color}`} />
                        </div>
                        <p className={`mt-3 text-2xl font-black ${color}`}>
                            {value.toLocaleString()}명
                        </p>
                    </section>
                ))}
            </div>

            <section className="rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-sm">
                <div className="grid gap-3 lg:grid-cols-[1fr_160px_180px]">
                    <label className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="학교명, 관리자명, 로그인 ID 검색"
                            className="h-11 w-full rounded-lg border border-slate-200 pl-10 pr-3 text-sm font-semibold outline-none focus:border-emerald-500"
                        />
                    </label>
                    <select
                        value={status}
                        onChange={(event) => {
                            setStatus(event.target.value as typeof status);
                            setPage(0);
                        }}
                        className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-500"
                    >
                        <option value="ALL">전체 상태</option>
                        <option value="ACTIVE">활성</option>
                        <option value="SUSPENDED">정지</option>
                        <option value="WITHDRAWN">탈퇴</option>
                    </select>
                    <select
                        value={sort}
                        onChange={(event) => {
                            setSort(event.target.value as AdminSort);
                            setPage(0);
                        }}
                        className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-500"
                    >
                        <option value="SCHOOL_ASC">학교명순</option>
                        <option value="NAME_ASC">관리자명순</option>
                        <option value="JOINED_DESC">최근 가입순</option>
                    </select>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
                    <p className="font-bold text-slate-500">
                        조회 결과 <span className="text-emerald-700">{(result?.totalElements ?? 0).toLocaleString()}</span>명
                    </p>
                    <button
                        onClick={() => {
                            setSearch("");
                            setStatus("ALL");
                            setSort("SCHOOL_ASC");
                            setPage(0);
                        }}
                        className="font-extrabold text-slate-500 hover:text-emerald-700"
                    >
                        필터 초기화
                    </button>
                </div>
            </section>

            {error && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                    <AlertTriangle className="size-4" />
                    {error}
                </div>
            )}

            <section className="overflow-hidden rounded-2xl border border-emerald-900/10 bg-white shadow-sm">
                <div className="overflow-x-auto">
                            <table className="w-full min-w-[1120px] table-fixed text-left text-sm">
                                <colgroup>
                                    <col className="w-[220px]" />
                                    <col className="w-[160px]" />
                                    <col className="w-[130px]" />
                                    <col className="w-[150px]" />
                                    <col className="w-[105px]" />
                                    <col className="w-[130px]" />
                                    <col className="w-[180px]" />
                                    <col className="w-[150px]" />
                                </colgroup>
                                <thead className="bg-slate-50 text-xs font-extrabold text-slate-500">
                                    <tr>
                                        <th className="px-5 py-3">학교</th>
                                        <th className="px-5 py-3">관리자</th>
                                        <th className="px-5 py-3">로그인 ID</th>
                                        <th className="px-5 py-3">연락처</th>
                                        <th className="px-5 py-3">상태</th>
                                        <th className="px-5 py-3">가입일</th>
                                        <th className="px-5 py-3">최근 로그인</th>
                                        <th className="px-5 py-3">관리</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={8} className="px-5 py-16 text-center">
                                                <RefreshCw className="mx-auto size-6 animate-spin text-emerald-700" />
                                            </td>
                                        </tr>
                                    ) : (
                                        result?.content.map((member) => (
                                            <tr
                                                key={member.memberId}
                                                onClick={() => void openMemberDetail(member)}
                                                className={`cursor-pointer font-semibold text-slate-700 transition hover:bg-emerald-50/60 ${
                                                    selectedMember?.memberId === member.memberId
                                                        ? "bg-emerald-50"
                                                        : ""
                                                }`}
                                            >
                                                <td className="px-5 py-4">
                                                    <button
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            onOpenSchool(member.univId);
                                                        }}
                                                        title={member.univName}
                                                        className="flex w-full min-w-0 items-center gap-2 font-black text-slate-950 hover:text-emerald-700"
                                                    >
                                                        <Building2 className="size-4 shrink-0" />
                                                        <span className="truncate">{member.univName}</span>
                                                    </button>
                                                </td>
                                                <td className="px-5 py-4 font-black text-slate-950">
                                                    {member.memberName}
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-4">
                                                    {member.loginId}
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-4">
                                                    {formatPhoneNumber(member.phoneNumber)}
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-4">
                                                    <StatusBadge status={member.status} />
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                                                    {formatDate(member.createdAt)}
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                                                    {formatDateTime(member.logtimeAt)}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <button
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            void changeStatus(member);
                                                        }}
                                                        disabled={
                                                            member.status === "WITHDRAWN" ||
                                                            changingMemberId === member.memberId
                                                        }
                                                        className={`h-9 w-[104px] whitespace-nowrap rounded-lg px-3 text-xs font-black ${
                                                            member.status === "ACTIVE"
                                                                ? "border border-amber-200 text-amber-700 hover:bg-amber-50"
                                                                : "border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                                        } disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400`}
                                                    >
                                                        {changingMemberId === member.memberId
                                                            ? "변경 중"
                                                            : member.status === "ACTIVE"
                                                                ? "계정 정지"
                                                                : "계정 활성화"}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                    {!loading && result?.content.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={8}
                                                className="px-5 py-12 text-center font-bold text-slate-400"
                                            >
                                                조건에 맞는 학교 관리자가 없습니다.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm font-bold text-slate-400">
                                {(page + 1).toLocaleString()} / {Math.max(result?.totalPages ?? 1, 1).toLocaleString()} 페이지
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage((current) => Math.max(0, current - PAGE_JUMP_SIZE))}
                                    disabled={page === 0}
                                    className="flex h-9 min-w-9 items-center justify-center rounded-lg border border-slate-200 px-2 text-xs font-black disabled:opacity-40"
                                >
                                    -{PAGE_JUMP_SIZE}
                                </button>
                                <button
                                    onClick={() => setPage((current) => Math.max(0, current - 1))}
                                    disabled={page === 0}
                                    className="flex size-9 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40"
                                    aria-label="이전 페이지"
                                >
                                    <ChevronLeft className="size-4" />
                                </button>
                                {paginationItems.map((item) =>
                                    typeof item === "number" ? (
                                        <button
                                            key={item}
                                            onClick={() => setPage(item)}
                                            className={`size-9 rounded-lg text-sm font-black ${
                                                page === item
                                                    ? "bg-emerald-700 text-white"
                                                    : "border border-slate-200 text-slate-600"
                                            }`}
                                            aria-label={`${item + 1}페이지`}
                                            aria-current={page === item ? "page" : undefined}
                                        >
                                            {item + 1}
                                        </button>
                                    ) : (
                                        <span
                                            key={item}
                                            className="flex size-7 items-center justify-center text-sm font-black text-slate-400"
                                            aria-hidden="true"
                                        >
                                            ...
                                        </span>
                                    ),
                                )}
                                <button
                                    onClick={() =>
                                        setPage((current) =>
                                            Math.min((result?.totalPages ?? 1) - 1, current + 1),
                                        )
                                    }
                                    disabled={!result || result.last}
                                    className="flex size-9 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40"
                                    aria-label="다음 페이지"
                                >
                                    <ChevronRight className="size-4" />
                                </button>
                                <button
                                    onClick={() =>
                                        setPage((current) =>
                                            Math.min((result?.totalPages ?? 1) - 1, current + PAGE_JUMP_SIZE),
                                        )
                                    }
                                    disabled={!result || result.last}
                                    className="flex h-9 min-w-9 items-center justify-center rounded-lg border border-slate-200 px-2 text-xs font-black disabled:opacity-40"
                                >
                                    +{PAGE_JUMP_SIZE}
                                </button>
                            </div>
                </div>
            </section>

            {selectedMember && (
                <div
                    className={`fixed inset-0 z-50 transition ${
                        isDetailOpen ? "pointer-events-auto" : "pointer-events-none"
                    }`}
                    aria-hidden={!isDetailOpen}
                >
                    <button
                        type="button"
                        onClick={closeMemberDetail}
                        className={`absolute inset-0 bg-slate-950/35 backdrop-blur-[1px] transition-opacity duration-300 ${
                            isDetailOpen ? "opacity-100" : "opacity-0"
                        }`}
                        aria-label="학교 관리자 상세 닫기"
                    />

                    <aside
                        role="dialog"
                        aria-modal="true"
                        aria-label={`${selectedMember.memberName} 학교 관리자 상세`}
                        className={`absolute inset-y-0 right-0 flex w-full max-w-[760px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
                            isDetailOpen ? "translate-x-0" : "translate-x-full"
                        }`}
                    >
                        <div className="flex items-start justify-between border-b border-slate-100 px-7 py-6">
                            <div>
                                <p className="text-xs font-extrabold text-emerald-700">
                                    학교 관리자 상세
                                </p>
                                <h2 className="mt-2 text-2xl font-black">
                                    {selectedMember.memberName}
                                </h2>
                                <p className="mt-1 text-sm font-semibold text-slate-400">
                                    {selectedMember.loginId}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <StatusBadge status={selectedMember.status} />
                                <button
                                    type="button"
                                    onClick={closeMemberDetail}
                                    className="flex size-10 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                    aria-label="닫기"
                                >
                                    <X className="size-5" />
                                </button>
                            </div>
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto px-7 py-6">
                            {detailLoading && (
                                <div className="mb-5 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                                    <RefreshCw className="size-4 animate-spin" />
                                    상세 정보를 불러오는 중입니다.
                                </div>
                            )}

                            <section className="rounded-2xl bg-[#f4faf7] p-5">
                                <p className="text-xs font-extrabold text-emerald-800">
                                    기본 정보
                                </p>
                                <dl className="mt-5 grid gap-x-6 gap-y-5 sm:grid-cols-2">
                                    {[
                                        ["소속 학교", selectedMember.univName],
                                        ["역할", "학교 관리자"],
                                        ["로그인 ID", selectedMember.loginId],
                                        [
                                            "연락처",
                                            formatPhoneNumber(selectedMember.phoneNumber),
                                        ],
                                        ["가입일", formatDate(selectedMember.createdAt)],
                                        [
                                            "최근 로그인",
                                            formatDateTime(selectedMember.logtimeAt),
                                        ],
                                    ].map(([label, value]) => (
                                        <div key={label}>
                                            <dt className="text-xs font-extrabold text-slate-400">
                                                {label}
                                            </dt>
                                            <dd className="mt-1.5 break-all text-sm font-black text-slate-800">
                                                {value}
                                            </dd>
                                        </div>
                                    ))}
                                </dl>
                            </section>

                            <section className="mt-5 rounded-2xl border border-slate-200 p-5">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="font-black">계정 제어</p>
                                        <p className="mt-1 text-xs font-semibold leading-5 text-slate-400">
                                            정지 처리와 강제 로그아웃 시 현재 Redis 세션은 함께 만료됩니다.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => void forceLogout()}
                                        disabled={loggingOutMemberId === selectedMember.memberId}
                                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-4 text-sm font-black text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                                    >
                                        <LogIn className="size-4" />
                                        전체 기기 로그아웃
                                    </button>
                                </div>
                                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                    <button
                                        onClick={() => void changeStatus(selectedMember)}
                                        disabled={
                                            selectedMember.status === "ACTIVE" ||
                                            selectedMember.status === "WITHDRAWN" ||
                                            changingMemberId === selectedMember.memberId
                                        }
                                        className="h-10 rounded-lg border border-slate-200 text-sm font-black text-slate-700 hover:border-emerald-200 hover:text-emerald-700 disabled:bg-slate-50 disabled:text-slate-300"
                                    >
                                        활성 처리
                                    </button>
                                    <button
                                        onClick={() => void changeStatus(selectedMember)}
                                        disabled={
                                            selectedMember.status === "SUSPENDED" ||
                                            selectedMember.status === "WITHDRAWN" ||
                                            changingMemberId === selectedMember.memberId
                                        }
                                        className="h-10 rounded-lg border border-slate-200 text-sm font-black text-slate-700 hover:border-emerald-200 hover:text-emerald-700 disabled:bg-slate-50 disabled:text-slate-300"
                                    >
                                        정지 처리
                                    </button>
                                </div>
                                {selectedMember.status === "WITHDRAWN" && (
                                    <p className="mt-3 text-xs font-semibold text-slate-400">
                                        탈퇴한 관리자 계정은 다시 활성화할 수 없습니다.
                                    </p>
                                )}
                            </section>

                            <section className="mt-6">
                                <h3 className="font-black">활동 요약</h3>
                                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
                                    {[
                                        {
                                            key: "login" as const,
                                            label: "로그인 로그",
                                            value: loginLogPage?.totalElements ?? selectedLoginLogs.length,
                                            icon: LogIn,
                                        },
                                        {
                                            key: "notices" as const,
                                            label: "공지",
                                            value: selectedSummary?.noticeCount ?? 0,
                                            icon: Megaphone,
                                        },
                                        {
                                            key: "posts" as const,
                                            label: "게시글",
                                            value: selectedSummary?.postCount ?? 0,
                                            icon: FileText,
                                        },
                                        {
                                            key: "comments" as const,
                                            label: "댓글",
                                            value: selectedSummary?.commentCount ?? 0,
                                            icon: MessageSquareText,
                                        },
                                        {
                                            key: "inquiries" as const,
                                            label: "문의",
                                            value: selectedSummary?.inquiryCount ?? 0,
                                            icon: ShieldCheck,
                                        },
                                    ].map(({ key, label, value, icon: Icon }) => (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => {
                                                setActiveActivitySection(key);
                                                if (key === "login") {
                                                    setLoginLogPageNumber(0);
                                                } else {
                                                    setActivityItems([]);
                                                    setActivityItemPage(null);
                                                    setActivityPage(0);
                                                }
                                            }}
                                            className={`flex min-h-[78px] flex-col justify-between rounded-xl border bg-white px-3 py-3 text-left transition ${
                                                activeActivitySection === key
                                                    ? "border-emerald-300 bg-emerald-50"
                                                    : "border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/50"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-xs font-extrabold text-slate-400">{label}</p>
                                                <Icon className="size-4 text-emerald-700" />
                                            </div>
                                            <p className="text-lg font-black">{value.toLocaleString()}</p>
                                        </button>
                                    ))}
                                </div>
                            </section>

                            <section className="mt-6">
                                <h3 className="mb-3 font-black">
                                    {ACTIVITY_SECTION_LABEL[activeActivitySection]}
                                </h3>
                                {(loginLogLoading || activityLoading) && (
                                    <div className="mb-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                                        <RefreshCw className="size-4 animate-spin" />
                                        활동 내역을 불러오는 중입니다.
                                    </div>
                                )}
                                {activeActivitySection === "login" ? (
                                    <LoginLogList logs={detailLoginLogs} />
                                ) : (
                                    <ActivityList
                                        items={detailActivityItems}
                                        empty={`${ACTIVITY_SECTION_LABEL[activeActivitySection]} 항목이 없습니다.`}
                                    />
                                )}
                                <DetailPagination
                                    page={detailActivityPage}
                                    onPageChange={
                                        activeActivitySection === "login"
                                            ? setLoginLogPageNumber
                                            : setActivityPage
                                    }
                                />
                            </section>
                        </div>

                        <div className="border-t border-slate-100 px-7 py-5">
                            <button
                                onClick={() => onOpenSchool(selectedMember.univId)}
                                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-100 text-sm font-black text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-800"
                            >
                                <Building2 className="size-4" />
                                해당 학교 상세 보기
                            </button>
                        </div>
                    </aside>
                </div>
            )}
        </div>
    );
}
