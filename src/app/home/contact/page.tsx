/* eslint-disable */
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
    const [contactError, setContactError] = useState("");
    const [schoolQuery, setSchoolQuery] = useState("");
    const [showSchoolList, setShowSchoolList] = useState(false);

    const filteredUniversities = universities.filter((u) =>
        u.univName.toLowerCase().includes(schoolQuery.toLowerCase())
    );

    const isValidContact = (value: string) => {
        const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneReg = /^[0-9]{9,11}$/;
        return emailReg.test(value) || phoneReg.test(value.replace(/-/g, ""));
    };

    useEffect(() => {
        getUniversities().then(setUniversities).catch(console.error);
    }, []);

    const selectedSchool = universities.find((u) => String(u.univId) === univId);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!memberName.trim() || !contact.trim() || !univId || !message.trim() || !schoolQuery) return;
        if (!isValidContact(contact)) {
            setContactError("?대찓???먮뒗 ?꾪솕踰덊샇 ?뺤떇?쇰줈 ?낅젰?댁＜?몄슂.");
            return;
        }
        setContactError("");

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
                    <span className="font-extrabold text-slate-900 text-lg tracking-tight">Univ쨌us</span>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 mb-4 transition-colors"
                    >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        ?뚯븘媛湲?
                    </button>

                    {done ? (
                        <div className="text-center py-8">
                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Send className="w-5 h-5 text-primary" />
                            </div>
                            <h2 className="font-extrabold text-slate-900 mb-2">臾몄쓽媛 ?묒닔?먯뼱??/h2>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                ?뚯냽 ?숆탳 愿由ъ옄?먭쾶 ?꾨떖???덉젙?댁뿉??<br />
                                ?낅젰?섏떊 ?곕씫泥섎줈 ?듬? ?쒕┫寃뚯슂.
                            </p>
                            <button
                                onClick={() => router.push("/home")}
                                className="mt-6 text-sm font-semibold text-primary hover:underline"
                            >
                                ?덉쑝濡??뚯븘媛湲?
                            </button>
                        </div>
                    ) : (
                        <>
                            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 mb-1">
                                ?숆탳 愿由ъ옄 臾몄쓽
                            </h1>
                            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                                怨꾩젙 諛쒓툒 ??臾몄쓽?ы빆???④꺼二쇱떆硫?br />
                                ?뚯냽 ?숆탳 愿由ъ옄?먭쾶 ?꾨떖?쇱슂.
                            </p>

                            <form onSubmit={handleSubmit} className="space-y-3">
                                <input
                                    value={memberName}
                                    onChange={(e) => setMemberName(e.target.value)}
                                    placeholder="?대쫫"
                                    required
                                    className="h-11 w-full rounded-lg border border-slate-200 px-3.5 text-sm outline-none focus:border-primary transition"
                                />
                                <div className="relative">
                                    <input
                                        value={schoolQuery}
                                        onChange={(e) => {
                                            setSchoolQuery(e.target.value);
                                            setUnivId("");
                                            setShowSchoolList(true);
                                        }}
                                        onFocus={() => setShowSchoolList(true)}
                                        onBlur={() => setTimeout(() => setShowSchoolList(false), 150)}
                                        placeholder="?뚯냽 ?숆탳 寃??
                                        className={`h-11 w-full rounded-lg border px-3.5 text-sm outline-none focus:border-primary transition ${!univId && schoolQuery ? "border-slate-200" : univId ? "border-primary" : "border-slate-200"}`}
                                    />
                                    {showSchoolList && schoolQuery && filteredUniversities.length > 0 && (
                                        <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                                            {filteredUniversities.map((u) => (
                                                <li key={u.univId}>
                                                    <button
                                                        type="button"
                                                        onMouseDown={() => {
                                                            setUnivId(String(u.univId));
                                                            setSchoolQuery(u.univName);
                                                            setShowSchoolList(false);
                                                        }}
                                                        className="w-full px-3.5 py-2.5 text-left text-sm hover:bg-slate-50"
                                                    >
                                                        {u.univName}
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                <div>
                                    <input
                                        value={contact}
                                        onChange={(e) => { setContact(e.target.value); setContactError(""); }}
                                        placeholder="?곕씫泥?(?대찓???먮뒗 ?꾪솕踰덊샇)"
                                        required
                                        className={`h-11 w-full rounded-lg border px-3.5 text-sm outline-none focus:border-primary transition ${contactError ? "border-rose-400" : "border-slate-200"}`}
                                    />
                                    {contactError && <p className="mt-1 text-xs text-rose-500">{contactError}</p>}
                                </div>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="臾몄쓽 ?댁슜???낅젰?댁＜?몄슂."
                                    required
                                    rows={4}
                                    className="w-full rounded-lg border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-primary transition resize-none"
                                />

                                <Button type="submit" className="w-full" disabled={submitting}>
                                    <Send className="size-4" />
                                    {submitting ? "?꾩넚 以?.." : "臾몄쓽 蹂대궡湲?}
                                </Button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </main>
    );
}

