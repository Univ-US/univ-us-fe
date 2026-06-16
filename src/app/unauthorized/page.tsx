"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";

export default function UnauthorizedPage() {
  const logoutAction = useAuthStore((state) => state.logoutAction);

  useEffect(() => {
    void logoutAction();
  }, [logoutAction]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 text-slate-950">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          <ShieldAlert className="size-6" />
        </div>
        <h1 className="mt-5 text-2xl font-black">접근 권한이 없습니다</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          현재 계정으로는 이 화면에 접근할 수 없습니다. 학교 구독 상태가 비활성화된 경우 학교 관리자에게 문의해 주세요.
        </p>
        <Button asChild className="mt-6 w-full font-black">
          <Link href="/home/login">홈 로그인으로 이동</Link>
        </Button>
      </section>
    </main>
  );
}
