// src/types/lmsProfessorChat.ts
// 교수 채팅(PLM 채팅) 타입 선언 (lmsProfessorChatApi.ts에서 분리)

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
