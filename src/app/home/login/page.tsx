"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogIn, ChevronDown, Search, Check } from "lucide-react";
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
    const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
    const isInitialized = useAuthStore((s) => s.isInitialized);

    useEffect(() => {
        if (isInitialized && isLoggedIn) {
            router.replace("/home");
        }
    }, [isInitialized, isLoggedIn, router]);

    const [memberId, setMemberId] = useState("");
    const [password, setPassword] = useState("");
    const [univId, setUnivId] = useState<number | null>(null);
    const [universities, setUniversities] = useState<University[]>([]);
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [univOpen, setUnivOpen] = useState(false);
    const [univSearch, setUnivSearch] = useState("");
    const univRef = useRef<HTMLDivElement>(null);

    const selectedUniv = universities.find((u) => u.univId === univId) ?? null;
    const filteredUnivs = universities.filter((u) =>
        u.univName.toLowerCase().includes(univSearch.toLowerCase())
    );

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (univRef.current && !univRef.current.contains(e.target as Node)) {
                setUnivOpen(false);
                setUnivSearch("");
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

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
            localStorage.setItem("memberName", data.memberName);
            localStorage.setItem("role", data.role);
            if (data.univId != null) localStorage.setItem("univId", String(data.univId));
            if (data.univName) localStorage.setItem("univName", data.univName);
            loadFromStorage();

            router.push(getRedirectPathByRole(data.role));
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
                    <img src="/univusicon.png" alt="UniVUs" className="w-8 h-8 rounded-md" />
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
                        <div className="relative" ref={univRef}>
                            <button
                                type="button"
                                onClick={() => { setUnivOpen((v) => !v); setUnivSearch(""); }}
                                className={`h-11 w-full rounded-lg border px-3.5 text-sm text-left flex items-center justify-between transition bg-white outline-none ${
                                    univOpen ? "border-primary ring-2 ring-primary/20" : "border-slate-200"
                                }`}
                            >
                                <span className={selectedUniv ? "text-slate-900" : "text-slate-400"}>
                                    {selectedUniv ? selectedUniv.univName : "학교를 선택해주세요"}
                                </span>
                                <ChevronDown className={`size-4 text-slate-400 transition-transform ${univOpen ? "rotate-180" : ""}`} />
                            </button>

                            {univOpen && (
                                <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
                                    <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
                                        <Search className="size-4 shrink-0 text-slate-400" />
                                        <input
                                            autoFocus
                                            value={univSearch}
                                            onChange={(e) => setUnivSearch(e.target.value)}
                                            placeholder="학교 검색"
                                            className="w-full text-sm outline-none placeholder:text-slate-400"
                                        />
                                    </div>
                                    <ul className="max-h-48 overflow-y-auto py-1">
                                        {filteredUnivs.length > 0 ? filteredUnivs.map((u) => (
                                            <li key={u.univId}>
                                                <button
                                                    type="button"
                                                    onClick={() => { setUnivId(u.univId); setUnivOpen(false); setUnivSearch(""); }}
                                                    className="flex w-full items-center justify-between px-3.5 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                                                >
                                                    {u.univName}
                                                    {univId === u.univId && <Check className="size-4 text-primary" />}
                                                </button>
                                            </li>
                                        )) : (
                                            <li className="px-3.5 py-3 text-sm text-slate-400">검색 결과가 없어요</li>
                                        )}
                                    </ul>
                                </div>
                            )}
                        </div>

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
