import api from "@/lib/api";
import {
  formatChatDateLabel,
  formatChatListTime,
  formatChatMessageTime,
} from "@/lib/lmsStudentChatApi";

export interface ProfessorChatRoom {
  roomId: number;
  lecId: number;
  studentLmsPrfId: number;
  professorLmsPrfId: number;
  studentName: string;
  studentNo: string | null;
  courseName: string;
  lecSection: number | null;
  lastMessage: string;
  lastAt: string;
  unread: number;
  avatarInitial: string;
  avatarColor: string;
}

export interface ProfessorChatMessage {
  messageId: number;
  roomId: number;
  senderLmsPrfId: number;
  sender: "me" | "student";
  chtRomMsgContent: string;
  chtRomMsgDate: string;
  read?: boolean;
}

export interface ProfessorChatThread {
  roomId: number;
  dateLabel: string;
  messages: ProfessorChatMessage[];
}

const avatarColors = [
  "bg-slate-700",
  "bg-emerald-700",
  "bg-blue-700",
  "bg-violet-700",
  "bg-rose-700",
  "bg-cyan-700",
];

export const LMS_PROFESSOR_CHAT_TOPIC_PREFIX = "/sub/lms-chats";
export { formatChatDateLabel, formatChatListTime, formatChatMessageTime };

const normalizeRoom = (
  room: Omit<ProfessorChatRoom, "avatarInitial" | "avatarColor">,
): ProfessorChatRoom => {
  const studentName = room.studentName?.trim() || "학생";
  const seed = studentName.charCodeAt(0) + room.roomId;

  return {
    ...room,
    studentName,
    studentNo: room.studentNo ?? null,
    courseName: room.courseName ?? "",
    lecSection: room.lecSection ?? null,
    lastMessage: room.lastMessage || "아직 메시지가 없습니다.",
    unread: room.unread ?? 0,
    avatarInitial: studentName[0] ?? "학",
    avatarColor: avatarColors[Math.abs(seed) % avatarColors.length],
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
