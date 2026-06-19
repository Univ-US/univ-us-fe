// src/types/lmsStudentChat.ts
// SLM-008 학생 채팅 타입 선언 (lmsStudentChatApi.ts에서 분리)

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
  messageId: number;
  roomId: number;
  senderLmsPrfId: number;
  sender: "me" | "professor";
  chtRomMsgContent: string;
  chtRomMsgDate: string;
  read?: boolean;
}

export interface ChatThread {
  roomId: number;
  dateLabel: string;
  messages: ChatMessage[];
}
