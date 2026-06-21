"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import PolicyModal from "@/components/common/PolicyModal";
import { checkLoginId, signup } from "@/lib/authApi";
import { getApiErrorMessage } from "@/lib/apiError";

export default function SignupPage() {
    const router = useRouter();

    const isInitialized = useAuthStore((state) => state.isInitialized);
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);

    useEffect(() => {
        if (!isInitialized || !isLoggedIn) return;

        router.replace("/landing");
    }, [isInitialized, isLoggedIn, router]);

    const [loginId, setLoginId] = useState("");
    // ID 중복확인을 했는지 여부입니다.
    const [loginIdChecked, setLoginIdChecked] = useState(false);
    // 중복확인 결과입니다. true면 사용 가능, false면 이미 사용 중입니다.
    const [loginIdAvailable, setLoginIdAvailable] = useState<boolean | null>(null);
    // 중복확인 API 호출 중인지 여부입니다.
    const [checkingLoginId, setCheckingLoginId] = useState(false);
    const [password, setPassword] = useState("");
    const [passwordCheck, setPasswordCheck] = useState("");
    const [memberName, setMemberName] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [gender, setGender] = useState("M");
    const [birth, setBirth] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
    const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);

    const phoneRegex = /^010\d{8}$/;
    const birthRegex = /^\d{8}$/;
    const loginIdRegex = /^\d+$/;

    // 로그인 ID는 중복확인을 통과해야 회원가입 제출이 가능합니다.
    const isLoginIdReady = loginIdChecked && loginIdAvailable === true;

    // 비밀번호는 입력되어 있고, 확인 값과 일치해야 합니다.
    const isPasswordReady = password.trim() !== "" && password === passwordCheck;

    // 이름은 필수 입력값입니다.
    const isRequiredProfileReady = memberName.trim() !== "";

    // 전화번호는 010으로 시작하는 숫자 11자리여야 합니다.
    const isPhoneReady = phoneRegex.test(phoneNumber);

    // 생년월일은 yyyyMMdd 형식의 숫자 8자리여야 합니다.
    const isBirthReady = birthRegex.test(birth);

    const canSubmit =
        isLoginIdReady &&
        isPasswordReady &&
        isRequiredProfileReady &&
        isPhoneReady &&
        isBirthReady &&
        agreedToTerms &&
        agreedToPrivacy &&
        !submitting &&
        !checkingLoginId;

    // ID 입력값이 바뀌면 이전 중복확인 결과는 더 이상 유효하지 않으므로 초기화합니다.
    const handleLoginIdChange = (value: string) => {
        setLoginId(value);
        setLoginIdChecked(false);
        setLoginIdAvailable(null);
    };

    // 백엔드에 로그인 ID 중복 여부를 확인합니다.
    const handleCheckLoginId = async () => {
        setError("");

        if (!loginId.trim()) {
            setError("로그인 ID를 입력해주세요.");
            return;
        }

        if (!loginIdRegex.test(loginId)) {
            setError("로그인 ID는 숫자로 입력해주세요.");
            return;
        }

        try {
            setCheckingLoginId(true);

            const data = await checkLoginId(loginId);

            setLoginIdChecked(true);
            setLoginIdAvailable(data.available);
        } catch {
            setLoginIdChecked(false);
            setLoginIdAvailable(null);
            setError("ID 중복 확인에 실패했습니다. 잠시 후 다시 시도해주세요.");
        } finally {
            setCheckingLoginId(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");

        if (!loginId.trim() || !password.trim() || !memberName.trim()) {
            setError("아이디, 비밀번호, 이름은 필수입니다.");
            return;
        }

        if (!loginIdRegex.test(loginId)) {
            setError("로그인 ID는 숫자로 입력해주세요.");
            return;
        }

        // 중복확인을 하지 않은 상태에서는 회원가입을 막습니다.
        if (!loginIdChecked) {
            setError("ID 중복 확인을 해주세요.");
            return;
        }

        // 중복확인 결과 이미 사용 중인 ID면 회원가입을 막습니다.
        if (!loginIdAvailable) {
            setError("이미 사용 중인 ID입니다.");
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

        if (!agreedToTerms) {
            setError("이용약관에 동의해주세요.");
            return;
        }

        if (!agreedToPrivacy) {
            setError("개인정보처리방침에 동의해주세요.");
            return;
        }

        try {
            setSubmitting(true);

            await signup({
                loginId,
                password,
                memberName,
                phoneNumber,
                gender,
                birth,
            });

            alert("회원가입이 완료되었습니다. 로그인해주세요.");
            router.push("/login");
        } catch (signupError) {
            setError(getApiErrorMessage(signupError, "회원가입에 실패했습니다. 입력값을 확인해주세요."));
        } finally {
            setSubmitting(false);
        }
    };

    if (!isInitialized) {
        return null;
    }

    if (isLoggedIn) {
        return null;
    }

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
                    <div>
                        <div className="flex gap-2">
                            <input
                                value={loginId}
                                onChange={(e) => handleLoginIdChange(e.target.value.replace(/\D/g, ""))}
                                inputMode="numeric"
                                placeholder="로그인 ID 숫자"
                                className="h-11 min-w-0 flex-1 rounded-lg border border-input px-3.5 text-sm outline-none focus:border-primary"
                            />

                            <Button
                                type="button"
                                variant="outline"
                                className="h-11 shrink-0 px-4 text-sm font-bold"
                                onClick={handleCheckLoginId}
                                disabled={checkingLoginId}
                            >
                                {checkingLoginId ? "확인 중" : "중복 확인"}
                            </Button>
                        </div>

                        {loginIdChecked && loginIdAvailable === true && (
                            <p className="mt-2 text-xs font-medium text-emerald-600">
                                사용 가능한 ID입니다.
                            </p>
                        )}

                        {loginIdChecked && loginIdAvailable === false && (
                            <p className="mt-2 text-xs font-medium text-red-500">
                                이미 사용 중인 ID입니다.
                            </p>
                        )}

                        {!loginIdChecked && loginId.trim() && (
                            <p className="mt-2 text-xs font-medium text-slate-500">
                                ID 중복 확인을 해주세요.
                            </p>
                        )}
                    </div>

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

                <div className="mt-5 flex items-center gap-2 text-sm text-slate-700">
                    <input
                        id="terms-agreement"
                        type="checkbox"
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        className="size-4 rounded border-slate-300 text-primary focus:ring-primary"
                    />
                    <div>
                        <button
                            type="button"
                            onClick={() => setIsTermsModalOpen(true)}
                            className="font-semibold underline underline-offset-2 hover:text-primary"
                        >
                            이용약관
                        </button>
                        <label htmlFor="terms-agreement">에 동의합니다. (필수)</label>
                    </div>
                </div>

                <div className="mt-3 flex items-center gap-2 text-sm text-slate-700">
                    <input
                        id="privacy-agreement"
                        type="checkbox"
                        checked={agreedToPrivacy}
                        onChange={(e) => setAgreedToPrivacy(e.target.checked)}
                        className="size-4 rounded border-slate-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="privacy-agreement">
                        <Link href="/privacy" className="font-semibold underline underline-offset-2 hover:text-primary">
                            개인정보처리방침
                        </Link>
                        에 동의합니다. (필수)
                    </label>
                </div>

                <Button
                    type="submit"
                    className="mt-4 h-11 w-full text-base font-bold"
                    disabled={!canSubmit}
                >
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

            {isTermsModalOpen && (
                <PolicyModal type="terms" onClose={() => setIsTermsModalOpen(false)} />
            )}
        </main>
    );
}
