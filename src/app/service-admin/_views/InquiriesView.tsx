"use client";

import { Client, type IStompSocket } from "@stomp/stompjs";
import {
    ArrowLeft,
    CheckCircle2,
    Clock3,
    FileText,
    MessageSquareText,
    Paperclip,
    RefreshCw,
    Search,
    Send,
    Wifi,
    WifiOff,
    X,
} from "lucide-react";
import {
    FormEvent,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import SockJS from "sockjs-client";
import { getApiErrorMessage } from "@/lib/apiError";
import {
    CATEGORY_LABEL,
    INQUIRY_ROOMS_TOPIC,
    INQUIRY_TOPIC_PREFIX,
    STATUS_LABEL,
    closeServiceAdminInquiry,
    getAttachmentDownloadHref,
    getServiceAdminInquiryRooms,
    getServiceAdminInquiryThread,
    sendServiceAdminInquiryMessage,
    type InquiryCategory,
    type InquiryMessage,
    type InquiryRoom,
    type InquiryStatus,
    type InquiryThread,
} from "@/lib/inquiryApi";
import { getWebSocketEndpointUrl } from "@/lib/realtime";
import { useAuthStore } from "@/store/authStore";

type RealtimeStatus = "connected" | "disconnected";

const MAX_FILES = 3;
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif", "txt", "pdf", "doc", "docx", "hwp", "hwpx", "xls", "xlsx"];
const FILE_ACCEPT = ALLOWED_EXTENSIONS.map((extension) => `.${extension}`).join(",");

const CATEGORY_STYLE: Record<InquiryCategory, string> = {
    PAYMENT: "bg-sky-100 text-sky-700",
    SUBSCRIPTION: "bg-violet-100 text-violet-700",
    ACCOUNT: "bg-amber-100 text-amber-700",
    ERROR: "bg-rose-100 text-rose-700",
    ETC: "bg-slate-100 text-slate-600",
};

const STATUS_STYLE: Record<InquiryStatus, string> = {
    WAITING: "bg-amber-100 text-amber-700",
    IN_PROGRESS: "bg-primary/10 text-primary",
    CLOSED: "bg-slate-100 text-slate-500",
};

function getServiceAdminDisplayStatus(room: InquiryRoom): InquiryStatus {
    if (room.status === "CLOSED") return "CLOSED";
    return room.unreadCount > 0 ? "WAITING" : room.status;
}

function formatTime(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("ko-KR", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

function sortRooms(rooms: InquiryRoom[]) {
    return [...rooms].sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

function mergeRoom(rooms: InquiryRoom[], next: InquiryRoom) {
    const exists = rooms.some((room) => room.roomId === next.roomId);
    return sortRooms(exists
        ? rooms.map((room) => (room.roomId === next.roomId ? { ...room, ...next } : room))
        : [next, ...rooms]);
}

function getFileExtension(file: File) {
    const name = file.name.trim();
    const dotIndex = name.lastIndexOf(".");
    return dotIndex >= 0 ? name.slice(dotIndex + 1).toLowerCase() : "";
}

export default function InquiriesView() {
    const memberName = useAuthStore((state) => state.memberName);
    const [rooms, setRooms] = useState<InquiryRoom[]>([]);
    const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
    const [thread, setThread] = useState<InquiryThread | null>(null);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<"ALL" | InquiryStatus>("ALL");
    const [category, setCategory] = useState<"ALL" | InquiryCategory>("ALL");
    const [message, setMessage] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [loading, setLoading] = useState(true);
    const [threadLoading, setThreadLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>("disconnected");
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const messageListRef = useRef<HTMLDivElement | null>(null);

    const selectedRoom = useMemo(
        () => rooms.find((room) => room.roomId === selectedRoomId) ?? null,
        [rooms, selectedRoomId],
    );
    const filteredRooms = useMemo(() => {
        const keyword = search.trim().toLocaleLowerCase("ko-KR");
        return sortRooms(rooms.filter((room) => {
            const matchesSearch =
                !keyword ||
                room.title.toLocaleLowerCase("ko-KR").includes(keyword) ||
                room.univName.toLocaleLowerCase("ko-KR").includes(keyword) ||
                (room.adminName ?? "").toLocaleLowerCase("ko-KR").includes(keyword);
            const matchesStatus = status === "ALL" || room.status === status;
            const matchesCategory = category === "ALL" || room.category === category;
            return matchesSearch && matchesStatus && matchesCategory;
        }));
    }, [category, rooms, search, status]);
    const summary = useMemo(() => ({
        waiting: rooms.filter((room) => getServiceAdminDisplayStatus(room) === "WAITING").length,
        inProgress: rooms.filter((room) => getServiceAdminDisplayStatus(room) === "IN_PROGRESS").length,
        closed: rooms.filter((room) => room.status === "CLOSED").length,
    }), [rooms]);

    const loadRooms = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const data = sortRooms(await getServiceAdminInquiryRooms());
            setRooms(data);
            setSelectedRoomId((current) => {
                if (current && data.some((room) => room.roomId === current)) return current;
                return null;
            });
        } catch (loadError) {
            setError(getApiErrorMessage(loadError, "문의 목록을 불러오지 못했습니다."));
        } finally {
            setLoading(false);
        }
    }, []);

    const loadThread = useCallback(async (roomId: number) => {
        setThreadLoading(true);
        setError("");
        try {
            const data = await getServiceAdminInquiryThread(roomId);
            setThread(data);
            setRooms((current) =>
                current.map((room) =>
                    room.roomId === roomId
                        ? { ...room, status: data.status, unreadCount: 0 }
                        : room,
                ),
            );
        } catch (loadError) {
            setThread(null);
            setError(getApiErrorMessage(loadError, "문의 내용을 불러오지 못했습니다."));
        } finally {
            setThreadLoading(false);
        }
    }, []);

    const appendMessage = useCallback((incoming: InquiryMessage) => {
        const normalizedIncoming = {
            ...incoming,
            content: (incoming.content ?? "").trim(),
            attachments: incoming.attachments ?? [],
        };
        setThread((current) => {
            if (!current || current.roomId !== normalizedIncoming.roomId) return current;
            if (current.messages.some((item) => item.messageId === normalizedIncoming.messageId)) return current;
            return {
                ...current,
                status: normalizedIncoming.senderRole === "ADM"
                    ? "WAITING"
                    : normalizedIncoming.senderRole === "SUA" && current.status !== "CLOSED"
                        ? "IN_PROGRESS"
                        : current.status,
                messages: [...current.messages, normalizedIncoming],
            };
        });
        setRooms((current) =>
            sortRooms(current.map((room) => {
                if (room.roomId !== normalizedIncoming.roomId) return room;
                return {
                    ...room,
                    lastMessage: normalizedIncoming.content || normalizedIncoming.attachments[0]?.originalName || "첨부파일",
                    lastAt: normalizedIncoming.sentAt,
                    unreadCount: normalizedIncoming.senderRole === "SUA" || normalizedIncoming.roomId === selectedRoomId
                        ? 0
                        : room.unreadCount + 1,
                    status: normalizedIncoming.senderRole === "ADM"
                        ? "WAITING"
                        : normalizedIncoming.senderRole === "SUA" && room.status !== "CLOSED"
                            ? "IN_PROGRESS"
                            : room.status,
                };
            })),
        );
    }, [selectedRoomId]);

    useEffect(() => {
        void loadRooms();
    }, [loadRooms]);

    useEffect(() => {
        if (selectedRoomId == null) {
            setThread(null);
            return;
        }
        void loadThread(selectedRoomId);
    }, [loadThread, selectedRoomId]);

    useEffect(() => {
        let disposed = false;
        const client = new Client({
            webSocketFactory: () =>
                new SockJS(getWebSocketEndpointUrl()) as unknown as IStompSocket,
            reconnectDelay: 5000,
            heartbeatIncoming: 10000,
            heartbeatOutgoing: 10000,
            debug: () => {},
            onConnect: () => {
                if (disposed) return;
                setRealtimeStatus("connected");
                client.subscribe(INQUIRY_ROOMS_TOPIC, () => {
                    void loadRooms();
                });
                if (selectedRoomId != null) {
                    client.subscribe(`${INQUIRY_TOPIC_PREFIX}/${selectedRoomId}`, (frame) => {
                        if (!frame.body) return;
                        try {
                            const payload = JSON.parse(frame.body) as InquiryMessage;
                            if (payload.senderRole !== "SUA") {
                                void loadThread(selectedRoomId);
                            } else {
                                appendMessage(payload);
                            }
                        } catch {
                            // Ignore malformed realtime payloads.
                        }
                    });
                    client.subscribe(`${INQUIRY_TOPIC_PREFIX}/${selectedRoomId}/room`, (frame) => {
                        if (!frame.body) return;
                        try {
                            const room = JSON.parse(frame.body) as InquiryRoom;
                            setRooms((current) => mergeRoom(current, room));
                            setThread((current) =>
                                current && current.roomId === room.roomId
                                    ? { ...current, status: room.status }
                                    : current,
                            );
                        } catch {
                            // Ignore malformed realtime payloads.
                        }
                    });
                }
            },
            onDisconnect: () => setRealtimeStatus("disconnected"),
            onStompError: () => setRealtimeStatus("disconnected"),
            onWebSocketClose: () => setRealtimeStatus("disconnected"),
            onWebSocketError: () => setRealtimeStatus("disconnected"),
        });
        client.activate();
        return () => {
            disposed = true;
            setRealtimeStatus("disconnected");
            void client.deactivate();
        };
    }, [appendMessage, loadRooms, loadThread, selectedRoomId]);

    useEffect(() => {
        const messageList = messageListRef.current;
        if (messageList) {
            messageList.scrollTop = messageList.scrollHeight;
        }
    }, [thread?.messages, selectedRoomId]);

    const addFiles = (nextFiles: FileList | null) => {
        if (!nextFiles) return;
        const accepted = [...files];
        let rejectedByCount = 0;
        let rejectedBySize = 0;
        let rejectedByType = 0;

        for (const file of Array.from(nextFiles)) {
            if (accepted.length >= MAX_FILES) {
                rejectedByCount += 1;
                continue;
            }
            if (file.size > MAX_FILE_SIZE) {
                rejectedBySize += 1;
                continue;
            }
            if (!ALLOWED_EXTENSIONS.includes(getFileExtension(file))) {
                rejectedByType += 1;
                continue;
            }
            accepted.push(file);
        }

        const messages = [];
        if (rejectedByCount > 0) messages.push(`첨부파일은 최대 ${MAX_FILES}개까지 가능합니다.`);
        if (rejectedBySize > 0) messages.push("20MB를 초과한 파일은 첨부되지 않았습니다.");
        if (rejectedByType > 0) messages.push("지원하지 않는 형식의 파일은 첨부되지 않았습니다.");
        if (messages.length > 0) {
            setError(messages.join(" "));
        } else {
            setError("");
        }

        setFiles(accepted);
    };

    const removeFile = (index: number) => {
        setFiles((current) => current.filter((_, i) => i !== index));
    };

    async function handleSend(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!selectedRoomId || thread?.status === "CLOSED" || (!message.trim() && files.length === 0) || submitting) return;
        const submittedText = message;
        const submittedFiles = files;
        setSubmitting(true);
        setError("");
        try {
            const saved = await sendServiceAdminInquiryMessage(selectedRoomId, {
                messageText: submittedText.trim(),
                files: submittedFiles,
            });
            appendMessage(saved);
            setMessage("");
            setFiles([]);
            if (fileInputRef.current) fileInputRef.current.value = "";
        } catch (sendError) {
            setError(getApiErrorMessage(sendError, "답변을 전송하지 못했습니다."));
        } finally {
            setSubmitting(false);
        }
    }

    async function handleClose() {
        if (!selectedRoomId || thread?.status === "CLOSED" || !window.confirm("문의를 종료하시겠습니까? 종료 후에는 메시지를 보낼 수 없습니다.")) return;
        setSubmitting(true);
        setError("");
        try {
            await closeServiceAdminInquiry(selectedRoomId);
            setRooms((current) =>
                current.map((room) => room.roomId === selectedRoomId ? { ...room, status: "CLOSED" } : room),
            );
            setThread((current) => current ? { ...current, status: "CLOSED" } : current);
        } catch (closeError) {
            setError(getApiErrorMessage(closeError, "문의를 종료하지 못했습니다."));
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
            <header className="flex shrink-0 flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-black tracking-tight">채팅 문의</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        학교 관리자가 생성한 문의를 확인하고 실시간으로 답변합니다.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-500">
                        {realtimeStatus === "connected" ? <Wifi className="size-4 text-primary" /> : <WifiOff className="size-4 text-slate-400" />}
                        {realtimeStatus === "connected" ? "실시간 연결" : "연결 대기"}
                    </span>
                    <button type="button" onClick={() => void loadRooms()} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 hover:bg-slate-50">
                        <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
                        새로고침
                    </button>
                </div>
            </header>

            {error && (
                <div className="shrink-0 rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600">
                    {error}
                </div>
            )}

            <div className="grid shrink-0 gap-3 sm:grid-cols-3">
                {[
                    { label: "응답 대기", value: summary.waiting, icon: Clock3, color: "text-amber-600" },
                    { label: "진행 중", value: summary.inProgress, icon: MessageSquareText, color: "text-primary" },
                    { label: "종료", value: summary.closed, icon: CheckCircle2, color: "text-slate-500" },
                ].map(({ label, value, icon: Icon, color }) => (
                    <section key={label} className="rounded-2xl border border-primary/10 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-extrabold text-slate-500">{label}</p>
                            <Icon className={`size-5 ${color}`} />
                        </div>
                        <p className={`mt-3 text-2xl font-black ${color}`}>{value}건</p>
                    </section>
                ))}
            </div>

            <section className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-primary/10 bg-white shadow-sm">
                <div className={`${selectedRoomId ? "hidden" : "flex"} min-h-0 w-full flex-col`}>
                    <div className="space-y-3 border-b border-slate-100 p-4">
                        <label className="relative block">
                            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="학교명, 관리자명, 제목 검색" className="h-10 w-full rounded-lg border border-slate-200 pl-10 pr-3 text-sm font-semibold outline-none focus:border-primary" />
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <select value={status} onChange={(event) => setStatus(event.target.value as "ALL" | InquiryStatus)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold outline-none focus:border-primary">
                                <option value="ALL">전체 상태</option>
                                <option value="WAITING">응답 대기</option>
                                <option value="IN_PROGRESS">진행 중</option>
                                <option value="CLOSED">종료</option>
                            </select>
                            <select value={category} onChange={(event) => setCategory(event.target.value as "ALL" | InquiryCategory)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold outline-none focus:border-primary">
                                <option value="ALL">전체 분류</option>
                                {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain bg-slate-50/60 p-3">
                        {loading ? (
                            <div className="flex h-52 items-center justify-center text-sm font-bold text-slate-400">불러오는 중...</div>
                        ) : filteredRooms.length === 0 ? (
                            <div className="flex h-52 flex-col items-center justify-center text-slate-400">
                                <MessageSquareText className="size-7" />
                                <p className="mt-2 text-sm font-bold">조건에 맞는 문의가 없습니다.</p>
                            </div>
                        ) : filteredRooms.map((room) => (
                            <button key={room.roomId} type="button" onClick={() => setSelectedRoomId(room.roomId)} className={`group w-full rounded-xl border px-3.5 py-3.5 text-left shadow-sm transition ${room.roomId === selectedRoomId ? "border-primary/20 bg-primary/5 shadow-primary/5" : "border-slate-200 bg-white hover:border-primary/20 hover:bg-primary/40"}`}>
                                <div className="flex items-center justify-between gap-3">
                                    <p className="truncate text-xs font-extrabold text-slate-500">{room.univName}</p>
                                    <span className="shrink-0 text-[11px] font-semibold text-slate-400">{formatTime(room.lastAt)}</span>
                                </div>
                                <div className="mt-2 flex min-w-0 items-center gap-2">
                                    <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-black ${CATEGORY_STYLE[room.category]}`}>{CATEGORY_LABEL[room.category]}</span>
                                    <p className="truncate text-sm font-black text-slate-900">{room.title}</p>
                                </div>
                                <p className="mt-2 truncate text-xs font-semibold text-slate-400">{room.lastMessage || "첨부파일"}</p>
                                <div className="mt-2 flex items-center justify-between gap-2">
                                    <span className="truncate text-[11px] font-bold text-slate-400">{room.adminName ?? "학교 관리자"}</span>
                                    <div className="flex shrink-0 items-center gap-1.5">
                                        {room.unreadCount > 0 && (
                                            <span className="flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-black text-white">{room.unreadCount}</span>
                                        )}
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${STATUS_STYLE[getServiceAdminDisplayStatus(room)]}`}>{STATUS_LABEL[getServiceAdminDisplayStatus(room)]}</span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className={`${selectedRoomId ? "flex" : "hidden"} min-h-0 w-full min-w-0 flex-col`}>
                    {selectedRoom && thread ? (
                        <>
                            <header className="flex shrink-0 flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex min-w-0 items-start gap-3">
                                    <button type="button" onClick={() => setSelectedRoomId(null)} className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50" aria-label="문의 목록으로 돌아가기">
                                        <ArrowLeft className="size-4" />
                                    </button>
                                    <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-black ${CATEGORY_STYLE[selectedRoom.category]}`}>{CATEGORY_LABEL[selectedRoom.category]}</span>
                                        <h2 className="truncate font-black text-slate-950">{selectedRoom.title}</h2>
                                    </div>
                                    <p className="mt-1 text-xs font-semibold text-slate-400">
                                        {selectedRoom.univName} · {selectedRoom.adminName ?? "학교 관리자"}
                                    </p>
                                    </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    <span className={`rounded-full px-2.5 py-1 text-xs font-black ${STATUS_STYLE[thread.status]}`}>{STATUS_LABEL[thread.status]}</span>
                                    {thread.status !== "CLOSED" && (
                                        <button type="button" onClick={handleClose} disabled={submitting} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-black text-slate-600 hover:bg-slate-50">
                                            <CheckCircle2 className="size-4" />
                                            문의 종료
                                        </button>
                                    )}
                                </div>
                            </header>

                            <div ref={messageListRef} className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain bg-slate-50/70 px-5 py-6">
                                {threadLoading ? (
                                    <div className="flex h-full items-center justify-center text-sm font-bold text-slate-400">메시지를 불러오는 중...</div>
                                ) : thread.messages.map((item) => {
                                    const mine = item.senderRole === "SUA";
                                    return (
                                        <div key={item.messageId} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                                            <div className={`flex max-w-[78%] flex-col ${mine ? "items-end" : "items-start"}`}>
                                                <p className="mb-1 px-1 text-[11px] font-extrabold text-slate-400">
                                                    {mine ? memberName ?? item.senderName : item.senderName}
                                                </p>
                                                <div className={`rounded-2xl px-4 py-3 text-sm font-semibold leading-6 ${mine ? "rounded-br-md bg-primary text-white" : "rounded-bl-md border border-slate-200 bg-white text-slate-800"}`}>
                                                    {item.content && <p className="whitespace-pre-wrap">{item.content}</p>}
                                                    {item.attachments.length > 0 && (
                                                        <div className="mt-2 space-y-1">
                                                            {item.attachments.map((attachment) => (
                                                                <a key={attachment.attachmentId} href={getAttachmentDownloadHref(attachment)} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-bold ${mine ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600"}`}>
                                                                    <FileText className="size-4 shrink-0" />
                                                                    <span className="truncate">{attachment.originalName}</span>
                                                                </a>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="mt-1 px-1 text-[10px] font-semibold text-slate-400">{formatTime(item.sentAt)}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {thread.status === "CLOSED" ? (
                                <div className="shrink-0 border-t border-slate-100 bg-white px-5 py-5 text-center">
                                    <p className="text-sm font-bold text-slate-400">종료된 문의입니다. 메시지를 추가로 보낼 수 없습니다.</p>
                                </div>
                            ) : (
                                <form onSubmit={handleSend} className="shrink-0 border-t border-slate-100 bg-white p-4">
                                    {files.length > 0 && (
                                        <div className="mb-3 flex flex-wrap gap-2">
                                            {files.map((file, index) => (
                                                <span key={`${file.name}-${index}`} className="inline-flex max-w-full items-center gap-2 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                                                    <FileText className="size-3.5 shrink-0" />
                                                    <span className="truncate">{file.name}</span>
                                                    <button type="button" onClick={() => removeFile(index)} className="text-slate-400 hover:text-rose-500">
                                                        <X className="size-3.5" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    <div className="flex items-end gap-2">
                                        <input ref={fileInputRef} type="file" multiple accept={FILE_ACCEPT} className="hidden" onChange={(event) => {
                                            addFiles(event.target.files);
                                            event.target.value = "";
                                        }} />
                                        <button type="button" onClick={() => fileInputRef.current?.click()} className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-primary" aria-label="파일 첨부">
                                            <Paperclip className="size-5" />
                                        </button>
                                        <textarea value={message} onChange={(event) => setMessage(event.target.value.slice(0, 1000))} rows={2} placeholder="답변을 입력하세요. Enter 전송, Shift+Enter 줄바꿈" onKeyDown={(event) => {
                                            if (event.key === "Enter" && !event.shiftKey) {
                                                event.preventDefault();
                                                event.currentTarget.form?.requestSubmit();
                                            }
                                        }} className="min-h-11 flex-1 resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold outline-none focus:border-primary" />
                                        <button type="submit" disabled={submitting || (!message.trim() && files.length === 0)} className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-white hover:bg-primary/90 disabled:bg-slate-300" aria-label="답변 전송">
                                            <Send className="size-5" />
                                        </button>
                                    </div>
                                </form>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-1 flex-col items-center justify-center text-slate-400">
                            <MessageSquareText className="size-10" />
                            <p className="mt-3 text-sm font-bold">문의를 선택하면 대화 내용이 표시됩니다.</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
