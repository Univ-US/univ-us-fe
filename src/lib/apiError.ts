import { isAxiosError } from 'axios';

type ApiErrorBody = {
  message?: unknown;
  error?: unknown;
};

export function getApiErrorMessage(error: unknown, fallbackMessage: string) {
  if (!isAxiosError(error)) {
    return fallbackMessage;
  }

  const data = error.response?.data;

  if (typeof data === 'string') {
    return data.trim() || fallbackMessage;
  }

  if (!data || typeof data !== 'object') {
    return fallbackMessage;
  }

  const body = data as ApiErrorBody;

  if (typeof body.message === 'string' && body.message.trim()) {
    return body.message;
  }

  if (typeof body.error === 'string' && body.error.trim()) {
    return body.error;
  }

  return fallbackMessage;
}

export function isApiErrorStatus(error: unknown, status: number) {
  return isAxiosError(error) && error.response?.status === status;
}
