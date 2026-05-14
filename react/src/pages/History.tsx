import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { SessionStatus } from '../lib/types';

type Row = Awaited<ReturnType<typeof api.list>>[number];

function statusClass(s: SessionStatus): string {
  if (s === 'ready') return 'badge badge-ready';
  if (s === 'failed') return 'badge badge-failed';
  if (s === 'uploading') return 'badge badge-idle';
  return 'badge badge-working';
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function rowHref(r: Row): string {
  return r.status === 'ready' ? `/result/${r.id}` : `/processing/${r.id}`;
}

export function History() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .list()
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  if (error) {
    return (
      <main className="page">
        <p className="error">{error}</p>
        <Link to="/" className="button">
          Home
        </Link>
      </main>
    );
  }

  if (!rows) {
    return (
      <main className="page">
        <p>Loading…</p>
      </main>
    );
  }

  return (
    <main className="page wide">
      <div className="hero">
        <h1>Your pitches</h1>
        <p className="tagline">{rows.length === 0 ? 'Nothing yet.' : `${rows.length} session${rows.length === 1 ? '' : 's'}`}</p>
      </div>

      {rows.length === 0 ? (
        <div className="card">
          <p>No sessions yet — start your first recording.</p>
          <div className="row">
            <Link to="/record" className="primary button">
              Start recording
            </Link>
          </div>
        </div>
      ) : (
        <ul className="session-list">
          {rows.map((r) => (
            <li key={r.id}>
              <Link to={rowHref(r)} className="session-card">
                <div className="session-main">
                  <div className="session-title">{r.title || 'Untitled pitch'}</div>
                  <div className="session-meta">
                    {r.diagram_type ? <span>{r.diagram_type}</span> : null}
                    <span>·</span>
                    <span>{formatDate(r.created_at)}</span>
                  </div>
                </div>
                <span className={statusClass(r.status)}>{r.status}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="row" style={{ marginTop: '1.5rem' }}>
        <Link to="/" className="button ghost">
          Home
        </Link>
        <Link to="/record" className="button">
          New recording
        </Link>
      </div>
    </main>
  );
}
