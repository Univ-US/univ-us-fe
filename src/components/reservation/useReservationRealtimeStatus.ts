import { Client, type IStompSocket } from '@stomp/stompjs';
import { useEffect, useState } from 'react';
import SockJS from 'sockjs-client';

import { getWebSocketEndpointUrl } from '@/lib/realtime';

export type ReservationRealtimeStatus = 'connected' | 'disconnected';

export function useReservationRealtimeStatus() {
  const [status, setStatus] =
    useState<ReservationRealtimeStatus>('disconnected');

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () =>
        new SockJS(getWebSocketEndpointUrl()) as unknown as IStompSocket,
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: () => {},
      onConnect: () => setStatus('connected'),
      onDisconnect: () => setStatus('disconnected'),
      onStompError: () => setStatus('disconnected'),
      onWebSocketClose: () => setStatus('disconnected'),
      onWebSocketError: () => setStatus('disconnected'),
    });

    client.activate();

    return () => {
      void client.deactivate();
    };
  }, []);

  return status;
}
