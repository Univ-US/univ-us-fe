"use client";

// LMS 학생 공용 레이아웃 (사이드바 + 콘텐츠 셸)
// - 사이드바 상단: 학교명(API) + UniVUs 브랜드 + 사용자(이름/학과/아바타, API)
// - 네비: '프로필'만 활성(SLM-001). 나머지 메뉴는 해당 화면 미구현이라 placeholder(비활성)
// - children = 각 LMS 페이지(현재는 /lms/student/profile)
import { Client, type IStompSocket } from "@stomp/stompjs";
import { useEffect, useState, type ReactNode } from "react";
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import SockJS from "sockjs-client";
import { useAuthStore } from "@/store/authStore";
import { useStudentProfileStore } from "@/store/lms/lmsStudentProfileStore";
import { useLmsStudentAssignmentStore } from "@/store/lms/lmsStudentAssignmentStore";
import { useLmsStudentChatStore } from "@/store/lms/lmsStudentChatStore";
import LmsGuard from "@/components/auth/LmsGuard";
import useEscapeClose from "@/components/lms/useEscapeClose";
import {
  getChatRooms,
  LMS_STUDENT_CHAT_TOPIC_PREFIX,
  type ChatMessage,
} from "@/lib/lmsStudentChatApi";
import { getWebSocketEndpointUrl } from "@/lib/realtime";
import { ROLE, type Role } from "@/lib/rolecode";
import { getSubscriptionStatus } from "@/lib/subscriptionApi";

// SLM(학생 LMS) 접근 허용 역할: 학생 + 졸업생 — 관리자(ADM·SUA)는 LMS 미진입(BO에서 데이터 관리)
const STUDENT_LMS_ROLES: Role[] = [ROLE.STU, ROLE.ALU];

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:9090";
const resolveImg = (u?: string | null) =>
  !u ? null : u.startsWith("http") ? u : `${API_BASE}${u}`;

// trailingSlash:true(next.config) → pathname이 "/lms/student/profile/"로 와서
// href("/lms/student/profile")와 정확 일치가 깨진다. 양끝 슬래시를 떼고 비교.
const stripSlash = (p: string) => p.replace(/\/+$/, "") || "/";

type NavItem = { label: string; icon: string; href?: string; badge?: number };
const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  { title: "계정", items: [{ label: "프로필", icon: "👤", href: "/lms/student/profile" }] },
  {
    title: "메인",
    items: [
      { label: "대시보드", icon: "🏠", href: "/lms/student/dashboard" },
      { label: "수강 내역", icon: "📖", href: "/lms/student/courses" },
      { label: "과제 내역", icon: "📄", href: "/lms/student/assignments/history" },
      { label: "출석 내역", icon: "🗓️", href: "/lms/student/attendance" },
    ],
  },
  {
    title: "학습",
    items: [
      { label: "강의 자료", icon: "🎬", href: "/lms/student/materials" },
      { label: "과제 제출", icon: "📤", href: "/lms/student/assignments/submit" },
      { label: "채팅", icon: "💬", href: "/lms/student/chat" },
      { label: "공지사항", icon: "📢", href: "/lms/student/notice" },
      { label: "캘린더", icon: "📅", href: "/lms/student/calendar" },
    ],
  },
];

function LmsStudentLayoutInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const logoutAction = useAuthStore((s) => s.logoutAction);
  // 사이드바 헤더(학교/이름/학과/역할/아바타) — 공유 스토어 구독 (폼과 1회 공유, 저장 시 자동 갱신)
  const profile = useStudentProfileStore((s) => s.profile);
  const loadProfile = useStudentProfileStore((s) => s.load);
  const submittableAssignmentCount = useLmsStudentAssignmentStore((s) => s.submittableCount);
  const loadSubmittableAssignmentCount = useLmsStudentAssignmentStore((s) => s.loadSubmittableCount);
  const chatUnreadCount = useLmsStudentChatStore((s) => s.unreadCount);
  const loadChatUnreadCount = useLmsStudentChatStore((s) => s.loadUnreadCount);
  const [accessChecked, setAccessChecked] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false); // 프로필 로드 실패(BE 문제) 표기
  const [logoutOpen, setLogoutOpen] = useState(false); // SLM-011 로그아웃 확인 모달
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const sync = () => setSidebarOpen(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

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
      void loadSubmittableAssignmentCount();
      void loadChatUnreadCount();
    }
  }, [accessChecked, loadProfile, loadSubmittableAssignmentCount, loadChatUnreadCount]);

  // SLM-011: 사이드바 로그아웃 → 확인 모달 → 확인 시 로그아웃 + 로그인 페이지(/) 이동
  const handleLogout = async () => {
    try {
      await logoutAction();
    } catch {
      /* 무시 */
    } finally {
      router.push("/");
    }
  };

  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 767px)");
    if (mobile.matches) setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    const currentPath = stripSlash(pathname);
    if (!accessChecked || currentPath.startsWith("/lms/student/chat")) return;

    let disposed = false;
    let client: Client | null = null;

    void getChatRooms()
      .then((rooms) => {
        if (disposed || rooms.length === 0) return;

        client = new Client({
          webSocketFactory: () =>
            new SockJS(getWebSocketEndpointUrl()) as unknown as IStompSocket,
          reconnectDelay: 5000,
          heartbeatIncoming: 10000,
          heartbeatOutgoing: 10000,
          debug: () => {},
          onConnect: () => {
            if (disposed) return;
            rooms.forEach((room) => {
              client?.subscribe(`${LMS_STUDENT_CHAT_TOPIC_PREFIX}/${room.roomId}`, (message) => {
                if (!message.body) return;
                try {
                  const payload = JSON.parse(message.body) as ChatMessage;
                  if (payload.senderLmsPrfId !== room.studentLmsPrfId) {
                    void loadChatUnreadCount();
                  }
                } catch {
                  // Ignore malformed realtime payloads.
                }
              });
            });
          },
        });

        client.activate();
      })
      .catch(() => {
        /* unread 초기 조회가 이미 있으므로 실시간 구독 실패는 조용히 둔다. */
      });

    return () => {
      disposed = true;
      void client?.deactivate();
    };
  }, [accessChecked, loadChatUnreadCount, pathname]);

  useEscapeClose(logoutOpen, () => setLogoutOpen(false)); // ESC = 취소

  const avatar = resolveImg(profile?.lmsStudentProfileImageUrl ?? null);
  const initial = profile?.lmsStudentProfileName?.trim()?.[0] ?? "U";

  if (!accessChecked) return null;

  return (
    <div className="flex min-h-screen bg-slate-50">
      {!sidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          aria-label="사이드바 열기"
          title="사이드바 열기"
          className="fixed left-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-200 bg-white text-emerald-800 shadow-lg md:hidden"
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
          높이는 h-screen 고정(명시 높이라 flex stretch에 안 늘어남), 메뉴(nav)만 내부 스크롤 */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-screen w-60 shrink-0 flex-col bg-emerald-900 text-emerald-100/80 shadow-xl transition-all duration-200 md:sticky md:top-0 md:z-auto md:shadow-none ${
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
          className="absolute right-0 top-5 z-10 flex h-9 w-9 translate-x-1/2 items-center justify-center rounded-full border border-emerald-700/70 bg-emerald-950 text-emerald-50 shadow-lg hover:bg-emerald-800"
        >
          {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
        </button>

        {/* 브랜드: 학교명(API) + UniVUs — 클릭 시 홈(/home)으로 이동 */}
        <div className={`flex items-center px-3 py-4 ${sidebarOpen ? "gap-2" : "justify-center"}`}>
          {sidebarOpen ? (
            <Link
              href="/home"
              title="홈으로"
              className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-1 transition-colors hover:bg-emerald-800/50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/univusicon.png" alt="UniVUs" className="h-10 w-10 shrink-0 object-contain" />
              <>
                <div className="min-w-0">
                  <p className="truncate text-[11px] text-emerald-200/70">
                    {/* 학교명: BE 제공(계정 미설정이면 null) */}
                    {profile?.lmsStudentProfileUniversityName || "-"}
                  </p>
                  <p className="text-lg font-bold text-white">UniVUs</p>
                </div>
                <span className="ml-auto rounded-md border border-emerald-600/60 px-2 py-0.5 text-xs text-emerald-50">
                  {profile?.lmsStudentProfileRole || "학생"}
                </span>
              </>
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="사이드바 펼치기"
              title="사이드바 펼치기"
              className="flex items-center justify-center rounded-xl p-2 transition-colors hover:bg-emerald-800/50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/univusicon.png" alt="" className="h-10 w-10 shrink-0 object-contain" />
            </button>
          )}
        </div>

        {/* 사용자 카드 */}
        <div
          className={`mx-3 mb-4 flex items-center rounded-xl bg-emerald-800/40 px-3 py-3 ${
            sidebarOpen ? "gap-3" : "justify-center"
          }`}
        >
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-teal-700 text-sm font-semibold text-white">
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
                {profile?.lmsStudentProfileName ?? "학생"}
              </p>
              <p className="truncate text-xs text-emerald-200/60">
                {/* 학과 · 학번 */}
                {profile?.lmsStudentProfileDepartment ?? "-"}
                {profile?.lmsStudentProfileStudentNo
                  ? ` · ${profile.lmsStudentProfileStudentNo}`
                  : ""}
              </p>
            </div>
          )}
        </div>

        {/* 프로필 로드 실패 시 (가짜 정보로 가리지 않고 표기) */}
        {sidebarOpen && loadFailed && !profile && (
          <p className="mx-3 -mt-2 mb-3 text-[11px] text-amber-300">
            ⚠ 프로필 정보를 불러오지 못했습니다 (서버 확인)
          </p>
        )}

        {/* 네비게이션 */}
        <nav className="flex-1 overflow-y-auto px-3">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="mb-4">
              {sidebarOpen && (
                <p className="px-2 pb-1 text-[11px] font-medium tracking-wide text-emerald-300/50">
                  {section.title}
                </p>
              )}
              {section.items.map((item) => {
                const active =
                  item.href && stripSlash(pathname) === stripSlash(item.href);
                const badge =
                  item.href === "/lms/student/assignments/submit"
                    ? submittableAssignmentCount
                    : item.href === "/lms/student/chat"
                      ? chatUnreadCount
                    : item.badge;
                const content = (
                  <>
                    <span className="text-base">{item.icon}</span>
                    {sidebarOpen && <span className="flex-1">{item.label}</span>}
                    {badge != null && badge > 0 && (
                      <span
                        className={`rounded-full bg-orange-500 px-1.5 text-[11px] font-semibold text-white ${
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
                        ? "bg-emerald-700/80 font-semibold text-white before:absolute before:bottom-1.5 before:left-0 before:top-1.5 before:w-0.5 before:rounded-full before:bg-emerald-300 before:content-['']"
                        : "text-emerald-100/80 hover:bg-emerald-800/50"
                    } ${sidebarOpen ? "" : "justify-center"}`}
                  >
                    {content}
                  </Link>
                ) : (
                  <div
                    key={item.label}
                    title="준비 중"
                    className={`${base} cursor-not-allowed text-emerald-200/40 ${
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
            className={`flex items-center gap-2.5 px-5 py-2 text-sm text-emerald-100/80 hover:text-white ${
              sidebarOpen ? "" : "justify-center px-0"
            }`}
          >
            <span className="text-base">🏠</span> {sidebarOpen && "홈으로"}
          </Link>
          <button
            type="button"
            onClick={() => setLogoutOpen(true)}
            title="로그아웃"
            className={`flex w-full items-center gap-2.5 px-5 py-2 text-sm text-emerald-100/80 hover:text-white ${
              sidebarOpen ? "" : "justify-center px-0"
            }`}
          >
            <span className="text-base">↩</span> {sidebarOpen && "로그아웃"}
          </button>
        </div>
      </aside>

      {/* 콘텐츠 */}
      <div className="flex-1 overflow-x-hidden">{children}</div>

      {/* SLM-011 로그아웃 확인 모달 — 사이드바(w-60) 제외 본문 기준 중앙 */}
      {logoutOpen && (
        <div
          className="fixed inset-y-0 right-0 left-60 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="로그아웃 확인"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-2xl">
              🚪
            </div>
            <h3 className="text-lg font-bold text-slate-900">로그아웃 하시겠습니까?</h3>
            <p className="mt-1 text-sm text-slate-500">아래 계정에서 로그아웃됩니다.</p>

            {/* 계정 카드 */}
            <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-left">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-teal-700 text-sm font-semibold text-white">
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span>{initial}</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {profile?.lmsStudentProfileName ?? "학생"}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {profile?.lmsStudentProfileStudentNo ?? "-"}
                  {profile?.lmsStudentProfileDepartment ? ` · ${profile.lmsStudentProfileDepartment}` : ""}
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
export default function LmsStudentLayout({ children }: { children: ReactNode }) {
  return (
    <LmsGuard allowedRoles={STUDENT_LMS_ROLES}>
      <LmsStudentLayoutInner>{children}</LmsStudentLayoutInner>
    </LmsGuard>
  );
}
