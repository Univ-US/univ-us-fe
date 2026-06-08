"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import RoleGuard from "@/components/auth/RoleGuard";
import Link from "next/link";
import {
    Bell,
    Building2,
    ChartNoAxesColumn,
    ChevronRight,
    FileBox,
    Home,
    LayoutDashboard,
    ListChecks,
    LogOut,
    MessageSquareText,
    School,
    Settings,
    UsersRound,
    CircleDollarSign,
} from "lucide-react";

const schools = [
    ["동명사이버대학교", "프로", "1,840명", "₩1,490,000", "정상"],
    ["라온에듀센터", "베이직", "312명", "₩490,000", "정상"],
    ["해솔간호전문학원", "프로", "1,260명", "₩1,490,000", "정상"],
    ["북경한국국제학교", "엔터프라이즈", "2,420명", "₩2,100,000", "검토"],
    ["메타코딩부트캠프", "베이직", "188명", "₩490,000", "정상"],
];

const members = [
    ["문서윤", "seoyun.moon@univus.kr", "관리자", "동명사이버대학교", "원격교육지원팀", "활성"],
    ["한지우", "jiwoo.han@univus.kr", "교수", "해솔간호전문학원", "간호학과", "활성"],
    ["서도현", "dohyun.seo@univus.kr", "학생", "라온에듀센터", "웹개발반", "대기"],
    ["강아린", "arin.kang@univus.kr", "학생", "북경한국국제학교", "고등부", "활성"],
    ["윤태오", "tae.yoon@univus.kr", "교수", "메타코딩부트캠프", "백엔드 트랙", "정지"],
    ["배하린", "harin.bae@univus.kr", "관리자", "라온에듀센터", "운영팀", "활성"],
];

const navItems = [
    { label: "대시보드", icon: LayoutDashboard, active: true },
    { label: "학교 관리", icon: School },
    { label: "회원 관리", icon: UsersRound },
    { label: "결제 관리", icon: CircleDollarSign },
    { label: "구독플랜 설정", icon: Settings },
    { label: "공지 관리", icon: Bell },
    { label: "채팅 문의", icon: MessageSquareText },
    { label: "운영 로그", icon: ListChecks },
    { label: "통계 리포트", icon: ChartNoAxesColumn },
    { label: "첨부파일", icon: FileBox },
];

const planStats = [
    ["베이직", "월 49,000원", "14개"],
    ["프로", "월 149,000원", "19개"],
    ["엔터프라이즈", "맞춤 견적", "3개"],
];

const recentMembers = [
    ["문서윤", "동명사이버대학교 · 관리자", "2026-06-01"],
    ["한지우", "해솔간호전문학원 · 교수", "2026-05-29"],
    ["서도현", "라온에듀센터 · 학생", "2026-05-27"],
    ["강아린", "북경한국국제학교 · 학생", "2026-05-24"],
];

function StatusBadge({ value }: { value: string }) {
    const isWarn = value === "검토" || value === "대기";
    const isStop = value === "정지";

    return (
        <span
            className={`inline-flex min-w-12 justify-center rounded-full px-3 py-1 text-xs font-extrabold ${
                isStop
                    ? "bg-rose-100 text-rose-600"
                    : isWarn
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700"
            }`}
        >
      {value}
    </span>
    );
}

function Initial({ name }: { name: string }) {
    return (
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-extrabold text-white">
      {name.slice(0, 1)}
    </span>
    );
}

export default function ServiceAdminDashboardPage() {
    const router = useRouter();
    const logoutAction = useAuthStore((state) => state.logoutAction);

    const handleLogout = async () => {
        await logoutAction();
        router.push("/landing");
    };

    return (
        <RoleGuard allowedRoles={["SUA"]}>
            <main className="min-h-screen bg-[#f4faf7] text-slate-950">
                <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] bg-[#064b35] px-3 py-5 text-white lg:block">
                    <div className="flex items-center gap-3 px-2">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-primary font-black">
                            U
                        </div>
                        <span className="text-lg font-black">Univ-us</span>
                        <span className="ml-auto rounded-full border border-white/20 px-3 py-1 text-xs font-bold text-emerald-100">
                어드민
              </span>
                    </div>

                    <div className="mt-8 rounded-xl bg-white/12 p-4">
                        <div className="flex items-center gap-3">
                            <div className="flex size-12 items-center justify-center rounded-full bg-primary text-lg font-black">
                                어
                            </div>
                            <div>
                                <p className="font-extrabold">어드민</p>
                                <p className="mt-1 text-xs font-medium text-emerald-100">플랫폼 관리자</p>
                            </div>
                        </div>
                    </div>

                    <p className="mt-7 px-2 text-xs font-bold text-emerald-100/80">관리</p>

                    <nav className="mt-3 space-y-1">
                        {navItems.map((item) => {
                            const Icon = item.icon;

                            return (
                                <button
                                    key={item.label}
                                    className={`flex h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-bold transition ${
                                        item.active ? "bg-white/18 text-white" : "text-emerald-50/85 hover:bg-white/10"
                                    }`}
                                >
                                    <Icon className="size-4" />
                                    {item.label}
                                </button>
                            );
                        })}
                    </nav>

                    <div className="absolute inset-x-3 bottom-5 space-y-2">
                        <button className="flex h-11 w-full items-center rounded-lg bg-white/12 px-3 text-sm font-extrabold">
                            관리자 LMS 임시 화면
                        </button>
                        <button
                            onClick={handleLogout}
                            className="flex h-11 w-full items-center gap-3 rounded-lg bg-white/12 px-3 text-sm font-extrabold"
                        >
                            <LogOut className="size-4" />
                            로그아웃
                        </button>
                    </div>
                </aside>

                <div className="lg:pl-[260px]">
                    <header className="sticky top-0 z-20 border-b border-emerald-900/10 bg-white/85 backdrop-blur">
                        <div className="flex h-20 items-center justify-between px-6 lg:px-8">
                            <div className="flex items-center gap-2 text-sm font-extrabold text-slate-500">
                                <Building2 className="size-4" />
                                <span>UnivUs 플랫폼</span>
                                <ChevronRight className="size-4 text-slate-300" />
                                <span className="text-slate-900">어드민 대시보드</span>
                            </div>

                            <div className="flex items-center gap-3">
                                <Link
                                    href="/landing"
                                    className="flex size-10 items-center justify-center rounded-full border border-border bg-white text-slate-700 shadow-sm"
                                >
                                    <Home className="size-4" />
                                </Link>
                                <div className="flex size-11 items-center justify-center rounded-full bg-emerald-700 text-lg font-black text-white">
                                    어
                                </div>
                            </div>
                        </div>
                    </header>

                    <section className="px-6 py-8 lg:px-8">
                        <div className="mb-6">
                            <h1 className="text-3xl font-black tracking-tight">어드민 대시보드</h1>
                            <p className="mt-2 text-sm text-slate-500">
                                전체 구독 기관, 월 매출, 회원 사용량과 운영 문의를 한 화면에서 확인합니다.
                            </p>
                        </div>

                        <div className="grid gap-5 xl:grid-cols-[1fr_370px]">
                            <div className="space-y-5">
                                <section className="overflow-hidden rounded-2xl bg-[#064b35] p-7 text-white shadow-sm">
                                    <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
                                        <div>
                        <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-extrabold">
                          전체 플랫폼
                        </span>
                                            <p className="mt-6 text-sm font-bold text-emerald-100">구독 기관</p>
                                            <p className="mt-2 text-4xl font-black">36개</p>
                                            <button className="mt-4 rounded-full bg-orange-500 px-4 py-2 text-sm font-black text-white">
                                                + 5 신규
                                            </button>
                                        </div>

                                        <div className="md:min-w-[360px]">
                                            <p className="text-sm font-extrabold text-emerald-100">이번 달 매출</p>
                                            <p className="mt-4 text-4xl font-black tracking-tight">₩6,124,000</p>
                                            <p className="mt-2 text-sm font-medium text-emerald-100">전월 대비 11.4% 증가</p>
                                            <p className="mt-12 text-right text-xs font-black text-emerald-100">
                                                Admin Overview · 2026.06
                                            </p>
                                        </div>
                                    </div>
                                </section>

                                <section className="overflow-hidden rounded-2xl border border-emerald-900/10 bg-white shadow-sm">
                                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                                        <h2 className="text-lg font-black">구독 기관 현황</h2>
                                        <button className="text-xs font-extrabold text-primary">플랜 설정</button>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full min-w-[720px] text-left text-sm">
                                            <thead className="bg-slate-50 text-xs font-extrabold text-slate-500">
                                            <tr>
                                                <th className="px-5 py-3">기관명</th>
                                                <th className="px-5 py-3">플랜</th>
                                                <th className="px-5 py-3">회원 수</th>
                                                <th className="px-5 py-3">월 매출</th>
                                                <th className="px-5 py-3">상태</th>
                                            </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                            {schools.map((row) => (
                                                <tr key={row[0]} className="font-semibold text-slate-700">
                                                    <td className="px-5 py-4 text-slate-950">{row[0]}</td>
                                                    <td className="px-5 py-4">{row[1]}</td>
                                                    <td className="px-5 py-4">{row[2]}</td>
                                                    <td className="px-5 py-4 font-black text-slate-950">{row[3]}</td>
                                                    <td className="px-5 py-4">
                                                        <StatusBadge value={row[4]} />
                                                    </td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </section>

                                <section className="overflow-hidden rounded-2xl border border-emerald-900/10 bg-white shadow-sm">
                                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                                        <h2 className="text-lg font-black">전체 회원 조회</h2>
                                        <div className="hidden gap-2 md:flex">
                                            {["학생", "교수", "관리자", "활성/대기/정지"].map((tag) => (
                                                <span key={tag} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700">
                            {tag}
                          </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full min-w-[820px] text-left text-sm">
                                            <thead className="bg-slate-50 text-xs font-extrabold text-slate-500">
                                            <tr>
                                                <th className="px-5 py-3">회원</th>
                                                <th className="px-5 py-3">권한</th>
                                                <th className="px-5 py-3">소속 기관</th>
                                                <th className="px-5 py-3">학과/부서</th>
                                                <th className="px-5 py-3">상태</th>
                                            </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                            {members.map((member) => (
                                                <tr key={member[1]} className="font-semibold text-slate-700">
                                                    <td className="px-5 py-4">
                                                        <p className="font-black text-slate-950">{member[0]}</p>
                                                        <p className="mt-1 text-xs text-slate-400">{member[1]}</p>
                                                    </td>
                                                    <td className="px-5 py-4">{member[2]}</td>
                                                    <td className="px-5 py-4">{member[3]}</td>
                                                    <td className="px-5 py-4">{member[4]}</td>
                                                    <td className="px-5 py-4">
                                                        <StatusBadge value={member[5]} />
                                                    </td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </section>
                            </div>

                            <aside className="space-y-5">
                                <section className="rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-lg font-black">문의 처리 현황</h2>
                                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
                        11건
                      </span>
                                    </div>

                                    <div className="mt-5 grid grid-cols-3 gap-3">
                                        {[
                                            ["3", "답변 대기"],
                                            ["6", "진행 중"],
                                            ["2", "오늘 종료"],
                                        ].map((item) => (
                                            <div key={item[1]} className="rounded-xl bg-emerald-50 px-3 py-4 text-center">
                                                <p className="text-2xl font-black">{item[0]}</p>
                                                <p className="mt-2 text-xs font-bold text-slate-500">{item[1]}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <p className="mt-5 text-sm leading-6 text-slate-500">
                                        학교 관리자가 보낸 결제, 계정, 플랜 문의를 기준으로 집계합니다.
                                    </p>
                                    <button className="mt-4 text-sm font-black text-emerald-700">
                                        문의 목록으로 이동 →
                                    </button>
                                </section>

                                <section className="rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-sm">
                                    <h2 className="text-lg font-black">운영 알림</h2>
                                    <div className="mt-4 space-y-3">
                                        {[
                                            ["문", "3건의 신규 문의가 답변을 기다립니다."],
                                            ["플", "2개 기관이 플랜 변경 검토 중입니다."],
                                            ["결", "1개 기관의 결제 확인이 필요합니다."],
                                        ].map((item) => (
                                            <button key={item[1]} className="flex w-full items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-left">
                          <span className="flex size-8 items-center justify-center rounded-full bg-white text-sm font-black text-emerald-700">
                            {item[0]}
                          </span>
                                                <span className="flex-1 text-sm font-extrabold">{item[1]}</span>
                                                <ChevronRight className="size-4 text-slate-400" />
                                            </button>
                                        ))}
                                    </div>
                                </section>

                                <section className="rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-sm">
                                    <h2 className="text-lg font-black">플랜별 기관 수</h2>
                                    <div className="mt-4 divide-y divide-slate-100">
                                        {planStats.map((plan) => (
                                            <div key={plan[0]} className="flex items-center gap-3 py-3">
                          <span className="flex size-9 items-center justify-center rounded-full bg-emerald-600 text-xs font-black text-white">
                            {plan[0].slice(0, 1)}
                          </span>
                                                <div className="flex-1">
                                                    <p className="font-black">{plan[0]}</p>
                                                    <p className="mt-1 text-xs text-slate-500">{plan[1]}</p>
                                                </div>
                                                <p className="text-sm font-bold text-slate-400">{plan[2]}</p>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <section className="rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-sm">
                                    <h2 className="text-lg font-black">최근 가입 회원</h2>
                                    <div className="mt-4 divide-y divide-slate-100">
                                        {recentMembers.map((member) => (
                                            <div key={member[0]} className="flex items-center gap-3 py-3">
                                                <Initial name={member[0]} />
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-black">{member[0]}</p>
                                                    <p className="truncate text-xs text-slate-500">{member[1]}</p>
                                                </div>
                                                <p className="text-xs font-medium text-slate-400">{member[2]}</p>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </aside>
                        </div>
                    </section>
                </div>
            </main>
        </RoleGuard>
    );
}