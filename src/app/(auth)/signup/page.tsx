"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signup } from "@/lib/authApi";

export default function SignupPage() {
    const router = useRouter();

    const [memberId, setMemberId] = useState("");
    const [password, setPassword] = useState("");
    const [passwordCheck, setPasswordCheck] = useState("");
    const [memberName, setMemberName] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [gender, setGender] = useState("M");
    const [birth, setBirth] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const phoneRegex = /^010\d{8}$/;
    const birthRegex = /^\d{8}$/;

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");

        if (!memberId.trim() || !password.trim() || !memberName.trim()) {
            setError("아이디, 비밀번호, 이름은 필수입니다.");
            return;
        }

        if (password !== passwordCheck) {
            setError("비밀번호가 일치하지 않습니다.");
            return;
        }

        if (!phoneRegex.test(phoneNumber)) {
            setError("전화번호는 01012341234 형식의 숫자 11자리로 입력해주세요.");
            return;
        }

        if (!birthRegex.test(birth)) {
            setError("생년월일은 20001010 형식의 숫자 8자리로 입력해주세요.");
            return;
        }

        try {
            setSubmitting(true);

            await signup({
                loginId: memberId,
                password,
                memberName,
                phoneNumber,
                gender,
                birth,
            });

            alert("회원가입이 완료되었습니다. 로그인해주세요.");
            router.push("/login");
        } catch {
            setError("회원가입에 실패했습니다. 이미 사용 중인 ID인지 확인해주세요.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-10">
            <form
                onSubmit={handleSubmit}
                className="w-full max-w-[460px] rounded-2xl border border-border bg-white p-6 shadow-sm"
            >
                <div className="mb-6">
                    <p className="text-sm font-bold text-primary">UnivUs</p>
                    <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">
                        회원가입
                    </h1>
                    <p className="mt-2 text-sm text-slate-500">
                        구독 신청과 운영자 계정 생성을 위한 기본 정보를 입력해주세요.
                    </p>
                </div>

                <div className="space-y-4">
                    <input
                        value={memberId}
                        onChange={(e) => setMemberId(e.target.value)}
                        placeholder="아이디"
                        className="h-11 w-full rounded-lg border border-input px-3.5 text-sm outline-none focus:border-primary"
                    />

                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="비밀번호"
                        className="h-11 w-full rounded-lg border border-input px-3.5 text-sm outline-none focus:border-primary"
                    />

                    <input
                        type="password"
                        value={passwordCheck}
                        onChange={(e) => setPasswordCheck(e.target.value)}
                        placeholder="비밀번호 확인"
                        className="h-11 w-full rounded-lg border border-input px-3.5 text-sm outline-none focus:border-primary"
                    />

                    <input
                        value={memberName}
                        onChange={(e) => setMemberName(e.target.value)}
                        placeholder="이름"
                        className="h-11 w-full rounded-lg border border-input px-3.5 text-sm outline-none focus:border-primary"
                    />

                    <input
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 11))}
                        inputMode="numeric"
                        maxLength={11}
                        placeholder="전화번호 예: 01011111111"
                        className="h-11 w-full rounded-lg border border-input px-3.5 text-sm outline-none focus:border-primary"
                    />

                    <div className="grid grid-cols-2 gap-3">
                        <select
                            value={gender}
                            onChange={(e) => setGender(e.target.value)}
                            className="h-11 rounded-lg border border-input bg-white px-3.5 text-sm outline-none focus:border-primary"
                        >
                            <option value="M">남성</option>
                            <option value="F">여성</option>
                        </select>

                        <input
                            value={birth}
                            onChange={(e) => setBirth(e.target.value.replace(/\D/g, "").slice(0, 8))}
                            inputMode="numeric"
                            maxLength={8}
                            placeholder="생년월일 예: 20001010"
                            className="h-11 rounded-lg border border-input px-3.5 text-sm outline-none focus:border-primary"
                        />
                    </div>
                </div>

                {error && (
                    <p className="mt-4 text-sm font-medium text-red-500">{error}</p>
                )}

                <Button type="submit" className="mt-5 h-11 w-full text-base font-bold" disabled={submitting}>
                    <UserPlus className="size-4" />
                    {submitting ? "가입 중..." : "회원가입"}
                </Button>

                <div className="mt-5 text-center text-sm text-slate-500">
                    이미 계정이 있나요?{" "}
                    <Link href="/login" className="font-bold text-primary">
                        로그인
                    </Link>
                </div>
            </form>
        </main>
    );
}