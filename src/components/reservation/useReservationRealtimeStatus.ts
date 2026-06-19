import { Client, type IStompSocket } from '@stomp/stompjs';
import { useEffect, useRef, useState } from 'react';
import SockJS from 'sockjs-client';

import { getWebSocketEndpointUrl } from '@/lib/realtime';

export type ReservationRealtimeStatus = 'connected' | 'disconnected';

export type ReadingSeatRealtimeEvent = {
  action: 'RESERVED' | 'CANCELLED' | string;
  seatId: number;
  readingRoomId: number;
  startTime: string;
  endTime: string;
};

export type RoomReservationRealtimeEvent = {
  action: 'RESERVED' | 'CANCELLED' | string;
  roomId: number;
  startTime: string;
  endTime: string;
};

type ReservationRealtimeOptions = {
  onSeatEvent?: (event: ReadingSeatRealtimeEvent) => void;
  onRoomEvent?: (event: RoomReservationRealtimeEvent) => void;
  onMySeatEvent?: (event: ReadingSeatRealtimeEvent) => void;
  onMyRoomEvent?: (event: RoomReservationRealtimeEvent) => void;
};

function isBrowserOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

export function useReservationRealtimeStatus(options?: ReservationRealtimeOptions) {
  const [status, setStatus] =
    useState<ReservationRealtimeStatus>('disconnected');
  const onSeatEventRef = useRef(options?.onSeatEvent);
  const onRoomEventRef = useRef(options?.onRoomEvent);
  const onMySeatEventRef = useRef(options?.onMySeatEvent);
  const onMyRoomEventRef = useRef(options?.onMyRoomEvent);

  useEffect(() => {
    onSeatEventRef.current = options?.onSeatEvent;
  }, [options?.onSeatEvent]);

  useEffect(() => {
    onRoomEventRef.current = options?.onRoomEvent;
  }, [options?.onRoomEvent]);

  useEffect(() => {
    onMySeatEventRef.current = options?.onMySeatEvent;
  }, [options?.onMySeatEvent]);

  useEffect(() => {
    onMyRoomEventRef.current = options?.onMyRoomEvent;
  }, [options?.onMyRoomEvent]);

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

          nextClient.subscribe('/sub/reservations/rooms', (message) => {
            if (!message.body) {
              return;
            }

            try {
              const event = JSON.parse(message.body) as RoomReservationRealtimeEvent;
              onRoomEventRef.current?.(event);
            } catch {
              // Ignore malformed realtime messages without breaking the socket.
            }
          });

          nextClient.subscribe('/user/queue/reservations/seats', (message) => {
            if (!message.body) {
              return;
            }

            try {
              const event = JSON.parse(message.body) as ReadingSeatRealtimeEvent;
              onMySeatEventRef.current?.(event);
            } catch {
              // Ignore malformed realtime messages without breaking the socket.
            }
          });

          nextClient.subscribe('/user/queue/reservations/rooms', (message) => {
            if (!message.body) {
              return;
            }

            try {
              const event = JSON.parse(message.body) as RoomReservationRealtimeEvent;
              onMyRoomEventRef.current?.(event);
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
