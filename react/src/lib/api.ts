import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function authHeader(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  withAuth = true
): Promise<T> {
  const headers: HeadersInit = {
    ...(withAuth ? await authHeader() : {}),
    ...(init.headers || {}),
  };
  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // 4a only uses the unauthenticated health probe + auth-guarded raw client.
  // Session methods land in 4b/4c.
  health: () => request<{ ok: boolean }>('/health', {}, false),
};
