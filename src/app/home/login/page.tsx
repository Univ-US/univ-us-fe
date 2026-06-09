"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import { userLogin } from "@/lib/authApi";
import { getUniversities } from "@/lib/homeApi";
import type { University } from "@/lib/homeApi";

const getRedirectPathByRole = (role: string) => {
    switch (role) {
        case "ADM":
            return "/dashboard/school-admin";
        default:
            return "/home";
    }
};

export default function UserLoginPage() {
    const router = useRouter();
    const loadFromStorage = useAuthStore((s) => s.loadFromStorage);

    const [memberId, setMemberId] = useState("");
    const [password, setPassword] = useState("");
    const [univId, setUnivId] = useState<number | null>(null);
    const [universities, setUniversities] = useState<University[]>([]);
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        getUniversities().then(setUniversities).catch(() => {});
    }, []);

    const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");

        if (!memberId.trim() || !password.trim()) {
            setError("아이디와 비밀번호를 입력해주세요.");
            return;
        }

        if (univId === null) {
            setError("학교를 선택해주세요.");
            return;
        }

        try {
            setSubmitting(true);

            const data = await userLogin({ loginId: memberId, password, univId });

            localStorage.setItem("accessToken", data.accessToken);
            localStorage.setItem("refreshToken", data.refreshToken);
            localStorage.setItem("memberId", String(data.memberId));
            localStorage.setItem("memberName", data.memberName);
            localStorage.setItem("role", data.role);
            if (data.univId != null) localStorage.setItem("univId", String(data.univId));
            if (data.univName) localStorage.setItem("univName", data.univName);
            localStorage.setItem("communityNickname", data.communityNickname ?? "");
            loadFromStorage();

            const redirectPath = new URLSearchParams(window.location.search).get("redirect");
            const communityAllowedRoles = ["SUA", "ADM", "STU", "ALU"];
            const canRedirectToCommunity =
                !!redirectPath &&
                redirectPath.startsWith("/community") &&
                communityAllowedRoles.includes(data.role);

            router.push(canRedirectToCommunity ? redirectPath : getRedirectPathByRole(data.role));
        } catch {
            setError("로그인에 실패했습니다. 아이디 또는 비밀번호를 확인해주세요.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main className="flex min-h-screen items-center justify-center bg-[#f4f6f8] px-6">
            <div className="w-full max-w-[380px]">
                <div className="flex items-center gap-2 justify-center mb-8">
                    <div className="w-8 h-8 bg-[#11302a] rounded-md flex items-center justify-center text-white text-sm font-black">
                        U
                    </div>
                    <span className="font-extrabold text-slate-900 text-lg tracking-tight">Univ·us</span>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                    <h1 className="text-xl font-extrabold tracking-tight text-slate-900 mb-6">
                        로그인
                    </h1>

                    <div className="space-y-3">
                        <select
                            value={univId ?? ""}
                            onChange={(e) => setUnivId(e.target.value ? Number(e.target.value) : null)}
                            className="h-11 w-full rounded-lg border border-slate-200 px-3.5 text-sm outline-none focus:border-primary transition bg-white"
                        >
                            <option value="">학교를 선택해주세요</option>
                            {universities.map((u) => (
                                <option key={u.univId} value={u.univId}>
                                    {u.univName}
                                </option>
                            ))}
                        </select>

                        <input
                            value={memberId}
                            onChange={(e) => setMemberId(e.target.value)}
                            placeholder="학번 / 교번"
                            className="h-11 w-full rounded-lg border border-slate-200 px-3.5 text-sm outline-none focus:border-primary transition"
                        />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="비밀번호"
                            className="h-11 w-full rounded-lg border border-slate-200 px-3.5 text-sm outline-none focus:border-primary transition"
                        />
                    </div>

                    {error && (
                        <p className="mt-3 text-sm font-medium text-red-500">{error}</p>
                    )}

                    <Button type="submit" className="mt-5 w-full" disabled={submitting}>
                        <LogIn className="size-4" />
                        {submitting ? "로그인 중..." : "로그인"}
                    </Button>

                    <div className="mt-5 text-center text-xs text-slate-400">
                        계정이 없으신가요?{" "}
                        <Link href="/home/contact" className="font-semibold text-primary hover:underline">
                            학교 관리자에게 문의
                        </Link>
                    </div>
                </form>
            </div>
        </main>
    );
}
