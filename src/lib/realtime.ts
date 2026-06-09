import { API_BASE_URL } from './api';

const WEBSOCKET_ENDPOINT = '/ws-univus';

export function getWebSocketEndpointUrl() {
  const baseUrl =
    API_BASE_URL && API_BASE_URL.length > 0
      ? API_BASE_URL
      : typeof window !== 'undefined'
        ? window.location.origin
        : 'http://localhost:9090';

  return new URL(WEBSOCKET_ENDPOINT, baseUrl).toString();
}
