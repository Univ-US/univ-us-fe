"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitSupport } from "@/lib/authApi";
import { getUniversities, type University } from "@/lib/homeApi";

export default function ContactPage() {
    const router = useRouter();

    const [universities, setUniversities] = useState<University[]>([]);
    const [memberName, setMemberName] = useState("");
    const [contact, setContact] = useState("");
    const [univId, setUnivId] = useState("");
    const [message, setMessage] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);

    useEffect(() => {
        getUniversities().then(setUniversities).catch(() => {});
    }, []);

    const selectedSchool = universities.find((u) => String(u.univId) === univId);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!memberName.trim() || !contact.trim() || !univId || !message.trim()) return;

        try {
            setSubmitting(true);
            await submitSupport({
                univId: Number(univId),
                memberName,
                contact,
                message,
            });
            setDone(true);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main className="flex min-h-screen items-center justify-center bg-[#f4f6f8] px-6 py-10">
            <div className="w-full max-w-[420px]">
                <div className="flex items-center gap-2 justify-center mb-8">
                    <div className="w-8 h-8 bg-[#11302a] rounded-md flex items-center justify-center text-white text-sm font-black">
                        U
                    </div>
                    <span className="font-extrabold text-slate-900 text-lg tracking-tight">Univ·us</span>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 mb-4 transition-colors"
                    >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        돌아가기
                    </button>

                    {done ? (
                        <div className="text-center py-8">
                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Send className="w-5 h-5 text-primary" />
                            </div>
                            <h2 className="font-extrabold text-slate-900 mb-2">문의가 접수됐어요</h2>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                소속 학교 관리자에게 전달될 예정이에요.<br />
                                입력하신 연락처로 답변 드릴게요.
                            </p>
                            <button
                                onClick={() => router.push("/home")}
                                className="mt-6 text-sm font-semibold text-primary hover:underline"
                            >
                                홈으로 돌아가기
                            </button>
                        </div>
                    ) : (
                        <>
                            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 mb-1">
                                학교 관리자 문의
                            </h1>
                            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                                계정 발급 등 문의사항을 남겨주시면<br />
                                소속 학교 관리자에게 전달돼요.
                            </p>

                            <form onSubmit={handleSubmit} className="space-y-3">
                                <input
                                    value={memberName}
                                    onChange={(e) => setMemberName(e.target.value)}
                                    placeholder="이름"
                                    required
                                    className="h-11 w-full rounded-lg border border-slate-200 px-3.5 text-sm outline-none focus:border-primary transition"
                                />
                                <select
                                    value={univId}
                                    onChange={(e) => setUnivId(e.target.value)}
                                    required
                                    className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm outline-none focus:border-primary transition text-slate-700"
                                >
                                    <option value="" disabled>소속 학교 선택</option>
                                    {universities.map((u) => (
                                        <option key={u.univId} value={u.univId}>
                                            {u.univName}
                                        </option>
                                    ))}
                                </select>
                                <input
                                    value={contact}
                                    onChange={(e) => setContact(e.target.value)}
                                    placeholder="연락처 (이메일 또는 전화번호)"
                                    required
                                    className="h-11 w-full rounded-lg border border-slate-200 px-3.5 text-sm outline-none focus:border-primary transition"
                                />
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="문의 내용을 입력해주세요."
                                    required
                                    rows={4}
                                    className="w-full rounded-lg border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-primary transition resize-none"
                                />

                                <Button type="submit" className="w-full" disabled={submitting}>
                                    <Send className="size-4" />
                                    {submitting ? "전송 중..." : "문의 보내기"}
                                </Button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </main>
    );
}
