import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
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
  const timerRef = useRef<number | null>(null);

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
    <main className="page">
      <div className="hero">
        <h1>{isFailed ? 'Something went wrong' : 'Working on it'}</h1>
        {!isFailed && <p className="tagline">{STATUS_TEXT[status] ?? 'Working…'}</p>}
      </div>
      <div className="card">
        {!isFailed && (
          <div className="spinner-row">
            <div className="spinner" aria-hidden />
            <span>{status}</span>
          </div>
        )}
        {isFailed && (
          <>
            <p className="error">{session?.error_message || 'Unknown error.'}</p>
            <div className="row">
              <Link to="/record" className="primary button">
                Try again
              </Link>
              <Link to="/" className="button ghost">
                Home
              </Link>
            </div>
          </>
        )}
        {error && !isFailed && <p className="warn">Network hiccup: {error} — retrying.</p>}
      </div>
    </main>
  );
}
