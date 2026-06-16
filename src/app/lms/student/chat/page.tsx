"use client";

import { Client, type IStompSocket } from "@stomp/stompjs";
import { MessageCircle, RefreshCw, Send, Wifi, WifiOff } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import SockJS from "sockjs-client";

import { getApiErrorMessage } from "@/lib/apiError";
import {
  formatChatDateLabel,
  formatChatListTime,
  formatChatMessageTime,
  getChatRooms,
  getChatThread,
  LMS_STUDENT_CHAT_TOPIC_PREFIX,
  sendChatMessage,
  type ChatMessage,
  type ChatRoom,
  type ChatThread,
} from "@/lib/lmsStudentChatApi";
import { getWebSocketEndpointUrl } from "@/lib/realtime";
import { useLmsStudentChatStore } from "@/store/lms/lmsStudentChatStore";

type RealtimeStatus = "connected" | "disconnected";

function sortRooms(rooms: ChatRoom[]) {
  return [...rooms].sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

function applyMessageToRooms(rooms: ChatRoom[], message: ChatMessage, activeRoomId: number | null) {
  return sortRooms(
    rooms.map((room) => {
      if (room.roomId !== message.roomId) return room;
      const incomingUnread =
        message.sender !== "me" && message.roomId !== activeRoomId ? 1 : 0;

      return {
        ...room,
        lastMessage: message.text,
        lastAt: message.sentAt,
        unread: message.sender === "me" || message.roomId === activeRoomId ? 0 : room.unread + incomingUnread,
      };
    }),
  );
}

function normalizeMessageForRoom(message: ChatMessage, room: ChatRoom): ChatMessage {
  return {
    ...message,
    sender: message.senderLmsPrfId === room.studentLmsPrfId ? "me" : "professor",
  };
}

export default function StudentChatPage() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>("disconnected");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const loadUnreadCount = useLmsStudentChatStore((s) => s.loadUnreadCount);
  const setUnreadCount = useLmsStudentChatStore((s) => s.setUnreadCount);

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.roomId === selectedRoomId) ?? null,
    [rooms, selectedRoomId],
  );
  const totalUnread = useMemo(() => rooms.reduce((sum, room) => sum + room.unread, 0), [rooms]);

  const loadRooms = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = sortRooms(await getChatRooms());
      setRooms(data);
      setSelectedRoomId((current) => {
        if (current && data.some((room) => room.roomId === current)) return current;
        return data[0]?.roomId ?? null;
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
        const data = await getChatThread(roomId);
        setThread(data);
        setRooms((current) =>
          current.map((room) => (room.roomId === roomId ? { ...room, unread: 0 } : room)),
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
    (incoming: ChatMessage) => {
      const message =
        selectedRoom && selectedRoom.roomId === incoming.roomId
          ? normalizeMessageForRoom(incoming, selectedRoom)
          : incoming;

      setThread((current) => {
        if (!current || current.roomId !== message.roomId) return current;
        if (current.messages.some((item) => item.id === message.id)) return current;
        return {
          ...current,
          dateLabel: current.dateLabel || formatChatDateLabel(message.sentAt),
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
      debug: () => {},
      onConnect: () => {
        if (disposed) return;
        setRealtimeStatus("connected");
        client.subscribe(`${LMS_STUDENT_CHAT_TOPIC_PREFIX}/${selectedRoomId}`, (message) => {
          if (!message.body) return;
          try {
            const payload = normalizeMessageForRoom(
              JSON.parse(message.body) as ChatMessage,
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

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    const submitted = input;
    if (!selectedRoomId || !text || sending) return;

    setSending(true);
    setError("");
    try {
      const message = await sendChatMessage(selectedRoomId, text);
      appendMessage(message);
      setInput((current) => (current === submitted ? "" : current));
    } catch (sendError) {
      console.error(sendError);
      setError(getApiErrorMessage(sendError, "메시지 전송에 실패했습니다."));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">교수 채팅</h1>
          <p className="mt-1 text-sm text-slate-500">안읽은 메시지 {totalUnread}건</p>
        </div>
        <button
          type="button"
          onClick={() => void loadRooms()}
          disabled={loading}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 hover:border-emerald-500 hover:text-emerald-700 disabled:opacity-50"
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          새로고침
        </button>
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
          <p className="text-sm font-semibold text-slate-500">수강 중인 강의 채팅방이 없습니다.</p>
        </div>
      ) : (
        <div className="grid h-[70vh] grid-cols-1 gap-4 lg:grid-cols-[20rem_1fr]">
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
                      className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                        active ? "bg-emerald-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${room.avatarColor}`}
                      >
                        {room.avatarInitial}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-slate-800">
                            {room.professorName} 교수
                          </span>
                          <span className="shrink-0 text-[11px] text-slate-400">
                            {formatChatListTime(room.lastAt)}
                          </span>
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          {room.courseName}
                          {room.lecSection ? ` ${room.lecSection}반` : ""}
                        </span>
                        <span className="mt-0.5 flex items-center justify-between gap-2">
                          <span className="truncate text-xs text-slate-400">{room.lastMessage}</span>
                          {room.unread > 0 && (
                            <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
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
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${selectedRoom.avatarColor}`}
                  >
                    {selectedRoom.avatarInitial}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800">{selectedRoom.professorName} 교수</p>
                    <p className="truncate text-xs text-slate-500">
                      {selectedRoom.courseName}
                      {selectedRoom.lecSection ? ` ${selectedRoom.lecSection}반` : ""}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      realtimeStatus === "connected"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {realtimeStatus === "connected" ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
                    {realtimeStatus === "connected" ? "실시간" : "오프라인"}
                  </span>
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
                        message.sender === "professor" ? (
                          <div key={message.id} className="flex flex-col items-start">
                            <span className="mb-1 text-[11px] text-slate-400">
                              {selectedRoom.professorName} 교수
                            </span>
                            <div className="flex max-w-[85%] items-end gap-2">
                              <div className="rounded-2xl rounded-tl-sm bg-white px-3.5 py-2 text-sm text-slate-700 shadow-sm">
                                <p className="whitespace-pre-wrap break-words">{message.text}</p>
                              </div>
                              <span className="shrink-0 text-[11px] text-slate-400">
                                {formatChatMessageTime(message.sentAt)}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div key={message.id} className="flex justify-end">
                            <div className="flex max-w-[85%] items-end gap-2">
                              <span className="shrink-0 text-[11px] text-slate-400">
                                {message.read ? "읽음 " : ""}
                                {formatChatMessageTime(message.sentAt)}
                              </span>
                              <div className="rounded-2xl rounded-tr-sm bg-emerald-600 px-3.5 py-2 text-sm text-white shadow-sm">
                                <p className="whitespace-pre-wrap break-words">{message.text}</p>
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
                    className="min-h-10 flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-300 focus:border-emerald-500 focus:bg-white"
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
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    <Send className="size-4" />
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
