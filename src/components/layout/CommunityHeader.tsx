"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, Bell, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/community",        label: "커뮤니티 홈", exact: true },
  { href: "/community/free",   label: "자유게시판" },
  { href: "/community/secret", label: "익명게시판" },
  { href: "/community/notice", label: "공지사항" },
  { href: "/community/market", label: "중고거래" },
  { href: "/community/facility", label: "시설 이용" },
];

export default function CommunityHeader() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 shadow-sm">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-6 px-6">

        {/* 로고 */}
        <Link href="/community" className="flex items-center gap-2.5 shrink-0 group">
          {/* 아이콘 마크 */}
          <div className="relative flex size-8 items-center justify-center">
            {/* 글로우 효과 */}
            <div className="absolute inset-0 rounded-xl bg-primary opacity-20 blur-md group-hover:opacity-30 transition-opacity" />
            {/* 아이콘 본체 */}
            <div className="relative flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-teal-700 shadow-md shadow-primary/30 text-white font-extrabold text-sm">
              U
            </div>
          </div>
          {/* 텍스트 */}
          <span className="text-[20px] font-extrabold tracking-tight text-slate-900">
            Univ<span className="text-primary">Us</span>
          </span>
        </Link>

        {/* 구분선 */}
        <div className="h-5 w-px bg-border shrink-0" />

        {/* 네비게이션 */}
        <nav className="hidden items-center gap-0.5 md:flex">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative rounded-md px-3.5 py-2 text-[14.5px] font-semibold transition-colors",
                  active
                    ? "text-primary"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                {item.label}
                {active && (
                  <span className="absolute inset-x-3 -bottom-[17px] h-[2.5px] rounded-full bg-primary shadow-sm shadow-primary/50" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* 우측 액션 */}
        <div className="ml-auto flex items-center gap-2.5">

          {/* 검색창 */}
          <div className="relative hidden lg:block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="게시글, 상품 검색"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const value = (e.target as HTMLInputElement).value.trim();
                  if (value) router.push(`/community/search?q=${encodeURIComponent(value)}`);
                  else router.push("/community/search");
                }
              }}
              onClick={() => router.push("/community/search")}
              className="h-9 w-60 rounded-full border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 focus:shadow-sm cursor-pointer"
            />
          </div>

          {/* 알림 버튼 */}
          <button className="relative flex size-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-all hover:border-primary hover:text-primary hover:shadow-md hover:shadow-primary/10">
            <Bell className="size-[18px]" />
            {/* 알림 뱃지 */}
            <span className="absolute right-2 top-2 size-[7px] rounded-full border-2 border-white bg-red-500 shadow-sm" />
          </button>

          {/* 마이페이지 버튼 */}
          <button
            onClick={() => router.push("/community/mypage")}
            className={cn(
              "flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition-all",
              pathname.startsWith("/community/mypage")
                ? "border-primary bg-primary/5 text-primary shadow-sm shadow-primary/20"
                : "border-slate-200 bg-white text-slate-600 hover:border-primary hover:text-primary hover:shadow-md hover:shadow-primary/10"
            )}
          >
            <UserRound className="size-4" />
            마이페이지
          </button>

        </div>
      </div>
    </header>
  );
}