'use client';

import { Client, type IStompSocket } from '@stomp/stompjs';
import { MessageCircle, X } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import SockJS from 'sockjs-client';

import { getWebSocketEndpointUrl } from '@/lib/realtime';
import {
  markSeatChatMessagesRead,
  type SeatChatNotification,
} from '@/lib/reservationApi';
import { useAuthStore } from '@/store/authStore';
import { useSeatChatNotificationStore } from '@/store/reservation/seatChatNotificationStore';

const SEAT_CHAT_NOTIFICATION_TOPIC =
  '/user/queue/seat-chat-notifications';
const TOAST_DURATION_MS = 6000;

export default function SeatChatNotificationCenter() {
  const pathname = usePathname();
  const router = useRouter();
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const activeReservationId = useSeatChatNotificationStore(
    (state) => state.activeReservation?.reservationId ?? null,
  );
  const refreshContext = useSeatChatNotificationStore(
    (state) => state.refreshContext,
  );
  const reset = useSeatChatNotificationStore((state) => state.reset);
  const requestOpen = useSeatChatNotificationStore(
    (state) => state.requestOpen,
  );
  const [toast, setToast] = useState<SeatChatNotification | null>(null);

  useEffect(() => {
    if (!isInitialized) return;
    if (!isLoggedIn) {
      reset();
      return;
    }

    void refreshContext();
    const intervalId = window.setInterval(() => {
      void refreshContext();
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, [
    isInitialized,
    isLoggedIn,
    pathname,
    refreshContext,
    reset,
  ]);

  useEffect(() => {
    if (!isLoggedIn || !activeReservationId) return;

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
        void refreshContext();

        client.subscribe(SEAT_CHAT_NOTIFICATION_TOPIC, (message) => {
          if (!message.body) return;

          try {
            const notification = JSON.parse(
              message.body,
            ) as SeatChatNotification;
            const state = useSeatChatNotificationStore.getState();
            const viewingRoom =
              state.drawerOpen
              && state.activeRoomId === notification.roomId;

            if (viewingRoom) {
              void markSeatChatMessagesRead(notification.roomId)
                .then(() => state.markRoomRead(notification.roomId))
                .catch(() => {});
              return;
            }

            state.applyNotification(notification);
            setToast(notification);
            void state.refreshContext();
          } catch {
            // Ignore malformed realtime payloads.
          }
        });
      },
    });

    client.activate();

    return () => {
      disposed = true;
      void client.deactivate();
    };
  }, [activeReservationId, isLoggedIn, refreshContext]);

  useEffect(() => {
    if (!toast) return;
    const timeoutId = window.setTimeout(
      () => setToast(null),
      TOAST_DURATION_MS,
    );
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  if (!toast) return null;

  const openChat = () => {
    requestOpen(toast.roomId);
    setToast(null);
    router.push('/community/reservation');
  };

  return (
    <div className='fixed right-5 top-20 z-[90] w-[min(360px,calc(100vw-2.5rem))] animate-in slide-in-from-right-3 fade-in duration-200'>
      <div className='overflow-hidden rounded-xl border border-primary/20 bg-white shadow-xl'>
        <button
          type='button'
          onClick={openChat}
          className='flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-primary/5'
        >
          <span className='mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
            <MessageCircle className='size-4' />
          </span>
          <span className='min-w-0 flex-1'>
            <span className='block text-[12px] font-extrabold text-slate-900'>
              좌석 채팅 · {toast.senderRoomName} {toast.senderSeatNumber}번
            </span>
            <span className='mt-1 block truncate text-[12px] font-semibold text-slate-500'>
              {toast.messageText}
            </span>
          </span>
        </button>
        <button
          type='button'
          onClick={() => setToast(null)}
          aria-label='알림 닫기'
          className='absolute right-2 top-2 flex size-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700'
        >
          <X className='size-3.5' />
        </button>
      </div>
    </div>
  );
}
