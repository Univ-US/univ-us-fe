"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import {
    isAdminSessionConflictError,
    type AdminSessionInfo,
} from "@/lib/authApi";

const getRedirectPathByRole = (role: string) => {
    switch (role) {
        case "SUA":
            return "/service-admin";
        case "ADM":
            return "/dashboard/school-admin";
        case "GUEST":
            return "/landing";
        default:
            return "/home";
    }
};

export default function LoginPage() {
    const router = useRouter();

    const loginAction = useAuthStore((state) => state.loginAction);
    const isInitialized = useAuthStore((state) => state.isInitialized);
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
    const role = useAuthStore((state) => state.role);

    const [loginId, setLoginId] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [conflictSession, setConflictSession] =
        useState<AdminSessionInfo | null>(null);

    useEffect(() => {
        if (!isInitialized || !isLoggedIn) return;

        const redirectPath = role ? getRedirectPathByRole(role) : "/landing";
        router.replace(redirectPath ?? "/landing");
    }, [isInitialized, isLoggedIn, role, router]);

    const submitLogin = async (forceLogin = false) => {
        setError("");

        if (!loginId.trim() || !password.trim()) {
            setError("아이디와 비밀번호를 입력해주세요.");
            return;
        }

        if (!/^\d+$/.test(loginId)) {
            setError("로그인 ID는 숫자로 입력해주세요.");
            return;
        }

        try {
            setSubmitting(true);

            const role = await loginAction(loginId, password, forceLogin);
            const redirectPath = getRedirectPathByRole(role);

            if (!redirectPath) {
                setError("운영 계정만 로그인할 수 있습니다.");
                return;
            }

            router.push(redirectPath);
        } catch (error) {
            if (isAdminSessionConflictError(error)) {
                setConflictSession(error.response.data.session ?? null);
                return;
            }

            setError("로그인에 실패했습니다. 아이디 또는 비밀번호를 확인해주세요.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        await submitLogin(false);
    };

    const handleCancelConflict = () => {
        setConflictSession(null);
        setError("기존 접속이 있어 로그인이 취소되었습니다.");
    };

    const handleForceLogin = async () => {
        setConflictSession(null);
        await submitLogin(true);
    };

    if (!isInitialized) {
        return null;
    }

    if (isLoggedIn) {
        return null;
    }

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
                        value={loginId}
                        onChange={(e) => setLoginId(e.target.value)}
                        placeholder="로그인 ID"
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
                <div className="mt-4 flex justify-center gap-3 text-xs text-slate-500">
                    <Link href="/account-recovery" className="font-medium hover:text-primary">
                        아이디 찾기
                    </Link>
                    <span aria-hidden="true">|</span>
                    <Link href="/account-recovery" className="font-medium hover:text-primary">
                        비밀번호 찾기
                    </Link>
                </div>
                <div className="mt-5 text-center text-sm text-slate-500">
                    아직 계정이 없나요?{" "}
                    <Link href="/signup" className="font-bold text-primary">
                        회원가입
                    </Link>
                </div>
            </form>

            {conflictSession && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
                    <div className="w-full max-w-[420px] rounded-2xl bg-white p-6 shadow-xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">
                                    동시 접근 제한
                                </h2>
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                    현재 같은 관리자 계정으로 접속 중인 세션이 있습니다.
                                    기존 접속을 종료하고 로그인하시겠습니까?
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleCancelConflict}
                                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                aria-label="닫기"
                            >
                                ×
                            </button>
                        </div>

                        <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                            <div className="flex justify-between gap-4">
                                <span className="text-slate-500">접속 시간</span>
                                <span className="font-medium">
                                    {conflictSession.loginAt ?? "확인 불가"}
                                </span>
                            </div>
                            <div className="mt-2 flex justify-between gap-4">
                                <span className="text-slate-500">접속 환경</span>
                                <span className="font-medium">
                                    {conflictSession.device ?? "확인 불가"}
                                </span>
                            </div>
                            <div className="mt-2 flex justify-between gap-4">
                                <span className="text-slate-500">접속 IP</span>
                                <span className="font-medium">
                                    {conflictSession.ipAddress ?? "확인 불가"}
                                </span>
                            </div>
                        </div>

                        <div className="mt-6 flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="flex-1"
                                onClick={handleCancelConflict}
                                disabled={submitting}
                            >
                                취소
                            </Button>
                            <Button
                                type="button"
                                className="flex-1"
                                onClick={handleForceLogin}
                                disabled={submitting}
                            >
                                기존 접속 종료
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
