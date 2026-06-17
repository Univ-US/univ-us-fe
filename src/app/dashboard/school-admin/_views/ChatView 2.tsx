"use client";

import { useRef, useState } from "react";
import { Send } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

type ChatMessage = { sender: "me" | "admin"; text: string };

export default function ChatView() {
    const { memberName } = useAuthStore();
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const endRef = useRef<HTMLDivElement>(null);

    const handleSend = () => {
        const text = input.trim();
        if (!text) return;
        setMessages((prev) => [...prev, { sender: "me", text }]);
        setInput("");
        setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 0);
    };

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-2xl font-black tracking-tight">운영팀 문의</h1>
                <p className="mt-1 text-sm text-slate-500">서비스 최고관리자와 1:1로 소통합니다.</p>
            </div>

            <section className="flex h-[60vh] flex-col overflow-hidden rounded-2xl border border-emerald-900/10 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-4">
                    <h2 className="font-black">최고관리자</h2>
                </div>

                <div className="flex-1 space-y-2 overflow-y-auto p-5">
                    {messages.length === 0 ? (
                        <p className="text-sm text-slate-400">아직 보낸 메시지가 없습니다.</p>
                    ) : (
                        messages.map((m, i) => (
                            <div key={i} className={`flex flex-col ${m.sender === "me" ? "items-end" : "items-start"}`}>
                                <span className="mb-1 text-xs font-bold text-slate-400">
                                    {m.sender === "me" ? memberName ?? "나" : "최고관리자"}
                                </span>
                                <p
                                    className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                                        m.sender === "me" ? "bg-[#064b35] text-white" : "bg-slate-50 text-slate-700"
                                    }`}
                                >
                                    {m.text}
                                </p>
                            </div>
                        ))
                    )}
                    <div ref={endRef} />
                </div>

                <div className="flex items-center gap-2 border-t border-slate-100 p-4">
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder="메시지를 입력하세요"
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#064b35]"
                    />
                    <button
                        onClick={handleSend}
                        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#064b35] text-white hover:bg-emerald-800"
                    >
                        <Send className="size-4" />
                    </button>
                </div>
            </section>
        </div>
    );
}
