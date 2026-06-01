import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { exportDiagram, type ExportFormat } from '../lib/exportDiagram';
import { DiagramView } from '../components/DiagramView';
import { AppShell } from '../components/AppShell';
import { Menu } from '../components/Menu';
import { CaretDownIcon, DownloadIcon } from '../components/icons';

type Shared = Awaited<ReturnType<typeof api.getShared>>;

export function Share() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<Shared | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  async function doExport(format: ExportFormat) {
    if (!data) return;
    setExporting(format);
    setExportError(null);
    try {
      await exportDiagram(format, data.title);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : String(e));
    } finally {
      setExporting(null);
    }
  }

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    api
      .getShared(token)
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch(() => {
        setError('Not found.');
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <AppShell minimal>
        <p className="pp-muted">Loading…</p>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell minimal>
        <div className="pp-status-card pp-card">
          <h1>Not found</h1>
          <p className="pp-muted">
            This share link doesn't exist or the pitch isn't ready yet.
          </p>
          <Link to="/" className="pp-btn pp-btn--primary">
            Go to Pitch Picture
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell minimal>
      <div className="pp-page">
        <div className="pp-page-head">
          <div>
            <h1>{data.title || 'Untitled pitch'}</h1>
            {data.diagram_type && (
              <div className="pp-result-sub" style={{ marginTop: 6 }}>
                <span className="pp-chip">{data.diagram_type.replace(/_/g, ' ')}</span>
              </div>
            )}
          </div>
          {data.mermaid_code && (
            <Menu
              align="end"
              trigger={({ toggle, open }) => (
                <button
                  type="button"
                  className="pp-btn pp-btn--secondary"
                  onClick={toggle}
                  aria-expanded={open}
                  disabled={exporting !== null}
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
          )}
        </div>

        {exportError && <p className="error">{exportError}</p>}

        {data.mermaid_code && (
          <div className="pp-canvas">
            <DiagramView code={data.mermaid_code} />
          </div>
        )}

        {data.summary && (
          <section className="pp-section">
            <h2 className="pp-section-title">Summary</h2>
            <p className="pp-section-body">{data.summary}</p>
          </section>
        )}

        {data.key_concepts && data.key_concepts.length > 0 && (
          <section className="pp-section">
            <h2 className="pp-section-title">Key concepts</h2>
            <div className="pp-tags">
              {data.key_concepts.map((c) => (
                <span key={c} className="pp-tag">
                  {c}
                </span>
              ))}
            </div>
          </section>
        )}

        <footer className="pp-share-footer">
          Made with <Link to="/">Pitch Picture</Link>
        </footer>
      </div>
    </AppShell>
  );
}
