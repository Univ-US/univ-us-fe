"use client";

// LMS 교수 공용 레이아웃 (사이드바 + 콘텐츠 셸)
// - 사이드바 상단: 학교명(API) + UniVUs 브랜드 + 사용자(이름/소속/아바타, API)
// - 네비: '프로필'만 활성(PLM-001). 나머지 메뉴는 해당 화면 미구현이라 placeholder(비활성)
// - children = 각 LMS 페이지(현재는 /lms/professor/profile)
import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useProfessorProfileStore } from "@/store/lms/lmsProfessorProfileStore";

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
    title: "강의 관리",
    items: [
      { label: "강의 내역", icon: "📖" },
      { label: "수강생 현황", icon: "👥" },
      { label: "채점 현황", icon: "✅", badge: 5 },
    ],
  },
  {
    title: "콘텐츠",
    items: [
      { label: "강의 업로드", icon: "🎬" },
      { label: "과제 관리", icon: "📄" },
      { label: "공지사항", icon: "📢" },
      { label: "출결 확인", icon: "🗓️" },
    ],
  },
  {
    title: "커뮤니케이션",
    items: [
      { label: "채팅", icon: "💬", badge: 2 },
      { label: "캘린더", icon: "📅" },
    ],
  },
];

export default function LmsProfessorLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const logoutAction = useAuthStore((s) => s.logoutAction);
  // 사이드바 헤더(학교/이름/소속/역할/아바타) — 공유 스토어 구독 (폼과 1회 공유, 저장 시 자동 갱신)
  const profile = useProfessorProfileStore((s) => s.profile);
  const loadProfile = useProfessorProfileStore((s) => s.load);

  useEffect(() => {
    loadProfile().catch(() => {});
  }, [loadProfile]);

  const handleLogout = async () => {
    try {
      await logoutAction();
    } catch {
      /* 무시 */
    } finally {
      router.push("/");
    }
  };

  const avatar = resolveImg(profile?.lmsProfessorProfileImageUrl ?? null);
  const initial = profile?.lmsProfessorProfileName?.trim()?.[0] ?? "U";

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* 사이드바 */}
      <aside className="flex w-60 shrink-0 flex-col bg-slate-900 text-slate-300">
        {/* 브랜드: 학교명(API) + UniVUs */}
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-lg font-bold text-white">
            U
          </div>
          <div className="min-w-0">
            <p className="truncate text-[11px] text-slate-400">
              {/* 학교명: BE 제공(계정 미설정이면 null) */}
              {profile?.lmsProfessorProfileUniversityName || "—"}
            </p>
            <p className="text-lg font-bold text-white">UniVUs</p>
          </div>
          <span className="ml-auto rounded-md border border-slate-600 px-2 py-0.5 text-xs text-slate-300">
            {profile?.lmsProfessorProfileRole || "교수"}
          </span>
        </div>

        {/* 사용자 카드 */}
        <div className="mx-3 mb-4 flex items-center gap-3 rounded-xl bg-slate-800/70 px-3 py-3">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-teal-700 text-sm font-semibold text-white">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              <span>{initial}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              {profile?.lmsProfessorProfileName ?? "교수"} {profile?.lmsProfessorProfileRole || "교수"}
            </p>
            <p className="truncate text-xs text-slate-400">
              {profile?.lmsProfessorProfileDepartment ?? "—"}
            </p>
          </div>
        </div>

        {/* 네비게이션 */}
        <nav className="flex-1 overflow-y-auto px-3">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="mb-4">
              <p className="px-2 pb-1 text-[11px] font-medium tracking-wide text-slate-500">
                {section.title}
              </p>
              {section.items.map((item) => {
                const active =
                  item.href && stripSlash(pathname) === stripSlash(item.href);
                const content = (
                  <>
                    <span className="text-base">{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    {item.badge != null && (
                      <span className="rounded-full bg-emerald-500/90 px-1.5 text-[11px] font-semibold text-white">
                        {item.badge}
                      </span>
                    )}
                  </>
                );
                const base =
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors";
                return item.href ? (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`${base} ${
                      active
                        ? "bg-slate-700 font-semibold text-white"
                        : "text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    {content}
                  </Link>
                ) : (
                  <div
                    key={item.label}
                    title="준비 중"
                    className={`${base} cursor-not-allowed text-slate-500`}
                  >
                    {content}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        {/* 로그아웃 */}
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-5 py-4 text-sm text-slate-300 hover:text-white"
        >
          <span className="text-base">↩</span> 로그아웃
        </button>
      </aside>

      {/* 콘텐츠 */}
      <div className="flex-1 overflow-x-hidden">{children}</div>
    </div>
  );
}
