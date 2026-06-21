import api from "@/lib/api";
import { getLmsAvatarColor, getLmsAvatarInitial } from "@/lib/lmsAvatar";
import type { ChatRoom, ChatMessage, ChatThread } from "@/types/lmsStudentChat";

// 타입은 src/types/lmsStudentChat.ts로 분리 — 기존 소비처가 이 lib에서 type import하던 호환 유지(re-export)
export type { ChatRoom, ChatMessage, ChatThread } from "@/types/lmsStudentChat";

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

  return {
    ...room,
    professorName,
    courseName: room.courseName ?? "",
    lecSection: room.lecSection ?? null,
    lastMessage: room.lastMessage || "아직 메시지가 없습니다.",
    unread: room.unread ?? 0,
    avatarInitial: getLmsAvatarInitial(professorName, "교"),
    // 같은 교수는 어느 화면에서나 같은 색 → 교수 식별자(professorLmsPrfId)로 시드
    avatarColor: getLmsAvatarColor(room.professorLmsPrfId),
  };
};

const normalizeMessage = (message: ChatMessage): ChatMessage => ({
  ...message,
  chtRomMsgContent: message.chtRomMsgContent ?? "",
  read: Boolean(message.read),
});

export const getChatRooms = async (): Promise<ChatRoom[]> => {
  const res = await api.get<Omit<ChatRoom, "avatarInitial" | "avatarColor">[]>("/api/lms/student/chats");
  return (res.data ?? []).map(normalizeRoom);
};

// '채팅 만들기' 후보 — 수강 중이나 아직 대화 안 한 과목 방(BE: NOT EXISTS(messages)). semYear/semTerm 포함(년도/학기 필터용)
export const getStartableChatRooms = async (): Promise<ChatRoom[]> => {
  const res = await api.get<Omit<ChatRoom, "avatarInitial" | "avatarColor">[]>(
    "/api/lms/student/chats/startable",
  );
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

// 채팅방 소프트 삭제 (CHAT_ROOM.CHT_ROM_VAL_STATUS → 'DEL'). 방은 교수·학생 공유라 양쪽에서 사라짐.
export const deleteChatRoom = async (roomId: number): Promise<void> => {
  await api.delete(`/api/lms/student/chats/${roomId}`);
};
