import { Platform } from 'react-native';
import { API_URL, authClient } from './auth-client';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: { method?: 'GET' | 'POST'; body?: unknown } = {}) {
  const isWeb = Platform.OS === 'web';
  const headers: Record<string, string> = {};
  if (init.body !== undefined) headers['content-type'] = 'application/json';
  // No celular a sessão fica no SecureStore e vai no header; na web vai no cookie do navegador
  if (!isWeb) {
    const cookie = await authClient.getCookie();
    if (cookie) headers.cookie = cookie;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: init.method ?? 'GET',
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    credentials: isWeb ? 'include' : 'omit',
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data?.error ?? 'Algo deu errado. Tente novamente.');
  return data as T;
}
