import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { exportDiagram, type ExportFormat } from '../lib/exportDiagram';
import { DiagramView } from '../components/DiagramView';
import { AppShell } from '../components/AppShell';
import { Menu } from '../components/Menu';
import {
  ArrowLeftIcon,
  CalendarIcon,
  CaretDownIcon,
  ChevronIcon,
  DownloadIcon,
  LinkIcon,
  MicIcon,
  SparklesIcon,
  TrashIcon,
} from '../components/icons';
import type { Session } from '../lib/types';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function Result() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .getSession(id)
      .then(setSession)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [id]);

  async function copyShare() {
    if (!session) return;
    const url = `${window.location.origin}/#/s/${session.share_token}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function doExport(format: ExportFormat) {
    if (!session) return;
    setExporting(format);
    setError(null);
    try {
      await exportDiagram(format, session.title);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setExporting(null);
    }
  }

  async function handleDelete() {
    if (!session) return;
    if (!window.confirm('Delete this pitch? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await api.del(session.id);
      navigate('/history', { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setDeleting(false);
    }
  }

  if (error) {
    return (
      <AppShell active="history">
        <div className="pp-status-card pp-card">
          <p className="error">{error}</p>
          <Link to="/history" className="pp-btn pp-btn--secondary">
            Back to history
          </Link>
        </div>
      </AppShell>
    );
  }

  if (!session) {
    return (
      <AppShell active="history">
        <p className="pp-muted">Loading…</p>
      </AppShell>
    );
  }

  if (session.status !== 'ready') {
    return (
      <AppShell active="history">
        <div className="pp-status-card pp-card">
          <p className="pp-muted">Not ready yet — status: {session.status}</p>
          <Link to={`/processing/${session.id}`} className="pp-btn pp-btn--primary">
            See progress
          </Link>
        </div>
      </AppShell>
    );
  }

  const wordCount = session.transcript
    ? session.transcript.trim().split(/\s+/).length
    : 0;

  return (
    <AppShell active="history" wide>
      <div className="pp-page">
        <div className="pp-result-head">
          <Link className="pp-back" to="/history">
            <ArrowLeftIcon /> History
          </Link>
          <span className="pp-meta-dot" />
          <CalendarIcon /> {formatDate(session.created_at)}
          <span className="pp-meta-dot" />
          <span className="pp-pill pp-pill--ready">ready</span>
        </div>

        <h1 className="pp-result-title">{session.title || 'Untitled pitch'}</h1>
        {session.diagram_type && (
          <div className="pp-result-sub">
            <span className="pp-chip">{session.diagram_type.replace(/_/g, ' ')}</span>
          </div>
        )}

        {session.error_message && (
          <p className="warn" style={{ marginTop: 12 }}>
            {session.error_message}
          </p>
        )}

        {session.mermaid_code && (
          <div className="pp-canvas">
            <DiagramView code={session.mermaid_code} />
          </div>
        )}

        <div className="pp-actions">
          <button type="button" className="pp-btn pp-btn--primary" onClick={copyShare}>
            <LinkIcon /> {copied ? 'Copied!' : 'Copy share link'}
          </button>
          <Link to={`/refine/${session.id}`} className="pp-btn pp-btn--secondary">
            <SparklesIcon /> Refine with a recording
          </Link>
          <Link to="/record" className="pp-btn pp-btn--secondary">
            <MicIcon /> New recording
          </Link>
          <Menu
            align="start"
            trigger={({ toggle, open }) => (
              <button
                type="button"
                className="pp-btn pp-btn--secondary"
                onClick={toggle}
                aria-expanded={open}
                disabled={!session.mermaid_code || exporting !== null}
              >
                <DownloadIcon />{' '}
                {exporting === 'png'
                  ? 'Saving PNG…'
                  : exporting === 'svg'
                    ? 'Saving SVG…'
                    : 'Download'}
                <CaretDownIcon />
              </button>
            )}
          >
            {(close) => (
              <>
                <button
                  type="button"
                  className="pp-menu-item"
                  onClick={() => {
                    close();
                    doExport('png');
                  }}
                >
                  <DownloadIcon /> PNG image
                </button>
                <button
                  type="button"
                  className="pp-menu-item"
                  onClick={() => {
                    close();
                    doExport('svg');
                  }}
                >
                  <DownloadIcon /> SVG vector
                </button>
              </>
            )}
          </Menu>
          <span className="pp-actions-spacer" />
          <span className="pp-actions-divider" />
          <button
            type="button"
            className="pp-btn pp-btn--danger"
            onClick={handleDelete}
            disabled={deleting}
          >
            <TrashIcon /> {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>

        {session.summary && (
          <section className="pp-section">
            <h2 className="pp-section-title">Summary</h2>
            <p className="pp-section-body">{session.summary}</p>
          </section>
        )}

        {session.key_concepts && session.key_concepts.length > 0 && (
          <section className="pp-section">
            <h2 className="pp-section-title">Key concepts</h2>
            <div className="pp-tags">
              {session.key_concepts.map((c) => (
                <span key={c} className="pp-tag">
                  {c}
                </span>
              ))}
            </div>
          </section>
        )}

        {session.transcript && (
          <details className="pp-transcript">
            <summary>
              <ChevronIcon />
              Transcript · {wordCount} {wordCount === 1 ? 'word' : 'words'}
            </summary>
            <div className="pp-transcript-body">{session.transcript}</div>
          </details>
        )}
      </div>
    </AppShell>
  );
}
