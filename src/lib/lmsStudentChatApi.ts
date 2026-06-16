import api from "@/lib/api";

export interface ChatRoom {
  roomId: number;
  lecId: number;
  studentLmsPrfId: number;
  professorLmsPrfId: number;
  professorName: string;
  courseName: string;
  lecSection: number | null;
  lastMessage: string;
  lastAt: string;
  unread: number;
  avatarInitial: string;
  avatarColor: string;
}

export interface ChatMessage {
  id: number;
  roomId: number;
  senderLmsPrfId: number;
  sender: "me" | "professor";
  text: string;
  sentAt: string;
  read?: boolean;
}

export interface ChatThread {
  roomId: number;
  dateLabel: string;
  messages: ChatMessage[];
}

const avatarColors = [
  "bg-emerald-600",
  "bg-sky-600",
  "bg-indigo-600",
  "bg-rose-600",
  "bg-amber-600",
  "bg-teal-600",
];

const pad = (n: number) => String(n).padStart(2, "0");

export const LMS_STUDENT_CHAT_TOPIC_PREFIX = "/sub/lms-chats";

export function formatChatListTime(at: string | Date, now: Date = new Date()): string {
  const d = typeof at === "string" ? new Date(at) : at;
  if (Number.isNaN(d.getTime())) return "";
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (d.getFullYear() === now.getFullYear()) return `${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

export function formatChatMessageTime(at: string | Date): string {
  const d = typeof at === "string" ? new Date(at) : at;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatChatDateLabel(at: string | Date): string {
  const d = typeof at === "string" ? new Date(at) : at;
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

const normalizeRoom = (room: Omit<ChatRoom, "avatarInitial" | "avatarColor">): ChatRoom => {
  const professorName = room.professorName?.trim() || "교수";
  const seed = professorName.charCodeAt(0) + room.roomId;

  return {
    ...room,
    professorName,
    courseName: room.courseName ?? "",
    lecSection: room.lecSection ?? null,
    lastMessage: room.lastMessage || "아직 메시지가 없습니다.",
    unread: room.unread ?? 0,
    avatarInitial: professorName[0] ?? "교",
    avatarColor: avatarColors[Math.abs(seed) % avatarColors.length],
  };
};

const normalizeMessage = (message: ChatMessage): ChatMessage => ({
  ...message,
  text: message.text ?? "",
  read: Boolean(message.read),
});

export const getChatRooms = async (): Promise<ChatRoom[]> => {
  const res = await api.get<Omit<ChatRoom, "avatarInitial" | "avatarColor">[]>("/api/lms/student/chats");
  return (res.data ?? []).map(normalizeRoom);
};

export const getChatThread = async (roomId: number): Promise<ChatThread> => {
  const res = await api.get<ChatThread>(`/api/lms/student/chats/${roomId}`);
  return {
    roomId: res.data.roomId,
    dateLabel: res.data.dateLabel ?? "",
    messages: (res.data.messages ?? []).map(normalizeMessage),
  };
};

export const sendChatMessage = async (roomId: number, messageText: string): Promise<ChatMessage> => {
  const res = await api.post<ChatMessage>(`/api/lms/student/chats/${roomId}/messages`, {
    messageText,
  });
  return normalizeMessage(res.data);
};

export const getChatUnreadCount = async (): Promise<number> => {
  const res = await api.get<{ count: number }>("/api/lms/student/chats/unread-count");
  return res.data.count ?? 0;
};
