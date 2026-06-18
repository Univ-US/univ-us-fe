import api, { API_BASE_URL } from "@/lib/api";

export type InquiryCategory = "PAYMENT" | "SUBSCRIPTION" | "ACCOUNT" | "ERROR" | "ETC";
export type InquiryStatus = "WAITING" | "IN_PROGRESS" | "CLOSED";
export type InquirySenderRole = "ADM" | "SUA";

export interface InquiryAttachment {
    attachmentId: number;
    messageId: number;
    originalName: string;
    fileSize: number;
    fileType: string;
    downloadUrl: string;
}

export interface InquiryMessage {
    messageId: number;
    roomId: number;
    memberId: number;
    senderName: string;
    senderRole: InquirySenderRole;
    content: string;
    sentAt: string;
    read: boolean;
    attachments: InquiryAttachment[];
}

export interface InquiryRoom {
    roomId: number;
    univId: number;
    univName: string;
    title: string;
    category: InquiryCategory;
    status: InquiryStatus;
    createdAt: string;
    lastAt: string;
    lastMessage: string;
    adminMemberId: number | null;
    adminName: string | null;
    unreadCount: number;
}

export interface InquiryThread {
    roomId: number;
    univId: number;
    univName: string;
    title: string;
    category: InquiryCategory;
    status: InquiryStatus;
    createdAt: string;
    messages: InquiryMessage[];
}

export const INQUIRY_TOPIC_PREFIX = "/sub/inquiries";
export const INQUIRY_ROOMS_TOPIC = "/sub/inquiries/rooms";

export const CATEGORY_LABEL: Record<InquiryCategory, string> = {
    PAYMENT: "결제",
    SUBSCRIPTION: "구독",
    ACCOUNT: "계정",
    ERROR: "오류",
    ETC: "기타",
};

export const STATUS_LABEL: Record<InquiryStatus, string> = {
    WAITING: "응답 대기",
    IN_PROGRESS: "진행 중",
    CLOSED: "종료",
};

const appendFiles = (formData: FormData, files?: File[]) => {
    files?.forEach((file) => formData.append("files", file));
};

const normalizeRoom = (room: InquiryRoom): InquiryRoom => ({
    ...room,
    category: room.category ?? "ETC",
    status: room.status ?? "WAITING",
    unreadCount: room.unreadCount ?? 0,
    lastMessage: room.lastMessage ?? "",
});

const normalizeMessage = (message: InquiryMessage): InquiryMessage => ({
    ...message,
    content: (message.content ?? "").trim(),
    read: Boolean(message.read),
    attachments: message.attachments ?? [],
});

const normalizeThread = (thread: InquiryThread): InquiryThread => ({
    ...thread,
    category: thread.category ?? "ETC",
    status: thread.status ?? "WAITING",
    messages: (thread.messages ?? []).map(normalizeMessage),
});

export const getAttachmentDownloadHref = (attachment: InquiryAttachment) => {
    if (!attachment.downloadUrl) return "#";
    return new URL(attachment.downloadUrl, API_BASE_URL).toString();
};

export const getAdminInquiryRooms = async () => {
    const res = await api.get<InquiryRoom[]>("/api/admin/inquiries");
    return (res.data ?? []).map(normalizeRoom);
};

export const getAdminInquiryThread = async (roomId: number) => {
    const res = await api.get<InquiryThread>(`/api/admin/inquiries/${roomId}`);
    return normalizeThread(res.data);
};

export const createAdminInquiry = async (input: {
    title: string;
    category: InquiryCategory;
    messageText: string;
    files?: File[];
}) => {
    const formData = new FormData();
    formData.append("title", input.title);
    formData.append("category", input.category);
    formData.append("messageText", input.messageText);
    appendFiles(formData, input.files);
    const res = await api.post<InquiryRoom>("/api/admin/inquiries", formData);
    return normalizeRoom(res.data);
};

export const sendAdminInquiryMessage = async (
    roomId: number,
    input: { messageText: string; files?: File[] },
) => {
    const formData = new FormData();
    formData.append("messageText", input.messageText);
    appendFiles(formData, input.files);
    const res = await api.post<InquiryMessage>(`/api/admin/inquiries/${roomId}/messages`, formData);
    return normalizeMessage(res.data);
};

export const closeAdminInquiry = async (roomId: number) => {
    await api.patch(`/api/admin/inquiries/${roomId}/close`);
};

export const getServiceAdminInquiryRooms = async () => {
    const res = await api.get<InquiryRoom[]>("/api/service-admin/inquiries");
    return (res.data ?? []).map(normalizeRoom);
};

export const getServiceAdminInquiryThread = async (roomId: number) => {
    const res = await api.get<InquiryThread>(`/api/service-admin/inquiries/${roomId}`);
    return normalizeThread(res.data);
};

export const sendServiceAdminInquiryMessage = async (
    roomId: number,
    input: { messageText: string; files?: File[] },
) => {
    const formData = new FormData();
    formData.append("messageText", input.messageText);
    appendFiles(formData, input.files);
    const res = await api.post<InquiryMessage>(
        `/api/service-admin/inquiries/${roomId}/messages`,
        formData,
    );
    return normalizeMessage(res.data);
};

export const closeServiceAdminInquiry = async (roomId: number) => {
    await api.patch(`/api/service-admin/inquiries/${roomId}/close`);
};
