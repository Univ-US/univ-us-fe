import { Client, type IStompSocket } from "@stomp/stompjs";
import { useEffect, useRef } from "react";
import SockJS from "sockjs-client";

import { getWebSocketEndpointUrl } from "@/lib/realtime";
import type { EnrollResult } from "@/types/lmsStudentEnroll";

/** 수강신청 결과 푸시 구독 — /user/queue/lms/enroll-result. 재연결되면 onConnect가 다시 호출되어 구독도 자동 복구됨. */
export function useEnrollResultRealtime(onResult: (result: EnrollResult) => void) {
  const onResultRef = useRef(onResult);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    let client: Client | null = null;

    const nextClient = new Client({
      webSocketFactory: () => new SockJS(getWebSocketEndpointUrl()) as unknown as IStompSocket,
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: () => {},
      onConnect: () => {
        nextClient.subscribe("/user/queue/lms/enroll-result", (message) => {
          if (!message.body) return;
          try {
            const result = JSON.parse(message.body) as EnrollResult;
            onResultRef.current(result);
          } catch {
            // Ignore malformed realtime messages without breaking the socket.
          }
        });
      },
    });

    client = nextClient;
    nextClient.activate();

    return () => {
      const currentClient = client;
      client = null;
      void currentClient?.deactivate();
    };
  }, []);
}
