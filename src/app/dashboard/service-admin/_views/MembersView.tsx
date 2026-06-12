"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
    Ban,
    BookOpen,
    Building2,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    FileText,
    LogIn,
    MessageSquareText,
    RotateCcw,
    Search,
    ShieldCheck,
    TriangleAlert,
    Upload,
    UserRoundCheck,
    UserRoundX,
    UsersRound,
    X,
} from "lucide-react";
import {
    getMockMemberActivity,
    getMockMemberReservations,
} from "../_mockData";
import type {
    MemberReservationSummary,
    MemberRole,
    MemberStatus,
    ReservationPenaltyStatus,
    SeatReservationStatus,
    ServiceMember,
    ServiceSchool,
} from "../_types";

type MemberSort =
    | "joined-desc"
    | "joined-asc"
    | "name-asc"
    | "school-asc"
    | "role-asc";

type ActivityTab =
    | "community"
    | "access"
    | "courses"
    | "submissions"
    | "reservations";
type ActivityPeriod = "7" | "30" | "90" | "ALL";

interface MembersViewProps {
    schools: ServiceSchool[];
    members: ServiceMember[];
    onChangeStatus: (memberId: number, status: MemberStatus) => void;
    onOpenSchool: (school: ServiceSchool) => void;
}

const PAGE_SIZE = 10;

const ROLE_LABEL: Record<MemberRole, string> = {
    STU: "학생",
    PROF: "교수",
    ADM: "학교 관리자",
};

const STATUS_LABEL: Record<MemberStatus, string> = {
    ACTIVE: "활성",
    SUSPENDED: "정지",
    WITHDRAWN: "탈퇴",
};

const RESERVATION_STATUS_LABEL: Record<SeatReservationStatus, string> = {
    RESERVED: "예약 예정",
    COMPLETED: "이용 완료",
    CANCELED: "예약 취소",
    NO_SHOW: "노쇼",
};

const RESERVATION_STATUS_STYLE: Record<SeatReservationStatus, string> = {
    RESERVED: "bg-sky-100 text-sky-700",
    COMPLETED: "bg-emerald-100 text-emerald-700",
    CANCELED: "bg-slate-100 text-slate-600",
    NO_SHOW: "bg-rose-100 text-rose-700",
};

const PENALTY_STATUS_LABEL: Record<ReservationPenaltyStatus, string> = {
    ACTIVE: "적용 중",
    EXPIRED: "기간 종료",
    CANCELED: "관리자 해제",
};

function MemberStatusBadge({ status }: { status: MemberStatus }) {
    const style =
        status === "ACTIVE"
            ? "bg-emerald-100 text-emerald-700"
            : status === "SUSPENDED"
                ? "bg-amber-100 text-amber-700"
                : "bg-slate-100 text-slate-500";

    return (
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-extrabold ${style}`}>
            {STATUS_LABEL[status]}
        </span>
    );
}

function ActivityEmpty({ message }: { message: string }) {
    return (
        <div className="px-5 py-10 text-center">
            <p className="text-sm font-bold text-slate-400">{message}</p>
        </div>
    );
}

export default function MembersView({
    schools,
    members,
    onChangeStatus,
    onOpenSchool,
}: MembersViewProps) {
    const [search, setSearch] = useState("");
    const [schoolId, setSchoolId] = useState<"ALL" | number>("ALL");
    const [role, setRole] = useState<"ALL" | MemberRole>("ALL");
    const [status, setStatus] = useState<"ALL" | MemberStatus>("ALL");
    const [sort, setSort] = useState<MemberSort>("joined-desc");
    const [page, setPage] = useState(1);
    const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [activityTab, setActivityTab] = useState<ActivityTab>("community");
    const [activityPeriod, setActivityPeriod] = useState<ActivityPeriod>("30");
    const [reservationOverrides, setReservationOverrides] = useState<
        Record<number, MemberReservationSummary>
    >({});
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const schoolMap = useMemo(
        () => new Map(schools.map((school) => [school.id, school])),
        [schools],
    );

    const filteredMembers = useMemo(() => {
        const keyword = search.trim().toLocaleLowerCase("ko-KR");
        const result = members.filter((member) => {
            const school = schoolMap.get(member.schoolId);
            const matchesSearch =
                !keyword ||
                member.name.toLocaleLowerCase("ko-KR").includes(keyword) ||
                member.loginId.toLocaleLowerCase("ko-KR").includes(keyword) ||
                member.email.toLocaleLowerCase("ko-KR").includes(keyword);
            const matchesSchool = schoolId === "ALL" || member.schoolId === schoolId;
            const matchesRole = role === "ALL" || member.role === role;
            const matchesStatus = status === "ALL" || member.status === status;

            return Boolean(school) && matchesSearch && matchesSchool && matchesRole && matchesStatus;
        });

        return [...result].sort((a, b) => {
            const schoolA = schoolMap.get(a.schoolId)?.name ?? "";
            const schoolB = schoolMap.get(b.schoolId)?.name ?? "";

            if (sort === "joined-asc") return a.joinedAt.localeCompare(b.joinedAt);
            if (sort === "joined-desc") return b.joinedAt.localeCompare(a.joinedAt);
            if (sort === "school-asc") return schoolA.localeCompare(schoolB, "ko-KR");
            if (sort === "role-asc") return ROLE_LABEL[a.role].localeCompare(ROLE_LABEL[b.role], "ko-KR");
            return a.name.localeCompare(b.name, "ko-KR");
        });
    }, [members, role, schoolId, schoolMap, search, sort, status]);

    const totalPages = Math.max(1, Math.ceil(filteredMembers.length / PAGE_SIZE));
    const pagedMembers = filteredMembers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const visiblePages = Array.from(
        { length: Math.min(5, totalPages) },
        (_, index) => {
            const start = Math.min(
                Math.max(1, page - 2),
                Math.max(1, totalPages - 4),
            );
            return start + index;
        },
    );
    const selectedMember =
        members.find((member) => member.id === selectedMemberId) ?? null;
    const selectedSchool = selectedMember
        ? schoolMap.get(selectedMember.schoolId) ?? null
        : null;
    const memberActivity = useMemo(
        () => selectedMember ? getMockMemberActivity(selectedMember) : null,
        [selectedMember],
    );
    const baseReservationSummary = useMemo(
        () => selectedMember ? getMockMemberReservations(selectedMember) : null,
        [selectedMember],
    );
    const reservationSummary = selectedMember
        ? reservationOverrides[selectedMember.id] ?? baseReservationSummary
        : null;

    const stats = {
        total: members.length,
        active: members.filter((member) => member.status === "ACTIVE").length,
        suspended: members.filter((member) => member.status === "SUSPENDED").length,
        admins: members.filter((member) => member.role === "ADM").length,
    };

    useEffect(() => {
        setPage(1);
    }, [role, schoolId, search, sort, status]);

    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    useEffect(() => {
        if (!selectedMemberId) return;

        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "";
        };
    }, [selectedMemberId]);

    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape" && isDetailOpen) {
                setIsDetailOpen(false);
                closeTimerRef.current = setTimeout(() => {
                    setSelectedMemberId(null);
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

    const openMemberDetail = (memberId: number) => {
        if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }

        setSelectedMemberId(memberId);
        setActivityTab("community");
        setActivityPeriod("30");
        requestAnimationFrame(() => {
            requestAnimationFrame(() => setIsDetailOpen(true));
        });
    };

    const closeMemberDetail = () => {
        setIsDetailOpen(false);
        closeTimerRef.current = setTimeout(() => {
            setSelectedMemberId(null);
            closeTimerRef.current = null;
        }, 300);
    };

    const isWithinPeriod = (dateTime: string) => {
        if (activityPeriod === "ALL") return true;
        const target = new Date(dateTime.replace(" ", "T"));
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - Number(activityPeriod));
        return target >= cutoff;
    };

    const filteredActivity = memberActivity
        ? {
            ...memberActivity,
            community: memberActivity.community.filter((item) => isWithinPeriod(item.createdAt)),
            accessLogs: memberActivity.accessLogs.filter((item) => isWithinPeriod(item.occurredAt)),
            submissions: memberActivity.submissions.filter((item) => isWithinPeriod(item.submittedAt)),
        }
        : null;
    const filteredReservations = reservationSummary
        ? reservationSummary.reservations.filter((item) => isWithinPeriod(item.startTime))
        : [];
    const filteredPenalties = reservationSummary
        ? reservationSummary.penalties.filter((item) => isWithinPeriod(item.createdAt))
        : [];

    const activityTabs = selectedMember
        ? [
            { key: "community" as const, label: "게시글·댓글", icon: MessageSquareText },
            { key: "access" as const, label: "접속 기록", icon: LogIn },
            ...(selectedMember.role === "ADM"
                ? []
                : [
                    {
                        key: "courses" as const,
                        label: selectedMember.role === "PROF" ? "담당 강좌" : "수강 강좌",
                        icon: BookOpen,
                    },
                    {
                        key: "submissions" as const,
                        label: selectedMember.role === "PROF" ? "자료 업로드" : "제출 파일",
                        icon: Upload,
                    },
                ]),
            {
                key: "reservations" as const,
                label: "예약·노쇼",
                icon: CalendarDays,
            },
        ]
        : [];

    const communitySummary = memberActivity
        ? {
            posts: memberActivity.community.filter((item) => item.type === "POST").length,
            comments: memberActivity.community.filter((item) => item.type === "COMMENT").length,
        }
        : { posts: 0, comments: 0 };

    const updateReservationSummary = (
        updater: (current: MemberReservationSummary) => MemberReservationSummary,
    ) => {
        if (!selectedMember || !reservationSummary) return;
        setReservationOverrides((current) => ({
            ...current,
            [selectedMember.id]: updater(reservationSummary),
        }));
    };

    const releaseReservationRestriction = () => {
        updateReservationSummary((current) => ({
            ...current,
            isRestricted: false,
            restrictedUntil: null,
            penalties: current.penalties.map((penalty) =>
                penalty.status === "ACTIVE"
                    ? {
                        ...penalty,
                        status: "CANCELED",
                        endTime: "2026-06-12 12:00",
                    }
                    : penalty,
            ),
        }));
    };

    const applyReservationRestriction = () => {
        updateReservationSummary((current) => ({
            ...current,
            isRestricted: true,
            restrictedUntil: "2026-06-19 23:59",
            penalties: [
                {
                    id: selectedMember ? selectedMember.id * 600 + 99 : 0,
                    type: "MANUAL",
                    reason: "서비스 관리자 수동 예약 제한",
                    startTime: "2026-06-12 12:00",
                    endTime: "2026-06-19 23:59",
                    status: "ACTIVE",
                    createdAt: "2026-06-12 12:00",
                },
                ...current.penalties,
            ],
        }));
    };

    const resetNoShowCount = () => {
        updateReservationSummary((current) => ({
            ...current,
            noShowCount: 0,
            isRestricted: false,
            restrictedUntil: null,
            penalties: current.penalties.map((penalty) =>
                penalty.status === "ACTIVE"
                    ? {
                        ...penalty,
                        status: "CANCELED",
                        endTime: "2026-06-12 12:00",
                    }
                    : penalty,
            ),
        }));
    };

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-2xl font-black tracking-tight">회원 관리</h1>
                <p className="mt-1 text-sm text-slate-500">
                    전체 학교의 학생, 교수, 학교 관리자 계정을 통합 조회합니다.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                {[
                    { label: "전체 회원", value: stats.total, icon: UsersRound, color: "text-slate-700" },
                    { label: "활성 회원", value: stats.active, icon: UserRoundCheck, color: "text-emerald-700" },
                    { label: "정지 회원", value: stats.suspended, icon: UserRoundX, color: "text-amber-600" },
                    { label: "학교 관리자", value: stats.admins, icon: ShieldCheck, color: "text-sky-700" },
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
                <div className="grid gap-3 xl:grid-cols-[minmax(260px,1fr)_200px_150px_150px_190px]">
                    <label className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="이름, 학번/사번, 이메일 검색"
                            className="h-11 w-full rounded-lg border border-slate-200 pl-10 pr-3 text-sm font-semibold outline-none focus:border-emerald-500"
                        />
                    </label>

                    <select
                        value={schoolId}
                        onChange={(event) =>
                            setSchoolId(event.target.value === "ALL" ? "ALL" : Number(event.target.value))
                        }
                        className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-500"
                    >
                        <option value="ALL">전체 학교</option>
                        {schools.map((school) => (
                            <option key={school.id} value={school.id}>{school.name}</option>
                        ))}
                    </select>

                    <select
                        value={role}
                        onChange={(event) => setRole(event.target.value as "ALL" | MemberRole)}
                        className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-500"
                    >
                        <option value="ALL">전체 역할</option>
                        <option value="STU">학생</option>
                        <option value="PROF">교수</option>
                        <option value="ADM">학교 관리자</option>
                    </select>

                    <select
                        value={status}
                        onChange={(event) => setStatus(event.target.value as "ALL" | MemberStatus)}
                        className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-500"
                    >
                        <option value="ALL">전체 상태</option>
                        <option value="ACTIVE">활성</option>
                        <option value="SUSPENDED">정지</option>
                        <option value="WITHDRAWN">탈퇴</option>
                    </select>

                    <select
                        value={sort}
                        onChange={(event) => setSort(event.target.value as MemberSort)}
                        className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-500"
                    >
                        <option value="joined-desc">최근 가입순</option>
                        <option value="joined-asc">오래된 가입순</option>
                        <option value="name-asc">이름순</option>
                        <option value="school-asc">학교 이름순</option>
                        <option value="role-asc">역할순</option>
                    </select>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
                    <p className="font-bold text-slate-500">
                        검색 결과 <span className="text-emerald-700">{filteredMembers.length}</span>명
                    </p>
                    <button
                        onClick={() => {
                            setSearch("");
                            setSchoolId("ALL");
                            setRole("ALL");
                            setStatus("ALL");
                            setSort("joined-desc");
                        }}
                        className="font-extrabold text-slate-500 hover:text-emerald-700"
                    >
                        필터 초기화
                    </button>
                </div>
            </section>

            <div>
                <section className="overflow-hidden rounded-2xl border border-emerald-900/10 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[980px] text-left text-sm">
                            <thead className="bg-slate-50 text-xs font-extrabold text-slate-500">
                                <tr>
                                    <th className="px-5 py-3">회원</th>
                                    <th className="px-5 py-3">학교</th>
                                    <th className="px-5 py-3">역할</th>
                                    <th className="px-5 py-3">학과/부서</th>
                                    <th className="px-5 py-3">상태</th>
                                    <th className="px-5 py-3">가입일</th>
                                    <th className="px-5 py-3">최근 로그인</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {pagedMembers.map((member) => (
                                    <tr
                                        key={member.id}
                                        onClick={() => openMemberDetail(member.id)}
                                        className={`cursor-pointer font-semibold text-slate-700 transition ${
                                            member.id === selectedMemberId
                                                ? "bg-emerald-50"
                                                : "hover:bg-emerald-50/60"
                                        }`}
                                    >
                                        <td className="px-5 py-4">
                                            <p className="font-black text-slate-950">{member.name}</p>
                                            <p className="mt-1 text-xs text-slate-400">{member.loginId}</p>
                                        </td>
                                        <td className="px-5 py-4">{schoolMap.get(member.schoolId)?.name}</td>
                                        <td className="px-5 py-4">{ROLE_LABEL[member.role]}</td>
                                        <td className="px-5 py-4">{member.department}</td>
                                        <td className="px-5 py-4">
                                            <MemberStatusBadge status={member.status} />
                                        </td>
                                        <td className="px-5 py-4 text-slate-500">{member.joinedAt}</td>
                                        <td className="px-5 py-4 text-slate-500">{member.lastLoginAt}</td>
                                    </tr>
                                ))}
                                {pagedMembers.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-5 py-16 text-center font-bold text-slate-400">
                                            조건에 맞는 회원이 없습니다.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
                        <p className="text-sm font-bold text-slate-400">
                            {page} / {totalPages} 페이지
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage((current) => Math.max(1, current - 1))}
                                disabled={page === 1}
                                className="flex size-9 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40"
                                aria-label="이전 페이지"
                            >
                                <ChevronLeft className="size-4" />
                            </button>
                            {visiblePages.map((pageNumber) => (
                                <button
                                    key={pageNumber}
                                    onClick={() => setPage(pageNumber)}
                                    className={`size-9 rounded-lg text-sm font-black ${
                                        page === pageNumber
                                            ? "bg-emerald-700 text-white"
                                            : "border border-slate-200 text-slate-600"
                                    }`}
                                >
                                    {pageNumber}
                                </button>
                            ))}
                            <button
                                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                                disabled={page === totalPages}
                                className="flex size-9 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40"
                                aria-label="다음 페이지"
                            >
                                <ChevronRight className="size-4" />
                            </button>
                        </div>
                    </div>
                </section>
            </div>

            {selectedMember && selectedSchool && (
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
                        aria-label="회원 상세 닫기"
                    />

                    <aside
                        role="dialog"
                        aria-modal="true"
                        aria-label={`${selectedMember.name} 회원 상세`}
                        className={`absolute inset-y-0 right-0 flex w-full max-w-[720px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
                            isDetailOpen ? "translate-x-0" : "translate-x-full"
                        }`}
                    >
                        <div className="flex items-start justify-between border-b border-slate-100 px-7 py-6">
                            <div>
                                <p className="text-xs font-extrabold text-emerald-700">회원 상세</p>
                                <h2 className="mt-2 text-2xl font-black">{selectedMember.name}</h2>
                                <p className="mt-1 text-sm font-semibold text-slate-400">
                                    {selectedMember.loginId}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <MemberStatusBadge status={selectedMember.status} />
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
                                <p className="text-xs font-extrabold text-emerald-800">기본 정보</p>
                                <dl className="mt-5 grid gap-x-6 gap-y-5 sm:grid-cols-2">
                                    {[
                                        ["소속 학교", selectedSchool.name],
                                        ["역할", ROLE_LABEL[selectedMember.role]],
                                        ["학과/부서", selectedMember.department],
                                        ["이메일", selectedMember.email],
                                        ["연락처", selectedMember.phone],
                                        ["가입일", selectedMember.joinedAt],
                                        ["최근 로그인", selectedMember.lastLoginAt],
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

                            {memberActivity && filteredActivity && (
                                <section className="mt-6">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                                        <div>
                                            <h3 className="font-black">활동 기록</h3>
                                            <p className="mt-1 text-xs font-semibold text-slate-400">
                                                문의 대응과 운영 확인을 위한 최근 사용자 활동 목업입니다.
                                            </p>
                                        </div>
                                        {activityTab !== "courses" && (
                                            <select
                                                value={activityPeriod}
                                                onChange={(event) =>
                                                    setActivityPeriod(event.target.value as ActivityPeriod)
                                                }
                                                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-extrabold outline-none focus:border-emerald-500"
                                            >
                                                <option value="7">최근 7일</option>
                                                <option value="30">최근 30일</option>
                                                <option value="90">최근 90일</option>
                                                <option value="ALL">전체 기간</option>
                                            </select>
                                        )}
                                    </div>

                                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
                                        {[
                                            {
                                                label: "게시글",
                                                value: communitySummary.posts,
                                                icon: FileText,
                                            },
                                            {
                                                label: "댓글",
                                                value: communitySummary.comments,
                                                icon: MessageSquareText,
                                            },
                                            {
                                                label: selectedMember.role === "PROF" ? "담당 강좌" : "수강 강좌",
                                                value: memberActivity.courses.length,
                                                icon: BookOpen,
                                            },
                                            {
                                                label: selectedMember.role === "PROF" ? "업로드" : "제출 파일",
                                                value: memberActivity.submissions.length,
                                                icon: Upload,
                                            },
                                            {
                                                label: "접속 기록",
                                                value: memberActivity.accessLogs.length,
                                                icon: LogIn,
                                            },
                                            {
                                                label: "누적 노쇼",
                                                value: reservationSummary?.noShowCount ?? 0,
                                                icon: TriangleAlert,
                                            },
                                        ].map(({ label, value, icon: Icon }) => (
                                            <div
                                                key={label}
                                                className="flex min-h-[82px] flex-col justify-between rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm"
                                            >
                                                <div className="flex min-h-4 items-start justify-between gap-2">
                                                    <p className="text-[11px] font-extrabold leading-4 text-slate-400">
                                                        {label}
                                                    </p>
                                                    <Icon className="mt-0.5 size-3.5 shrink-0 text-emerald-700" />
                                                </div>
                                                <p className="text-lg font-black leading-none">{value}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-5 overflow-x-auto border-b border-slate-200">
                                        <div className="flex min-w-[650px]">
                                            {activityTabs.map(({ key, label, icon: Icon }) => (
                                                <button
                                                    key={key}
                                                    type="button"
                                                    onClick={() => setActivityTab(key)}
                                                    className={`flex h-11 min-w-[130px] flex-1 items-center justify-center gap-2 border-b-2 px-3 text-sm font-extrabold transition-colors ${
                                                        activityTab === key
                                                            ? "border-emerald-700 text-emerald-700"
                                                            : "border-transparent text-slate-400 hover:text-slate-700"
                                                    }`}
                                                >
                                                    <Icon className="size-4" />
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                                        {activityTab === "community" && (
                                            <div className="divide-y divide-slate-100">
                                                <div className="hidden grid-cols-[72px_minmax(0,1fr)_132px] gap-3 bg-slate-50 px-4 py-2.5 text-[11px] font-extrabold text-slate-400 sm:grid">
                                                    <span>구분</span>
                                                    <span>활동 내용</span>
                                                    <span className="text-right">작성 일시</span>
                                                </div>
                                                {filteredActivity.community.map((item) => (
                                                    <div
                                                        key={item.id}
                                                        className="grid min-h-[68px] items-center gap-3 px-4 py-3 sm:grid-cols-[72px_minmax(0,1fr)_132px]"
                                                    >
                                                        <span
                                                            className={`inline-flex h-8 w-[64px] items-center justify-center whitespace-nowrap rounded-full px-2 text-[11px] font-extrabold ${
                                                                item.type === "POST"
                                                                    ? "bg-sky-100 text-sky-700"
                                                                    : "bg-violet-100 text-violet-700"
                                                            }`}
                                                        >
                                                            {item.type === "POST" ? "게시글" : "댓글"}
                                                        </span>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <p className="truncate text-sm font-black text-slate-800">
                                                                    {item.title}
                                                                </p>
                                                                {item.status === "DELETED" && (
                                                                    <span className="shrink-0 text-[11px] font-extrabold text-rose-500">
                                                                        삭제됨
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="mt-1 text-xs font-semibold text-slate-400">{item.board}</p>
                                                        </div>
                                                        <p className="whitespace-nowrap text-left text-xs font-bold tabular-nums text-slate-400 sm:text-right">
                                                            {item.createdAt}
                                                        </p>
                                                    </div>
                                                ))}
                                                {filteredActivity.community.length === 0 && (
                                                    <ActivityEmpty message="선택한 기간의 게시글·댓글 기록이 없습니다." />
                                                )}
                                            </div>
                                        )}

                                        {activityTab === "access" && (
                                            <div className="divide-y divide-slate-100">
                                                <div className="hidden grid-cols-[88px_minmax(0,1fr)_148px] gap-3 bg-slate-50 px-4 py-2.5 text-[11px] font-extrabold text-slate-400 sm:grid">
                                                    <span>상태</span>
                                                    <span>접속 환경</span>
                                                    <span className="text-right">접속 일시</span>
                                                </div>
                                                {filteredActivity.accessLogs.map((item) => (
                                                    <div
                                                        key={item.id}
                                                        className="grid min-h-[68px] items-center gap-3 px-4 py-3 sm:grid-cols-[88px_minmax(0,1fr)_148px]"
                                                    >
                                                        <span
                                                            className={`inline-flex h-8 w-[76px] items-center justify-center whitespace-nowrap rounded-full px-2 text-[11px] font-extrabold ${
                                                                item.type === "LOGIN"
                                                                    ? "bg-emerald-100 text-emerald-700"
                                                                    : item.type === "LOGOUT"
                                                                        ? "bg-slate-100 text-slate-600"
                                                                        : "bg-rose-100 text-rose-600"
                                                            }`}
                                                        >
                                                            {item.type === "LOGIN"
                                                                ? "로그인"
                                                                : item.type === "LOGOUT"
                                                                    ? "로그아웃"
                                                                    : "로그인 실패"}
                                                        </span>
                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-black text-slate-800">
                                                                {item.device}
                                                            </p>
                                                            <p className="mt-1 truncate text-xs font-semibold text-slate-400">
                                                                IP {item.ipAddress}
                                                            </p>
                                                        </div>
                                                        <p className="whitespace-nowrap text-left text-xs font-bold tabular-nums text-slate-400 sm:text-right">
                                                            {item.occurredAt}
                                                        </p>
                                                    </div>
                                                ))}
                                                {filteredActivity.accessLogs.length === 0 && (
                                                    <ActivityEmpty message="선택한 기간의 접속 기록이 없습니다." />
                                                )}
                                            </div>
                                        )}

                                        {activityTab === "courses" && (
                                            <div className="divide-y divide-slate-100">
                                                {memberActivity.courses.map((course) => (
                                                    <div key={course.id} className="min-h-[76px] px-4 py-4">
                                                        <div className="grid items-start gap-3 sm:grid-cols-[minmax(0,1fr)_88px]">
                                                            <div className="min-w-0">
                                                                <p className="font-black text-slate-800">{course.courseName}</p>
                                                                <p className="mt-1 text-xs font-semibold text-slate-400">
                                                                    {course.semester} · 담당 {course.professorName}
                                                                </p>
                                                            </div>
                                                            <span className="inline-flex h-8 w-[88px] items-center justify-center whitespace-nowrap rounded-full bg-emerald-100 px-2 text-[11px] font-extrabold text-emerald-700">
                                                                {course.status === "TEACHING"
                                                                    ? "담당 중"
                                                                    : course.status === "COMPLETED"
                                                                        ? "수강 완료"
                                                                        : "수강 중"}
                                                            </span>
                                                        </div>
                                                        {selectedMember.role === "STU" && (
                                                            <div className="mt-3">
                                                                <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                                                                    <span>학습 진도</span>
                                                                    <span>{course.progress}%</span>
                                                                </div>
                                                                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                                                                    <div
                                                                        className="h-full rounded-full bg-emerald-600"
                                                                        style={{ width: `${course.progress}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                                {memberActivity.courses.length === 0 && (
                                                    <ActivityEmpty message="강좌 기록이 없습니다." />
                                                )}
                                            </div>
                                        )}

                                        {activityTab === "submissions" && (
                                            <div className="divide-y divide-slate-100">
                                                {filteredActivity.submissions.map((item) => (
                                                    <div key={item.id} className="px-4 py-4">
                                                        <div className="grid items-start gap-3 sm:grid-cols-[minmax(0,1fr)_88px]">
                                                            <div className="min-w-0">
                                                                <p className="truncate font-black text-slate-800">
                                                                    {item.assignmentName}
                                                                </p>
                                                                <p className="mt-1 text-xs font-semibold text-slate-400">
                                                                    {item.courseName}
                                                                </p>
                                                            </div>
                                                            <span
                                                                className={`inline-flex h-8 w-[88px] items-center justify-center whitespace-nowrap rounded-full px-2 text-[11px] font-extrabold ${
                                                                    item.status === "SUBMITTED"
                                                                        ? "bg-emerald-100 text-emerald-700"
                                                                        : item.status === "LATE"
                                                                            ? "bg-amber-100 text-amber-700"
                                                                            : "bg-rose-100 text-rose-600"
                                                                }`}
                                                            >
                                                                {item.status === "SUBMITTED"
                                                                    ? "제출 완료"
                                                                    : item.status === "LATE"
                                                                        ? "지각 제출"
                                                                        : "반려"}
                                                            </span>
                                                        </div>
                                                        <div className="mt-3 flex flex-col gap-1 rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                                                            <span className="truncate">{item.fileName} · {item.fileSize}</span>
                                                            <span className="shrink-0">{item.submittedAt}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                                {filteredActivity.submissions.length === 0 && (
                                                    <ActivityEmpty message="선택한 기간의 제출·업로드 기록이 없습니다." />
                                                )}
                                            </div>
                                        )}

                                        {activityTab === "reservations" && reservationSummary && (
                                            <div>
                                                <div
                                                    className={`p-5 ${
                                                        reservationSummary.isRestricted
                                                            ? "bg-rose-50"
                                                            : "bg-emerald-50"
                                                    }`}
                                                >
                                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                                        <div className="flex items-start gap-3">
                                                            <div
                                                                className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${
                                                                    reservationSummary.isRestricted
                                                                        ? "bg-rose-100 text-rose-700"
                                                                        : "bg-emerald-100 text-emerald-700"
                                                                }`}
                                                            >
                                                                {reservationSummary.isRestricted
                                                                    ? <Ban className="size-5" />
                                                                    : <CalendarDays className="size-5" />}
                                                            </div>
                                                            <div>
                                                                <p
                                                                    className={`font-black ${
                                                                        reservationSummary.isRestricted
                                                                            ? "text-rose-800"
                                                                            : "text-emerald-800"
                                                                    }`}
                                                                >
                                                                    {reservationSummary.isRestricted
                                                                        ? "도서실 예약 제한 중"
                                                                        : "도서실 예약 가능"}
                                                                </p>
                                                                <p className="mt-1 text-xs font-semibold text-slate-500">
                                                                    {reservationSummary.isRestricted
                                                                        ? `${reservationSummary.restrictedUntil}까지 새 예약이 제한됩니다.`
                                                                        : "현재 적용 중인 예약 패널티가 없습니다."}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="shrink-0 text-left sm:text-right">
                                                            <p className="text-xs font-extrabold text-slate-400">누적 노쇼</p>
                                                            <p className="mt-1 text-2xl font-black text-slate-950">
                                                                {reservationSummary.noShowCount}
                                                                <span className="text-sm text-slate-400">
                                                                    {" "}/ {reservationSummary.restrictionThreshold}회
                                                                </span>
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="mt-4 rounded-xl bg-white/80 p-4">
                                                        <div className="flex items-center justify-between text-xs font-extrabold">
                                                            <span className="text-slate-500">자동 제한 기준</span>
                                                            <span className="text-rose-600">노쇼 3회</span>
                                                        </div>
                                                        <div className="mt-3 grid grid-cols-3 gap-2">
                                                            {Array.from({ length: 3 }, (_, index) => (
                                                                <div
                                                                    key={index}
                                                                    className={`h-2 rounded-full ${
                                                                        reservationSummary.noShowCount > index
                                                                            ? "bg-rose-500"
                                                                            : "bg-slate-200"
                                                                    }`}
                                                                />
                                                            ))}
                                                        </div>
                                                        <p className="mt-3 text-[11px] font-semibold leading-5 text-slate-400">
                                                            누적 횟수 초기화는 예약 이력을 삭제하지 않고 자동 제한 판정용 횟수만 0회로 변경합니다.
                                                        </p>
                                                    </div>

                                                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                                                        {reservationSummary.isRestricted ? (
                                                            <button
                                                                type="button"
                                                                onClick={releaseReservationRestriction}
                                                                className="flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-700 text-xs font-black text-white hover:bg-emerald-800 sm:col-span-2"
                                                            >
                                                                <ShieldCheck className="size-4" />
                                                                예약 제한 해제
                                                            </button>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={applyReservationRestriction}
                                                                className="flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-800 text-xs font-black text-white hover:bg-slate-900 sm:col-span-2"
                                                            >
                                                                <Ban className="size-4" />
                                                                7일 수동 제한
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={resetNoShowCount}
                                                            disabled={
                                                                reservationSummary.noShowCount === 0 &&
                                                                !reservationSummary.isRestricted
                                                            }
                                                            className="flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-xs font-black text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                                                        >
                                                            <RotateCcw className="size-4" />
                                                            횟수 초기화
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="border-t border-slate-200">
                                                    <div className="flex items-center justify-between bg-slate-50 px-4 py-3">
                                                        <p className="text-xs font-black text-slate-600">최근 좌석 예약 이력</p>
                                                        <p className="text-[11px] font-bold text-slate-400">
                                                            {filteredReservations.length}건
                                                        </p>
                                                    </div>
                                                    <div className="divide-y divide-slate-100">
                                                        {filteredReservations.map((reservation) => (
                                                            <div
                                                                key={reservation.id}
                                                                className="grid min-h-[72px] items-center gap-3 px-4 py-3 sm:grid-cols-[84px_minmax(0,1fr)_148px]"
                                                            >
                                                                <span
                                                                    className={`inline-flex h-8 w-[76px] items-center justify-center rounded-full text-[11px] font-extrabold ${
                                                                        RESERVATION_STATUS_STYLE[reservation.status]
                                                                    }`}
                                                                >
                                                                    {RESERVATION_STATUS_LABEL[reservation.status]}
                                                                </span>
                                                                <div className="min-w-0">
                                                                    <p className="truncate text-sm font-black text-slate-800">
                                                                        {reservation.roomName}
                                                                    </p>
                                                                    <p className="mt-1 text-xs font-semibold text-slate-400">
                                                                        좌석 {reservation.seatNumber}
                                                                    </p>
                                                                </div>
                                                                <div className="text-left text-xs font-bold tabular-nums text-slate-400 sm:text-right">
                                                                    <p>{reservation.startTime}</p>
                                                                    <p className="mt-1">~ {reservation.endTime}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {filteredReservations.length === 0 && (
                                                            <ActivityEmpty message="선택한 기간의 좌석 예약 이력이 없습니다." />
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="border-t border-slate-200">
                                                    <div className="flex items-center justify-between bg-slate-50 px-4 py-3">
                                                        <p className="text-xs font-black text-slate-600">예약 패널티 이력</p>
                                                        <p className="text-[11px] font-bold text-slate-400">
                                                            {filteredPenalties.length}건
                                                        </p>
                                                    </div>
                                                    <div className="divide-y divide-slate-100">
                                                        {filteredPenalties.map((penalty) => (
                                                            <div key={penalty.id} className="px-4 py-4">
                                                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                                    <div className="min-w-0">
                                                                        <div className="flex items-center gap-2">
                                                                            <p className="font-black text-slate-800">
                                                                                {penalty.type === "NO_SHOW"
                                                                                    ? "노쇼 자동 제한"
                                                                                    : "관리자 수동 제한"}
                                                                            </p>
                                                                            <span
                                                                                className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                                                                                    penalty.status === "ACTIVE"
                                                                                        ? "bg-rose-100 text-rose-700"
                                                                                        : "bg-slate-100 text-slate-500"
                                                                                }`}
                                                                            >
                                                                                {PENALTY_STATUS_LABEL[penalty.status]}
                                                                            </span>
                                                                        </div>
                                                                        <p className="mt-1 text-xs font-semibold text-slate-500">
                                                                            {penalty.reason}
                                                                        </p>
                                                                    </div>
                                                                    <p className="shrink-0 text-xs font-bold tabular-nums text-slate-400 sm:text-right">
                                                                        {penalty.startTime}
                                                                        <br />
                                                                        ~ {penalty.endTime}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {filteredPenalties.length === 0 && (
                                                            <ActivityEmpty message="선택한 기간의 예약 패널티 이력이 없습니다." />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            )}

                            <section className="mt-6 rounded-2xl border border-slate-200 p-5">
                                <p className="font-black">회원 상태 변경</p>
                                <p className="mt-1 text-xs font-semibold text-slate-400">
                                    서비스 관리자가 회원의 서비스 접근 상태를 변경합니다.
                                </p>
                                <div className="mt-5 grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => onChangeStatus(selectedMember.id, "ACTIVE")}
                                        disabled={
                                            selectedMember.status === "ACTIVE" ||
                                            selectedMember.status === "WITHDRAWN"
                                        }
                                        className="h-11 rounded-lg bg-emerald-700 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                                    >
                                        활성 처리
                                    </button>
                                    <button
                                        onClick={() => onChangeStatus(selectedMember.id, "SUSPENDED")}
                                        disabled={
                                            selectedMember.status === "SUSPENDED" ||
                                            selectedMember.status === "WITHDRAWN"
                                        }
                                        className="h-11 rounded-lg border border-amber-200 text-sm font-black text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                                    >
                                        이용 정지
                                    </button>
                                </div>
                                <p className="mt-3 text-xs font-semibold leading-5 text-slate-400">
                                    탈퇴 회원은 목업에서도 다시 활성화할 수 없습니다.
                                </p>
                            </section>
                        </div>

                        <div className="border-t border-slate-100 px-7 py-5">
                            <button
                                onClick={() => onOpenSchool(selectedSchool)}
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
