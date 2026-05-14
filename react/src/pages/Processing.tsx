import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import type { Session } from '../lib/types';

// 4b stub: one-shot fetch + manual refresh.
// 4c will replace this with 2s polling and auto-navigation on `ready`.
export function Processing() {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!id) return;
    setError(null);
    try {
      const s = await api.getSession(id);
      setSession(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  return (
    <main className="page">
      <div className="hero">
        <h1>Processing</h1>
        <p className="tagline">Session {id}</p>
      </div>
      <div className="card">
        {error && <p className="error">{error}</p>}
        {session && (
          <>
            <p>
              Status: <strong>{session.status}</strong>
            </p>
            {session.error_message && <p className="error">{session.error_message}</p>}
            <pre style={{ overflow: 'auto', fontSize: 12 }}>
              {JSON.stringify(session, null, 2)}
            </pre>
          </>
        )}
        <div className="row">
          <button type="button" onClick={load}>
            Refresh
          </button>
          <Link to="/" className="button ghost">
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
