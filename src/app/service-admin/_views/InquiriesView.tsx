"use client";

import Image from "next/image";
import {
    FormEvent,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    CheckCircle2,
    Clock3,
    ImagePlus,
    MessageSquareText,
    RotateCcw,
    Search,
    Send,
    X,
} from "lucide-react";
import type {
    InquiryCategory,
    InquiryStatus,
    ServiceInquiry,
    ServiceSchool,
} from "../_types";

interface InquiriesViewProps {
    inquiries: ServiceInquiry[];
    schools: ServiceSchool[];
    adminName: string;
    onRead: (inquiryId: number) => void;
    onSendMessage: (
        inquiryId: number,
        payload: {
            text: string;
            imageUrl: string | null;
            imageName: string | null;
        },
    ) => void;
    onChangeStatus: (inquiryId: number, status: InquiryStatus) => void;
}

const CATEGORY_LABEL: Record<InquiryCategory, string> = {
    PAYMENT: "결제",
    SUBSCRIPTION: "구독",
    ACCOUNT: "계정",
    ERROR: "오류",
    ETC: "기타",
};

const CATEGORY_STYLE: Record<InquiryCategory, string> = {
    PAYMENT: "bg-sky-100 text-sky-700",
    SUBSCRIPTION: "bg-violet-100 text-violet-700",
    ACCOUNT: "bg-amber-100 text-amber-700",
    ERROR: "bg-rose-100 text-rose-700",
    ETC: "bg-slate-100 text-slate-600",
};

const STATUS_LABEL: Record<InquiryStatus, string> = {
    WAITING: "답변 대기",
    IN_PROGRESS: "진행 중",
    CLOSED: "종료",
};

const STATUS_STYLE: Record<InquiryStatus, string> = {
    WAITING: "bg-amber-100 text-amber-700",
    IN_PROGRESS: "bg-emerald-100 text-emerald-700",
    CLOSED: "bg-slate-100 text-slate-500",
};

function formatMessageTime(value: string) {
    const date = new Date(value.replace(" ", "T"));
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString("ko-KR", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

export default function InquiriesView({
    inquiries,
    schools,
    adminName,
    onRead,
    onSendMessage,
    onChangeStatus,
}: InquiriesViewProps) {
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<"ALL" | InquiryStatus>("ALL");
    const [category, setCategory] = useState<"ALL" | InquiryCategory>("ALL");
    const [selectedInquiryId, setSelectedInquiryId] = useState<number | null>(
        inquiries[0]?.id ?? null,
    );
    const [message, setMessage] = useState("");
    const [selectedImage, setSelectedImage] = useState<{
        name: string;
        url: string;
    } | null>(null);
    const [imageError, setImageError] = useState("");
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const messageEndRef = useRef<HTMLDivElement | null>(null);

    const schoolMap = useMemo(
        () => new Map(schools.map((school) => [school.id, school])),
        [schools],
    );
    const filteredInquiries = useMemo(() => {
        const keyword = search.trim().toLocaleLowerCase("ko-KR");
        return inquiries
            .filter((inquiry) => {
                const schoolName = schoolMap.get(inquiry.schoolId)?.name ?? "";
                const matchesSearch =
                    !keyword ||
                    inquiry.title.toLocaleLowerCase("ko-KR").includes(keyword) ||
                    schoolName.toLocaleLowerCase("ko-KR").includes(keyword);
                const matchesStatus =
                    status === "ALL" || inquiry.status === status;
                const matchesCategory =
                    category === "ALL" || inquiry.category === category;
                return matchesSearch && matchesStatus && matchesCategory;
            })
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }, [category, inquiries, schoolMap, search, status]);
    const selectedInquiry =
        inquiries.find((inquiry) => inquiry.id === selectedInquiryId) ?? null;
    const selectedSchool = selectedInquiry
        ? schoolMap.get(selectedInquiry.schoolId) ?? null
        : null;

    const summary = {
        waiting: inquiries.filter((inquiry) => inquiry.status === "WAITING").length,
        inProgress: inquiries.filter(
            (inquiry) => inquiry.status === "IN_PROGRESS",
        ).length,
        closed: inquiries.filter((inquiry) => inquiry.status === "CLOSED").length,
    };

    useEffect(() => {
        if (selectedInquiryId !== null) onRead(selectedInquiryId);
    }, [onRead, selectedInquiryId]);

    useEffect(() => {
        messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [selectedInquiry?.messages.length]);

    const selectInquiry = (inquiryId: number) => {
        if (selectedImage?.url.startsWith("blob:")) {
            URL.revokeObjectURL(selectedImage.url);
        }
        setSelectedImage(null);
        setImageError("");
        setMessage("");
        setSelectedInquiryId(inquiryId);
    };

    const selectImage = (file: File | undefined) => {
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            setImageError("이미지 파일만 첨부할 수 있습니다.");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setImageError("이미지는 5MB 이하만 첨부할 수 있습니다.");
            return;
        }
        if (selectedImage?.url.startsWith("blob:")) {
            URL.revokeObjectURL(selectedImage.url);
        }
        setSelectedImage({
            name: file.name,
            url: URL.createObjectURL(file),
        });
        setImageError("");
    };

    const removeSelectedImage = () => {
        if (selectedImage?.url.startsWith("blob:")) {
            URL.revokeObjectURL(selectedImage.url);
        }
        setSelectedImage(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const sendMessage = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!selectedInquiry || selectedInquiry.status === "CLOSED") return;
        if (!message.trim() && !selectedImage) return;

        onSendMessage(selectedInquiry.id, {
            text: message.trim(),
            imageUrl: selectedImage?.url ?? null,
            imageName: selectedImage?.name ?? null,
        });
        setMessage("");
        setSelectedImage(null);
        setImageError("");
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-2xl font-black tracking-tight">채팅 문의</h1>
                <p className="mt-1 text-sm text-slate-500">
                    학교 관리자가 생성한 1:1 문의를 확인하고 실시간으로 답변합니다.
                </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
                {[
                    {
                        label: "답변 대기",
                        value: summary.waiting,
                        icon: Clock3,
                        color: "text-amber-600",
                    },
                    {
                        label: "진행 중",
                        value: summary.inProgress,
                        icon: MessageSquareText,
                        color: "text-emerald-700",
                    },
                    {
                        label: "종료",
                        value: summary.closed,
                        icon: CheckCircle2,
                        color: "text-slate-500",
                    },
                ].map(({ label, value, icon: Icon, color }) => (
                    <section
                        key={label}
                        className="rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-sm"
                    >
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-extrabold text-slate-500">{label}</p>
                            <Icon className={`size-5 ${color}`} />
                        </div>
                        <p className={`mt-3 text-2xl font-black ${color}`}>
                            {value}건
                        </p>
                    </section>
                ))}
            </div>

            <section className="grid min-h-[680px] overflow-hidden rounded-2xl border border-emerald-900/10 bg-white shadow-sm xl:grid-cols-[380px_minmax(0,1fr)]">
                <div className="flex min-h-0 flex-col border-b border-slate-200 xl:border-b-0 xl:border-r">
                    <div className="space-y-3 border-b border-slate-100 p-4">
                        <label className="relative block">
                            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                            <input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="학교명 또는 문의 제목 검색"
                                className="h-10 w-full rounded-lg border border-slate-200 pl-10 pr-3 text-sm font-semibold outline-none focus:border-emerald-500"
                            />
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <select
                                value={status}
                                onChange={(event) =>
                                    setStatus(
                                        event.target.value as
                                            | "ALL"
                                            | InquiryStatus,
                                    )
                                }
                                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold outline-none focus:border-emerald-500"
                            >
                                <option value="ALL">전체 상태</option>
                                <option value="WAITING">답변 대기</option>
                                <option value="IN_PROGRESS">진행 중</option>
                                <option value="CLOSED">종료</option>
                            </select>
                            <select
                                value={category}
                                onChange={(event) =>
                                    setCategory(
                                        event.target.value as
                                            | "ALL"
                                            | InquiryCategory,
                                    )
                                }
                                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold outline-none focus:border-emerald-500"
                            >
                                <option value="ALL">전체 분류</option>
                                {Object.entries(CATEGORY_LABEL).map(
                                    ([value, label]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    ),
                                )}
                            </select>
                        </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto">
                        {filteredInquiries.map((inquiry) => {
                            const school = schoolMap.get(inquiry.schoolId);
                            const lastMessage =
                                inquiry.messages[inquiry.messages.length - 1];
                            return (
                                <button
                                    key={inquiry.id}
                                    onClick={() => selectInquiry(inquiry.id)}
                                    className={`w-full border-b border-slate-100 px-4 py-4 text-left transition ${
                                        inquiry.id === selectedInquiryId
                                            ? "bg-emerald-50"
                                            : "hover:bg-slate-50"
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="truncate text-xs font-extrabold text-slate-500">
                                            {school?.name ?? "학교 정보 없음"}
                                        </p>
                                        <span className="shrink-0 text-[11px] font-semibold text-slate-400">
                                            {formatMessageTime(inquiry.updatedAt)}
                                        </span>
                                    </div>
                                    <div className="mt-2 flex min-w-0 items-center gap-2">
                                        <span
                                            className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-black ${CATEGORY_STYLE[inquiry.category]}`}
                                        >
                                            {CATEGORY_LABEL[inquiry.category]}
                                        </span>
                                        <p className="truncate text-sm font-black text-slate-900">
                                            {inquiry.title}
                                        </p>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between gap-3">
                                        <p className="truncate text-xs font-semibold text-slate-400">
                                            {lastMessage?.text ||
                                                (lastMessage?.imageName
                                                    ? `이미지: ${lastMessage.imageName}`
                                                    : "")}
                                        </p>
                                        <div className="flex shrink-0 items-center gap-1.5">
                                            {inquiry.unreadCount > 0 && (
                                                <span className="flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-black text-white">
                                                    {inquiry.unreadCount}
                                                </span>
                                            )}
                                            <span
                                                className={`rounded-full px-2 py-0.5 text-[10px] font-black ${STATUS_STYLE[inquiry.status]}`}
                                            >
                                                {STATUS_LABEL[inquiry.status]}
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                        {filteredInquiries.length === 0 && (
                            <div className="flex h-52 flex-col items-center justify-center text-slate-400">
                                <MessageSquareText className="size-7" />
                                <p className="mt-2 text-sm font-bold">
                                    조건에 맞는 문의가 없습니다.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex min-h-[680px] min-w-0 flex-col">
                    {selectedInquiry && selectedSchool ? (
                        <>
                            <header className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-black ${CATEGORY_STYLE[selectedInquiry.category]}`}
                                        >
                                            {CATEGORY_LABEL[selectedInquiry.category]}
                                        </span>
                                        <h2 className="truncate font-black text-slate-950">
                                            {selectedInquiry.title}
                                        </h2>
                                    </div>
                                    <p className="mt-1 text-xs font-semibold text-slate-400">
                                        {selectedSchool.name} · {selectedSchool.adminName} 관리자
                                    </p>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    <span
                                        className={`rounded-full px-2.5 py-1 text-xs font-black ${STATUS_STYLE[selectedInquiry.status]}`}
                                    >
                                        {STATUS_LABEL[selectedInquiry.status]}
                                    </span>
                                    {selectedInquiry.status === "CLOSED" ? (
                                        <button
                                            onClick={() =>
                                                onChangeStatus(
                                                    selectedInquiry.id,
                                                    "IN_PROGRESS",
                                                )
                                            }
                                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-200 px-3 text-xs font-black text-emerald-700 hover:bg-emerald-50"
                                        >
                                            <RotateCcw className="size-4" />
                                            문의 다시 열기
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() =>
                                                onChangeStatus(
                                                    selectedInquiry.id,
                                                    "CLOSED",
                                                )
                                            }
                                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-black text-slate-600 hover:bg-slate-50"
                                        >
                                            <CheckCircle2 className="size-4" />
                                            문의 종료
                                        </button>
                                    )}
                                </div>
                            </header>

                            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-slate-50/70 px-5 py-6">
                                {selectedInquiry.messages.map((item) => {
                                    const isAdmin = item.senderRole === "SUA";
                                    return (
                                        <div
                                            key={item.id}
                                            className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}
                                        >
                                            <div
                                                className={`max-w-[78%] ${isAdmin ? "items-end" : "items-start"} flex flex-col`}
                                            >
                                                <p className="mb-1 px-1 text-[11px] font-extrabold text-slate-400">
                                                    {isAdmin
                                                        ? adminName
                                                        : `${selectedSchool.adminName} 관리자`}
                                                </p>
                                                <div
                                                    className={`overflow-hidden rounded-2xl ${
                                                        isAdmin
                                                            ? "rounded-br-md bg-emerald-700 text-white"
                                                            : "rounded-bl-md border border-slate-200 bg-white text-slate-800"
                                                    }`}
                                                >
                                                    {item.imageUrl && (
                                                        <div className="relative h-44 w-64 max-w-full bg-slate-100">
                                                            <Image
                                                                src={item.imageUrl}
                                                                alt={item.imageName ?? "문의 첨부 이미지"}
                                                                fill
                                                                unoptimized
                                                                className="object-cover"
                                                            />
                                                        </div>
                                                    )}
                                                    {item.text && (
                                                        <p className="whitespace-pre-wrap px-4 py-3 text-sm font-semibold leading-6">
                                                            {item.text}
                                                        </p>
                                                    )}
                                                </div>
                                                <p className="mt-1 px-1 text-[10px] font-semibold text-slate-400">
                                                    {formatMessageTime(item.sentAt)}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messageEndRef} />
                            </div>

                            {selectedInquiry.status === "CLOSED" ? (
                                <div className="border-t border-slate-100 bg-white px-5 py-5 text-center">
                                    <p className="text-sm font-bold text-slate-400">
                                        종료된 문의입니다. 답변하려면 문의를 다시 열어주세요.
                                    </p>
                                </div>
                            ) : (
                                <form
                                    onSubmit={sendMessage}
                                    className="border-t border-slate-100 bg-white p-4"
                                >
                                    {selectedImage && (
                                        <div className="mb-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                                            <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                                                <Image
                                                    src={selectedImage.url}
                                                    alt={selectedImage.name}
                                                    fill
                                                    unoptimized
                                                    className="object-cover"
                                                />
                                            </div>
                                            <p className="min-w-0 flex-1 truncate text-xs font-bold text-slate-600">
                                                {selectedImage.name}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={removeSelectedImage}
                                                className="flex size-8 items-center justify-center rounded-full text-slate-400 hover:bg-white hover:text-rose-500"
                                                aria-label="첨부 이미지 제거"
                                            >
                                                <X className="size-4" />
                                            </button>
                                        </div>
                                    )}
                                    {imageError && (
                                        <p className="mb-2 text-xs font-bold text-rose-600">
                                            {imageError}
                                        </p>
                                    )}
                                    <div className="flex items-end gap-2">
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp,image/gif"
                                            onChange={(event) =>
                                                selectImage(event.target.files?.[0])
                                            }
                                            className="hidden"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-emerald-700"
                                            aria-label="이미지 첨부"
                                        >
                                            <ImagePlus className="size-5" />
                                        </button>
                                        <textarea
                                            value={message}
                                            onChange={(event) =>
                                                setMessage(event.target.value)
                                            }
                                            onKeyDown={(event) => {
                                                if (
                                                    event.key === "Enter" &&
                                                    !event.shiftKey
                                                ) {
                                                    event.preventDefault();
                                                    event.currentTarget.form?.requestSubmit();
                                                }
                                            }}
                                            rows={2}
                                            placeholder="답변을 입력하세요. Enter 전송, Shift+Enter 줄바꿈"
                                            className="min-h-11 flex-1 resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold outline-none focus:border-emerald-500"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!message.trim() && !selectedImage}
                                            className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                                            aria-label="답변 전송"
                                        >
                                            <Send className="size-5" />
                                        </button>
                                    </div>
                                </form>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-1 flex-col items-center justify-center text-slate-400">
                            <MessageSquareText className="size-10" />
                            <p className="mt-3 text-sm font-bold">
                                문의를 선택하면 대화 내용이 표시됩니다.
                            </p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
