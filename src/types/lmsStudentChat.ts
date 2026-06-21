// src/types/lmsStudentChat.ts
// SLM-008 학생 채팅 타입 선언 (lmsStudentChatApi.ts에서 분리)

export interface ChatRoom {
  roomId: number;
  lecId: number;
  studentLmsPrfId: number;
  professorLmsPrfId: number;
  professorName: string;
  professorImageUrl?: string | null;
  courseName: string;
  lecSection: number | null;
  lastMessage: string;
  lastAt: string;
  unread: number;
  avatarInitial: string;
  avatarColor: string;
  semYear?: number | null; // '채팅 만들기'(startable) 응답에만 채워짐 — 년도/학기 필터용
  semTerm?: string | null; // SEM_TERM 코드(공통코드)
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
