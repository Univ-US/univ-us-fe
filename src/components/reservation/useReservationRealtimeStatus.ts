import { Client, type IStompSocket } from '@stomp/stompjs';
import { useEffect, useRef, useState } from 'react';
import SockJS from 'sockjs-client';

import { getWebSocketEndpointUrl } from '@/lib/realtime';

export type ReservationRealtimeStatus = 'connected' | 'disconnected';

export type ReadingSeatRealtimeEvent = {
  action: 'RESERVED' | 'CANCELLED' | string;
  reservationId: number;
  memberId: number;
  seatId: number;
  readingRoomId: number;
  startTime: string;
  endTime: string;
};

type ReservationRealtimeOptions = {
  onSeatEvent?: (event: ReadingSeatRealtimeEvent) => void;
};

function isBrowserOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

export function useReservationRealtimeStatus(options?: ReservationRealtimeOptions) {
  const [status, setStatus] =
    useState<ReservationRealtimeStatus>('disconnected');
  const onSeatEventRef = useRef(options?.onSeatEvent);

  useEffect(() => {
    onSeatEventRef.current = options?.onSeatEvent;
  }, [options?.onSeatEvent]);

  useEffect(() => {
    let client: Client | null = null;
    let disposed = false;
    let online = isBrowserOnline();

    const deactivateClient = () => {
      if (!client) {
        return;
      }

      const currentClient = client;
      client = null;
      void currentClient.deactivate();
    };

    const activateClient = () => {
      if (disposed || client || !isBrowserOnline()) {
        setStatus('disconnected');
        return;
      }

      const nextClient = new Client({
        webSocketFactory: () =>
          new SockJS(getWebSocketEndpointUrl()) as unknown as IStompSocket,
        reconnectDelay: 5000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        debug: () => {},
        onConnect: () => {
          if (isBrowserOnline()) {
            setStatus('connected');
          }

          nextClient.subscribe('/sub/reservations/seats', (message) => {
            if (!message.body) {
              return;
            }

            try {
              const event = JSON.parse(message.body) as ReadingSeatRealtimeEvent;
              onSeatEventRef.current?.(event);
            } catch {
              // Ignore malformed realtime messages without breaking the socket.
            }
          });
        },
        onDisconnect: () => setStatus('disconnected'),
        onStompError: () => setStatus('disconnected'),
        onWebSocketClose: () => setStatus('disconnected'),
        onWebSocketError: () => setStatus('disconnected'),
      });

      client = nextClient;
      nextClient.activate();
    };

    const handleOffline = () => {
      online = false;
      setStatus('disconnected');
      deactivateClient();
    };

    const handleOnline = () => {
      online = true;
      setStatus('disconnected');
      activateClient();
    };

    const syncBrowserNetworkStatus = () => {
      const nextOnline = isBrowserOnline();

      if (nextOnline === online) {
        return;
      }

      if (nextOnline) {
        handleOnline();
        return;
      }

      handleOffline();
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    const networkStatusInterval = window.setInterval(
      syncBrowserNetworkStatus,
      1000,
    );
    activateClient();

    return () => {
      disposed = true;
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      window.clearInterval(networkStatusInterval);
      deactivateClient();
    };
  }, []);

  return status;
}
