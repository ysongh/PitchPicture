import { supabase } from './supabase';
import type { Session } from './types';

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
  health: () => request<{ ok: boolean }>('/health', {}, false),

  createSession: () =>
    request<{ id: string; status: 'uploading' }>('/api/sessions', {
      method: 'POST',
    }),

  uploadAudio: async (id: string, blob: Blob) => {
    const form = new FormData();
    const ext = blob.type.includes('webm') ? 'webm' : 'bin';
    form.append('audio', blob, `recording.${ext}`);
    return request<{ id: string; status: 'transcribing' }>(
      `/api/sessions/${id}/audio`,
      { method: 'POST', body: form }
    );
  },

  getSession: (id: string) => request<Session>(`/api/sessions/${id}`),

  getShared: (token: string) =>
    request<Pick<
      Session,
      | 'id'
      | 'status'
      | 'title'
      | 'diagram_type'
      | 'diagram_reasoning'
      | 'mermaid_code'
      | 'summary'
      | 'key_concepts'
      | 'created_at'
    >>(`/api/share/${token}`, {}, false),
};
