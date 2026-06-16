'use client';

import { Client, type IStompSocket } from '@stomp/stompjs';
import {
  CreditCard,
  Landmark,
  MessageCircle,
  RefreshCw,
  Send,
  Tag,
  Trash2,
  UserRound,
  Wallet,
  PackageOpen,
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
import {
  completeFreeTradeChat,
  completeTradeChatPayment,
  closeTradeChatRoom,
  createOrGetTradeChatRoom,
  deleteTradeChatRoom,
  getPaymentConfig,
  getTradeChatMessages,
  getTradeChatRooms,
  sendTradeChatMessage,
  updateTradeChatNegotiatedPrice,
} from '@/lib/marketApi';
import { getWebSocketEndpointUrl } from '@/lib/realtime';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import type { Product, TradeChatMessage, TradeChatRoom } from '@/types/community';

type CommunityMarketChatDrawerProps = {
  open: boolean;
  targetProduct: Product | null;
  onClose: () => void;
  onRoomCreated?: (room: TradeChatRoom) => void;
  onRoomUpdated?: (room: TradeChatRoom) => void;
  onRoomsChanged?: () => void;
  onTradeCompleted?: () => void;
};

type RealtimeStatus = 'connected' | 'disconnected';
type PaymentMethod = 'card' | 'trans' | 'kakaopay';
type PortOnePayMethod = 'CARD' | 'TRANSFER' | 'EASY_PAY';

type PortOnePaymentRequest = {
  storeId: string;
  channelKey: string;
  paymentId: string;
  orderName: string;
  totalAmount: number;
  currency: 'CURRENCY_KRW';
  payMethod: PortOnePayMethod;
  customer: {
    fullName: string;
    email: string;
    phoneNumber: string;
  };
};

type PortOnePaymentResponse = {
  code?: string;
  message?: string;
  paymentId?: string;
};

type PortOneSdk = {
  requestPayment: (
    paymentRequest: PortOnePaymentRequest,
  ) => Promise<PortOnePaymentResponse>;
};

declare global {
  interface Window {
    PortOne?: PortOneSdk;
  }
}

const PORTONE_SCRIPT_SRC = 'https://cdn.portone.io/v2/browser-sdk.js';

const PAYMENT_METHODS: {
  value: PaymentMethod;
  label: string;
  description: string;
  channelKeyType: 'kgInicisChannelKey' | 'kakaoPayChannelKey';
  payMethod: PortOnePayMethod;
  Icon: typeof CreditCard;
}[] = [
  {
    value: 'card',
    label: '카드',
    description: '신용/체크',
    channelKeyType: 'kgInicisChannelKey',
    payMethod: 'CARD',
    Icon: CreditCard,
  },
  {
    value: 'trans',
    label: '계좌이체',
    description: '실시간',
    channelKeyType: 'kgInicisChannelKey',
    payMethod: 'TRANSFER',
    Icon: Landmark,
  },
  {
    value: 'kakaopay',
    label: '카카오페이',
    description: '간편결제',
    channelKeyType: 'kakaoPayChannelKey',
    payMethod: 'EASY_PAY',
    Icon: Wallet,
  },
];

function sortRoomsByRecentMessage(rooms: TradeChatRoom[]) {
  return [...rooms].sort((a, b) => {
    const aTime = a.lastMessageAt ?? a.createdAt;
    const bTime = b.lastMessageAt ?? b.createdAt;

    return bTime.localeCompare(aTime);
  });
}

function upsertRoom(rooms: TradeChatRoom[], room: TradeChatRoom) {
  return sortRoomsByRecentMessage([
    room,
    ...rooms.filter((item) => item.roomId !== room.roomId),
  ]);
}

function formatPrice(price: number) {
  return price === 0 ? '무료' : `${price.toLocaleString('ko-KR')}원`;
}

function formatMessageTime(value?: string) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getRoomTitle(room: TradeChatRoom, memberId: number | null) {
  const otherName =
    memberId === room.sellerId
      ? room.buyerName
      : room.sellerName;

  return `${room.productName ?? '상품'} · ${otherName ?? '상대방'}`;
}

function getParticipantName(
  message: TradeChatMessage,
  room: TradeChatRoom | null,
  memberId: number | null,
) {
  if (message.senderId === memberId) {
    return '나';
  }

  if (message.senderName) {
    return message.senderName;
  }

  if (room?.sellerId === message.senderId) {
    return room.sellerName ?? '판매자';
  }

  if (room?.buyerId === message.senderId) {
    return room.buyerName ?? '구매자';
  }

  return '상대방';
}

function getInitial(name: string) {
  return name.trim().slice(0, 1) || '?';
}

function loadPortOneScript() {
  return new Promise<void>((resolve, reject) => {
    if (window.PortOne) {
      resolve();
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${PORTONE_SCRIPT_SRC}"]`,
    );
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = PORTONE_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject();
    document.body.appendChild(script);
  });
}

export default function CommunityMarketChatDrawer({
  open,
  targetProduct,
  onClose,
  onRoomCreated,
  onRoomUpdated,
  onRoomsChanged,
  onTradeCompleted,
}: CommunityMarketChatDrawerProps) {
  const memberId = useAuthStore((state) => state.memberId);
  const [rooms, setRooms] = useState<TradeChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<TradeChatRoom | null>(null);
  const [messages, setMessages] = useState<TradeChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [negotiatedPriceInput, setNegotiatedPriceInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [loading, setLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [priceSaving, setPriceSaving] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [freeCompleteLoading, setFreeCompleteLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [realtimeStatus, setRealtimeStatus] =
    useState<RealtimeStatus>('disconnected');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);

  const activeRoomId = activeRoom?.roomId ?? null;
  const targetProductId = targetProduct?.productId ?? null;
  const isSeller = Boolean(activeRoom && memberId === activeRoom.sellerId);
  const isBuyer = Boolean(activeRoom && memberId === activeRoom.buyerId);
  const isDone =
    activeRoom?.status === 'DONE' || activeRoom?.productStatus === 'DONE';
  const isClosed = activeRoom?.status === 'CLOSED';
  const isChatLocked = isDone || isClosed;
  const activePrice = Number(activeRoom?.negotiatedPrice ?? targetProduct?.price ?? 0);
  const isFreeSharing = activePrice <= 0;

  const emptyMessage = useMemo(() => {
    if (!memberId) {
      return '로그인 후 중고거래 채팅을 사용할 수 있습니다.';
    }

    return '상품에서 채팅을 시작하거나 기존 채팅방을 선택해 주세요.';
  }, [memberId]);

  const focusMessageInput = useCallback(() => {
    window.setTimeout(() => {
      messageInputRef.current?.focus();
    }, 0);
  }, []);

  const applyRoomUpdate = useCallback((room: TradeChatRoom) => {
    setRooms((current) => upsertRoom(current, room));
    setActiveRoom((current) =>
      current?.roomId === room.roomId ? { ...current, ...room } : current,
    );
  }, []);

  const appendMessage = useCallback((message: TradeChatMessage) => {
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
                lastMessage: message.content,
                lastMessageAt: message.sendAt,
              }
            : room,
        ),
      ),
    );
  }, []);

  const loadRooms = useCallback(async () => {
    if (!memberId) {
      setRooms([]);
      setActiveRoom(null);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = sortRoomsByRecentMessage(await getTradeChatRooms());
      setRooms(data);
      setActiveRoom((current) => current ?? data[0] ?? null);
    } catch (loadError) {
      console.error(loadError);
      setRooms([]);
      setActiveRoom(null);
      setError(getApiErrorMessage(loadError, '채팅방을 불러오지 못했습니다.'));
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  const loadMessages = useCallback(async (roomId: number) => {
    setMessagesLoading(true);
    setError('');

    try {
      const data = await getTradeChatMessages(roomId);
      setMessages(data);
    } catch (loadError) {
      console.error(loadError);
      setMessages([]);
      setError(getApiErrorMessage(loadError, '메시지를 불러오지 못했습니다.'));
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      setRealtimeStatus('disconnected');
      return;
    }

    void loadRooms();
  }, [loadRooms, open]);

  useEffect(() => {
    if (!open || !targetProductId) {
      return;
    }

    const existingRoom = rooms.find((room) => room.productId === targetProductId);
    setActiveRoom(existingRoom ?? null);
    if (!existingRoom) {
      setMessages([]);
    }
  }, [open, rooms, targetProductId]);

  useEffect(() => {
    if (!open || !activeRoomId) {
      setMessages([]);
      return;
    }

    void loadMessages(activeRoomId);
  }, [activeRoomId, loadMessages, open]);

  useEffect(() => {
    setNegotiatedPriceInput(String(activeRoom?.negotiatedPrice ?? ''));
  }, [activeRoom?.negotiatedPrice, activeRoom?.roomId]);

  useEffect(() => {
    if (!open || !activeRoomId) {
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
        client.subscribe(`/sub/market-chats/${activeRoomId}`, (message) => {
          if (!message.body) {
            return;
          }

          try {
            appendMessage(JSON.parse(message.body) as TradeChatMessage);
          } catch {
            // malformed realtime payloads should not break the drawer.
          }
        });
        client.subscribe(`/sub/market-chats/${activeRoomId}/room`, (message) => {
          if (!message.body) {
            return;
          }

          try {
            applyRoomUpdate(JSON.parse(message.body) as TradeChatRoom);
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
  }, [activeRoomId, appendMessage, applyRoomUpdate, open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, activeRoomId]);

  useEffect(() => {
    if (open && activeRoomId) {
      focusMessageInput();
    }
  }, [activeRoomId, focusMessageInput, open]);

  useEffect(() => {
    if (isChatLocked) {
      setMessageText('');
    }
  }, [isChatLocked]);

  async function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedMessage = messageText.trim();
    const submittedMessage = messageText;
    if ((!activeRoom && !targetProductId) || isChatLocked || !trimmedMessage || sending) {
      return;
    }

    setSending(true);
    setError('');

    try {
      let room = activeRoom;
      if (!room && targetProductId) {
        const createdRoom = await createOrGetTradeChatRoom(targetProductId);
        room = createdRoom;
        setRooms((current) => upsertRoom(current, createdRoom));
        setActiveRoom(createdRoom);
        onRoomCreated?.(createdRoom);
      }

      if (!room) {
        return;
      }

      const message = await sendTradeChatMessage(room.roomId, trimmedMessage);
      appendMessage(message);
      setMessageText((current) =>
        current === submittedMessage ? '' : current,
      );
    } catch (sendError) {
      console.error(sendError);
      setError(getApiErrorMessage(sendError, '메시지 전송에 실패했습니다.'));
    } finally {
      setSending(false);
      focusMessageInput();
    }
  }

  async function handleSaveNegotiatedPrice() {
    if (!activeRoom || !isSeller || isChatLocked || priceSaving) {
      return;
    }

    const price = Number(negotiatedPriceInput);
    if (!Number.isInteger(price) || price < 0) {
      setError('협상 가격은 0원 이상 숫자로 입력해 주세요.');
      return;
    }

    setPriceSaving(true);
    setError('');

    try {
      const updatedRoom = await updateTradeChatNegotiatedPrice(
        activeRoom.roomId,
        price,
      );
      applyRoomUpdate(updatedRoom);
    } catch (saveError) {
      console.error(saveError);
      setError(getApiErrorMessage(saveError, '협상 가격 저장에 실패했습니다.'));
    } finally {
      setPriceSaving(false);
    }
  }

  async function handleCompleteFreeSharing() {
    if (!activeRoom || !isSeller || isChatLocked || freeCompleteLoading) {
      return;
    }

    if (!isFreeSharing) {
      setError('유료 상품은 구매자 결제로 거래를 완료해 주세요.');
      return;
    }

    if (!confirm('무료 나눔을 완료 처리할까요?')) {
      return;
    }

    setFreeCompleteLoading(true);
    setError('');

    try {
      const updatedRoom = await completeFreeTradeChat(activeRoom.roomId);
      applyRoomUpdate(updatedRoom);
      onRoomUpdated?.(updatedRoom);
      onRoomsChanged?.();
      onTradeCompleted?.();
    } catch (completeError) {
      console.error(completeError);
      setError(getApiErrorMessage(completeError, '나눔완료 처리에 실패했습니다.'));
    } finally {
      setFreeCompleteLoading(false);
    }
  }

  async function handlePayment() {
    if (!activeRoom || !memberId || !isBuyer || isChatLocked || paymentLoading) {
      return;
    }

    if (isDone) {
      setError('이미 거래가 완료된 채팅방입니다.');
      return;
    }

    if (isFreeSharing) {
      setError('무료 나눔 상품은 결제 없이 판매자가 나눔완료 처리합니다.');
      return;
    }

    setPaymentLoading(true);
    setError('');

    try {
      const paymentConfig = await getPaymentConfig();
      if (!paymentConfig.storeId) {
        throw new Error('PortOne 상점 ID가 설정되지 않았습니다.');
      }

      await loadPortOneScript();
      if (!window.PortOne) {
        throw new Error('PortOne SDK를 불러오지 못했습니다.');
      }

      const selectedPaymentMethod =
        PAYMENT_METHODS.find((method) => method.value === paymentMethod) ??
        PAYMENT_METHODS[0];
      const channelKey = paymentConfig[selectedPaymentMethod.channelKeyType];
      if (!channelKey) {
        throw new Error(`${selectedPaymentMethod.label} 채널키가 설정되지 않았습니다.`);
      }

      const paymentId = `market_chat_${activeRoom.roomId}_${Date.now()}`;
      const customerEmail =
        localStorage.getItem('memberEmail') ?? `member${memberId}@univus.test`;
      const customerName =
        localStorage.getItem('memberName') ?? `member-${memberId}`;
      const customerPhoneNumber =
        localStorage.getItem('memberPhoneNumber') ?? '01012345678';

      const response = await window.PortOne.requestPayment({
        storeId: paymentConfig.storeId,
        channelKey,
        paymentId,
        orderName: activeRoom.productName ?? '중고거래 상품',
        totalAmount: activePrice,
        currency: 'CURRENCY_KRW',
        payMethod: selectedPaymentMethod.payMethod,
        customer: {
          fullName: customerName,
          email: customerEmail,
          phoneNumber: customerPhoneNumber,
        },
      });

      if (response.code) {
        setError(response.message ?? '결제가 완료되지 않았습니다.');
        return;
      }

      await completeTradeChatPayment({
        roomId: activeRoom.roomId,
        paymentId: response.paymentId ?? paymentId,
      });
      applyRoomUpdate({
        ...activeRoom,
        status: 'DONE',
        productStatus: 'DONE',
      });
      onTradeCompleted?.();
    } catch (paymentError) {
      console.error(paymentError);
      setError(
        paymentError instanceof Error
          ? paymentError.message
          : '결제 처리에 실패했습니다.',
      );
    } finally {
      setPaymentLoading(false);
    }
  }

  async function handleCloseRoom() {
    if (!activeRoom || closing) {
      return;
    }
    if (!confirm('이 채팅방의 대화를 종료할까요?')) {
      return;
    }

    setClosing(true);
    setError('');

    try {
      const closedRoom = await closeTradeChatRoom(activeRoom.roomId);
      applyRoomUpdate(closedRoom);
      onRoomUpdated?.(closedRoom);
      onRoomsChanged?.();
    } catch (closeError) {
      console.error(closeError);
      setError(getApiErrorMessage(closeError, '대화 종료에 실패했습니다.'));
    } finally {
      setClosing(false);
    }
  }

  async function handleDeleteRoom() {
    if (!activeRoom || deleting) {
      return;
    }
    if (!confirm('종료된 채팅방을 삭제할까요?')) {
      return;
    }

    const deletingRoomId = activeRoom.roomId;
    setDeleting(true);
    setError('');

    try {
      await deleteTradeChatRoom(deletingRoomId);
      const nextRooms = rooms.filter((room) => room.roomId !== deletingRoomId);
      setRooms(nextRooms);
      setActiveRoom(nextRooms[0] ?? null);
      setMessages([]);
      onRoomsChanged?.();
    } catch (deleteError) {
      console.error(deleteError);
      setError(getApiErrorMessage(deleteError, '채팅방 삭제에 실패했습니다.'));
    } finally {
      setDeleting(false);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="중고거래 채팅 닫기"
        className="absolute inset-0 bg-slate-950/35"
        onClick={onClose}
      />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-[460px] flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[15px] font-extrabold text-slate-900">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MessageCircle className="size-4" />
              </span>
              중고거래 채팅
            </div>
            <div className="mt-1 truncate text-[12px] font-semibold text-slate-400">
              {activeRoom ? getRoomTitle(activeRoom, memberId) : targetProduct?.productName ?? '상품별 거래 채팅'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold',
                realtimeStatus === 'connected'
                  ? 'bg-primary/10 text-primary'
                  : 'bg-slate-100 text-slate-400',
              )}
            >
              {realtimeStatus === 'connected' ? (
                <Wifi className="size-3" />
              ) : (
                <WifiOff className="size-3" />
              )}
              {realtimeStatus === 'connected' ? '실시간' : '오프라인'}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="flex size-9 items-center justify-center rounded-lg border border-border text-slate-500 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:text-primary active:translate-y-0"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center text-[13px] font-bold text-slate-400">
            채팅방을 불러오는 중입니다.
          </div>
        ) : (
          <>
            <div className="border-b border-border px-5 py-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-[12px] font-extrabold text-slate-500">
                  채팅방
                </span>
                <button
                  type="button"
                  onClick={() => void loadRooms()}
                  disabled={loading}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-400 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:text-primary active:translate-y-0 disabled:opacity-50"
                >
                  <RefreshCw className={cn('size-3', loading && 'animate-spin')} />
                  새로고침
                </button>
              </div>
              {rooms.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-slate-50 px-4 py-3 text-[12px] font-semibold text-slate-400">
                  {emptyMessage}
                </div>
              ) : (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {rooms.map((room) => {
                    const selected = activeRoom?.roomId === room.roomId;

                    return (
                      <button
                        key={room.roomId}
                        type="button"
                        onClick={() => setActiveRoom(room)}
                        className={cn(
                          'min-w-[184px] rounded-xl border px-3 py-2 text-left transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0',
                          selected
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'border-border bg-white hover:border-primary hover:shadow-sm',
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <span
                            className={cn(
                              'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold',
                              selected
                                ? 'bg-primary text-white'
                                : 'bg-slate-100 text-slate-500',
                            )}
                          >
                            {getInitial(
                              memberId === room.sellerId
                                ? room.buyerName ?? '상대방'
                                : room.sellerName ?? '상대방',
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[12px] font-extrabold text-slate-900">
                              {room.productName ?? '상품'}
                            </div>
                            <div className="mt-0.5 truncate text-[11px] font-bold text-slate-400">
                              {memberId === room.sellerId
                                ? room.buyerName ?? '상대방'
                                : room.sellerName ?? '상대방'}
                            </div>
                          </div>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-400">
                          <span className="truncate">
                            {room.lastMessage || '아직 메시지가 없습니다'}
                          </span>
                          <span className="shrink-0 text-primary">
                            {formatPrice(room.negotiatedPrice)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              <div className="border-b border-border px-5 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-[12px] font-extrabold text-slate-900">
                      {activeRoom
                        ? getRoomTitle(activeRoom, memberId)
                        : targetProduct?.productName ?? '채팅방을 선택해 주세요'}
                    </div>
                    <div className="mt-1 text-[11px] font-semibold text-slate-400">
                      무료 나눔은 판매자가 완료 처리하고, 유료 상품은 협상가로 결제됩니다.
                    </div>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-md px-2.5 py-1 text-[11px] font-bold',
                      isDone || isClosed
                        ? 'bg-slate-100 text-slate-500'
                        : 'bg-amber-100 text-amber-700',
                    )}
                  >
                    {isDone ? '거래완료' : isClosed ? '종료됨' : '예약중'}
                  </span>
                </div>

                {activeRoom && (
                  <div className="mt-3 rounded-lg border border-border bg-slate-50 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[12px] font-bold text-slate-700">
                        <span className="flex size-6 items-center justify-center rounded-md bg-white text-primary">
                          <Tag className="size-3.5" />
                        </span>
                        협상 가격
                      </span>
                      <span className="text-[12px] font-extrabold text-slate-900">
                        {formatPrice(activePrice)}
                      </span>
                    </div>

                    {isSeller ? (
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min={0}
                          value={negotiatedPriceInput}
                          onChange={(event) =>
                            setNegotiatedPriceInput(event.target.value)
                          }
                          disabled={isChatLocked}
                          className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-white px-3 text-[13px] font-semibold text-slate-700 outline-none focus:border-primary disabled:opacity-50"
                        />
                        <button
                          type="button"
                          onClick={() => void handleSaveNegotiatedPrice()}
                          disabled={isChatLocked || priceSaving}
                          className="flex h-10 items-center justify-center rounded-lg bg-primary px-3 text-[12px] font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--brand-hover)] active:translate-y-0 disabled:bg-slate-200"
                        >
                          {priceSaving ? '저장중' : '가격수정'}
                        </button>
                      </div>
                    ) : isBuyer && !isFreeSharing ? (
                      <div className="grid grid-cols-3 gap-2">
                        {PAYMENT_METHODS.map(({ value, label, description, Icon }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setPaymentMethod(value)}
                            disabled={isChatLocked || paymentLoading}
                            className={cn(
                              'flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-lg border bg-white px-2 py-2 text-center transition-all disabled:opacity-50',
                              paymentMethod === value
                                ? 'border-primary text-primary shadow-sm'
                                : 'border-border text-slate-500 hover:border-primary/60 hover:text-primary',
                            )}
                          >
                            <Icon className="size-4" />
                            <span className="text-[12px] font-bold leading-none">
                              {label}
                            </span>
                            <span className="text-[10px] leading-none text-slate-400">
                              {description}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : null}

                    {isBuyer && isFreeSharing && (
                      <div className="mt-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-[12px] font-bold text-primary">
                        무료 나눔 상품입니다. 판매자가 나눔완료를 누르면 거래가 완료됩니다.
                      </div>
                    )}
                    {isBuyer && !isFreeSharing && (
                      <button
                        type="button"
                        onClick={() => void handlePayment()}
                        disabled={isChatLocked || paymentLoading}
                        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-[var(--brand-hover)] disabled:bg-slate-200"
                      >
                        <CreditCard className="size-4" />
                        {paymentLoading
                          ? '결제 처리중'
                          : `${formatPrice(activePrice)} 결제하기`}
                      </button>
                    )}

                    {isSeller && isFreeSharing && !isChatLocked && (
                      <button
                        type="button"
                        onClick={() => void handleCompleteFreeSharing()}
                        disabled={freeCompleteLoading}
                        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-[var(--brand-hover)] disabled:bg-slate-200"
                      >
                        <PackageOpen className="size-4" />
                        {freeCompleteLoading ? '처리중' : '나눔완료'}
                      </button>
                    )}

                    <div className="mt-3 flex gap-2">
                      {!isDone && !isClosed && (
                        <button
                          type="button"
                          onClick={() => void handleCloseRoom()}
                          disabled={closing}
                          className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-[12px] font-bold text-slate-500 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-700 active:translate-y-0 disabled:opacity-50"
                        >
                          <X className="size-3.5" />
                          {closing ? '종료중' : '대화종료'}
                        </button>
                      )}
                      {(isClosed || isDone) && (
                        <button
                          type="button"
                          onClick={() => void handleDeleteRoom()}
                          disabled={deleting}
                          className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-100 bg-red-50 text-[12px] font-bold text-red-500 transition-all duration-200 hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-100 active:translate-y-0 disabled:opacity-50"
                        >
                          <Trash2 className="size-3.5" />
                          {deleting ? '삭제중' : '채팅방 삭제'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-5 py-4">
                {error && (
                  <div className="mb-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-[12px] font-bold text-red-500">
                    {error}
                  </div>
                )}

                {messagesLoading ? (
                  <div className="flex h-full items-center justify-center text-[13px] font-bold text-slate-400">
                    채팅 내용을 불러오는 중입니다.
                  </div>
                ) : !activeRoom ? (
                  <div className="flex h-full items-center justify-center px-8 text-center text-[13px] font-bold text-slate-400">
                    {emptyMessage}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center px-8 text-center text-[13px] font-bold text-slate-400">
                    첫 메시지를 보내 거래를 시작해 보세요.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => {
                      const mine = message.senderId === memberId;
                      const senderName = getParticipantName(
                        message,
                        activeRoom,
                        memberId,
                      );

                      return (
                        <div
                          key={message.messageId}
                          className={cn(
                            'flex animate-in fade-in-0 slide-in-from-bottom-1 duration-200',
                            mine ? 'justify-end' : 'justify-start',
                          )}
                        >
                          <div className={cn('flex max-w-[86%] gap-2', mine && 'flex-row-reverse')}>
                            <div
                              className={cn(
                                'mt-5 flex size-8 shrink-0 items-center justify-center rounded-full text-[12px] font-extrabold shadow-sm',
                                mine
                                  ? 'bg-primary text-white'
                                  : 'border border-border bg-white text-slate-500',
                              )}
                            >
                              {mine ? '나' : getInitial(senderName)}
                            </div>
                            <div className={cn('min-w-0', mine && 'items-end text-right')}>
                              <div
                                className={cn(
                                  'mb-1 flex items-center gap-1.5 text-[11px] font-bold text-slate-400',
                                  mine && 'justify-end',
                                )}
                              >
                                <UserRound className="size-3" />
                                <span>{senderName}</span>
                              </div>
                              <div className={cn('flex items-end gap-1.5', mine && 'flex-row-reverse')}>
                                <div
                                  className={cn(
                                    'rounded-2xl px-3.5 py-2.5 shadow-sm transition-transform duration-200 hover:-translate-y-0.5',
                                    mine
                                      ? 'rounded-br-md bg-primary text-white'
                                      : 'rounded-bl-md border border-border bg-white text-slate-700',
                                  )}
                                >
                                  <div className="whitespace-pre-wrap break-words text-[13px] font-semibold leading-5">
                                    {message.content}
                                  </div>
                                </div>
                                <div
                                  className={cn(
                                    'mb-1 shrink-0 text-[10px] font-bold text-slate-300',
                                    mine ? 'text-right' : 'text-left',
                                  )}
                                >
                                  {formatMessageTime(message.sendAt)}
                                </div>
                              </div>
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
                className="flex items-center gap-2 border-t border-border bg-white px-5 py-4"
              >
                <textarea
                  ref={messageInputRef}
                  value={messageText}
                  onChange={(event) => setMessageText(event.target.value)}
                  disabled={(!activeRoom && !targetProductId) || isChatLocked}
                  rows={2}
                  maxLength={2000}
                  placeholder={isChatLocked ? '더 이상 참여할 수 없는 채팅입니다.' : '메시지 입력'}
                  className="h-14 flex-1 resize-none rounded-xl border border-primary bg-white px-3 py-[15px] text-[13px] font-semibold leading-5 text-slate-700 outline-none transition-all duration-200 placeholder:text-slate-300 focus:border-primary focus:shadow-[0_0_0_3px_rgba(20,184,166,0.12)] disabled:cursor-not-allowed disabled:border-border disabled:bg-slate-50 disabled:opacity-60"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={(!activeRoom && !targetProductId) || isChatLocked || !messageText.trim() || sending}
                  aria-label="메시지 보내기"
                  className="group flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--brand-hover)] hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:shadow-none"
                >
                  <Send className={cn('size-4 transition-transform duration-200', !sending && 'group-hover:translate-x-0.5')} />
                </button>
              </form>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
