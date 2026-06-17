"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    AlertTriangle,
    Building2,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    RefreshCw,
    Search,
    ShieldCheck,
    UserRoundCheck,
    UserRoundX,
    X,
} from "lucide-react";
import {
    changeServiceAdminMemberStatus,
    getServiceAdminMembers,
    type ServiceAdminMember,
    type ServiceAdminMemberPage,
    type ServiceAdminMemberQuery,
} from "@/lib/serviceAdminApi";
import type { MemberStatus } from "../_types";

interface MembersViewProps {
    onOpenSchool: (schoolId: number) => void;
}

type AdminSort = NonNullable<ServiceAdminMemberQuery["sort"]>;
type PaginationItem = number | "ellipsis-start" | "ellipsis-end";

const PAGE_WINDOW_SIZE = 5;
const PAGE_JUMP_SIZE = 10;

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
    const [selectedMember, setSelectedMember] =
        useState<ServiceAdminMember | null>(null);
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

    const openMemberDetail = (member: ServiceAdminMember) => {
        if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }

        setSelectedMember(member);
        requestAnimationFrame(() => {
            requestAnimationFrame(() => setIsDetailOpen(true));
        });
    };

    const closeMemberDetail = () => {
        setIsDetailOpen(false);
        closeTimerRef.current = setTimeout(() => {
            setSelectedMember(null);
            closeTimerRef.current = null;
        }, 300);
    };

    const changeStatus = async (member: ServiceAdminMember) => {
        const nextStatus =
            member.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";

        if (
            nextStatus === "SUSPENDED" &&
            !window.confirm(
                `${member.univName}의 유일한 관리자 계정을 정지합니다.\n\n` +
                "해당 관리자는 즉시 로그인 및 관리자 기능 이용이 차단됩니다. " +
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

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-2xl font-black tracking-tight">회원 관리</h1>
                <p className="mt-1 text-sm text-slate-500">
                    학교별 관리자 계정을 조회하고 로그인 가능 상태를 관리합니다.
                </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
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
            </section>

            <section className="overflow-hidden rounded-2xl border border-emerald-900/10 bg-white shadow-sm">
                {error ? (
                    <div className="flex min-h-72 flex-col items-center justify-center p-6 text-center">
                        <AlertTriangle className="size-7 text-rose-500" />
                        <p className="mt-3 font-black text-slate-900">{error}</p>
                        <button
                            onClick={() => void loadMembers()}
                            className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-black text-white"
                        >
                            <RefreshCw className="size-4" />
                            다시 시도
                        </button>
                    </div>
                ) : (
                    <>
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
                                                onClick={() => openMemberDetail(member)}
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

                        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
                            <p className="text-sm font-bold text-slate-400">
                                {(result?.totalPages ?? 0) === 0 ? 0 : page + 1} /{" "}
                                {result?.totalPages ?? 0} 페이지
                            </p>
                            <div className="flex flex-wrap items-center justify-end gap-2">
                                <button
                                    onClick={() => setPage(0)}
                                    disabled={page === 0}
                                    className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                                    aria-label="맨 앞 페이지"
                                    title="맨 앞 페이지"
                                >
                                    <ChevronsLeft className="size-4" />
                                </button>
                                <button
                                    onClick={() => setPage((current) => current - PAGE_JUMP_SIZE)}
                                    disabled={page < PAGE_JUMP_SIZE}
                                    className="flex h-9 min-w-11 items-center justify-center rounded-lg border border-slate-200 px-2 text-xs font-black text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                                    aria-label="10페이지 앞으로"
                                    title="10페이지 앞으로"
                                >
                                    -10
                                </button>
                                <button
                                    onClick={() => setPage((current) => Math.max(0, current - 1))}
                                    disabled={result?.first ?? true}
                                    className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
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
                                            Math.min(
                                                Math.max(0, (result?.totalPages ?? 1) - 1),
                                                current + 1,
                                            ),
                                        )
                                    }
                                    disabled={result?.last ?? true}
                                    className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                                    aria-label="다음 페이지"
                                >
                                    <ChevronRight className="size-4" />
                                </button>
                                <button
                                    onClick={() => setPage((current) => current + PAGE_JUMP_SIZE)}
                                    disabled={
                                        page + PAGE_JUMP_SIZE >= (result?.totalPages ?? 0)
                                    }
                                    className="flex h-9 min-w-11 items-center justify-center rounded-lg border border-slate-200 px-2 text-xs font-black text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                                    aria-label="10페이지 뒤로"
                                    title="10페이지 뒤로"
                                >
                                    +10
                                </button>
                                <button
                                    onClick={() =>
                                        setPage(Math.max((result?.totalPages ?? 1) - 1, 0))
                                    }
                                    disabled={result?.last ?? true}
                                    className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                                    aria-label="맨 뒤 페이지"
                                    title="맨 뒤 페이지"
                                >
                                    <ChevronsRight className="size-4" />
                                </button>
                            </div>
                        </div>
                    </>
                )}
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
                        className={`absolute inset-y-0 right-0 flex w-full max-w-[640px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
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

                            <section className="mt-6 rounded-2xl border border-slate-200 p-5">
                                <p className="font-black">계정 상태 변경</p>
                                <p className="mt-1 text-xs font-semibold leading-5 text-slate-400">
                                    정지하면 해당 관리자만 즉시 로그인과 관리자 기능
                                    이용이 차단됩니다. 학교 정보, 구독, 자동 결제와
                                    학생·교수 서비스는 유지됩니다.
                                </p>
                                <div className="mt-5 grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => void changeStatus(selectedMember)}
                                        disabled={
                                            selectedMember.status === "ACTIVE" ||
                                            selectedMember.status === "WITHDRAWN" ||
                                            changingMemberId === selectedMember.memberId
                                        }
                                        className="h-11 rounded-lg bg-emerald-700 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
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
                                        className="h-11 rounded-lg border border-amber-200 text-sm font-black text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                                    >
                                        계정 정지
                                    </button>
                                </div>
                                {selectedMember.status === "WITHDRAWN" && (
                                    <p className="mt-3 text-xs font-semibold text-slate-400">
                                        탈퇴한 관리자 계정은 다시 활성화할 수 없습니다.
                                    </p>
                                )}
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
