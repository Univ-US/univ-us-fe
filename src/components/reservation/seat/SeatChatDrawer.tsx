'use client';

import { Client, type IStompSocket } from '@stomp/stompjs';
import {
  MessageCircle,
  Minus,
  RefreshCw,
  Send,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import SockJS from 'sockjs-client';

import { getApiErrorMessage } from '@/lib/apiError';
import { getWebSocketEndpointUrl } from '@/lib/realtime';
import {
  createOrGetSeatChatRoom,
  getSeatChatContext,
  getSeatChatMessages,
  markSeatChatMessagesRead,
  sendSeatChatMessage,
  type ActiveSeatReservation,
  type ReadingSeatAvailability,
  type SeatChatMessage,
  type SeatChatRoom,
} from '@/lib/reservationApi';
import { cn } from '@/lib/utils';
import { useSeatChatNotificationStore } from '@/store/reservation/seatChatNotificationStore';
import { formatIsoTime, formatReservationPeriod } from '../reservationUtils';

type SeatChatDrawerProps = {
  open: boolean;
  targetSeat: ReadingSeatAvailability | null;
  initialRoomId?: number | null;
  activationId?: number;
  onClose: () => void;
};

type RealtimeStatus = 'connected' | 'disconnected';

function sortRoomsByRecentMessage(rooms: SeatChatRoom[]) {
  return [...rooms].sort((a, b) => {
    const aTime = a.lastMessageAt ?? a.createdAt;
    const bTime = b.lastMessageAt ?? b.createdAt;

    return bTime.localeCompare(aTime);
  });
}

function upsertRoom(rooms: SeatChatRoom[], room: SeatChatRoom) {
  return sortRoomsByRecentMessage([
    room,
    ...rooms.filter((item) => item.roomId !== room.roomId),
  ]);
}

function getSeatLabel(room: SeatChatRoom | null) {
  return room?.targetSeatNumber
    ? `${room.targetSeatNumber}번 좌석`
    : '좌석 이용자';
}

export default function SeatChatDrawer({
  open,
  targetSeat,
  initialRoomId = null,
  activationId = 0,
  onClose,
}: SeatChatDrawerProps) {
  const [activeReservation, setActiveReservation] =
    useState<ActiveSeatReservation | null>(null);
  const [rooms, setRooms] = useState<SeatChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<SeatChatRoom | null>(null);
  const [messages, setMessages] = useState<SeatChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(false);
  const [roomLoading, setRoomLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [realtimeStatus, setRealtimeStatus] =
    useState<RealtimeStatus>('disconnected');
  const [minimized, setMinimized] = useState(false);
  const handledTargetReservationRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);
  const markRoomRead = useSeatChatNotificationStore(
    (state) => state.markRoomRead,
  );
  const setDrawerState = useSeatChatNotificationStore(
    (state) => state.setDrawerState,
  );
  const refreshNotificationContext = useSeatChatNotificationStore(
    (state) => state.refreshContext,
  );
  const notificationRooms = useSeatChatNotificationStore(
    (state) => state.rooms,
  );

  const activeRoomId = activeRoom?.roomId ?? null;
  const activeReservationId = activeReservation?.reservationId ?? null;
  const targetReservationId = targetSeat?.reservationId ?? null;
  const hasActiveReservation = Boolean(activeReservation);
  const expanded = open && !minimized;
  const totalUnreadCount = rooms.reduce(
    (total, room) => total + (room.unreadCount ?? 0),
    0,
  );

  useEffect(() => {
    if (open) {
      setMinimized(false);
    }
  }, [activationId, open]);

  const focusMessageInput = useCallback(() => {
    window.setTimeout(() => {
      messageInputRef.current?.focus();
    }, 0);
  }, []);

  const appendMessage = useCallback((message: SeatChatMessage) => {
    setMessages((current) => {
      if (current.some((item) => item.messageId === message.messageId)) {
        return current;
      }

      return [...current, message];
    });
    setRooms((current) =>
      sortRoomsByRecentMessage(
        current.map((room) =>
          room.roomId === message.roomId
            ? {
                ...room,
                lastMessageText: message.messageText,
                lastMessageAt: message.createdAt,
              }
            : room,
        ),
      ),
    );
  }, []);

  const clearRoomUnread = useCallback((roomId: number) => {
    setRooms((current) =>
      current.map((room) =>
        room.roomId === roomId
          ? { ...room, unreadCount: 0 }
          : room,
      ),
    );
    markRoomRead(roomId);
  }, [markRoomRead]);

  const loadMessages = useCallback(async (roomId: number) => {
    setMessagesLoading(true);
    setError('');

    try {
      const data = await getSeatChatMessages(roomId);
      setMessages(data);
      try {
        await markSeatChatMessagesRead(roomId);
        clearRoomUnread(roomId);
        void refreshNotificationContext();
      } catch (readError) {
        console.error(readError);
      }
    } catch (loadError) {
      console.error(loadError);
      setMessages([]);
      setError(
        getApiErrorMessage(
          loadError,
          '좌석 채팅 메시지를 불러오지 못했습니다.',
        ),
      );
    } finally {
      setMessagesLoading(false);
    }
  }, [clearRoomUnread, refreshNotificationContext]);

  const loadContext = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await getSeatChatContext();
      const nextRooms = sortRoomsByRecentMessage(data.rooms);

      setActiveReservation(data.activeReservation);
      setRooms((current) =>
        sortRoomsByRecentMessage([
          ...nextRooms,
          ...current.filter(
            (room) => !nextRooms.some((item) => item.roomId === room.roomId),
          ),
        ]),
      );
      setActiveRoom((current) => {
        if (!data.activeReservation) {
          return null;
        }

        const requestedRoom = initialRoomId
          ? nextRooms.find((room) => room.roomId === initialRoomId)
          : null;
        const currentRoom = current
          ? nextRooms.find((room) => room.roomId === current.roomId)
          : null;

        return requestedRoom ?? currentRoom ?? nextRooms[0] ?? null;
      });
    } catch (contextError) {
      console.error(contextError);
      setActiveReservation(null);
      setRooms([]);
      setActiveRoom(null);
      setError(
        getApiErrorMessage(
          contextError,
          '좌석 채팅 정보를 불러오지 못했습니다.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [initialRoomId]);

  const startChatWithSeat = useCallback(async (reservationId: number) => {
    setRoomLoading(true);
    setError('');

    try {
      const room = await createOrGetSeatChatRoom(reservationId);
      setRooms((current) => upsertRoom(current, room));
      setActiveRoom(room);
    } catch (startError) {
      console.error(startError);
      setError(
        getApiErrorMessage(
          startError,
          '해당 좌석과 채팅을 시작하지 못했습니다.',
        ),
      );
    } finally {
      setRoomLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      handledTargetReservationRef.current = null;
      setRealtimeStatus('disconnected');
      return;
    }

    void loadContext();
  }, [loadContext, open]);

  useEffect(() => {
    if (!open || !targetReservationId) {
      return;
    }

    if (handledTargetReservationRef.current === targetReservationId) {
      return;
    }

    handledTargetReservationRef.current = targetReservationId;
    void startChatWithSeat(targetReservationId);
  }, [open, startChatWithSeat, targetReservationId]);

  useEffect(() => {
    if (!open || !activeRoomId) {
      setMessages([]);
      return;
    }

    void loadMessages(activeRoomId);
  }, [activeRoomId, loadMessages, open]);

  useEffect(() => {
    if (!open || !initialRoomId) return;
    const requestedRoom = rooms.find(
      (room) => room.roomId === initialRoomId,
    );
    if (requestedRoom) {
      setActiveRoom(requestedRoom);
    }
  }, [initialRoomId, open, rooms]);

  useEffect(() => {
    if (!open || notificationRooms.length === 0) return;
    setRooms((current) =>
      sortRoomsByRecentMessage([
        ...notificationRooms,
        ...current.filter(
          (room) =>
            !notificationRooms.some(
              (item) => item.roomId === room.roomId,
            ),
        ),
      ]),
    );
  }, [notificationRooms, open]);

  useEffect(() => {
    setDrawerState(expanded, expanded ? activeRoomId : null);
  }, [activeRoomId, expanded, setDrawerState]);

  useEffect(
    () => () => setDrawerState(false),
    [setDrawerState],
  );

  useEffect(() => {
    if (!expanded || !activeRoomId) {
      setRealtimeStatus('disconnected');
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
        if (disposed) {
          return;
        }

        setRealtimeStatus('connected');
        client.subscribe(`/sub/seat-chats/${activeRoomId}`, (message) => {
          if (!message.body) {
            return;
          }

          try {
            const payload = JSON.parse(message.body) as SeatChatMessage;
            appendMessage(payload);
            if (payload.senderReservationId !== activeReservationId) {
              void markSeatChatMessagesRead(activeRoomId)
                .then(() => {
                  clearRoomUnread(activeRoomId);
                  void refreshNotificationContext();
                })
                .catch(() => {});
            }
          } catch {
            // malformed realtime payloads should not break the drawer.
          }
        });
      },
      onDisconnect: () => setRealtimeStatus('disconnected'),
      onStompError: () => setRealtimeStatus('disconnected'),
      onWebSocketClose: () => setRealtimeStatus('disconnected'),
      onWebSocketError: () => setRealtimeStatus('disconnected'),
    });

    client.activate();

    return () => {
      disposed = true;
      setRealtimeStatus('disconnected');
      void client.deactivate();
    };
  }, [
    activeReservationId,
    activeRoomId,
    appendMessage,
    clearRoomUnread,
    expanded,
    refreshNotificationContext,
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, activeRoomId]);

  useEffect(() => {
    if (expanded && activeRoomId) {
      focusMessageInput();
    }
  }, [activeRoomId, expanded, focusMessageInput]);

  async function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedMessage = messageText.trim();
    const submittedMessage = messageText;
    if (!activeRoom || !trimmedMessage || sending) {
      return;
    }

    setSending(true);
    setError('');

    try {
      const message = await sendSeatChatMessage(
        activeRoom.roomId,
        trimmedMessage,
      );
      appendMessage(message);
      setMessageText((current) =>
        current === submittedMessage ? '' : current,
      );
    } catch (sendError) {
      console.error(sendError);
      setError(
        getApiErrorMessage(sendError, '메시지 전송에 실패했습니다.'),
      );
    } finally {
      setSending(false);
      focusMessageInput();
    }
  }

  const emptyMessage = useMemo(() => {
    if (!hasActiveReservation) {
      return '현재 이용 중인 좌석 예약이 있어야 좌석 채팅을 사용할 수 있습니다.';
    }

    return '사용 중인 좌석을 선택하면 익명 채팅을 시작할 수 있습니다.';
  }, [hasActiveReservation]);

  if (!open) {
    return null;
  }

  if (minimized) {
    return (
      <button
        type='button'
        onClick={() => setMinimized(false)}
        className='fixed bottom-5 right-5 z-50 flex h-12 w-[280px] max-w-[calc(100vw-2.5rem)] items-center gap-3 rounded-xl border border-primary/20 bg-white px-4 text-left shadow-xl transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-2xl'
        aria-label='좌석 채팅창 펼치기'
      >
        <span className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
          <MessageCircle className='size-4' />
        </span>
        <span className='min-w-0 flex-1'>
          <span className='block text-[12px] font-extrabold text-slate-900'>
            좌석 간 익명 채팅
          </span>
          <span className='block truncate text-[11px] font-semibold text-slate-400'>
            {activeRoom ? getSeatLabel(activeRoom) : '채팅창 열기'}
          </span>
        </span>
        {totalUnreadCount > 0 && (
          <span className='flex min-w-5 shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-extrabold leading-5 text-white'>
            {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <aside className='fixed bottom-2 right-2 z-50 flex h-[min(78vh,680px)] w-[calc(100vw-16px)] flex-col overflow-hidden rounded-xl border border-border bg-white shadow-2xl md:bottom-5 md:right-5 md:h-[min(680px,calc(100vh-96px))] md:w-[min(720px,calc(100vw-40px))]'>
        <div className='flex items-start justify-between gap-3 border-b border-border px-5 py-4'>
          <div className='min-w-0'>
            <div className='flex items-center gap-2 text-[15px] font-extrabold text-slate-900'>
              <MessageCircle className='size-4 text-primary' />
              좌석 간 익명 채팅
            </div>
            <div className='mt-1 truncate text-[12px] font-semibold text-slate-400'>
              {activeReservation
                ? `${activeReservation.roomName} ${activeReservation.seatNumber}번 이용 중`
                : '좌석 이용 중일 때 활성화됩니다'}
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <span
              className={cn(
                'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold',
                realtimeStatus === 'connected'
                  ? 'bg-primary/10 text-primary'
                  : 'bg-slate-100 text-slate-400',
              )}
            >
              {realtimeStatus === 'connected' ? (
                <Wifi className='size-3' />
              ) : (
                <WifiOff className='size-3' />
              )}
              {realtimeStatus === 'connected' ? '실시간' : '오프라인'}
            </span>
            <button
              type='button'
              onClick={() => setMinimized(true)}
              aria-label='좌석 채팅 최소화'
              title='최소화'
              className='flex size-9 items-center justify-center rounded-lg border border-border text-slate-500 transition-colors hover:border-primary hover:text-primary'
            >
              <Minus className='size-4' />
            </button>
            <button
              type='button'
              onClick={onClose}
              aria-label='닫기'
              className='flex size-9 items-center justify-center rounded-lg border border-border text-slate-500 transition-colors hover:border-primary hover:text-primary'
            >
              <X className='size-4' />
            </button>
          </div>
        </div>

        {loading ? (
          <div className='flex flex-1 items-center justify-center text-[13px] font-bold text-slate-400'>
            좌석 채팅 정보를 불러오는 중입니다.
          </div>
        ) : !activeReservation ? (
          <div className='flex flex-1 items-center justify-center px-8 text-center text-[13px] font-bold text-slate-400'>
            {emptyMessage}
          </div>
        ) : (
          <div className='grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[190px_minmax(0,1fr)]'>
            <div className='border-b border-border px-4 py-3 md:min-h-0 md:border-b-0 md:border-r'>
              <div className='mb-2 flex items-center justify-between gap-3'>
                <span className='text-[12px] font-extrabold text-slate-500'>
                  채팅방
                </span>
                <button
                  type='button'
                  onClick={() => void loadContext()}
                  disabled={loading}
                  className='flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-400 transition-colors hover:bg-slate-50 hover:text-primary disabled:opacity-50'
                >
                  <RefreshCw className={cn('size-3', loading && 'animate-spin')} />
                  새로고침
                </button>
              </div>
              {rooms.length === 0 ? (
                <div className='rounded-xl border border-dashed border-border bg-slate-50 px-4 py-3 text-[12px] font-semibold text-slate-400'>
                  {emptyMessage}
                </div>
              ) : (
                <div className='flex gap-2 overflow-x-auto pb-1 md:max-h-[calc(100%-34px)] md:flex-col md:overflow-y-auto md:pr-1'>
                  {rooms.map((room) => {
                    const selected = activeRoom?.roomId === room.roomId;
                    const unreadCount = room.unreadCount ?? 0;

                    return (
                      <button
                        key={room.roomId}
                        type='button'
                        onClick={() => setActiveRoom(room)}
                        className={cn(
                          'min-w-[150px] rounded-lg border px-3 py-2 text-left transition-colors md:w-full md:min-w-0',
                          selected
                            ? 'border-primary bg-primary/5'
                            : 'border-border bg-white hover:border-primary',
                        )}
                      >
                        <div className='flex items-center gap-2'>
                          <span className='min-w-0 flex-1 text-[13px] font-extrabold text-slate-900'>
                            {getSeatLabel(room)}
                          </span>
                          {unreadCount > 0 && (
                            <span className='flex min-w-5 shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-extrabold leading-5 text-white'>
                              {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                          )}
                        </div>
                        <div
                          title={room.targetRoomName}
                          className='mt-0.5 truncate text-[10px] font-bold text-primary'
                        >
                          {room.targetRoomName}
                        </div>
                        <div className='mt-1 truncate text-[11px] font-semibold text-slate-400'>
                          {room.lastMessageText || '아직 메시지가 없습니다'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className='flex min-h-0 flex-1 flex-col'>
              <div className='border-b border-border px-5 py-3'>
                <div className='flex min-w-0 items-center gap-2'>
                  <span className='shrink-0 rounded-md bg-primary/10 px-2 py-1 text-[12px] font-extrabold text-primary'>
                    {activeRoom ? getSeatLabel(activeRoom) : '좌석 이용자'}
                  </span>
                  {activeRoom && (
                    <span
                      title={activeRoom.targetRoomName}
                      className='min-w-0 truncate text-[12px] font-bold text-slate-600'
                    >
                      {activeRoom.targetRoomName}
                    </span>
                  )}
                </div>
                <div className='mt-1 text-[11px] font-semibold text-slate-400'>
                  {activeReservation
                    ? formatReservationPeriod(
                        activeReservation.startTime,
                        activeReservation.endTime,
                      )
                    : ''}
                </div>
              </div>

              <div className='min-h-0 flex-1 overflow-y-auto bg-slate-50 px-5 py-4'>
                {error && (
                  <div className='mb-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-[12px] font-bold text-red-500'>
                    {error}
                  </div>
                )}

                {roomLoading || messagesLoading ? (
                  <div className='flex h-full items-center justify-center text-[13px] font-bold text-slate-400'>
                    채팅 내용을 불러오는 중입니다.
                  </div>
                ) : !activeRoom ? (
                  <div className='flex h-full items-center justify-center text-center text-[13px] font-bold text-slate-400'>
                    {emptyMessage}
                  </div>
                ) : messages.length === 0 ? (
                  <div className='flex h-full items-center justify-center px-8 text-center text-[13px] font-bold text-slate-400'>
                    첫 메시지를 보내보세요. 좌석 번호만 보이고 이름은 보이지 않습니다.
                  </div>
                ) : (
                  <div className='space-y-3'>
                    {messages.map((message) => {
                      const mine =
                        message.senderReservationId === activeReservationId;

                      return (
                        <div
                          key={message.messageId}
                          className={cn(
                            'flex',
                            mine ? 'justify-end' : 'justify-start',
                          )}
                        >
                          <div
                            className={cn(
                              'max-w-[78%] rounded-2xl px-3 py-2 shadow-sm',
                              mine
                                ? 'rounded-br-md bg-primary text-white'
                                : 'rounded-bl-md border border-border bg-white text-slate-700',
                            )}
                          >
                            <div className='whitespace-pre-wrap break-words text-[13px] font-semibold leading-5'>
                              {message.messageText}
                            </div>
                            <div
                              className={cn(
                                'mt-1 text-right text-[10px] font-bold',
                                mine ? 'text-white/70' : 'text-slate-300',
                              )}
                            >
                              {formatIsoTime(message.createdAt)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              <form
                onSubmit={handleSendMessage}
                className='flex items-end gap-2 border-t border-border bg-white px-5 py-4'
              >
                <textarea
                  ref={messageInputRef}
                  value={messageText}
                  onChange={(event) => setMessageText(event.target.value)}
                  disabled={!activeRoom}
                  rows={2}
                  maxLength={2000}
                  placeholder='메시지 입력'
                  className='min-h-[44px] flex-1 resize-none rounded-xl border border-border bg-slate-50 px-3 py-2 text-[13px] font-semibold text-slate-700 outline-none transition-colors placeholder:text-slate-300 focus:border-primary focus:bg-white disabled:cursor-not-allowed disabled:opacity-60'
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                />
                <button
                  type='submit'
                  disabled={!activeRoom || !messageText.trim() || sending}
                  aria-label='메시지 보내기'
                  className='flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-sm transition-colors hover:bg-[var(--brand-hover)] disabled:cursor-not-allowed disabled:bg-slate-200'
                >
                  <Send className='size-4' />
                </button>
              </form>
            </div>
          </div>
        )}
    </aside>
  );
}
