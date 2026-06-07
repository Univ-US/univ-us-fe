"use client";

import Link from "next/link";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SubscribePage() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
            <div className="w-full max-w-[520px] rounded-2xl border border-border bg-white p-8 text-center shadow-sm">
                <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <CreditCard className="size-6" />
                </div>
                <h1 className="mt-5 text-2xl font-extrabold text-slate-900">
                    구독 신청
                </h1>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                    로그인한 기관 담당자가 플랜을 선택하고 구독 신청을 진행하는 페이지입니다.
                </p>
                <Button asChild className="mt-6">
                    <Link href="/home">홈으로 돌아가기</Link>
                </Button>
            </div>
        </main>
    );
}