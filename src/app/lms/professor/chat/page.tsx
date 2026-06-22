"use client";

import { Client, type IStompSocket } from "@stomp/stompjs";
import { MessageCircle, Plus, RefreshCw, Send, Trash2, Wifi, WifiOff } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import SockJS from "sockjs-client";

import { getApiErrorMessage } from "@/lib/apiError";
import {
  deleteProfessorChatRoom,
  formatChatDateLabel,
  formatChatListTime,
  formatChatMessageTime,
  getProfessorChatRooms,
  getProfessorChatThread,
  getProfessorStartableChatRooms,
  LMS_PROFESSOR_CHAT_TOPIC_PREFIX,
  normalizeProfessorMessageForRoom,
  sendProfessorChatMessage,
} from "@/lib/lmsProfessorChatApi";
import { getWebSocketEndpointUrl } from "@/lib/realtime";
import { useLmsProfessorChatStore } from "@/store/lms/lmsProfessorChatStore";
import type {
  ProfessorChatMessage,
  ProfessorChatRoom,
  ProfessorChatThread,
} from "@/types/lmsProfessorChat";
import useEscapeClose from "@/components/lms/useEscapeClose";
import { getCommonCodeList } from "@/lib/lmsCommonCode";
import { resolveImageUrl } from "@/lib/lmsProfessorStudentsApi";

type RealtimeStatus = "connected" | "disconnected";

const NEW_CHAT_SELECT_CLASS =
  "h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500";
const STUDENT_PAGE_SIZE = 5; // '채팅 만들기' 수강생 클릭 리스트 한 페이지당 표시 인원

function sortRooms(rooms: ProfessorChatRoom[]) {
  return [...rooms].sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

function applyMessageToRooms(
  rooms: ProfessorChatRoom[],
  message: ProfessorChatMessage,
  activeRoomId: number | null,
) {
  return sortRooms(
    rooms.map((room) => {
      if (room.roomId !== message.roomId) return room;
      const incomingUnread =
        message.sender !== "me" && message.roomId !== activeRoomId ? 1 : 0;

      return {
        ...room,
        lastMessage: message.chtRomMsgContent,
        lastAt: message.chtRomMsgDate,
        unread: message.sender === "me" || message.roomId === activeRoomId
          ? 0
          : room.unread + incomingUnread,
      };
    }),
  );
}

export default function ProfessorChatPage() {
  const [rooms, setRooms] = useState<ProfessorChatRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [thread, setThread] = useState<ProfessorChatThread | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>("disconnected");
  const [createOpen, setCreateOpen] = useState(false); // '채팅 만들기' 모달 열림
  const [deleteOpen, setDeleteOpen] = useState(false); // 채팅방 삭제 확인 모달
  const [deleting, setDeleting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const loadUnreadCount = useLmsProfessorChatStore((s) => s.loadUnreadCount);
  const setUnreadCount = useLmsProfessorChatStore((s) => s.setUnreadCount);

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.roomId === selectedRoomId) ?? null,
    [rooms, selectedRoomId],
  );
  const totalUnread = useMemo(() => rooms.reduce((sum, room) => sum + room.unread, 0), [rooms]);

  const loadRooms = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = sortRooms(await getProfessorChatRooms());
      setRooms(data);
      setSelectedRoomId((current) => {
        // 새로고침 시 보던 방은 유지하되 첫 진입은 자동 선택하지 않음
        // (자동 선택하면 loadThread가 해당 방을 읽음 처리 → 페이지 진입만으로 읽음되는 문제 방지)
        if (current && data.some((room) => room.roomId === current)) return current;
        return null;
      });
      setUnreadCount(data.reduce((sum, room) => sum + room.unread, 0));
    } catch (loadError) {
      console.error(loadError);
      setRooms([]);
      setSelectedRoomId(null);
      setError(getApiErrorMessage(loadError, "채팅 목록을 불러오지 못했습니다."));
    } finally {
      setLoading(false);
    }
  }, [setUnreadCount]);

  const loadThread = useCallback(
    async (roomId: number) => {
      setThreadLoading(true);
      setError("");
      try {
        const data = await getProfessorChatThread(roomId);
        setThread(data);
        setRooms((current) =>
          current.map((item) => (item.roomId === roomId ? { ...item, unread: 0 } : item)),
        );
        void loadUnreadCount();
      } catch (loadError) {
        console.error(loadError);
        setThread(null);
        setError(getApiErrorMessage(loadError, "채팅 메시지를 불러오지 못했습니다."));
      } finally {
        setThreadLoading(false);
      }
    },
    [loadUnreadCount],
  );

  const appendMessage = useCallback(
    (incoming: ProfessorChatMessage) => {
      const message =
        selectedRoom && selectedRoom.roomId === incoming.roomId
          ? normalizeProfessorMessageForRoom(incoming, selectedRoom)
          : incoming;

      setThread((current) => {
        if (!current || current.roomId !== message.roomId) return current;
        if (current.messages.some((item) => item.messageId === message.messageId)) return current;
        return {
          ...current,
          dateLabel: current.dateLabel || formatChatDateLabel(message.chtRomMsgDate),
          messages: [...current.messages, message],
        };
      });
      setRooms((current) => applyMessageToRooms(current, message, selectedRoomId));
      void loadUnreadCount();
    },
    [loadUnreadCount, selectedRoom, selectedRoomId],
  );

  useEffect(() => {
    void loadRooms();
  }, [loadRooms]);

  useEffect(() => {
    if (selectedRoomId == null) {
      setThread(null);
      return;
    }
    void loadThread(selectedRoomId);
  }, [loadThread, selectedRoomId]);

  useEffect(() => {
    if (selectedRoomId == null || !selectedRoom) {
      setRealtimeStatus("disconnected");
      return;
    }

    let disposed = false;
    const client = new Client({
      webSocketFactory: () =>
        new SockJS(getWebSocketEndpointUrl()) as unknown as IStompSocket,
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: () => { },
      onConnect: () => {
        if (disposed) return;
        setRealtimeStatus("connected");
        client.subscribe(`${LMS_PROFESSOR_CHAT_TOPIC_PREFIX}/${selectedRoomId}`, (message) => {
          if (!message.body) return;
          try {
            const payload = normalizeProfessorMessageForRoom(
              JSON.parse(message.body) as ProfessorChatMessage,
              selectedRoom,
            );
            if (payload.sender !== "me") {
              void loadThread(selectedRoomId);
            } else {
              appendMessage(payload);
            }
          } catch {
            // Ignore malformed realtime payloads.
          }
        });
      },
      onDisconnect: () => setRealtimeStatus("disconnected"),
      onStompError: () => setRealtimeStatus("disconnected"),
      onWebSocketClose: () => setRealtimeStatus("disconnected"),
      onWebSocketError: () => setRealtimeStatus("disconnected"),
    });

    client.activate();

    return () => {
      disposed = true;
      setRealtimeStatus("disconnected");
      void client.deactivate();
    };
  }, [appendMessage, loadThread, selectedRoom, selectedRoomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [thread?.messages, selectedRoomId]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [selectedRoomId]);

  useEscapeClose(createOpen, () => setCreateOpen(false)); // ESC = 모달 닫기
  useEscapeClose(deleteOpen, () => !deleting && setDeleteOpen(false));

  // '채팅 만들기'에서 고른 (빈) 방을 목록에 추가하고 선택 → 우측 패널에서 첫 메시지 전송 (학생 페이지와 동일)
  const handleStartChat = useCallback((room: ProfessorChatRoom) => {
    setRooms((prev) =>
      prev.some((r) => r.roomId === room.roomId) ? prev : sortRooms([room, ...prev]),
    );
    setSelectedRoomId(room.roomId);
    setCreateOpen(false);
  }, []);

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    const submitted = input;
    if (!selectedRoomId || !selectedRoom || !text || sending) return;

    setSending(true);
    setError("");
    try {
      const message = await sendProfessorChatMessage(selectedRoomId, text);
      appendMessage(normalizeProfessorMessageForRoom(message, selectedRoom));
      setInput((current) => (current === submitted ? "" : current));
    } catch (sendError) {
      console.error(sendError);
      setError(getApiErrorMessage(sendError, "메시지 전송에 실패했습니다."));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  async function handleDeleteRoom() {
    if (!selectedRoomId || deleting) return;
    setDeleting(true);
    setError("");
    try {
      await deleteProfessorChatRoom(selectedRoomId);
      setRooms((prev) => prev.filter((room) => room.roomId !== selectedRoomId));
      setSelectedRoomId(null);
      setThread(null);
      setDeleteOpen(false);
      void loadUnreadCount();
    } catch (deleteError) {
      console.error(deleteError);
      setError(getApiErrorMessage(deleteError, "채팅방을 삭제하지 못했습니다."));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">학생 채팅</h1>
          <p className="mt-1 text-sm text-slate-500">안읽은 메시지 {totalUnread}건</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadRooms()}
            disabled={loading}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 hover:border-slate-500 hover:text-slate-900 disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            새로고침
          </button>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-800 px-3 text-sm font-semibold text-white hover:bg-slate-700"
          >
            <Plus className="size-4" />
            채팅 만들기
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-500">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-[62vh] items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-400">
          채팅 목록을 불러오는 중입니다.
        </div>
      ) : rooms.length === 0 ? (
        <div className="flex h-[62vh] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white text-center">
          <MessageCircle className="mb-3 size-8 text-slate-300" />
          <p className="text-sm font-semibold text-slate-500">담당 강의의 학생 채팅방이 없습니다.</p>
        </div>
      ) : (
        <div className="grid h-[70vh] grid-cols-1 gap-4 lg:grid-cols-[21rem_1fr]">
          <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-bold text-slate-800">채팅 목록</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                {rooms.length}
              </span>
            </div>
            <ul className="min-h-0 flex-1 overflow-y-auto p-2">
              {rooms.map((room) => {
                const active = room.roomId === selectedRoomId;
                return (
                  <li key={room.roomId}>
                    <button
                      type="button"
                      onClick={() => setSelectedRoomId(room.roomId)}
                      className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${active ? "bg-slate-100" : "hover:bg-slate-50"
                        }`}
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-semibold text-white ${room.avatarColor}`}
                      >
                        {resolveImageUrl(room.studentImageUrl) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={resolveImageUrl(room.studentImageUrl)!} alt={room.studentName} className="h-full w-full object-cover" />
                        ) : (
                          room.avatarInitial
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-slate-800">
                            {room.studentName}
                          </span>
                          <span className="shrink-0 text-[11px] text-slate-400">
                            {formatChatListTime(room.lastAt)}
                          </span>
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          {room.studentNo ? `${room.studentNo} · ` : ""}
                          {room.courseName}
                          {room.lecSection ? ` ${room.lecSection}반` : ""}
                        </span>
                        <span className="mt-0.5 flex items-center justify-between gap-2">
                          <span className="truncate text-xs text-slate-400">{room.lastMessage}</span>
                          {room.unread > 0 && (
                            <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                              {room.unread}
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {!selectedRoom ? (
              <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
                왼쪽에서 채팅방을 선택해주세요.
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-semibold text-white ${selectedRoom.avatarColor}`}
                  >
                    {resolveImageUrl(selectedRoom.studentImageUrl) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={resolveImageUrl(selectedRoom.studentImageUrl)!} alt={selectedRoom.studentName} className="h-full w-full object-cover" />
                    ) : (
                      selectedRoom.avatarInitial
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800">{selectedRoom.studentName}</p>
                    <p className="truncate text-xs text-slate-500">
                      {selectedRoom.studentNo ? `${selectedRoom.studentNo} · ` : ""}
                      {selectedRoom.courseName}
                      {selectedRoom.lecSection ? ` ${selectedRoom.lecSection}반` : ""}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${realtimeStatus === "connected"
                      ? "bg-primary/5 text-primary"
                      : "bg-slate-100 text-slate-400"
                      }`}
                  >
                    {realtimeStatus === "connected" ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
                    {realtimeStatus === "connected" ? "실시간" : "오프라인"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDeleteOpen(true)}
                    aria-label="채팅방 삭제"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 px-5 py-4">
                  {threadLoading ? (
                    <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-400">
                      메시지를 불러오는 중입니다.
                    </div>
                  ) : !thread || thread.messages.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-center text-sm font-semibold text-slate-400">
                      첫 메시지를 보내보세요.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {thread.dateLabel && (
                        <p className="pb-1 text-center text-xs text-slate-400">{thread.dateLabel}</p>
                      )}
                      {thread.messages.map((message) =>
                        message.sender === "student" ? (
                          <div key={message.messageId} className="flex flex-col items-start">
                            <span className="mb-1 text-[11px] text-slate-400">
                              {selectedRoom.studentName}
                            </span>
                            <div className="flex max-w-[85%] items-end gap-2">
                              <div className="rounded-2xl rounded-tl-sm bg-white px-3.5 py-2 text-sm text-slate-700 shadow-sm">
                                <p className="whitespace-pre-wrap break-words">{message.chtRomMsgContent}</p>
                              </div>
                              <span className="shrink-0 text-[11px] text-slate-400">
                                {formatChatMessageTime(message.chtRomMsgDate)}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div key={message.messageId} className="flex justify-end">
                            <div className="flex max-w-[85%] items-end gap-2">
                              <span className="shrink-0 text-[11px] text-slate-400">
                                {message.read ? "읽음 " : ""}
                                {formatChatMessageTime(message.chtRomMsgDate)}
                              </span>
                              <div className="rounded-2xl rounded-tr-sm bg-slate-800 px-3.5 py-2 text-sm text-white shadow-sm">
                                <p className="whitespace-pre-wrap break-words">{message.chtRomMsgContent}</p>
                              </div>
                            </div>
                          </div>
                        ),
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                <form onSubmit={handleSend} className="flex items-end gap-2 border-t border-slate-100 px-4 py-3">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    rows={1}
                    maxLength={1000}
                    placeholder="메시지를 입력하세요."
                    className="min-h-10 flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-300 focus:border-slate-500 focus:bg-white"
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                        event.preventDefault();
                        event.currentTarget.form?.requestSubmit();
                      }
                    }}
                  />
                  <button
                    type="submit"
                    onMouseDown={(event) => event.preventDefault()}
                    disabled={!input.trim() || sending}
                    aria-label="메시지 보내기"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800 text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    <Send className="size-4" />
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
      )}

      {/* '채팅 만들기' 모달 — 담당 강의 수강생 중 아직 대화 안 한 학생에게 첫 메시지(년도/학기 + 과목 + 수강생 클릭 리스트) */}
      {createOpen && (
        <NewChatModal onClose={() => setCreateOpen(false)} onStart={handleStartChat} />
      )}

      {/* 채팅방 삭제 확인 모달 (소프트 삭제 — CHT_ROM_VAL_STATUS DEL) */}
      {deleteOpen && selectedRoom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="채팅방 삭제"
          onClick={() => !deleting && setDeleteOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-rose-50">
              <Trash2 className="size-5 text-rose-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">채팅방을 삭제할까요?</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
              <b className="font-semibold text-slate-700">{selectedRoom.studentName}</b> 학생과의 채팅방과
              대화 내용이 사라집니다. 삭제 후에도 &lsquo;채팅 만들기&rsquo;로 다시 대화를 시작할 수 있습니다.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                disabled={deleting}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteRoom()}
                disabled={deleting}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? "삭제 중…" : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// '채팅 만들기' 모달 — 담당 강의 수강생 중 아직 대화 안 한 (강의,학생) 빈 방(GET /api/lms/professor/chats/startable, NOT EXISTS(messages)).
// PLM 필터 패턴: 년도/학기 + 과목 드롭다운(첫 강의 자동선택) → 그 강의 수강생을 '클릭 선택 리스트'(한 페이지 5명·페이지네이션)에서 골라 채팅 시작.
// (학생 모달은 과목=교수 1:1이라 드롭다운이지만, 교수 모달은 과목 안에서 학생까지 골라야 해 리스트 클릭 방식.)
// 선택 시 onStart로 그 (이미 생성된) 빈 방을 넘겨 목록 추가+선택 → 우측 패널에서 첫 메시지 전송.
function NewChatModal({
  onClose,
  onStart,
}: {
  onClose: () => void;
  onStart: (room: ProfessorChatRoom) => void;
}) {
  const [candidates, setCandidates] = useState<ProfessorChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [termMap, setTermMap] = useState<Record<string, string>>({});
  const [termOrder, setTermOrder] = useState<string[]>([]);
  const [yearFilter, setYearFilter] = useState<number | "all">("all");
  const [termFilter, setTermFilter] = useState<string | "all">("all");
  const [selLecId, setSelLecId] = useState<number | null>(null);
  const [selRoomId, setSelRoomId] = useState<number | null>(null);
  const [studentPage, setStudentPage] = useState(0); // 수강생 리스트 페이지(0-based)

  // 후보 = 담당 강의 수강생 중 아직 대화 안 한 (강의,학생) 빈 방
  useEffect(() => {
    let active = true;
    setLoading(true);
    getProfessorStartableChatRooms()
      .then((data) => {
        if (active) setCandidates(data);
      })
      .catch((e) => {
        if (active) setError(getApiErrorMessage(e, "대화 가능한 수강생을 불러오지 못했습니다."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // 학기 라벨·순서 = 공통코드(SEM_TERM) — 하드코딩 금지
  useEffect(() => {
    void getCommonCodeList("SEM_TERM").then((list) => {
      setTermOrder(list.map((c) => c.codeVal));
      setTermMap(Object.fromEntries(list.map((c) => [c.codeVal, c.codeName])));
    });
  }, []);

  const yearOptions = useMemo(
    () =>
      [...new Set(candidates.map((c) => c.semYear).filter((y): y is number => y != null))].sort(
        (a, b) => b - a,
      ),
    [candidates],
  );
  // 학기 옵션 = 공통코드 순서(CODE_ORDER) 중 후보에 존재하는 학기만
  const termOptions = useMemo(
    () => termOrder.filter((code) => candidates.some((c) => c.semTerm === code)),
    [termOrder, candidates],
  );
  const filtered = useMemo(
    () =>
      candidates.filter(
        (c) =>
          (yearFilter === "all" || c.semYear === yearFilter) &&
          (termFilter === "all" || c.semTerm === termFilter),
      ),
    [candidates, yearFilter, termFilter],
  );
  // 과목(강의) 옵션 = 거른 후보의 distinct 강의(lecId)
  const courseOptions = useMemo(() => {
    const seen = new Map<number, ProfessorChatRoom>();
    filtered.forEach((c) => {
      if (!seen.has(c.lecId)) seen.set(c.lecId, c);
    });
    return [...seen.values()];
  }, [filtered]);

  // 첫 강의 자동선택 — 필터 변경 시 재선택
  useEffect(() => {
    setSelLecId((prev) =>
      courseOptions.some((c) => c.lecId === prev) ? prev : courseOptions[0]?.lecId ?? null,
    );
  }, [courseOptions]);

  // 선택 강의의 수강생
  const students = useMemo(
    () => filtered.filter((c) => c.lecId === selLecId),
    [filtered, selLecId],
  );
  // 첫 학생 자동선택 — 강의 변경 시 재선택
  useEffect(() => {
    setSelRoomId((prev) =>
      students.some((s) => s.roomId === prev) ? prev : students[0]?.roomId ?? null,
    );
  }, [students]);
  // 강의/필터 변경 시 수강생 리스트 1페이지로 복귀
  useEffect(() => {
    setStudentPage(0);
  }, [students]);

  // 수강생 페이지네이션 (한 페이지 5명)
  const totalPages = Math.max(1, Math.ceil(students.length / STUDENT_PAGE_SIZE));
  const page = Math.min(studentPage, totalPages - 1); // 삭제 등으로 범위 벗어나면 클램프
  const pagedStudents = students.slice(
    page * STUDENT_PAGE_SIZE,
    page * STUDENT_PAGE_SIZE + STUDENT_PAGE_SIZE,
  );

  const selected = students.find((s) => s.roomId === selRoomId) ?? null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="새 채팅 시작"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">새 채팅 시작</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>
        <p className="mb-4 text-sm text-slate-500">
          담당 강의의 수강생에게 먼저 채팅을 보낼 수 있습니다.
        </p>

        {error && (
          <p className="mb-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-500">
            {error}
          </p>
        )}

        {loading ? (
          <p className="py-10 text-center text-sm text-slate-400">불러오는 중입니다.</p>
        ) : candidates.length === 0 ? (
          <p className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-8 text-center text-sm text-slate-400">
            새로 시작할 수 있는 채팅이 없습니다.
            <br />
            (담당 강의 수강생 전원과 이미 대화 중이거나, 수강생이 없습니다.)
          </p>
        ) : (
          <>
            {/* 년도 / 학기 필터 */}
            <div className="mb-3 flex flex-wrap gap-2">
              <select
                value={yearFilter === "all" ? "" : String(yearFilter)}
                onChange={(e) =>
                  setYearFilter(e.target.value === "" ? "all" : Number(e.target.value))
                }
                className={`${NEW_CHAT_SELECT_CLASS} w-28`}
              >
                <option value="">전체 연도</option>
                {yearOptions.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}년
                  </option>
                ))}
              </select>
              <select
                value={termFilter === "all" ? "" : termFilter}
                onChange={(e) => setTermFilter(e.target.value === "" ? "all" : e.target.value)}
                className={`${NEW_CHAT_SELECT_CLASS} w-32`}
              >
                <option value="">전체 학기</option>
                {termOptions.map((t) => (
                  <option key={t} value={t}>
                    {termMap[t] ?? t}
                  </option>
                ))}
              </select>
            </div>

            {/* 과목(강의) 드롭다운 — 첫 강의 자동선택 */}
            <select
              value={selLecId == null ? "" : String(selLecId)}
              onChange={(e) => setSelLecId(e.target.value === "" ? null : Number(e.target.value))}
              disabled={courseOptions.length === 0}
              className={`${NEW_CHAT_SELECT_CLASS} mb-3 w-full disabled:cursor-not-allowed disabled:bg-slate-100`}
            >
              {courseOptions.length === 0 ? (
                <option value="">담당 강의 없음</option>
              ) : (
                courseOptions.map((c) => (
                  <option key={c.lecId} value={String(c.lecId)}>
                    {c.courseName}
                    {c.lecSection ? ` ${c.lecSection}반` : ""}
                  </option>
                ))
              )}
            </select>

            {/* 수강생 = 클릭 선택 리스트 (한 페이지 5명, 클릭 시 선택) */}
            <p className="mb-1 text-xs font-semibold text-slate-500">수강생 {students.length}명</p>
            <div className="rounded-xl border border-slate-200 p-1">
              {students.length === 0 ? (
                <p className="px-3 py-10 text-center text-sm text-slate-400">
                  선택한 조건에 채팅 가능한 학생이 없습니다.
                </p>
              ) : (
                <ul>
                  {pagedStudents.map((s) => {
                    const active = s.roomId === selRoomId;
                    return (
                      <li key={s.roomId}>
                        <button
                          type="button"
                          onClick={() => setSelRoomId(s.roomId)}
                          aria-pressed={active}
                          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition ${
                            active ? "bg-slate-100 ring-1 ring-slate-400" : "hover:bg-slate-50"
                          }`}
                        >
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold text-white ${s.avatarColor}`}
                          >
                            {resolveImageUrl(s.studentImageUrl) ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={resolveImageUrl(s.studentImageUrl)!} alt={s.studentName} className="h-full w-full object-cover" />
                            ) : (
                              s.avatarInitial
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-800">
                              {s.studentName}
                            </p>
                            <p className="truncate text-xs text-slate-500">{s.studentNo}</p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                  {/* 마지막 페이지 빈 행 패딩 — 인원 수와 무관하게 모달 높이 고정 */}
                  {Array.from({ length: STUDENT_PAGE_SIZE - pagedStudents.length }).map((_, i) => (
                    <li key={`pad-${i}`} aria-hidden className="px-3 py-2">
                      <div className="h-9" />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 페이지네이션 — 한 페이지 5명 */}
            <div className="mb-4 mt-2 flex items-center justify-center gap-4 text-sm">
              <button
                type="button"
                onClick={() => setStudentPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                aria-label="이전 페이지"
                className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
              >
                ‹
              </button>
              <span className="tabular-nums text-slate-500">
                {page + 1} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setStudentPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                aria-label="다음 페이지"
                className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
              >
                ›
              </button>
            </div>

            <button
              type="button"
              onClick={() => selected && onStart(selected)}
              disabled={!selected}
              className="w-full rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              채팅 시작
            </button>
          </>
        )}
      </div>
    </div>
  );
}
