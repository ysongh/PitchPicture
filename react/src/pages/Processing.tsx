import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { AppShell } from '../components/AppShell';
import type { Session } from '../lib/types';

const POLL_MS = 2000;

const STATUS_TEXT: Record<string, string> = {
  uploading: 'Uploading your audio…',
  transcribing: 'Transcribing your audio…',
  analyzing: 'Analyzing the structure and generating your diagram…',
};

export function Processing() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const timerRef = useRef<number | null>(null);

  async function handleRetry() {
    if (!id) return;
    setRetrying(true);
    setError(null);
    try {
      await api.retry(id);
      setSession((s) => (s ? { ...s, status: 'transcribing', error_message: null } : s));
      timerRef.current = window.setTimeout(async function poll() {
        try {
          const s = await api.getSession(id);
          setSession(s);
          if (s.status === 'ready') {
            navigate(`/result/${s.id}`, { replace: true });
            return;
          }
          if (s.status === 'failed') return;
          timerRef.current = window.setTimeout(poll, POLL_MS);
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e));
          timerRef.current = window.setTimeout(poll, POLL_MS);
        }
      }, POLL_MS);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRetrying(false);
    }
  }

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function tick() {
      try {
        const s = await api.getSession(id!);
        if (cancelled) return;
        setSession(s);
        if (s.status === 'ready') {
          navigate(`/result/${s.id}`, { replace: true });
          return;
        }
        if (s.status === 'failed') return;
        timerRef.current = window.setTimeout(tick, POLL_MS);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        timerRef.current = window.setTimeout(tick, POLL_MS);
      }
    }

    tick();
    return () => {
      cancelled = true;
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [id, navigate]);

  const status = session?.status ?? 'uploading';
  const isFailed = status === 'failed';

  return (
    <AppShell active="home">
      <div className="pp-status-card pp-card">
        <h1>{isFailed ? 'Something went wrong' : 'Working on it'}</h1>

        {!isFailed && (
          <>
            <p className="pp-muted">{STATUS_TEXT[status] ?? 'Working…'}</p>
            <div className="pp-spinner-row">
              <span className="pp-spinner" aria-hidden />
              <span>{status}</span>
            </div>
          </>
        )}

        {isFailed && (
          <>
            <p className="error">{session?.error_message || 'Unknown error.'}</p>
            <div className="pp-row pp-row--center">
              <button
                type="button"
                className="pp-btn pp-btn--primary"
                onClick={handleRetry}
                disabled={retrying}
              >
                {retrying ? 'Retrying…' : 'Retry'}
              </button>
              <Link to="/record" className="pp-btn pp-btn--secondary">
                New recording
              </Link>
              <Link to="/" className="pp-btn pp-btn--ghost">
                Home
              </Link>
            </div>
          </>
        )}

        {error && !isFailed && (
          <p className="warn">Network hiccup: {error} — retrying.</p>
        )}
      </div>
    </AppShell>
  );
}
