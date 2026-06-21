"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, KeyRound, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    resetRecoveredPassword,
    sendIdRecoveryCode,
    sendPasswordRecoveryCode,
    verifyIdRecoveryCode,
    verifyPasswordRecoveryCode,
    type AccountRecoveryIdentityRequest,
    type VerificationChallengeResponse,
    type RecoveryAccount,
} from "@/lib/authApi";
import { getApiErrorMessage } from "@/lib/apiError";

const EMPTY_IDENTITY: AccountRecoveryIdentityRequest = {
    memberName: "",
    phoneNumber: "",
    birth: "",
};

const formatCooldown = (seconds: number) =>
    `재발송 (${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")})`;

function useCooldown() {
    const [seconds, setSeconds] = useState(0);

    useEffect(() => {
        if (seconds <= 0) return;

        const timer = window.setInterval(() => setSeconds((current) => current - 1), 1000);
        return () => window.clearInterval(timer);
    }, [seconds]);

    return { seconds, start: () => setSeconds(60) };
}

function isIdentityValid(identity: AccountRecoveryIdentityRequest) {
    return Boolean(identity.memberName.trim())
        && /^010\d{8}$/.test(identity.phoneNumber)
        && /^\d{8}$/.test(identity.birth);
}

function IdentityInputs({
    identity,
    onChange,
    disabled,
}: {
    identity: AccountRecoveryIdentityRequest;
    onChange: (identity: AccountRecoveryIdentityRequest) => void;
    disabled?: boolean;
}) {
    return (
        <div className="space-y-3">
            <input
                value={identity.memberName}
                onChange={(event) => onChange({ ...identity, memberName: event.target.value })}
                placeholder="이름"
                autoComplete="name"
                disabled={disabled}
                className="h-11 w-full rounded-lg border border-input px-3.5 text-sm outline-none focus:border-primary disabled:bg-slate-100"
            />
            <input
                value={identity.birth}
                onChange={(event) => onChange({
                    ...identity,
                    birth: event.target.value.replace(/\D/g, "").slice(0, 8),
                })}
                inputMode="numeric"
                maxLength={8}
                placeholder="생년월일 8자리 (예: 20000101)"
                disabled={disabled}
                className="h-11 w-full rounded-lg border border-input px-3.5 text-sm outline-none focus:border-primary disabled:bg-slate-100"
            />
            <input
                value={identity.phoneNumber}
                onChange={(event) => onChange({
                    ...identity,
                    phoneNumber: event.target.value.replace(/\D/g, "").slice(0, 11),
                })}
                inputMode="numeric"
                maxLength={11}
                placeholder="휴대폰번호 (예: 01012345678)"
                autoComplete="tel"
                disabled={disabled}
                className="h-11 w-full rounded-lg border border-input px-3.5 text-sm outline-none focus:border-primary disabled:bg-slate-100"
            />
        </div>
    );
}

function VerificationMessageGuide({ challenge }: { challenge: VerificationChallengeResponse }) {
    return (
        <div className="space-y-2 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            <p>문자 앱에서 아래 번호로 인증 문구를 전송해주세요.</p>
            <div className="rounded-lg bg-white px-3 py-2">
                <p>수신번호: <span className="font-bold text-slate-900">{challenge.recipientNumber}</span></p>
                <p>인증 문구: <span className="font-bold text-slate-900">{challenge.messageText}</span></p>
            </div>
            <p className="text-xs text-slate-500">문자 전송 후 아래 인증 확인 버튼을 눌러주세요. 인증 문구는 5분 동안 유효합니다.</p>
        </div>
    );
}

function IdRecoveryPanel() {
    const [identity, setIdentity] = useState(EMPTY_IDENTITY);
    const [challenge, setChallenge] = useState<VerificationChallengeResponse | null>(null);
    const [accounts, setAccounts] = useState<RecoveryAccount[]>([]);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const cooldown = useCooldown();

    const updateIdentity = (nextIdentity: AccountRecoveryIdentityRequest) => {
        setIdentity(nextIdentity);
        setChallenge(null);
        setAccounts([]);
        setMessage("");
        setError("");
    };

    const sendCode = async () => {
        setError("");
        setMessage("");
        if (!isIdentityValid(identity)) {
            setError("이름, 생년월일, 휴대폰번호를 정확히 입력해주세요.");
            return;
        }

        try {
            setLoading(true);
            const response = await sendIdRecoveryCode(identity);
            setChallenge(response);
            cooldown.start();
            setMessage("인증 문구를 발급했습니다. 문자 앱에서 옥토모 번호로 전송해주세요.");
        } catch (sendError) {
            setError(getApiErrorMessage(sendError, "인증 문구 발급에 실패했습니다."));
        } finally {
            setLoading(false);
        }
    };

    const verifyCode = async () => {
        setError("");
        setMessage("");
        try {
            setLoading(true);
            const response = await verifyIdRecoveryCode(identity);
            setAccounts(response.accounts);
            setMessage("휴대폰번호 인증이 완료되었습니다.");
        } catch (verifyError) {
            setError(getApiErrorMessage(verifyError, "옥토모에서 인증 문자를 찾지 못했습니다. 문자 전송 후 다시 시도해주세요."));
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
                <Search className="size-5 text-primary" />
                <h2 className="text-lg font-extrabold text-slate-900">아이디 찾기</h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-500">
                가입 시 등록한 정보와 휴대폰번호를 인증하면 로그인 ID를 확인할 수 있습니다.
            </p>

            <div className="mt-5 space-y-3">
                <IdentityInputs identity={identity} onChange={updateIdentity} disabled={loading} />
                <Button type="button" variant="outline" className="h-11 w-full font-bold" disabled={loading || cooldown.seconds > 0} onClick={sendCode}>
                    {loading ? "처리 중..." : cooldown.seconds > 0 ? formatCooldown(cooldown.seconds) : "인증 문구 발급"}
                </Button>

                {challenge && (
                    <div className="space-y-2 border-t border-slate-100 pt-4">
                        <VerificationMessageGuide challenge={challenge} />
                        <Button type="button" className="h-11 w-full font-bold" disabled={loading} onClick={verifyCode}>
                            문자 전송 후 아이디 확인
                        </Button>
                    </div>
                )}
            </div>

            {error && <p className="mt-4 text-sm font-medium text-red-500">{error}</p>}
            {message && <p className="mt-4 text-sm font-medium text-emerald-600">{message}</p>}

            {accounts.length > 0 && (
                <div className="mt-4 rounded-xl bg-slate-50 p-4">
                    <p className="text-sm font-bold text-slate-800">찾은 아이디</p>
                    <ul className="mt-3 space-y-2">
                        {accounts.map((account) => (
                            <li key={`${account.univName}-${account.loginId}`} className="flex items-center justify-between gap-3 text-sm">
                                <span className="text-slate-500">{account.univName ?? "소속 학교 없음"}</span>
                                <span className="font-bold text-slate-900">{account.loginId}</span>
                            </li>
                        ))}
                    </ul>
                    <Button asChild className="mt-4 h-10 w-full font-bold">
                        <Link href="/home/login">홈 로그인으로</Link>
                    </Button>
                </div>
            )}
        </section>
    );
}

function PasswordRecoveryPanel() {
    const router = useRouter();
    const [identity, setIdentity] = useState(EMPTY_IDENTITY);
    const [loginId, setLoginId] = useState("");
    const [challenge, setChallenge] = useState<VerificationChallengeResponse | null>(null);
    const [resetToken, setResetToken] = useState("");
    const [password, setPassword] = useState("");
    const [passwordCheck, setPasswordCheck] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const cooldown = useCooldown();

    const clearVerification = () => {
        setChallenge(null);
        setResetToken("");
        setMessage("");
        setError("");
    };

    const updateIdentity = (nextIdentity: AccountRecoveryIdentityRequest) => {
        setIdentity(nextIdentity);
        clearVerification();
    };

    const updateLoginId = (value: string) => {
        setLoginId(value.replace(/\D/g, ""));
        clearVerification();
    };

    const sendCode = async () => {
        setError("");
        setMessage("");
        if (!loginId || !isIdentityValid(identity)) {
            setError("로그인 ID, 이름, 생년월일, 휴대폰번호를 정확히 입력해주세요.");
            return;
        }

        try {
            setLoading(true);
            const response = await sendPasswordRecoveryCode({ ...identity, loginId });
            setChallenge(response);
            cooldown.start();
            setMessage("인증 문구를 발급했습니다. 문자 앱에서 옥토모 번호로 전송해주세요.");
        } catch (sendError) {
            setError(getApiErrorMessage(sendError, "인증 문구 발급에 실패했습니다."));
        } finally {
            setLoading(false);
        }
    };

    const verifyCode = async () => {
        setError("");
        setMessage("");
        try {
            setLoading(true);
            const response = await verifyPasswordRecoveryCode({ ...identity, loginId });
            setResetToken(response.resetToken);
            setMessage("휴대폰번호 인증이 완료되었습니다. 새 비밀번호를 설정해주세요.");
        } catch (verifyError) {
            setError(getApiErrorMessage(verifyError, "옥토모에서 인증 문자를 찾지 못했습니다. 문자 전송 후 다시 시도해주세요."));
        } finally {
            setLoading(false);
        }
    };

    const submitPassword = async () => {
        setError("");
        if (!password || password !== passwordCheck) {
            setError("새 비밀번호와 비밀번호 확인이 일치해야 합니다.");
            return;
        }

        try {
            setLoading(true);
            await resetRecoveredPassword(resetToken, password);
            router.push("/home/login");
        } catch (resetError) {
            setError(getApiErrorMessage(resetError, "비밀번호 변경에 실패했습니다."));
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
                <KeyRound className="size-5 text-primary" />
                <h2 className="text-lg font-extrabold text-slate-900">비밀번호 찾기</h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-500">
                로그인 ID와 가입 정보를 확인한 뒤, 휴대폰번호 인증으로 새 비밀번호를 설정합니다.
            </p>

            <div className="mt-5 space-y-3">
                <input
                    value={loginId}
                    onChange={(event) => updateLoginId(event.target.value)}
                    inputMode="numeric"
                    placeholder="로그인 ID"
                    disabled={loading || Boolean(resetToken)}
                    className="h-11 w-full rounded-lg border border-input px-3.5 text-sm outline-none focus:border-primary disabled:bg-slate-100"
                />
                <IdentityInputs identity={identity} onChange={updateIdentity} disabled={loading || Boolean(resetToken)} />

                {!resetToken && (
                    <>
                        <Button type="button" variant="outline" className="h-11 w-full font-bold" disabled={loading || cooldown.seconds > 0} onClick={sendCode}>
                            {loading ? "처리 중..." : cooldown.seconds > 0 ? formatCooldown(cooldown.seconds) : "인증 문구 발급"}
                        </Button>

                        {challenge && (
                            <div className="space-y-2 border-t border-slate-100 pt-4">
                                <VerificationMessageGuide challenge={challenge} />
                                <Button type="button" className="h-11 w-full font-bold" disabled={loading} onClick={verifyCode}>
                                    문자 전송 후 인증 확인
                                </Button>
                            </div>
                        )}
                    </>
                )}

                {resetToken && (
                    <div className="space-y-3 border-t border-slate-100 pt-4">
                        <input
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder="새 비밀번호"
                            className="h-11 w-full rounded-lg border border-input px-3.5 text-sm outline-none focus:border-primary"
                        />
                        <input
                            type="password"
                            value={passwordCheck}
                            onChange={(event) => setPasswordCheck(event.target.value)}
                            placeholder="새 비밀번호 확인"
                            className="h-11 w-full rounded-lg border border-input px-3.5 text-sm outline-none focus:border-primary"
                        />
                        <Button type="button" className="h-11 w-full font-bold" disabled={loading || !password || password !== passwordCheck} onClick={submitPassword}>
                            새 비밀번호 설정
                        </Button>
                    </div>
                )}
            </div>

            {error && <p className="mt-4 text-sm font-medium text-red-500">{error}</p>}
            {message && <p className="mt-4 text-sm font-medium text-emerald-600">{message}</p>}
        </section>
    );
}

export default function AccountRecoveryPage() {
    return (
        <main className="min-h-screen bg-slate-50 px-6 py-10">
            <div className="mx-auto w-full max-w-5xl">
                <Link href="/home/login" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-primary">
                    <ArrowLeft className="size-4" />
                    로그인으로 돌아가기
                </Link>
                <div className="mt-5">
                    <p className="text-sm font-bold text-primary">UnivUs</p>
                    <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">계정 찾기</h1>
                    <p className="mt-2 text-sm text-slate-500">등록한 휴대폰번호로 인증한 뒤 계정을 확인하거나 비밀번호를 재설정할 수 있습니다.</p>
                </div>
                <div className="mt-7 grid gap-5 lg:grid-cols-2">
                    <IdRecoveryPanel />
                    <PasswordRecoveryPanel />
                </div>
                <div className="mt-6 flex justify-center">
                    <Button asChild variant="outline" className="h-11 min-w-32 font-bold">
                        <Link href="/home">홈으로</Link>
                    </Button>
                </div>
            </div>
        </main>
    );
}
