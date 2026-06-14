import Link from "next/link";
import { GraduationCap, Home, MessageSquare } from "lucide-react";

import NotFoundBackButton from "@/components/common/NotFoundBackButton";
import { Button } from "@/components/ui/button";

const quickLinks = [
  {
    href: "/home",
    label: "홈",
    description: "캠퍼스 홈으로 이동",
    icon: Home,
  },
  {
    href: "/lms/student/profile",
    label: "LMS",
    description: "학생 LMS로 이동",
    icon: GraduationCap,
  },
  {
    href: "/community",
    label: "커뮤니티",
    description: "커뮤니티 홈으로 이동",
    icon: MessageSquare,
  },
];

export default function NotFound() {
  return (
    <main className="min-h-svh bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-svh w-full max-w-5xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center">
          <Link
            href="/home"
            className="inline-flex items-center gap-2 rounded-lg px-1 py-1 text-sm font-extrabold tracking-tight text-slate-900 transition-colors hover:text-primary"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-black text-white">
              U
            </span>
            Univ-Us
          </Link>
        </header>

        <section className="flex flex-1 items-center py-14">
          <div className="grid w-full items-center gap-10 lg:grid-cols-[1fr_360px]">
            <div className="min-w-0">
              <p className="text-sm font-bold text-primary">페이지를 찾을 수 없습니다</p>
              <h1 className="mt-4 max-w-2xl text-4xl font-black leading-tight tracking-normal text-slate-950 sm:text-5xl">
                요청한 캠퍼스 경로가 사라졌거나 이동했어요.
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
                주소를 다시 확인하거나, 아래 주요 메뉴에서 필요한 화면으로 바로 이동해 주세요.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <NotFoundBackButton />
                <Button asChild size="lg" className="h-11 px-4">
                  <Link href="/home">
                    <Home className="size-4" />
                    홈으로
                  </Link>
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
                <span className="text-sm font-extrabold text-slate-900">빠른 이동</span>
                <span className="text-xs font-semibold text-slate-400">Univ-Us</span>
              </div>
              <div className="space-y-2">
                {quickLinks.map(({ href, label, description, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="group flex items-center gap-3 rounded-lg border border-transparent px-3 py-3 transition-colors hover:border-primary/20 hover:bg-primary/5"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-slate-900">{label}</span>
                      <span className="block truncate text-xs font-medium text-slate-500">{description}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
