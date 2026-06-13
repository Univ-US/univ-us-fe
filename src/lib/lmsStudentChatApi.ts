// src/lib/lmsStudentChatApi.ts
// SLM-008 교수↔학생 채팅 — 수강 과목 교수와 과목별 1:1 채팅 (공지사항은 SLM-009)
// ─────────────────────────────────────────────────────────────
// 🧪 mock-first 단계(§15): BE 연동 전이라 명시적 샘플 데이터로 동작. 화면 상단 앰버 배너 표기.
// BE 연동 예정(WebSocket/STOMP): 좌측 채팅 목록(GET) + 방별 메시지(GET) + 실시간 송수신(/ws-univus).
//   · 수강 과목 교수만 표시 / 읽음 표시 / 파일 첨부 지원.
//   · 현재는 mock 데이터 + 로컬 상태(보낸 메시지는 화면에만 추가) — 실제 전송 없음.
// ⚠️ 연동 시 이 mock 블록 + delay 삭제, axios/STOMP 실연동으로 교체(시그니처 유지) + describeApiError.
// ─────────────────────────────────────────────────────────────

/** 좌측 채팅 목록 1건(교수 1명 = 과목 1개) */
export interface ChatRoom {
  roomId: number;
  professorName: string;
  courseName: string;
  lastMessage: string;
  lastTime: string; // "11:12" / "어제" / "05.22"
  unread: number;
  avatarInitial: string;
  avatarColor: string; // tailwind bg 클래스
}

/** 메시지 1건 */
export interface ChatMessage {
  id: number;
  sender: "me" | "professor";
  text: string;
  time: string; // "오전 11:12"
  read?: boolean; // 내 메시지 읽음 여부
}

/** 한 채팅방의 대화(날짜 라벨 + 메시지) */
export interface ChatThread {
  roomId: number;
  dateLabel: string; // "2026년 5월 25일"
  messages: ChatMessage[];
}

// ── mock 데이터 (설계서 SLM-008 기준) — BE 연동 시 이 블록 + delay 삭제 ──
const MOCK_ROOMS: ChatRoom[] = [
  { roomId: 1, professorName: "이민준", courseName: "데이터구조 및 알고리즘", lastMessage: "O(n log n) 이하가 기준입니다. 슬라이드 7페이지 참고해 주세요!", lastTime: "11:12", unread: 1, avatarInitial: "이", avatarColor: "bg-emerald-600" },
  { roomId: 2, professorName: "박성훈", courseName: "운영체제", lastMessage: "다음 주 강의 자료 올려드렸어요. 미리 확인 부탁드립니다.", lastTime: "어제", unread: 1, avatarInitial: "박", avatarColor: "bg-blue-500" },
  { roomId: 3, professorName: "김태경", courseName: "소프트웨어공학", lastMessage: "UML 제출 마감 꼭 지켜주세요.", lastTime: "05.22", unread: 0, avatarInitial: "김", avatarColor: "bg-orange-500" },
  { roomId: 4, professorName: "최영수", courseName: "데이터베이스", lastMessage: "ERD 과제 질문은 언제든 환영입니다.", lastTime: "05.19", unread: 0, avatarInitial: "최", avatarColor: "bg-purple-500" },
  { roomId: 5, professorName: "이수진", courseName: "웹프로그래밍", lastMessage: "React 과제 잘 봤습니다. 수고했어요.", lastTime: "05.18", unread: 0, avatarInitial: "이", avatarColor: "bg-emerald-600" },
];

const MOCK_THREADS: Record<number, ChatThread> = {
  1: {
    roomId: 1,
    dateLabel: "2026년 5월 25일",
    messages: [
      { id: 1, sender: "professor", text: "안녕하세요. 과제 관련 질문이 있으면 언제든 말씀해주세요 😊", time: "오전 10:32" },
      { id: 2, sender: "me", text: "교수님, 3번 과제에서 시간복잡도 기준이 어떻게 되나요?", time: "오전 11:05", read: true },
      { id: 3, sender: "professor", text: "O(n log n) 이하가 기준입니다. 슬라이드 7페이지 참고해 주세요!", time: "오전 11:12" },
      { id: 4, sender: "me", text: "감사합니다! 확인해볼게요 😊", time: "오전 11:14", read: true },
    ],
  },
  2: {
    roomId: 2,
    dateLabel: "2026년 5월 24일",
    messages: [
      { id: 1, sender: "professor", text: "다음 주 강의 자료 올려드렸어요. 미리 확인 부탁드립니다.", time: "오후 4:20" },
    ],
  },
  3: {
    roomId: 3,
    dateLabel: "2026년 5월 22일",
    messages: [
      { id: 1, sender: "me", text: "교수님, UML 과제 제출 형식이 PDF만 가능한가요?", time: "오후 1:02", read: true },
      { id: 2, sender: "professor", text: "이미지도 가능합니다. UML 제출 마감 꼭 지켜주세요.", time: "오후 1:30" },
    ],
  },
  4: {
    roomId: 4,
    dateLabel: "2026년 5월 19일",
    messages: [
      { id: 1, sender: "professor", text: "ERD 과제 질문은 언제든 환영입니다.", time: "오전 9:48" },
    ],
  },
  5: {
    roomId: 5,
    dateLabel: "2026년 5월 18일",
    messages: [
      { id: 1, sender: "professor", text: "React 과제 잘 봤습니다. 수고했어요.", time: "오후 6:10" },
    ],
  },
};

const delay = <T,>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), 200));

/** GET — 채팅 목록(수강 과목 교수, 최근 메시지순) (현재 mock) */
export const getChatRooms = (): Promise<ChatRoom[]> => delay(MOCK_ROOMS);

/** GET — 특정 채팅방 대화 (현재 mock) */
export const getChatThread = (roomId: number): Promise<ChatThread> =>
  delay(MOCK_THREADS[roomId] ?? { roomId, dateLabel: "", messages: [] });
