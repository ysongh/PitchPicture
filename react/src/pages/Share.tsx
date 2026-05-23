import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { DiagramView } from '../components/DiagramView';
import { AppShell } from '../components/AppShell';

type Shared = Awaited<ReturnType<typeof api.getShared>>;

export function Share() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<Shared | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
        <h1 className="pp-result-title">{data.title || 'Untitled pitch'}</h1>
        {data.diagram_type && (
          <div className="pp-result-sub">
            <span className="pp-chip">{data.diagram_type.replace(/_/g, ' ')}</span>
          </div>
        )}

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
