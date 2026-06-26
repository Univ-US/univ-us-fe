"use client";

// LMS 교수 공용 레이아웃 (사이드바 + 콘텐츠 셸)
// - 사이드바 상단: 학교명(API) + UnivUs 브랜드 + 사용자(이름/소속/아바타, API)
// - 네비: '프로필'만 활성(PLM-001). 나머지 메뉴는 해당 화면 미구현이라 placeholder(비활성)
// - children = 각 LMS 페이지(현재는 /lms/professor/profile)
import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import {
  BookOpen,
  CalendarDays,
  CheckSquare,
  Clapperboard,
  FileText,
  Home,
  LogOut,
  Megaphone,
  Menu,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
  UserRound,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useProfessorProfileStore } from "@/store/lms/lmsProfessorProfileStore";
import { useLmsGradingStore } from "@/store/lms/lmsGradingStore";
import { useLmsProfessorChatStore } from "@/store/lms/lmsProfessorChatStore";
import { resetLmsUserStores } from "@/store/lms/lmsStoreReset";
import LmsGuard from "@/components/auth/LmsGuard";
import useEscapeClose from "@/components/lms/useEscapeClose";
import { getLmsAvatarColor } from "@/lib/lmsAvatar";
import { ROLE, type Role } from "@/lib/rolecode";
import { getSubscriptionStatus } from "@/lib/subscriptionApi";

// PLM(교수 LMS) 접근 허용 역할: 교수 전용 — 관리자(ADM·SUA)는 LMS 미진입(BO에서 데이터 관리)
const PROFESSOR_LMS_ROLES: Role[] = [ROLE.PROF];

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:9090";
const resolveImg = (u?: string | null) =>
  !u ? null : u.startsWith("http") ? u : `${API_BASE}${u}`;

// trailingSlash:true(next.config) → pathname이 "/lms/professor/profile/"로 와서
// href("/lms/professor/profile")와 정확 일치가 깨진다. 양끝 슬래시를 떼고 비교.
const stripSlash = (p: string) => p.replace(/\/+$/, "") || "/";

type NavItem = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  href?: string;
  badge?: number;
};
const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  { title: "계정", items: [{ label: "프로필", icon: UserRound, href: "/lms/professor/profile" }] },
  {
    title: "메인",
    items: [
      { label: "강의 내역", icon: BookOpen, href: "/lms/professor/courses" },
      { label: "수강생 현황", icon: UsersRound, href: "/lms/professor/Enrollee" },
      // '채점 현황' 배지는 하드코딩 X — 실제 미채점 건수(overview.totalUngraded)를 스토어에서 주입(아래 렌더)
      { label: "채점 현황", icon: CheckSquare, href: "/lms/professor/grading" },
    ],
  },
  {
    title: "학습",
    items: [
      { label: "강의 업로드", icon: Clapperboard, href: "/lms/professor/upload" },
      { label: "과제 관리", icon: FileText, href: "/lms/professor/assignments" },
      { label: "공지사항", icon: Megaphone, href: "/lms/professor/notice" },
      { label: "출결 확인", icon: CalendarDays, href: "/lms/professor/attendance" },
    ],
  },
  {
    title: "커뮤니케이션",
    items: [
      { label: "채팅", icon: MessageSquareText, href: "/lms/professor/chat" },
      { label: "캘린더", icon: CalendarDays, href: "/lms/professor/calendar" },
    ],
  },
];

function LmsProfessorLayoutInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const logoutAction = useAuthStore((s) => s.logoutAction);
  const role = useAuthStore((s) => s.role);
  // 사이드바 헤더(학교/이름/소속/역할/아바타) — 공유 스토어 구독 (폼과 1회 공유, 저장 시 자동 갱신)
  const profile = useProfessorProfileStore((s) => s.profile);
  const loadProfile = useProfessorProfileStore((s) => s.load);
  const [accessChecked, setAccessChecked] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false); // 프로필 로드 실패(BE 문제) 표기
  const [logoutOpen, setLogoutOpen] = useState(false); // PLM-011 로그아웃 확인 모달
  const [sidebarOpen, setSidebarOpen] = useState(false); // 사이드바 접기/펼치기 (학생 사이드바와 동일 동작)

  // '채점 현황' 배지용 미채점 건수 — 채점 화면과 같은 스토어 공유(같은 totalUngraded 값)
  const ungradedCount = useLmsGradingStore((s) => s.ungradedCount);
  const loadUngradedCount = useLmsGradingStore((s) => s.loadUngradedCount);
  const chatUnreadCount = useLmsProfessorChatStore((s) => s.unreadCount);
  const loadChatUnreadCount = useLmsProfessorChatStore((s) => s.loadUnreadCount);

  useEffect(() => {
    let active = true;
    void getSubscriptionStatus()
      .then((status) => {
        if (!active) return;
        if (!status.serviceAccessible) {
          router.replace("/unauthorized");
          return;
        }
        setAccessChecked(true);
      })
      .catch(() => {
        if (active) setAccessChecked(true);
      });

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (accessChecked) {
      loadProfile().catch(() => setLoadFailed(true));
    }
  }, [accessChecked, loadProfile]);

  // 미채점 건수 조회 — 가드가 PROF 전용이라 role 체크는 이중 안전장치
  useEffect(() => {
    if (role === ROLE.PROF) loadUngradedCount();
  }, [role, loadUngradedCount]);

  useEffect(() => {
    if (role === ROLE.PROF) void loadChatUnreadCount();
  }, [role, loadChatUnreadCount]);

  // 데스크톱(≥768px)이면 펼침·모바일이면 접힘으로 초기 동기화 (학생 사이드바와 동일)
  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const sync = () => setSidebarOpen(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  // 모바일에서 페이지 이동 시 사이드바 자동 접기
  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 767px)");
    if (mobile.matches) setSidebarOpen(false);
  }, [pathname]);

  // PLM-011: 사이드바 로그아웃 → 확인 모달 → 확인 시 로그아웃 + 홈(/) 이동
  const handleLogout = async () => {
    // 로그아웃 플래그 → LmsGuard가 "로그인이 안되어있습니다" alert를 건너뛰게 함(커뮤니티 패턴)
    sessionStorage.setItem("lmsLogout", "true");
    try {
      await logoutAction();
    } catch {
      /* 무시 */
    } finally {
      resetLmsUserStores(); // per-user LMS 스토어 초기화 → 다음 로그인 시 이전 계정 정보 잔존 방지
      alert("로그아웃되었습니다.");
      router.push("/");
    }
  };

  useEscapeClose(logoutOpen, () => setLogoutOpen(false)); // ESC = 취소

  const avatar = resolveImg(profile?.imageUrl ?? null);
  const initial = profile?.name?.trim()?.[0] ?? "U";
  const sidebarOffsetClass = sidebarOpen ? "md:pl-[256px]" : "md:pl-[104px]";

  if (!accessChecked) return null;

  return (
    <div className="min-h-screen bg-[#f7f8fb] text-slate-950">
      {!sidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          aria-label="사이드바 열기"
          title="사이드바 열기"
          className="fixed left-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-white text-primary shadow-lg md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}
      {sidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          aria-label="사이드바 닫기"
          className="fixed inset-0 z-30 bg-slate-950/35 md:hidden"
        />
      )}

      {/* 사이드바 — sticky로 뷰포트 상단에 붙어 긴 페이지 스크롤 시에도 화면을 따라다님.
          높이는 h-screen 고정(명시 높이라 flex stretch에 안 늘어남), 메뉴(nav)만 내부 스크롤.
          토글 버튼으로 접기/펼치기(데스크톱 w-60↔w-16 · 모바일 오버레이) — 학생 사이드바와 동일 동작 */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-screen shrink-0 flex-col overflow-visible border-r border-primary/20 bg-[linear-gradient(180deg,#0f8f83_0%,#0b6b63_46%,#06443f_100%)] py-5 text-white shadow-2xl shadow-primary/10 transition-[width,padding,transform] duration-300 ease-out md:translate-x-0 ${
          sidebarOpen
            ? "w-[256px] translate-x-0 px-4"
            : "-translate-x-full px-4 md:w-[104px] md:px-4"
        }`}
      >
        <button
          type="button"
          onClick={() => setSidebarOpen((open) => !open)}
          aria-label={sidebarOpen ? "사이드바 접기" : "사이드바 펼치기"}
          title={sidebarOpen ? "사이드바 접기" : "사이드바 펼치기"}
          className="absolute -right-4 top-1/2 z-40 hidden size-8 -translate-y-1/2 items-center justify-center rounded-full border border-primary/20 bg-white text-primary shadow-lg shadow-primary/15 transition-all duration-200 hover:-translate-y-1/2 hover:scale-105 hover:bg-primary hover:text-white md:flex"
        >
          {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
        </button>

        {/* 브랜드: 학교명(API) + UnivUs — 펼침=강의 내역 이동 / 접힘=로고 클릭 시 펼치기 */}
        <div className={`flex items-center ${sidebarOpen ? "" : "justify-center"}`}>
          {sidebarOpen ? (
            <Link
              href="/lms/professor/courses"
              title="강의 내역"
              className="group flex h-12 min-w-0 flex-1 items-center overflow-hidden rounded-2xl border border-white/70 bg-white/90 px-3 shadow-sm shadow-black/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                <img src="/univusicon.png" alt="UnivUs" className="size-6 rounded-lg object-contain" />
              </span>
              <span className="ml-2 min-w-0 flex-1 text-left">
                <span className="block text-sm font-black leading-4 text-slate-950">UnivUs</span>
                <span className="block truncate text-[10px] font-bold uppercase tracking-widest text-slate-800/65">
                  {profile?.universityName || "Professor LMS"}
                </span>
              </span>
              <span className="ml-2 shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                {profile?.role || "교수"}
              </span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="사이드바 펼치기"
              title="사이드바 펼치기"
              className="group flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-white/70 bg-white/90 shadow-sm shadow-black/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                <img src="/univusicon.png" alt="" className="size-6 rounded-lg object-contain" />
              </span>
            </button>
          )}
        </div>

        {/* 사용자 카드 */}
        <div
          className={`mt-6 rounded-2xl border border-white/70 bg-white/80 shadow-sm transition-all duration-300 ${
            sidebarOpen ? "p-4" : "p-2"
          }`}
        >
          <div className={`flex items-center ${sidebarOpen ? "gap-3" : "justify-center"}`}>
            <div className={`flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full ${getLmsAvatarColor(profile?.employeeNo)} text-sm font-black text-white`}>
              {avatar ? (
                <img src={avatar} alt="" className="h-full w-full object-cover" />
              ) : (
                <span>{initial}</span>
              )}
            </div>
            {sidebarOpen && (
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-slate-950">
                  {profile?.name ?? "교수"}
                </p>
                <p className="mt-0.5 truncate text-xs font-medium text-slate-800/65">
                  {profile?.department ?? "-"}
                  {profile?.employeeNo ? ` · ${profile.employeeNo}` : ""}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 프로필 로드 실패 시 (가짜 정보로 가리지 않고 표기) */}
        {sidebarOpen && loadFailed && !profile && (
          <p className="mt-3 rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-[11px] font-bold text-amber-200">
            프로필 정보를 불러오지 못했습니다.
          </p>
        )}

        {/* 네비게이션 */}
        <nav className={`mt-5 min-h-0 flex-1 overflow-y-auto ${sidebarOpen ? "pr-1" : "space-y-2 pr-0"}`}>
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className={sidebarOpen ? "mb-4 space-y-0.5" : "mb-2 space-y-2"}>
              {sidebarOpen && (
                <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-white/45">
                  {section.title}
                </p>
              )}
              {section.items.map((item) => {
                const active =
                  item.href && stripSlash(pathname) === stripSlash(item.href);
                // '채점 현황'은 실제 미채점 건수 주입, 나머지는 정적 badge. 0/미로딩이면 숨김.
                const badge =
                  item.href === "/lms/professor/grading"
                    ? ungradedCount
                    : item.href === "/lms/professor/chat"
                      ? chatUnreadCount
                      : item.badge;
                const Icon = item.icon;
                const content = (
                  <>
                    <Icon className="size-4 shrink-0" />
                    <span className={sidebarOpen ? "flex-1 truncate" : "sr-only"}>{item.label}</span>
                    {badge != null && badge > 0 && (
                      <span
                        className={`flex min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-black leading-4 text-white ${
                          sidebarOpen ? "" : "absolute -right-1 -top-1"
                        }`}
                      >
                        {badge}
                      </span>
                    )}
                  </>
                );
                const base =
                  "relative flex h-10 items-center rounded-xl text-sm font-bold transition-all duration-200";
                return item.href ? (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`${base} ${
                      active
                        ? "bg-white text-primary shadow-sm"
                        : "text-white/75 hover:translate-x-0.5 hover:bg-white/18 hover:text-white"
                    } ${sidebarOpen ? "w-[calc(100%_-_2.75rem)] max-w-[calc(100%_-_2.75rem)] gap-3 px-3 text-left" : "mx-auto w-10 justify-center px-0"}`}
                  >
                    {content}
                  </Link>
                ) : (
                  <div
                    key={item.label}
                    title="준비 중"
                    className={`${base} cursor-not-allowed text-white/35 ${
                      sidebarOpen ? "w-[calc(100%_-_2.75rem)] max-w-[calc(100%_-_2.75rem)] gap-3 px-3 text-left" : "mx-auto w-10 justify-center px-0"
                    }`}
                  >
                    {content}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        {/* 하단 액션: 홈으로(/home) + 로그아웃 */}
        <div className="mt-4 space-y-1.5">
          <Link
            href="/home"
            title="홈으로"
            className={`flex h-10 w-full items-center rounded-xl border border-white/20 bg-white/15 text-sm font-bold text-white/75 transition-all duration-200 hover:translate-x-0.5 hover:bg-white/25 hover:text-white ${
              sidebarOpen ? "gap-3 px-3" : "justify-center px-0"
            }`}
          >
            <Home className="size-4" />
            <span className={sidebarOpen ? "truncate" : "sr-only"}>홈으로</span>
          </Link>
          <button
            type="button"
            onClick={() => setLogoutOpen(true)}
            title="로그아웃"
            className={`flex h-10 w-full items-center rounded-xl border border-white/20 bg-white/15 text-sm font-bold text-white/75 transition-all duration-200 hover:translate-x-0.5 hover:bg-white/25 hover:text-white ${
              sidebarOpen ? "gap-3 px-3" : "justify-center px-0"
            }`}
          >
            <LogOut className="size-4" />
            <span className={sidebarOpen ? "truncate" : "sr-only"}>로그아웃</span>
          </button>
        </div>
      </aside>

      {/* 콘텐츠 */}
      <div className={`min-h-screen overflow-x-hidden transition-[padding] duration-300 ease-out ${sidebarOffsetClass}`}>
        {children}
      </div>

      {/* PLM-011 로그아웃 확인 모달 — 사이드바(w-60) 제외 본문 기준 중앙 */}
      {logoutOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="로그아웃 확인"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <LogOut className="size-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">로그아웃 하시겠습니까?</h3>
            <p className="mt-1 text-sm text-slate-500">아래 계정에서 로그아웃됩니다.</p>

            {/* 계정 카드 */}
            <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-left">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full ${getLmsAvatarColor(profile?.employeeNo)} text-sm font-semibold text-white`}>
                {avatar ? (
                  <img src={avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span>{initial}</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {profile?.name ?? "교수"}{" "}
                  {profile?.role || "교수"}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {/* 학과 · 사번 (사이드바 사용자 카드와 동일 패턴) */}
                  {profile?.department ?? "-"}
                  {profile?.employeeNo
                    ? ` · ${profile.employeeNo}`
                    : ""}
                </p>
              </div>
            </div>

            {/* 액션 — 취소 / 로그아웃(로즈) */}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setLogoutOpen(false)}
                className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
              >
                ↩ 로그아웃
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 접근 가드로 감싼다. 권한 없는 사용자는 내부 레이아웃(프로필 로드 등)이 아예 마운트되지 않는다.
export default function LmsProfessorLayout({ children }: { children: ReactNode }) {
  return (
    <LmsGuard allowedRoles={PROFESSOR_LMS_ROLES}>
      <LmsProfessorLayoutInner>{children}</LmsProfessorLayoutInner>
    </LmsGuard>
  );
}
