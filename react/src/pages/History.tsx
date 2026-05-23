import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { AppShell } from '../components/AppShell';
import { Menu } from '../components/Menu';
import { CalendarIcon, KebabIcon, LinkIcon, MicIcon, PlusIcon, TrashIcon } from '../components/icons';
import type { SessionStatus } from '../lib/types';

type Row = Awaited<ReturnType<typeof api.list>>[number];

function pillKind(s: SessionStatus): 'ready' | 'processing' | 'failed' {
  if (s === 'ready') return 'ready';
  if (s === 'failed') return 'failed';
  return 'processing';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function HistoryRow({
  row,
  onDeleted,
  onError,
}: {
  row: Row;
  onDeleted: (id: string) => void;
  onError: (msg: string) => void;
}) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const href = row.status === 'ready' ? `/result/${row.id}` : `/processing/${row.id}`;

  async function copyLink() {
    try {
      const s = await api.getSession(row.id);
      await navigator.clipboard.writeText(
        `${window.location.origin}/#/s/${s.share_token}`
      );
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this pitch? This cannot be undone.')) return;
    setBusy(true);
    try {
      await api.del(row.id);
      onDeleted(row.id);
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <article
      className="pp-history-item"
      role="button"
      tabIndex={0}
      onClick={() => navigate(href)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate(href);
        }
      }}
    >
      <div className="pp-history-main">
        <div className="pp-history-title">{row.title || 'Untitled pitch'}</div>
        <div className="pp-history-meta">
          {row.diagram_type && (
            <span className="pp-chip">{row.diagram_type.replace(/_/g, ' ')}</span>
          )}
          <span className="pp-meta-dot" />
          <CalendarIcon />
          <span>{formatDate(row.created_at)}</span>
        </div>
      </div>

      <span className={`pp-pill pp-pill--${pillKind(row.status)}`}>{row.status}</span>

      <Menu
        align="end"
        trigger={({ open, toggle }) => (
          <button
            type="button"
            className="pp-icon-btn"
            onClick={toggle}
            aria-label="More actions"
            aria-expanded={open}
            aria-haspopup="menu"
          >
            <KebabIcon />
          </button>
        )}
      >
        {(close) => (
          <>
            {row.status === 'ready' && (
              <button
                type="button"
                className="pp-menu-item"
                role="menuitem"
                onClick={() => {
                  close();
                  void copyLink();
                }}
              >
                <LinkIcon /> Copy share link
              </button>
            )}
            <button
              type="button"
              className="pp-menu-item pp-menu-item--danger"
              role="menuitem"
              disabled={busy}
              onClick={() => {
                close();
                void handleDelete();
              }}
            >
              <TrashIcon /> Delete
            </button>
          </>
        )}
      </Menu>
    </article>
  );
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
      <AppShell active="history">
        <div className="pp-status-card pp-card">
          <p className="error">{error}</p>
          <Link to="/" className="pp-btn pp-btn--secondary">
            Home
          </Link>
        </div>
      </AppShell>
    );
  }

  if (!rows) {
    return (
      <AppShell active="history">
        <p className="pp-muted">Loading…</p>
      </AppShell>
    );
  }

  return (
    <AppShell active="history" wide>
      <div className="pp-page">
        <div className="pp-page-head">
          <div>
            <h1>Your pitches</h1>
            <div className="pp-page-count">
              {rows.length === 0
                ? 'Nothing yet'
                : `${rows.length} session${rows.length === 1 ? '' : 's'}`}
            </div>
          </div>
          <Link to="/record" className="pp-btn pp-btn--primary">
            <PlusIcon /> New recording
          </Link>
        </div>

        {rows.length === 0 ? (
          <div className="pp-empty pp-card">
            <p>No sessions yet — start your first recording.</p>
            <Link to="/record" className="pp-btn pp-btn--primary">
              <MicIcon /> Start recording
            </Link>
          </div>
        ) : (
          <div className="pp-history-list">
            {rows.map((r) => (
              <HistoryRow
                key={r.id}
                row={r}
                onDeleted={(id) =>
                  setRows((prev) => (prev ? prev.filter((x) => x.id !== id) : prev))
                }
                onError={setError}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
