import api from "@/lib/api";
import { getLmsAvatarColor, getLmsAvatarInitial } from "@/lib/lmsAvatar";
import {
  formatChatDateLabel,
  formatChatListTime,
  formatChatMessageTime,
} from "@/lib/lmsStudentChatApi";
import type {
  ProfessorChatMessage,
  ProfessorChatRoom,
  ProfessorChatThread,
} from "@/types/lmsProfessorChat";

export const LMS_PROFESSOR_CHAT_TOPIC_PREFIX = "/sub/lms-chats";
export { formatChatDateLabel, formatChatListTime, formatChatMessageTime };

const normalizeRoom = (
  room: Omit<ProfessorChatRoom, "avatarInitial" | "avatarColor">,
): ProfessorChatRoom => {
  const studentName = room.studentName?.trim() || "학생";

  return {
    ...room,
    studentName,
    studentNo: room.studentNo ?? null,
    courseName: room.courseName ?? "",
    lecSection: room.lecSection ?? null,
    lastMessage: room.lastMessage || "아직 메시지가 없습니다.",
    unread: room.unread ?? 0,
    avatarInitial: getLmsAvatarInitial(studentName, "학"),
    // 같은 학생은 어느 화면에서나 같은 색 → 학번(studentNo)으로 시드(없으면 이름)
    avatarColor: getLmsAvatarColor(room.studentNo ?? studentName),
  };
};

const normalizeMessage = (message: ProfessorChatMessage): ProfessorChatMessage => ({
  ...message,
  chtRomMsgContent: message.chtRomMsgContent ?? "",
  read: Boolean(message.read),
});

export const normalizeProfessorMessageForRoom = (
  message: ProfessorChatMessage,
  room: ProfessorChatRoom,
): ProfessorChatMessage => ({
  ...normalizeMessage(message),
  sender: message.senderLmsPrfId === room.professorLmsPrfId ? "me" : "student",
});

export const getProfessorChatRooms = async (): Promise<ProfessorChatRoom[]> => {
  const res = await api.get<Omit<ProfessorChatRoom, "avatarInitial" | "avatarColor">[]>(
    "/api/lms/professor/chats",
  );
  return (res.data ?? []).map(normalizeRoom);
};

export const getProfessorChatThread = async (roomId: number): Promise<ProfessorChatThread> => {
  const res = await api.get<ProfessorChatThread>(`/api/lms/professor/chats/${roomId}`);
  return {
    roomId: res.data.roomId,
    dateLabel: res.data.dateLabel ?? "",
    messages: (res.data.messages ?? []).map(normalizeMessage),
  };
};

export const sendProfessorChatMessage = async (
  roomId: number,
  messageText: string,
): Promise<ProfessorChatMessage> => {
  const res = await api.post<ProfessorChatMessage>(`/api/lms/professor/chats/${roomId}/messages`, {
    messageText,
  });
  return normalizeMessage(res.data);
};

export const getProfessorChatUnreadCount = async (): Promise<number> => {
  const res = await api.get<{ count: number }>("/api/lms/professor/chats/unread-count");
  return res.data.count ?? 0;
};
