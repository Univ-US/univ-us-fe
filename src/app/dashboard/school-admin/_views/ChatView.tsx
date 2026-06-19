"use client";

import { Client, type IStompSocket } from "@stomp/stompjs";
import {
    ArrowLeft,
    CheckCircle2,
    Clock3,
    FileText,
    MessageSquareText,
    Paperclip,
    Plus,
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
    closeAdminInquiry,
    createAdminInquiry,
    getAdminInquiryRooms,
    getAdminInquiryThread,
    getAttachmentDownloadHref,
    sendAdminInquiryMessage,
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
const CATEGORY_OPTIONS: InquiryCategory[] = ["PAYMENT", "SUBSCRIPTION", "ACCOUNT", "ERROR", "ETC"];

const CATEGORY_STYLE: Record<InquiryCategory, string> = {
    PAYMENT: "bg-sky-100 text-sky-700",
    SUBSCRIPTION: "bg-violet-100 text-violet-700",
    ACCOUNT: "bg-amber-100 text-amber-700",
    ERROR: "bg-rose-100 text-rose-700",
    ETC: "bg-slate-100 text-slate-600",
};

const STATUS_STYLE: Record<InquiryStatus, string> = {
    WAITING: "bg-amber-100 text-amber-700",
    IN_PROGRESS: "bg-emerald-100 text-emerald-700",
    CLOSED: "bg-slate-100 text-slate-500",
};

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

export default function ChatView() {
    const { memberName } = useAuthStore();
    const [rooms, setRooms] = useState<InquiryRoom[]>([]);
    const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
    const [thread, setThread] = useState<InquiryThread | null>(null);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<"ALL" | InquiryStatus>("ALL");
    const [category, setCategory] = useState<"ALL" | InquiryCategory>("ALL");
    const [message, setMessage] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [newOpen, setNewOpen] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newCategory, setNewCategory] = useState<InquiryCategory>("ETC");
    const [newMessage, setNewMessage] = useState("");
    const [newFiles, setNewFiles] = useState<File[]>([]);
    const [loading, setLoading] = useState(true);
    const [threadLoading, setThreadLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>("disconnected");
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const newFileInputRef = useRef<HTMLInputElement | null>(null);
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
                room.lastMessage.toLocaleLowerCase("ko-KR").includes(keyword);
            const matchesStatus = status === "ALL" || room.status === status;
            const matchesCategory = category === "ALL" || room.category === category;
            return matchesSearch && matchesStatus && matchesCategory;
        }));
    }, [category, rooms, search, status]);
    const summary = useMemo(() => ({
        waiting: rooms.filter((room) => room.status === "WAITING").length,
        inProgress: rooms.filter((room) => room.status === "IN_PROGRESS").length,
        closed: rooms.filter((room) => room.status === "CLOSED").length,
    }), [rooms]);
    const closed = selectedRoom?.status === "CLOSED";
    const totalUnread = useMemo(() => rooms.reduce((sum, room) => sum + room.unreadCount, 0), [rooms]);

    const loadRooms = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const data = sortRooms(await getAdminInquiryRooms());
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
            const data = await getAdminInquiryThread(roomId);
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
                    unreadCount: normalizedIncoming.senderRole === "ADM" || normalizedIncoming.roomId === selectedRoomId
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
                            if (payload.senderRole !== "ADM") {
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

    const addFiles = (nextFiles: FileList | null, target: "new" | "reply") => {
        if (!nextFiles) return;
        const current = target === "new" ? newFiles : files;
        const accepted = [...current];
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

        if (target === "new") setNewFiles(accepted);
        else setFiles(accepted);
    };

    const removeFile = (index: number, target: "new" | "reply") => {
        if (target === "new") {
            setNewFiles((current) => current.filter((_, i) => i !== index));
            return;
        }
        setFiles((current) => current.filter((_, i) => i !== index));
    };

    async function handleCreate(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!newTitle.trim() || (!newMessage.trim() && newFiles.length === 0) || submitting) return;
        setSubmitting(true);
        setError("");
        try {
            const room = await createAdminInquiry({
                title: newTitle.trim(),
                category: newCategory,
                messageText: newMessage.trim(),
                files: newFiles,
            });
            setRooms((current) => mergeRoom(current, room));
            setSelectedRoomId(room.roomId);
            setNewOpen(false);
            setNewTitle("");
            setNewCategory("ETC");
            setNewMessage("");
            setNewFiles([]);
            if (newFileInputRef.current) newFileInputRef.current.value = "";
        } catch (createError) {
            setError(getApiErrorMessage(createError, "문의를 등록하지 못했습니다."));
        } finally {
            setSubmitting(false);
        }
    }

    async function handleSend(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!selectedRoomId || closed || (!message.trim() && files.length === 0) || submitting) return;
        const submittedText = message;
        const submittedFiles = files;
        setSubmitting(true);
        setError("");
        try {
            const saved = await sendAdminInquiryMessage(selectedRoomId, {
                messageText: submittedText.trim(),
                files: submittedFiles,
            });
            appendMessage(saved);
            setMessage("");
            setFiles([]);
            if (fileInputRef.current) fileInputRef.current.value = "";
        } catch (sendError) {
            setError(getApiErrorMessage(sendError, "메시지를 전송하지 못했습니다."));
        } finally {
            setSubmitting(false);
        }
    }

    async function handleClose() {
        if (!selectedRoomId || closed || !window.confirm("문의를 종료하시겠습니까? 종료 후에는 메시지를 보낼 수 없습니다.")) return;
        setSubmitting(true);
        setError("");
        try {
            await closeAdminInquiry(selectedRoomId);
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

    const renderFiles = (items: File[], target: "new" | "reply") => (
        items.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
                {items.map((file, index) => (
                    <span key={`${file.name}-${index}`} className="inline-flex max-w-full items-center gap-2 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                        <FileText className="size-3.5 shrink-0" />
                        <span className="truncate">{file.name}</span>
                        <button type="button" onClick={() => removeFile(index, target)} className="text-slate-400 hover:text-rose-500">
                            <X className="size-3.5" />
                        </button>
                    </span>
                ))}
            </div>
        )
    );

    return (
        <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
            <header className="flex shrink-0 flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-black tracking-tight">운영 문의</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        서비스 최고 관리자와 문의를 주고받습니다. 읽지 않은 메시지 {totalUnread}건
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-500">
                        {realtimeStatus === "connected" ? <Wifi className="size-4 text-emerald-600" /> : <WifiOff className="size-4 text-slate-400" />}
                        {realtimeStatus === "connected" ? "실시간 연결" : "연결 대기"}
                    </span>
                    <button type="button" onClick={() => void loadRooms()} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 hover:bg-slate-50">
                        <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
                        새로고침
                    </button>
                    <button type="button" onClick={() => {
                        setSelectedRoomId(null);
                        setNewOpen((value) => !value);
                    }} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#064b35] px-3 text-xs font-black text-white hover:bg-emerald-800">
                        <Plus className="size-4" />
                        새 문의
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
                    { label: "답변 대기", value: summary.waiting, icon: Clock3, color: "text-amber-600" },
                    { label: "진행 중", value: summary.inProgress, icon: MessageSquareText, color: "text-emerald-700" },
                    { label: "종료", value: summary.closed, icon: CheckCircle2, color: "text-slate-500" },
                ].map(({ label, value, icon: Icon, color }) => (
                    <section key={label} className="rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-extrabold text-slate-500">{label}</p>
                            <Icon className={`size-5 ${color}`} />
                        </div>
                        <p className={`mt-3 text-2xl font-black ${color}`}>{value}건</p>
                    </section>
                ))}
            </div>

            <section className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-emerald-900/10 bg-white shadow-sm">
                {newOpen && (
                    <div className="flex min-h-0 w-full min-w-0 flex-col">
                        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                            <div className="flex min-w-0 items-center gap-3">
                                <button type="button" onClick={() => setNewOpen(false)} className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50" aria-label="문의 목록으로 돌아가기">
                                    <ArrowLeft className="size-4" />
                                </button>
                                <div className="min-w-0">
                                    <h2 className="font-black text-slate-950">새 문의</h2>
                                    <p className="mt-1 text-xs font-semibold text-slate-400">서비스 최고 관리자에게 문의를 보냅니다.</p>
                                </div>
                            </div>
                        </header>

                        <form onSubmit={handleCreate} className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50/60 p-5">
                            <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                <div className="grid shrink-0 gap-3 lg:grid-cols-[160px_minmax(0,1fr)]">
                                    <select value={newCategory} onChange={(event) => setNewCategory(event.target.value as InquiryCategory)} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-500">
                                        {CATEGORY_OPTIONS.map((category) => (
                                            <option key={category} value={category}>{CATEGORY_LABEL[category]}</option>
                                        ))}
                                    </select>
                                    <input value={newTitle} onChange={(event) => setNewTitle(event.target.value.slice(0, 50))} maxLength={50} placeholder="문의 제목" className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-bold outline-none focus:border-emerald-500" />
                                </div>
                                <textarea value={newMessage} onChange={(event) => setNewMessage(event.target.value.slice(0, 1000))} placeholder="문의 내용을 입력하세요." className="mt-3 min-h-0 flex-1 w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold outline-none focus:border-emerald-500" />
                                {renderFiles(newFiles, "new")}
                                <div className="mt-4 flex shrink-0 justify-between gap-2">
                                    <input ref={newFileInputRef} type="file" multiple accept={FILE_ACCEPT} className="hidden" onChange={(event) => {
                                        addFiles(event.target.files, "new");
                                        event.target.value = "";
                                    }} />
                                    <button type="button" onClick={() => newFileInputRef.current?.click()} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-black text-slate-600 hover:bg-slate-50">
                                        <Paperclip className="size-4" />
                                        첨부
                                    </button>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => setNewOpen(false)} className="inline-flex h-10 items-center rounded-lg border border-slate-200 px-4 text-xs font-black text-slate-600 hover:bg-slate-50">
                                            취소
                                        </button>
                                        <button type="submit" disabled={submitting || !newTitle.trim() || (!newMessage.trim() && newFiles.length === 0)} className="inline-flex h-10 items-center rounded-lg bg-[#064b35] px-4 text-xs font-black text-white hover:bg-emerald-800 disabled:bg-slate-300">
                                            등록
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                )}

                <div className={`${selectedRoomId || newOpen ? "hidden" : "flex"} min-h-0 w-full flex-col`}>
                    <div className="space-y-3 border-b border-slate-100 p-4">
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="text-sm font-black text-slate-900">문의 목록</h2>
                            <span className="text-xs font-bold text-slate-400">{filteredRooms.length}건</span>
                        </div>
                        <label className="relative block">
                            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="학교명, 제목, 메시지 검색" className="h-10 w-full rounded-lg border border-slate-200 pl-10 pr-3 text-sm font-semibold outline-none focus:border-emerald-500" />
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <select value={status} onChange={(event) => setStatus(event.target.value as "ALL" | InquiryStatus)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold outline-none focus:border-emerald-500">
                                <option value="ALL">전체 상태</option>
                                <option value="WAITING">답변 대기</option>
                                <option value="IN_PROGRESS">진행 중</option>
                                <option value="CLOSED">종료</option>
                            </select>
                            <select value={category} onChange={(event) => setCategory(event.target.value as "ALL" | InquiryCategory)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold outline-none focus:border-emerald-500">
                                <option value="ALL">전체 분류</option>
                                {CATEGORY_OPTIONS.map((value) => (
                                    <option key={value} value={value}>{CATEGORY_LABEL[value]}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain bg-slate-50/60 p-3">
                        {loading ? (
                            <div className="flex h-40 items-center justify-center text-sm font-bold text-slate-400">불러오는 중...</div>
                        ) : filteredRooms.length === 0 ? (
                            <div className="flex h-56 flex-col items-center justify-center text-slate-400">
                                <MessageSquareText className="size-8" />
                                <p className="mt-2 text-sm font-bold">조건에 맞는 문의가 없습니다.</p>
                            </div>
                        ) : filteredRooms.map((room) => (
                            <button key={room.roomId} type="button" onClick={() => setSelectedRoomId(room.roomId)} className={`group w-full rounded-xl border px-3.5 py-3.5 text-left shadow-sm transition ${room.roomId === selectedRoomId ? "border-emerald-200 bg-emerald-50 shadow-emerald-900/5" : "border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/40"}`}>
                                <div className="flex items-center justify-between gap-2">
                                    <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-black ${CATEGORY_STYLE[room.category]}`}>{CATEGORY_LABEL[room.category]}</span>
                                    <span className="text-[11px] font-semibold text-slate-400">{formatTime(room.lastAt)}</span>
                                </div>
                                <p className="mt-2 truncate text-sm font-black text-slate-900">{room.title}</p>
                                <p className="mt-1 truncate text-xs font-semibold text-slate-500">{room.lastMessage || "첨부파일"}</p>
                                <div className="mt-2 flex items-center justify-between">
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${STATUS_STYLE[room.status]}`}>{STATUS_LABEL[room.status]}</span>
                                    {room.unreadCount > 0 && (
                                        <span className="flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-black text-white">{room.unreadCount}</span>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className={`${selectedRoomId ? "flex" : "hidden"} min-h-0 w-full min-w-0 flex-col`}>
                    {selectedRoom && thread ? (
                        <>
                            <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                                <div className="flex min-w-0 items-start gap-3">
                                    <button type="button" onClick={() => setSelectedRoomId(null)} className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50" aria-label="문의 목록으로 돌아가기">
                                        <ArrowLeft className="size-4" />
                                    </button>
                                    <div className="min-w-0">
                                    <div className="flex min-w-0 items-center gap-2">
                                        <span className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-black ${CATEGORY_STYLE[selectedRoom.category]}`}>{CATEGORY_LABEL[selectedRoom.category]}</span>
                                        <h2 className="truncate font-black text-slate-950">{selectedRoom.title}</h2>
                                    </div>
                                    <p className="mt-1 text-xs font-semibold text-slate-400">{selectedRoom.univName}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
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
                                    const mine = item.senderRole === "ADM";
                                    return (
                                        <div key={item.messageId} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                                            <div className={`flex max-w-[78%] flex-col ${mine ? "items-end" : "items-start"}`}>
                                                <p className="mb-1 px-1 text-[11px] font-extrabold text-slate-400">{mine ? memberName ?? item.senderName : item.senderName}</p>
                                                <div className={`rounded-2xl px-4 py-3 text-sm font-semibold leading-6 ${mine ? "rounded-br-md bg-[#064b35] text-white" : "rounded-bl-md border border-slate-200 bg-white text-slate-800"}`}>
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
                                <div className="shrink-0 border-t border-slate-100 bg-white px-5 py-5 text-center text-sm font-bold text-slate-400">
                                    종료된 문의입니다. 메시지를 추가로 보낼 수 없습니다.
                                </div>
                            ) : (
                                <form onSubmit={handleSend} className="shrink-0 border-t border-slate-100 bg-white p-4">
                                    {renderFiles(files, "reply")}
                                    <div className="flex items-end gap-2">
                                        <input ref={fileInputRef} type="file" multiple accept={FILE_ACCEPT} className="hidden" onChange={(event) => {
                                            addFiles(event.target.files, "reply");
                                            event.target.value = "";
                                        }} />
                                        <button type="button" onClick={() => fileInputRef.current?.click()} className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-emerald-700" aria-label="파일 첨부">
                                            <Paperclip className="size-5" />
                                        </button>
                                        <textarea value={message} onChange={(event) => setMessage(event.target.value.slice(0, 1000))} rows={2} placeholder="메시지를 입력하세요. Enter 전송, Shift+Enter 줄바꿈" onKeyDown={(event) => {
                                            if (event.key === "Enter" && !event.shiftKey) {
                                                event.preventDefault();
                                                event.currentTarget.form?.requestSubmit();
                                            }
                                        }} className="min-h-11 flex-1 resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold outline-none focus:border-emerald-500" />
                                        <button type="submit" disabled={submitting || (!message.trim() && files.length === 0)} className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#064b35] text-white hover:bg-emerald-800 disabled:bg-slate-300" aria-label="메시지 전송">
                                            <Send className="size-5" />
                                        </button>
                                    </div>
                                </form>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-1 flex-col items-center justify-center text-slate-400">
                            <MessageSquareText className="size-10" />
                            <p className="mt-3 text-sm font-bold">문의를 선택하거나 새 문의를 등록하세요.</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
