"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    AlertTriangle,
    Ban,
    BookOpen,
    CalendarDays,
    FileText,
    GraduationCap,
    LogIn,
    MessageSquareText,
    RefreshCw,
    Search,
    ShieldCheck,
    UserRoundCheck,
    UserRoundX,
    UserPlus,
    UsersRound,
    X,
} from "lucide-react";
import { SelectDropdown, ServiceAdminPagination } from "../_components";
import {
    changeServiceAdminUserStatus,
    forceLogoutServiceAdminUser,
    getServiceAdminUserActivities,
    getServiceAdminUserDetail,
    getServiceAdminUserLoginLogs,
    getServiceAdminUsers,
    type ServiceAdminUser,
    type ServiceAdminUserActivityItem,
    type ServiceAdminUserActivityItemPage,
    type ServiceAdminUserDetail,
    type ServiceAdminUserLoginLog,
    type ServiceAdminUserLoginLogPage,
    type ServiceAdminUserPage,
    type ServiceAdminUserQuery,
    type ServiceAdminUserRole,
} from "@/lib/serviceAdminApi";
import type { MemberStatus } from "../_types";
import ServiceAdminBulkSignupModal from "./ServiceAdminBulkSignupModal";

type UserSort = NonNullable<ServiceAdminUserQuery["sort"]>;
type PaginationItem = number | "ellipsis-start" | "ellipsis-end";
type UserActivitySection =
    | "login"
    | "posts"
    | "comments"
    | "courses"
    | "submissions"
    | "reservations"
    | "penalties"
    | "inquiries";

const PAGE_WINDOW_SIZE = 5;
const DETAIL_PAGE_SIZE = 10;

const ROLE_LABEL: Record<ServiceAdminUserRole, string> = {
    GUEST: "게스트",
    STU: "학생",
    PROF: "교수",
    ALU: "졸업생",
};

const STATUS_LABEL: Record<MemberStatus, string> = {
    ACTIVE: "활성",
    SUSPENDED: "정지",
    WITHDRAWN: "탈퇴",
};

const ACTIVITY_SECTION_LABEL: Record<UserActivitySection, string> = {
    login: "로그인 로그",
    posts: "게시글",
    comments: "댓글",
    courses: "강의",
    submissions: "제출",
    reservations: "예약",
    penalties: "노쇼/제한",
    inquiries: "문의",
};

function StatusBadge({ status }: { status: MemberStatus }) {
    const style =
        status === "ACTIVE"
            ? "bg-primary/10 text-primary"
            : status === "SUSPENDED"
                ? "bg-amber-100 text-amber-700"
                : "bg-slate-100 text-slate-500";

    return (
        <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${style}`}>
            {STATUS_LABEL[status]}
        </span>
    );
}

function formatDate(value: string | null) {
    return value ? new Date(value).toLocaleDateString("ko-KR") : "-";
}

function formatDateTime(value: string | null) {
    return value ? new Date(value).toLocaleString("ko-KR") : "-";
}

function formatLoginDateTime(value: string | null) {
    return value ? new Date(value).toLocaleString("ko-KR") : "로그인 기록 없음";
}

function displayAssigned(value: string | null) {
    return value ?? "미배정";
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

function LoginLogList({ logs }: { logs: ServiceAdminUserLoginLog[] }) {
    if (logs.length === 0) {
        return <ActivityList items={[]} empty="로그인 로그가 없습니다." />;
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
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-100">
            <ServiceAdminPagination
                page={page.page}
                totalPages={page.totalPages}
                first={page.first}
                last={page.last}
                paginationItems={pages}
                onChange={onPageChange}
            />
        </div>
    );
}

function getActivityItems(
    detail: ServiceAdminUserDetail,
    section: UserActivitySection,
) {
    if (section === "posts") {
        return detail.communityActivities.filter((item) => item.type === "POST");
    }
    if (section === "comments") {
        return detail.communityActivities.filter((item) => item.type === "COMMENT");
    }
    if (section === "courses") {
        return detail.courseActivities;
    }
    if (section === "submissions") {
        return detail.submissionActivities;
    }
    if (section === "reservations") {
        return detail.reservationActivities.filter((item) => item.type !== "PENALTY");
    }
    if (section === "penalties") {
        return detail.reservationActivities.filter((item) => item.type === "PENALTY");
    }
    if (section === "inquiries") {
        return detail.inquiryActivities;
    }
    return [];
}

export default function UsersView() {
    const [search, setSearch] = useState("");
    const [keyword, setKeyword] = useState("");
    const [role, setRole] = useState<"ALL" | ServiceAdminUserRole>("ALL");
    const [status, setStatus] = useState<"ALL" | MemberStatus>("ALL");
    const [sort, setSort] = useState<UserSort>("JOINED_DESC");
    const [page, setPage] = useState(0);
    const [result, setResult] = useState<ServiceAdminUserPage | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedDetail, setSelectedDetail] =
        useState<ServiceAdminUserDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [activeActivitySection, setActiveActivitySection] =
        useState<UserActivitySection>("login");
    const [activityPage, setActivityPage] = useState(0);
    const [activityLoading, setActivityLoading] = useState(false);
    const [loginLogPage, setLoginLogPage] =
        useState<ServiceAdminUserLoginLogPage | null>(null);
    const [activityItemPage, setActivityItemPage] =
        useState<ServiceAdminUserActivityItemPage | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [changingMemberId, setChangingMemberId] = useState<number | null>(null);
    const [loggingOutMemberId, setLoggingOutMemberId] = useState<number | null>(null);
    const [isBulkSignupOpen, setIsBulkSignupOpen] = useState(false);
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setKeyword(search.trim());
            setPage(0);
        }, 300);
        return () => window.clearTimeout(timer);
    }, [search]);

    const loadUsers = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            setResult(
                await getServiceAdminUsers({
                    page,
                    keyword: keyword || undefined,
                    role: role === "ALL" ? undefined : role,
                    status: status === "ALL" ? undefined : status,
                    sort,
                }),
            );
        } catch (loadError) {
            console.error("Failed to load service admin users.", loadError);
            setError("이용자 목록을 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    }, [keyword, page, role, sort, status]);

    useEffect(() => {
        void loadUsers();
    }, [loadUsers]);

    useEffect(() => {
        if (result && result.totalPages > 0 && page >= result.totalPages) {
            setPage(result.totalPages - 1);
        }
    }, [page, result]);

    useEffect(() => {
        if (!selectedDetail) return;

        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "";
        };
    }, [selectedDetail]);

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

    const openDetail = async (member: ServiceAdminUser) => {
        if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }

        setSelectedDetail({
            user: member,
            summary: {
                postCount: 0,
                commentCount: 0,
                courseCount: 0,
                submissionCount: 0,
                reservationCount: 0,
                noShowCount: 0,
                inquiryCount: 0,
            },
            loginLogs: [],
            communityActivities: [],
            courseActivities: [],
            submissionActivities: [],
            reservationActivities: [],
            inquiryActivities: [],
        });
        setActiveActivitySection("login");
        setActivityPage(0);
        setLoginLogPage(null);
        setActivityItemPage(null);
        setDetailLoading(true);
        requestAnimationFrame(() => {
            requestAnimationFrame(() => setIsDetailOpen(true));
        });

        try {
            setSelectedDetail(await getServiceAdminUserDetail(member.memberId));
        } catch (detailError) {
            console.error("Failed to load service admin user detail.", detailError);
            setError("이용자 상세 정보를 불러오지 못했습니다.");
        } finally {
            setDetailLoading(false);
        }
    };

    const loadDetailActivity = useCallback(async () => {
        const memberId = selectedDetail?.user.memberId;
        if (!memberId) return;

        setActivityLoading(true);
        try {
            if (activeActivitySection === "login") {
                setLoginLogPage(
                    await getServiceAdminUserLoginLogs(memberId, {
                        page: activityPage,
                        size: DETAIL_PAGE_SIZE,
                    }),
                );
                setActivityItemPage(null);
            } else {
                setActivityItemPage(
                    await getServiceAdminUserActivities(
                        memberId,
                        activeActivitySection,
                        {
                            page: activityPage,
                            size: DETAIL_PAGE_SIZE,
                        },
                    ),
                );
            }
        } catch (activityError) {
            console.error("Failed to load service admin user activity.", activityError);
            setError("이용자 활동 내역을 불러오지 못했습니다.");
        } finally {
            setActivityLoading(false);
        }
    }, [activeActivitySection, activityPage, selectedDetail?.user.memberId]);

    useEffect(() => {
        void loadDetailActivity();
    }, [loadDetailActivity]);

    const closeDetail = () => {
        setIsDetailOpen(false);
        closeTimerRef.current = setTimeout(() => {
            setSelectedDetail(null);
            setLoginLogPage(null);
            setActivityItemPage(null);
            closeTimerRef.current = null;
        }, 300);
    };

    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape" && isDetailOpen) {
                closeDetail();
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

    const replaceUser = (nextUser: ServiceAdminUser) => {
        setResult((current) =>
            current
                ? {
                    ...current,
                    content: current.content.map((user) =>
                        user.memberId === nextUser.memberId ? nextUser : user,
                    ),
                }
                : current,
        );
        setSelectedDetail((current) =>
            current ? { ...current, user: nextUser } : current,
        );
    };

    const changeStatus = async (nextStatus: MemberStatus) => {
        const user = selectedDetail?.user;
        if (!user || user.status === nextStatus) return;

        const message =
            nextStatus === "WITHDRAWN"
                ? `${user.memberName} 계정을 탈퇴 처리하시겠습니까?\n탈퇴 상태는 로그인과 인증 갱신이 차단됩니다.`
                : nextStatus === "SUSPENDED"
                    ? `${user.memberName} 계정을 정지하시겠습니까?\n현재 세션은 로그아웃되고 커뮤니티 이용이 제한됩니다.`
                    : `${user.memberName} 계정을 활성화하시겠습니까?`;

        if (!window.confirm(message)) return;

        setChangingMemberId(user.memberId);
        try {
            replaceUser(await changeServiceAdminUserStatus(user.memberId, nextStatus));
            await loadUsers();
        } catch (changeError) {
            console.error("Failed to change service admin user status.", changeError);
            setError("이용자 상태를 변경하지 못했습니다.");
        } finally {
            setChangingMemberId(null);
        }
    };

    const forceLogout = async () => {
        const user = selectedDetail?.user;
        if (!user) return;

        if (!window.confirm(`${user.memberName} 계정의 모든 기기 세션을 로그아웃하시겠습니까?`)) {
            return;
        }

        setLoggingOutMemberId(user.memberId);
        try {
            const response = await forceLogoutServiceAdminUser(user.memberId);
            window.alert(`${response.revokedSessionCount}개 세션을 로그아웃 처리했습니다.`);
        } catch (logoutError) {
            console.error("Failed to force logout service admin user.", logoutError);
            setError("이용자 세션을 로그아웃 처리하지 못했습니다.");
        } finally {
            setLoggingOutMemberId(null);
        }
    };

    const stats = result ?? {
        totalCount: 0,
        activeCount: 0,
        suspendedCount: 0,
        withdrawnCount: 0,
        studentCount: 0,
        professorCount: 0,
        alumniCount: 0,
        guestCount: 0,
    };
    const detail = selectedDetail;
    const detailActivityPage =
        activeActivitySection === "login" ? loginLogPage : activityItemPage;
    const detailLoginLogs = loginLogPage?.content ?? detail?.loginLogs ?? [];
    const detailActivityItems =
        activityItemPage?.content ??
        (detail ? getActivityItems(detail, activeActivitySection) : []);

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-black tracking-tight">이용자 관리</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        학교 관리자와 서비스 관리자를 제외한 이용자 계정을 조회하고 상태를 관리합니다.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setIsBulkSignupOpen(true)}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-black text-white hover:bg-primary/90"
                    >
                        <UserPlus className="size-4" />
                        일괄 회원가입
                    </button>
                <button
                    onClick={() => void loadUsers()}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 hover:border-primary/20 hover:text-primary"
                >
                    <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
                    새로고침
                </button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                {[
                    { label: "전체 이용자", value: stats.totalCount, icon: UsersRound, color: "text-slate-700" },
                    { label: "활성", value: stats.activeCount, icon: UserRoundCheck, color: "text-primary" },
                    { label: "정지", value: stats.suspendedCount, icon: UserRoundX, color: "text-amber-600" },
                    { label: "탈퇴", value: stats.withdrawnCount, icon: Ban, color: "text-slate-500" },
                ].map(({ label, value, icon: Icon, color }) => (
                    <section
                        key={label}
                        className="rounded-2xl border border-primary/10 bg-white p-5 shadow-sm"
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

            <section className="rounded-2xl border border-primary/10 bg-white p-5 shadow-sm">
                <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_180px_170px_210px]">
                    <label className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="이름, 아이디, 학교, 학과 검색"
                            className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold outline-none transition focus:border-primary"
                        />
                    </label>

                    <SelectDropdown
                        value={role}
                        onChange={(value) => {
                            setRole(value as "ALL" | ServiceAdminUserRole);
                            setPage(0);
                        }}
                        options={[
                            { value: "ALL", label: "전체 역할" },
                            { value: "GUEST", label: "게스트" },
                            { value: "STU", label: "학생" },
                            { value: "PROF", label: "교수" },
                            { value: "ALU", label: "졸업생" },
                        ]}
                    />

                    <SelectDropdown
                        value={status}
                        onChange={(value) => {
                            setStatus(value as "ALL" | MemberStatus);
                            setPage(0);
                        }}
                        options={[
                            { value: "ALL", label: "전체 상태" },
                            { value: "ACTIVE", label: "활성" },
                            { value: "SUSPENDED", label: "정지" },
                            { value: "WITHDRAWN", label: "탈퇴" },
                        ]}
                    />

                    <SelectDropdown
                        value={sort}
                        onChange={(value) => {
                            setSort(value as UserSort);
                            setPage(0);
                        }}
                        options={[
                            { value: "JOINED_DESC", label: "최근 가입순" },
                            { value: "JOINED_ASC", label: "오래된 가입순" },
                            { value: "NAME_ASC", label: "이름순" },
                            { value: "SCHOOL_ASC", label: "학교순" },
                            { value: "ROLE_ASC", label: "역할순" },
                            { value: "LOGIN_DESC", label: "최근 로그인순" },
                        ]}
                    />

                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
                    <p className="font-bold text-slate-500">
                        검색 결과 <span className="text-primary">{(result?.totalElements ?? 0).toLocaleString()}</span>명
                    </p>
                    <button
                        onClick={() => {
                            setSearch("");
                            setRole("ALL");
                            setStatus("ALL");
                            setSort("JOINED_DESC");
                            setPage(0);
                        }}
                        className="font-extrabold text-slate-500 hover:text-primary"
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

            <section className="overflow-hidden rounded-2xl border border-primary/10 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1120px] table-fixed text-left text-sm">
                        <colgroup>
                            <col className="w-[190px]" />
                            <col className="w-[230px]" />
                            <col className="w-[90px]" />
                            <col className="w-[170px]" />
                            <col className="w-[105px]" />
                            <col className="w-[130px]" />
                            <col className="w-[170px]" />
                        </colgroup>
                        <thead className="bg-slate-50 text-xs font-extrabold text-slate-500">
                            <tr>
                                <th className="px-5 py-3">이용자</th>
                                <th className="px-5 py-3">학교</th>
                                <th className="px-5 py-3">역할</th>
                                <th className="px-5 py-3">학과</th>
                                <th className="px-5 py-3">상태</th>
                                <th className="px-5 py-3">가입일</th>
                                <th className="px-5 py-3">최근 로그인</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading && (
                                <tr>
                                    <td colSpan={7} className="px-5 py-16 text-center">
                                        <RefreshCw className="mx-auto size-6 animate-spin text-primary" />
                                    </td>
                                </tr>
                            )}
                            {!loading && result?.content.map((user) => (
                                <tr
                                    key={user.memberId}
                                    onClick={() => void openDetail(user)}
                                    className={`cursor-pointer font-semibold text-slate-700 transition ${
                                        detail?.user.memberId === user.memberId
                                            ? "bg-primary/5"
                                            : "hover:bg-primary/60"
                                    }`}
                                >
                                    <td className="px-5 py-4">
                                        <p className="truncate font-black text-slate-950" title={user.memberName}>
                                            {user.memberName}
                                        </p>
                                        <p className="mt-1 truncate text-xs text-slate-400" title={user.loginId}>
                                            {user.loginId}
                                        </p>
                                    </td>
                                    <td className="px-5 py-4">
                                        <p className="truncate" title={user.univName ?? undefined}>
                                            {displayAssigned(user.univName)}
                                        </p>
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-4">{ROLE_LABEL[user.role]}</td>
                                    <td className="px-5 py-4">
                                        <p className="truncate" title={user.deptName ?? undefined}>
                                            {displayAssigned(user.deptName)}
                                        </p>
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-4">
                                        <StatusBadge status={user.status} />
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                                        {formatDate(user.createdAt)}
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                                        {formatLoginDateTime(user.logtimeAt)}
                                    </td>
                                </tr>
                            ))}
                            {!loading && result?.content.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-5 py-16 text-center font-bold text-slate-400">
                                        조건에 맞는 이용자가 없습니다.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <ServiceAdminPagination
                    page={page}
                    totalPages={result?.totalPages ?? 0}
                    first={page === 0}
                    last={result?.last ?? true}
                    paginationItems={paginationItems}
                    onChange={setPage}
                />
            </section>

            {detail && (
                <div
                    className={`fixed inset-0 z-50 transition ${
                        isDetailOpen ? "pointer-events-auto" : "pointer-events-none"
                    }`}
                    aria-hidden={!isDetailOpen}
                >
                    <button
                        type="button"
                        onClick={closeDetail}
                        className={`absolute inset-0 bg-slate-950/35 backdrop-blur-[1px] transition-opacity duration-300 ${
                            isDetailOpen ? "opacity-100" : "opacity-0"
                        }`}
                        aria-label="이용자 상세 닫기"
                    />

                    <aside
                        role="dialog"
                        aria-modal="true"
                        aria-label={`${detail.user.memberName} 이용자 상세`}
                        className={`absolute inset-y-0 right-0 flex w-full max-w-[760px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
                            isDetailOpen ? "translate-x-0" : "translate-x-full"
                        }`}
                    >
                        <div className="flex items-start justify-between border-b border-slate-100 px-7 py-6">
                            <div className="min-w-0">
                                <p className="text-xs font-extrabold text-primary">이용자 상세</p>
                                <h2 className="mt-2 truncate text-2xl font-black">{detail.user.memberName}</h2>
                                <p className="mt-1 truncate text-sm font-semibold text-slate-400">
                                    {detail.user.loginId}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <StatusBadge status={detail.user.status} />
                                <button
                                    type="button"
                                    onClick={closeDetail}
                                    className="flex size-10 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                    aria-label="닫기"
                                >
                                    <X className="size-5" />
                                </button>
                            </div>
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto px-7 py-6">
                            {detailLoading && (
                                <div className="mb-5 flex items-center gap-2 rounded-xl bg-primary/5 px-4 py-3 text-sm font-bold text-primary">
                                    <RefreshCw className="size-4 animate-spin" />
                                    상세 정보를 불러오는 중입니다.
                                </div>
                            )}

                            <section className="rounded-2xl bg-[var(--accent)] p-5">
                                <p className="text-xs font-extrabold text-primary">기본 정보</p>
                                <dl className="mt-5 grid gap-x-6 gap-y-5 sm:grid-cols-2">
                                    {[
                                        ["소속 학교", displayAssigned(detail.user.univName)],
                                        ["역할", ROLE_LABEL[detail.user.role]],
                                        ["학과", displayAssigned(detail.user.deptName)],
                                        ["커뮤니티 닉네임", detail.user.communityNickname ?? "-"],
                                        ["연락처", formatPhoneNumber(detail.user.phoneNumber)],
                                        ["생년월일", detail.user.birth ?? "-"],
                                        ["가입일", formatDateTime(detail.user.createdAt)],
                                        ["최근 로그인", formatLoginDateTime(detail.user.logtimeAt)],
                                    ].map(([label, value]) => (
                                        <div key={label}>
                                            <dt className="text-xs font-extrabold text-slate-400">{label}</dt>
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
                                        <p className="mt-1 text-xs font-semibold text-slate-400">
                                            정지와 탈퇴 처리 시 현재 Redis 세션은 함께 만료됩니다.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => void forceLogout()}
                                        disabled={loggingOutMemberId === detail.user.memberId}
                                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-4 text-sm font-black text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                                    >
                                        <LogIn className="size-4" />
                                        전체 기기 로그아웃
                                    </button>
                                </div>
                                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                                    {(["ACTIVE", "SUSPENDED", "WITHDRAWN"] as MemberStatus[]).map((nextStatus) => (
                                        <button
                                            key={nextStatus}
                                            onClick={() => void changeStatus(nextStatus)}
                                            disabled={
                                                detail.user.status === nextStatus ||
                                                changingMemberId === detail.user.memberId
                                            }
                                            className="h-10 rounded-lg border border-slate-200 text-sm font-black text-slate-700 hover:border-primary/20 hover:text-primary disabled:bg-slate-50 disabled:text-slate-300"
                                        >
                                            {STATUS_LABEL[nextStatus]} 처리
                                        </button>
                                    ))}
                                </div>
                            </section>

                            <section className="mt-6">
                                <h3 className="font-black">활동 요약</h3>
                                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                    {[
                                        {
                                            key: "login" as const,
                                            label: "로그인 로그",
                                            value: loginLogPage?.totalElements ?? detail.loginLogs.length,
                                            icon: LogIn,
                                        },
                                        { key: "posts" as const, label: "게시글", value: detail.summary.postCount, icon: FileText },
                                        { key: "comments" as const, label: "댓글", value: detail.summary.commentCount, icon: MessageSquareText },
                                        { key: "courses" as const, label: "강의", value: detail.summary.courseCount, icon: BookOpen },
                                        { key: "submissions" as const, label: "제출", value: detail.summary.submissionCount, icon: GraduationCap },
                                        { key: "reservations" as const, label: "예약", value: detail.summary.reservationCount, icon: CalendarDays },
                                        { key: "penalties" as const, label: "노쇼/제한", value: detail.summary.noShowCount, icon: AlertTriangle },
                                        { key: "inquiries" as const, label: "문의", value: detail.summary.inquiryCount, icon: ShieldCheck },
                                    ].map(({ key, label, value, icon: Icon }) => (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => {
                                                setActiveActivitySection(key);
                                                setActivityPage(0);
                                            }}
                                            className={`flex min-h-[78px] flex-col justify-between rounded-xl border bg-white px-3 py-3 text-left transition ${
                                                activeActivitySection === key
                                                    ? "border-primary/30 bg-primary/5"
                                                    : "border-slate-200 hover:border-primary/20 hover:bg-primary/50"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-xs font-extrabold text-slate-400">{label}</p>
                                                <Icon className="size-4 text-primary" />
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
                                {activityLoading && (
                                    <div className="mb-3 flex items-center gap-2 rounded-xl bg-primary/5 px-4 py-3 text-sm font-bold text-primary">
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
                                    onPageChange={setActivityPage}
                                />
                            </section>
                        </div>
                    </aside>
                </div>
            )}
            {isBulkSignupOpen && (
                <ServiceAdminBulkSignupModal
                    onClose={() => setIsBulkSignupOpen(false)}
                    onCompleted={() => void loadUsers()}
                />
            )}
        </div>
    );
}
