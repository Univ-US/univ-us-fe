"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";

const getRedirectPathByRole = (role: string) => {
    switch (role) {
        case "SUA":
            return "/dashboard/service-admin";
        case "ADM":
            return "/dashboard/school-admin";
        case "GUEST":
            return "/landing";
        default:
            return null;
    }
};

export default function LoginPage() {
    const router = useRouter();
    const loginAction = useAuthStore((state) => state.loginAction);

    const [memberId, setMemberId] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");

        if (!memberId.trim() || !password.trim()) {
            setError("아이디와 비밀번호를 입력해주세요.");
            return;
        }

        const parsedMemberId = Number(memberId);

        if (Number.isNaN(parsedMemberId)) {
            setError("회원 ID는 숫자로 입력해주세요.");
            return;
        }

        try {
            setSubmitting(true);

            const role = await loginAction(parsedMemberId, password);
            const redirectPath = getRedirectPathByRole(role);

            if (!redirectPath) {
                setError("운영자 계정만 로그인할 수 있습니다.");
                return;
            }

            router.push(redirectPath);
        } catch {
            setError("로그인에 실패했습니다. 아이디 또는 비밀번호를 확인해주세요.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
            <form
                onSubmit={handleSubmit}
                className="w-full max-w-[380px] rounded-2xl border border-border bg-white p-6 shadow-sm"
            >
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                    로그인
                </h1>

                <div className="mt-6 space-y-4">
                    <input
                        value={memberId}
                        onChange={(e) => setMemberId(e.target.value)}
                        placeholder="회원 ID"
                        className="h-11 w-full rounded-lg border border-input px-3.5 text-sm outline-none focus:border-primary"
                    />

                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="비밀번호"
                        className="h-11 w-full rounded-lg border border-input px-3.5 text-sm outline-none focus:border-primary"
                    />
                </div>

                {error && (
                    <p className="mt-3 text-sm font-medium text-red-500">{error}</p>
                )}

                <Button type="submit" className="mt-5 w-full" disabled={submitting}>
                    <LogIn className="size-4" />
                    {submitting ? "로그인 중..." : "로그인"}
                </Button>
                <div className="mt-5 text-center text-sm text-slate-500">
                    아직 계정이 없나요?{" "}
                    <Link href="/signup" className="font-bold text-primary">
                        회원가입
                    </Link>
                </div>
            </form>
        </main>
    );
}
