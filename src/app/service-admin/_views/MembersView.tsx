"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Building2,
    ChevronLeft,
    ChevronRight,
    Search,
    ShieldCheck,
    UserRoundCheck,
    UserRoundX,
} from "lucide-react";
import type {
    MemberStatus,
    ServiceMember,
    ServiceSchool,
} from "../_types";

interface MembersViewProps {
    schools: ServiceSchool[];
    members: ServiceMember[];
    onChangeStatus: (memberId: number, status: MemberStatus) => void;
    onOpenSchool: (school: ServiceSchool) => void;
}

type AdminSort = "school-asc" | "name-asc" | "joined-desc";

const PAGE_SIZE = 10;

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

export default function MembersView({
    schools,
    members,
    onChangeStatus,
    onOpenSchool,
}: MembersViewProps) {
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<"ALL" | MemberStatus>("ALL");
    const [sort, setSort] = useState<AdminSort>("school-asc");
    const [page, setPage] = useState(1);

    const schoolMap = useMemo(
        () => new Map(schools.map((school) => [school.id, school])),
        [schools],
    );
    const admins = useMemo(
        () => members.filter((member) => member.role === "ADM"),
        [members],
    );
    const filteredAdmins = useMemo(() => {
        const keyword = search.trim().toLocaleLowerCase("ko-KR");
        const result = admins.filter((admin) => {
            const school = schoolMap.get(admin.schoolId);
            const matchesKeyword =
                !keyword ||
                admin.name.toLocaleLowerCase("ko-KR").includes(keyword) ||
                admin.loginId.toLocaleLowerCase("ko-KR").includes(keyword) ||
                admin.email.toLocaleLowerCase("ko-KR").includes(keyword) ||
                school?.name.toLocaleLowerCase("ko-KR").includes(keyword);
            const matchesStatus = status === "ALL" || admin.status === status;
            return Boolean(school) && matchesKeyword && matchesStatus;
        });

        return [...result].sort((a, b) => {
            if (sort === "name-asc") {
                return a.name.localeCompare(b.name, "ko-KR");
            }
            if (sort === "joined-desc") {
                return b.joinedAt.localeCompare(a.joinedAt);
            }
            return (schoolMap.get(a.schoolId)?.name ?? "").localeCompare(
                schoolMap.get(b.schoolId)?.name ?? "",
                "ko-KR",
            );
        });
    }, [admins, schoolMap, search, sort, status]);

    const totalPages = Math.max(1, Math.ceil(filteredAdmins.length / PAGE_SIZE));
    const pagedAdmins = filteredAdmins.slice(
        (page - 1) * PAGE_SIZE,
        page * PAGE_SIZE,
    );
    const activeCount = admins.filter((admin) => admin.status === "ACTIVE").length;
    const suspendedCount = admins.filter(
        (admin) => admin.status === "SUSPENDED",
    ).length;

    useEffect(() => {
        setPage(1);
    }, [search, sort, status]);

    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-2xl font-black tracking-tight">회원 관리</h1>
                <p className="mt-1 text-sm text-slate-500">
                    학교별 관리자 계정을 조회하고 계정 상태를 관리합니다. 현재 학교당 관리자 1명을 기준으로 합니다.
                </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
                {[
                    {
                        label: "전체 학교 관리자",
                        value: admins.length,
                        icon: ShieldCheck,
                        color: "text-sky-700",
                    },
                    {
                        label: "활성 관리자",
                        value: activeCount,
                        icon: UserRoundCheck,
                        color: "text-emerald-700",
                    },
                    {
                        label: "정지 관리자",
                        value: suspendedCount,
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
                            placeholder="학교명, 관리자명, 로그인 ID, 이메일 검색"
                            className="h-11 w-full rounded-lg border border-slate-200 pl-10 pr-3 text-sm font-semibold outline-none focus:border-emerald-500"
                        />
                    </label>
                    <select
                        value={status}
                        onChange={(event) =>
                            setStatus(event.target.value as "ALL" | MemberStatus)
                        }
                        className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-500"
                    >
                        <option value="ALL">전체 상태</option>
                        <option value="ACTIVE">활성</option>
                        <option value="SUSPENDED">정지</option>
                        <option value="WITHDRAWN">탈퇴</option>
                    </select>
                    <select
                        value={sort}
                        onChange={(event) => setSort(event.target.value as AdminSort)}
                        className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-500"
                    >
                        <option value="school-asc">학교명순</option>
                        <option value="name-asc">관리자명순</option>
                        <option value="joined-desc">최근 가입순</option>
                    </select>
                </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-emerald-900/10 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1120px] table-fixed text-left text-sm">
                        <colgroup>
                            <col className="w-[210px]" />
                            <col className="w-[210px]" />
                            <col className="w-[120px]" />
                            <col className="w-[155px]" />
                            <col className="w-[105px]" />
                            <col className="w-[170px]" />
                            <col className="w-[150px]" />
                        </colgroup>
                        <thead className="bg-slate-50 text-xs font-extrabold text-slate-500">
                            <tr>
                                <th className="px-5 py-3">학교</th>
                                <th className="px-5 py-3">관리자</th>
                                <th className="px-5 py-3">로그인 ID</th>
                                <th className="px-5 py-3">연락처</th>
                                <th className="px-5 py-3">상태</th>
                                <th className="px-5 py-3">최근 로그인</th>
                                <th className="px-5 py-3">관리</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {pagedAdmins.map((admin) => {
                                const school = schoolMap.get(admin.schoolId);
                                if (!school) return null;

                                return (
                                    <tr key={admin.id} className="font-semibold text-slate-700">
                                        <td className="px-5 py-4">
                                            <button
                                                onClick={() => onOpenSchool(school)}
                                                title={school.name}
                                                className="flex w-full min-w-0 items-center gap-2 font-black text-slate-950 hover:text-emerald-700"
                                            >
                                                <Building2 className="size-4 shrink-0" />
                                                <span className="truncate">{school.name}</span>
                                            </button>
                                        </td>
                                        <td className="px-5 py-4">
                                            <p className="truncate font-black text-slate-950" title={admin.name}>{admin.name}</p>
                                            <p className="mt-1 truncate text-xs text-slate-400" title={admin.email}>{admin.email}</p>
                                        </td>
                                        <td className="whitespace-nowrap px-5 py-4">{admin.loginId}</td>
                                        <td className="whitespace-nowrap px-5 py-4">{admin.phone}</td>
                                        <td className="whitespace-nowrap px-5 py-4">
                                            <StatusBadge status={admin.status} />
                                        </td>
                                        <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                                            {admin.lastLoginAt}
                                        </td>
                                        <td className="px-5 py-4">
                                            <button
                                                onClick={() =>
                                                    onChangeStatus(
                                                        admin.id,
                                                        admin.status === "ACTIVE"
                                                            ? "SUSPENDED"
                                                            : "ACTIVE",
                                                    )
                                                }
                                                disabled={admin.status === "WITHDRAWN"}
                                                className={`h-9 w-[104px] whitespace-nowrap rounded-lg px-3 text-xs font-black ${
                                                    admin.status === "ACTIVE"
                                                        ? "border border-amber-200 text-amber-700 hover:bg-amber-50"
                                                        : "border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                                } disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400`}
                                            >
                                                {admin.status === "ACTIVE" ? "계정 정지" : "계정 활성화"}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {pagedAdmins.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={7}
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
                        검색 결과 {filteredAdmins.length}명
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage((current) => Math.max(1, current - 1))}
                            disabled={page === 1}
                            className="flex size-9 items-center justify-center rounded-lg border border-slate-200 disabled:text-slate-300"
                        >
                            <ChevronLeft className="size-4" />
                        </button>
                        <span className="min-w-16 text-center text-sm font-black text-slate-600">
                            {page} / {totalPages}
                        </span>
                        <button
                            onClick={() =>
                                setPage((current) => Math.min(totalPages, current + 1))
                            }
                            disabled={page === totalPages}
                            className="flex size-9 items-center justify-center rounded-lg border border-slate-200 disabled:text-slate-300"
                        >
                            <ChevronRight className="size-4" />
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}
