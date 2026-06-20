"use client";

// LMS 교수 공용 레이아웃 (사이드바 + 콘텐츠 셸)
// - 사이드바 상단: 학교명(API) + UniVUs 브랜드 + 사용자(이름/소속/아바타, API)
// - 네비: '프로필'만 활성(PLM-001). 나머지 메뉴는 해당 화면 미구현이라 placeholder(비활성)
// - children = 각 LMS 페이지(현재는 /lms/professor/profile)
import { useEffect, useState, type ReactNode } from "react";
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
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

type NavItem = { label: string; icon: string; href?: string; badge?: number };
const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  { title: "계정", items: [{ label: "프로필", icon: "👤", href: "/lms/professor/profile" }] },
  {
    title: "메인",
    items: [
      { label: "강의 내역", icon: "📖", href: "/lms/professor/courses" },
      { label: "수강생 현황", icon: "👥", href: "/lms/professor/Enrollee" },
      // '채점 현황' 배지는 하드코딩 X — 실제 미채점 건수(overview.totalUngraded)를 스토어에서 주입(아래 렌더)
      { label: "채점 현황", icon: "✅", href: "/lms/professor/grading" },
    ],
  },
  {
    title: "학습",
    items: [
      { label: "강의 업로드", icon: "🎬", href: "/lms/professor/upload" },
      { label: "과제 관리", icon: "📄", href: "/lms/professor/assignments" },
      { label: "공지사항", icon: "📢", href: "/lms/professor/notice" },
      { label: "출결 확인", icon: "🗓️", href: "/lms/professor/attendance" },
    ],
  },
  {
    title: "커뮤니케이션",
    items: [
      { label: "채팅", icon: "💬", href: "/lms/professor/chat" },
      { label: "캘린더", icon: "📅", href: "/lms/professor/calendar" },
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

  if (!accessChecked) return null;

  return (
    <div className="flex min-h-screen bg-slate-50">
      {!sidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          aria-label="사이드바 열기"
          title="사이드바 열기"
          className="fixed left-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-800 shadow-lg md:hidden"
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
        className={`fixed inset-y-0 left-0 z-40 flex h-screen w-60 shrink-0 flex-col bg-slate-900 text-slate-300 shadow-xl transition-all duration-200 md:sticky md:top-0 md:z-auto md:shadow-none ${
          sidebarOpen
            ? "translate-x-0 md:w-60"
            : "-translate-x-full md:w-16 md:translate-x-0"
        }`}
      >
        <button
          type="button"
          onClick={() => setSidebarOpen((open) => !open)}
          aria-label={sidebarOpen ? "사이드바 접기" : "사이드바 펼치기"}
          title={sidebarOpen ? "사이드바 접기" : "사이드바 펼치기"}
          className="absolute right-0 top-5 z-10 flex h-9 w-9 translate-x-1/2 items-center justify-center rounded-full border border-slate-700/70 bg-slate-950 text-slate-50 shadow-lg hover:bg-slate-800"
        >
          {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
        </button>

        {/* 브랜드: 학교명(API) + UniVUs — 펼침=강의 내역 이동 / 접힘=로고 클릭 시 펼치기 */}
        <div className={`flex items-center px-3 py-4 ${sidebarOpen ? "gap-2" : "justify-center"}`}>
          {sidebarOpen ? (
            <Link
              href="/lms/professor/courses"
              title="강의 내역"
              className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-1 transition-colors hover:bg-slate-800/60"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/univusicon.png" alt="UniVUs" className="h-10 w-10 shrink-0 object-contain" />
              <div className="min-w-0">
                <p className="truncate text-[11px] text-slate-400">
                  {/* 학교명: BE 제공(계정 미설정이면 null) */}
                  {profile?.universityName || "—"}
                </p>
                <p className="text-lg font-bold text-white">UniVUs</p>
              </div>
              <span className="ml-auto rounded-md border border-slate-600 px-2 py-0.5 text-xs text-slate-300">
                {profile?.role || "교수"}
              </span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="사이드바 펼치기"
              title="사이드바 펼치기"
              className="flex items-center justify-center rounded-xl p-2 transition-colors hover:bg-slate-800/60"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/univusicon.png" alt="" className="h-10 w-10 shrink-0 object-contain" />
            </button>
          )}
        </div>

        {/* 사용자 카드 */}
        <div
          className={`mx-3 mb-4 flex items-center rounded-xl bg-slate-800/70 px-3 py-3 ${
            sidebarOpen ? "gap-3" : "justify-center"
          }`}
        >
          <div className={`flex h-10 w-10 items-center justify-center overflow-hidden rounded-full ${getLmsAvatarColor(profile?.employeeNo)} text-sm font-semibold text-white`}>
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              <span>{initial}</span>
            )}
          </div>
          {sidebarOpen && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {profile?.name ?? "교수"} {profile?.role || "교수"}
              </p>
              <p className="truncate text-xs text-slate-400">
                {/* 학과 · 사번 (학생 사이드바의 학과·학번과 동일 패턴) */}
                {profile?.department ?? "—"}
                {profile?.employeeNo
                  ? ` · ${profile.employeeNo}`
                  : ""}
              </p>
            </div>
          )}
        </div>

        {/* 프로필 로드 실패 시 (가짜 정보로 가리지 않고 표기) */}
        {sidebarOpen && loadFailed && !profile && (
          <p className="mx-3 -mt-2 mb-3 text-[11px] text-amber-400">
            ⚠ 프로필 정보를 불러오지 못했습니다 (서버 확인)
          </p>
        )}

        {/* 네비게이션 */}
        <nav className="flex-1 overflow-y-auto px-3">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="mb-4">
              {sidebarOpen && (
                <p className="px-2 pb-1 text-[11px] font-medium tracking-wide text-slate-500">
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
                const content = (
                  <>
                    <span className="text-base">{item.icon}</span>
                    {sidebarOpen && <span className="flex-1">{item.label}</span>}
                    {badge != null && badge > 0 && (
                      <span
                        className={`rounded-full bg-emerald-500/90 px-1.5 text-[11px] font-semibold text-white ${
                          sidebarOpen ? "" : "absolute right-0.5 top-0.5"
                        }`}
                      >
                        {badge}
                      </span>
                    )}
                  </>
                );
                const base =
                  "relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors";
                return item.href ? (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`${base} ${
                      active
                        ? "bg-slate-700 font-semibold text-white"
                        : "text-slate-300 hover:bg-slate-800"
                    } ${sidebarOpen ? "" : "justify-center"}`}
                  >
                    {content}
                  </Link>
                ) : (
                  <div
                    key={item.label}
                    title="준비 중"
                    className={`${base} cursor-not-allowed text-slate-500 ${
                      sidebarOpen ? "" : "justify-center"
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
        <div className="py-2">
          <Link
            href="/home"
            title="홈으로"
            className={`flex items-center gap-2.5 px-5 py-2 text-sm text-slate-300 hover:text-white ${
              sidebarOpen ? "" : "justify-center px-0"
            }`}
          >
            <span className="text-base">🏠</span> {sidebarOpen && "홈으로"}
          </Link>
          <button
            type="button"
            onClick={() => setLogoutOpen(true)}
            title="로그아웃"
            className={`flex w-full items-center gap-2.5 px-5 py-2 text-sm text-slate-300 hover:text-white ${
              sidebarOpen ? "" : "justify-center px-0"
            }`}
          >
            <span className="text-base">↩</span> {sidebarOpen && "로그아웃"}
          </button>
        </div>
      </aside>

      {/* 콘텐츠 */}
      <div className="flex-1 overflow-x-hidden">{children}</div>

      {/* PLM-011 로그아웃 확인 모달 — 사이드바(w-60) 제외 본문 기준 중앙 */}
      {logoutOpen && (
        <div
          className="fixed inset-y-0 right-0 left-60 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="로그아웃 확인"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
            {/* §13 교수 화면 = 슬레이트 톤(설계서 teal 아이콘 박스 → slate-100 치환) */}
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
              🚪
            </div>
            <h3 className="text-lg font-bold text-slate-900">로그아웃 하시겠습니까?</h3>
            <p className="mt-1 text-sm text-slate-500">아래 계정에서 로그아웃됩니다.</p>

            {/* 계정 카드 */}
            <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-left">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full ${getLmsAvatarColor(profile?.employeeNo)} text-sm font-semibold text-white`}>
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
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
