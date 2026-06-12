"use client";

import { useEffect, useMemo, useState } from "react";
import {
    ArrowLeft,
    Building2,
    CalendarClock,
    CreditCard,
    Search,
    ShieldCheck,
    UsersRound,
} from "lucide-react";
import { PLAN_PRICE } from "../_mockData";
import type {
    MemberRole,
    MemberStatus,
    ServiceMember,
    ServiceSchool,
    SubscriptionPlan,
} from "../_types";
import {
    formatCurrency,
    getSubscriptionDuration,
    PaymentBadge,
    SubscriptionBadge,
} from "../_components";

interface SchoolDetailViewProps {
    school: ServiceSchool;
    members: ServiceMember[];
    onBack: () => void;
    onChangePlan: (plan: SubscriptionPlan) => void;
    onCancelSubscription: () => void;
}

const ROLE_LABEL: Record<MemberRole, string> = {
    STU: "학생",
    PROF: "교수",
    ADM: "관리자",
};

const STATUS_LABEL: Record<MemberStatus, string> = {
    ACTIVE: "활성",
    SUSPENDED: "정지",
    WITHDRAWN: "탈퇴",
};

const MEMBER_PAGE_SIZE = 8;

export default function SchoolDetailView({
    school,
    members,
    onBack,
    onChangePlan,
    onCancelSubscription,
}: SchoolDetailViewProps) {
    const [search, setSearch] = useState("");
    const [role, setRole] = useState<"ALL" | MemberRole>("ALL");
    const [status, setStatus] = useState<"ALL" | MemberStatus>("ALL");
    const [page, setPage] = useState(1);
    const filteredMembers = useMemo(() => {
        const keyword = search.trim().toLocaleLowerCase("ko-KR");
        return members.filter((member) => {
            const matchesKeyword =
                !keyword ||
                member.name.toLocaleLowerCase("ko-KR").includes(keyword) ||
                member.loginId.toLocaleLowerCase("ko-KR").includes(keyword);
            const matchesRole = role === "ALL" || member.role === role;
            const matchesStatus = status === "ALL" || member.status === status;
            return matchesKeyword && matchesRole && matchesStatus;
        });
    }, [members, role, search, status]);

    const totalPages = Math.max(1, Math.ceil(filteredMembers.length / MEMBER_PAGE_SIZE));
    const pagedMembers = filteredMembers.slice(
        (page - 1) * MEMBER_PAGE_SIZE,
        page * MEMBER_PAGE_SIZE,
    );

    useEffect(() => {
        setPage(1);
    }, [search, role, status]);

    const handleCancel = () => {
        if (school.subscriptionStatus === "CANCELED") return;
        if (window.confirm(`${school.name}의 구독을 취소 처리하시겠습니까?`)) {
            onCancelSubscription();
        }
    };

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <button
                        onClick={onBack}
                        className="mb-3 inline-flex items-center gap-2 text-sm font-extrabold text-slate-500 hover:text-emerald-700"
                    >
                        <ArrowLeft className="size-4" />
                        학교 목록
                    </button>
                    <h1 className="text-2xl font-black tracking-tight">{school.name}</h1>
                    <p className="mt-1 text-sm text-slate-500">학교 정보와 구독 및 회원 현황을 관리합니다.</p>
                </div>
                <div className="flex items-center gap-2">
                    <SubscriptionBadge value={school.subscriptionStatus} />
                    <PaymentBadge value={school.paymentStatus} />
                </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
                <section className="rounded-2xl border border-emerald-900/10 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-3">
                        <span className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                            <Building2 className="size-5" />
                        </span>
                        <div>
                            <h2 className="font-black">기관 기본 정보</h2>
                            <p className="mt-1 text-xs text-slate-400">{school.category}</p>
                        </div>
                    </div>
                    <dl className="mt-6 grid gap-5 sm:grid-cols-2">
                        {[
                            ["주소", school.address],
                            ["대표 전화", school.phone],
                            ["담당 관리자", school.adminName],
                            ["관리자 이메일", school.adminEmail],
                            ["서비스 가입일", school.joinedAt],
                            ["첫 구독일", school.firstSubscribedAt ?? "미구독"],
                            [
                                "구독 기간",
                                getSubscriptionDuration(
                                    school.firstSubscribedAt,
                                    school.subscriptionEndedAt,
                                    school.subscriptionStatus,
                                ),
                            ],
                            ["전체 회원", `${school.memberCount.toLocaleString()}명`],
                        ].map(([label, value]) => (
                            <div key={label}>
                                <dt className="text-xs font-extrabold text-slate-400">{label}</dt>
                                <dd className="mt-1 text-sm font-black text-slate-800">{value}</dd>
                            </div>
                        ))}
                    </dl>
                </section>

                <section className="rounded-2xl border border-emerald-900/10 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-3">
                        <span className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                            <CreditCard className="size-5" />
                        </span>
                        <div>
                            <h2 className="font-black">구독 및 예약 결제</h2>
                            <p className="mt-1 text-xs text-slate-400">PortOne 연동 예정 목업</p>
                        </div>
                    </div>

                    <label className="mt-6 block">
                        <span className="text-xs font-extrabold text-slate-500">구독 플랜</span>
                        <select
                            value={school.plan ?? ""}
                            onChange={(event) => onChangePlan(event.target.value as SubscriptionPlan)}
                            disabled={school.subscriptionStatus === "CANCELED"}
                            className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-black outline-none focus:border-emerald-500 disabled:bg-slate-100"
                        >
                            <option value="" disabled>플랜을 선택해 구독 시작</option>
                            <option value="Basic">Basic · 월 490,000원</option>
                            <option value="Pro">Pro · 월 1,490,000원</option>
                            <option value="Enterprise">Enterprise · 월 3,100,000원</option>
                        </select>
                    </label>

                    <div className="mt-5 space-y-3 rounded-xl bg-slate-50 p-4 text-sm">
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-500">예약 결제 금액</span>
                            <span className="font-black">
                                {school.plan ? formatCurrency(PLAN_PRICE[school.plan]) : "미구독"}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-500">다음 예약 결제</span>
                            <span className="font-black">{school.nextBillingAt}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-500">PortOne 고객 ID</span>
                            <span className="font-black">{school.portoneCustomerId ?? "-"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-500">첫 구독일</span>
                            <span className="font-black">{school.firstSubscribedAt ?? "-"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-500">구독 기간</span>
                            <span className="font-black">
                                {getSubscriptionDuration(
                                    school.firstSubscribedAt,
                                    school.subscriptionEndedAt,
                                    school.subscriptionStatus,
                                )}
                            </span>
                        </div>
                    </div>

                    <div className="mt-4 rounded-xl bg-emerald-50 p-4">
                        <div className="flex gap-3">
                            <CalendarClock className="mt-0.5 size-4 shrink-0 text-emerald-700" />
                            <p className="text-xs font-bold leading-5 text-emerald-800">
                                플랜 변경 시 다음 예약 결제 금액과 구독 상태가 함께 갱신되는 흐름을 표현한 목업입니다.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleCancel}
                        disabled={
                            school.subscriptionStatus === "CANCELED" ||
                            school.subscriptionStatus === "UNSUBSCRIBED"
                        }
                        className="mt-5 h-10 w-full rounded-lg border border-rose-200 text-sm font-black text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                    >
                        {school.subscriptionStatus === "CANCELED"
                            ? "구독 취소됨"
                            : school.subscriptionStatus === "UNSUBSCRIBED"
                                ? "현재 미구독"
                                : "구독 취소"}
                    </button>
                </section>
            </div>

            <section className="overflow-hidden rounded-2xl border border-emerald-900/10 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-5">
                    <div className="flex items-center gap-3">
                        <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                            <UsersRound className="size-5" />
                        </span>
                        <div>
                            <h2 className="font-black">학교 회원 목록</h2>
                            <p className="mt-1 text-xs text-slate-400">
                                목업 데이터 {members.length}명 · 실제 전체 회원 {school.memberCount.toLocaleString()}명
                            </p>
                        </div>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-[1fr_160px_160px]">
                        <label className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                            <input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="이름 또는 학번/사번 검색"
                                className="h-11 w-full rounded-lg border border-slate-200 pl-10 pr-3 text-sm font-semibold outline-none focus:border-emerald-500"
                            />
                        </label>
                        <select
                            value={role}
                            onChange={(event) => setRole(event.target.value as "ALL" | MemberRole)}
                            className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-500"
                        >
                            <option value="ALL">전체 역할</option>
                            <option value="STU">학생</option>
                            <option value="PROF">교수</option>
                            <option value="ADM">관리자</option>
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
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[780px] text-left text-sm">
                        <thead className="bg-slate-50 text-xs font-extrabold text-slate-500">
                            <tr>
                                <th className="px-5 py-3">회원</th>
                                <th className="px-5 py-3">학번/사번</th>
                                <th className="px-5 py-3">역할</th>
                                <th className="px-5 py-3">학과/부서</th>
                                <th className="px-5 py-3">상태</th>
                                <th className="px-5 py-3">가입일</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {pagedMembers.map((member) => (
                                <tr key={member.id} className="font-semibold text-slate-700">
                                    <td className="px-5 py-4 font-black text-slate-950">{member.name}</td>
                                    <td className="px-5 py-4">{member.loginId}</td>
                                    <td className="px-5 py-4">{ROLE_LABEL[member.role]}</td>
                                    <td className="px-5 py-4">{member.department}</td>
                                    <td className="px-5 py-4">
                                        <span
                                            className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${
                                                member.status === "ACTIVE"
                                                    ? "bg-emerald-100 text-emerald-700"
                                                    : member.status === "SUSPENDED"
                                                        ? "bg-amber-100 text-amber-700"
                                                        : "bg-slate-100 text-slate-500"
                                            }`}
                                        >
                                            {STATUS_LABEL[member.status]}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-slate-400">{member.joinedAt}</td>
                                </tr>
                            ))}
                            {pagedMembers.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-5 py-12 text-center font-bold text-slate-400">
                                        조건에 맞는 회원이 없습니다.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
                    <p className="text-sm font-bold text-slate-400">
                        검색 결과 {filteredMembers.length}명
                    </p>
                    <div className="flex items-center gap-2">
                        {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
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
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 size-5 text-emerald-700" />
                    <div>
                        <p className="font-black">목업 동작 범위</p>
                        <p className="mt-1 text-sm font-semibold text-slate-500">
                            현재 플랜 변경과 구독 취소는 화면 상태만 변경합니다. 실제 적용 단계에서는
                            백엔드 트랜잭션과 PortOne 예약 결제 변경 결과가 성공한 뒤 화면을 갱신해야 합니다.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}
