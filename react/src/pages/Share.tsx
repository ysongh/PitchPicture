import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { DiagramView } from '../components/DiagramView';

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
      <main className="page">
        <p>Loading…</p>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="page">
        <div className="hero">
          <h1>Not found</h1>
          <p className="tagline">This share link doesn't exist or the pitch isn't ready yet.</p>
        </div>
        <div className="row">
          <Link to="/" className="button">
            Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="page wide">
      <div className="hero">
        <h1>{data.title || 'Untitled pitch'}</h1>
        <p className="tagline">{data.diagram_type}</p>
      </div>

      {data.mermaid_code && (
        <div className="card">
          <DiagramView code={data.mermaid_code} />
        </div>
      )}

      {data.summary && (
        <div className="card">
          <h2>Summary</h2>
          <p>{data.summary}</p>
        </div>
      )}

      {data.key_concepts && data.key_concepts.length > 0 && (
        <div className="card">
          <h2>Key concepts</h2>
          <ul>
            {data.key_concepts.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      <footer className="share-footer">
        Made with{' '}
        <Link to="/" className="share-link">
          Pitch Picture
        </Link>
      </footer>
    </main>
  );
}
