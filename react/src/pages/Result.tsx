import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { DiagramView } from '../components/DiagramView';
import type { Session } from '../lib/types';

export function Result() {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
  if (!session) {
    return (
      <main className="page">
        <p>Loading…</p>
      </main>
    );
  }
  if (session.status !== 'ready') {
    return (
      <main className="page">
        <p>Not ready yet. Status: {session.status}</p>
        <Link to={`/processing/${session.id}`} className="button">
          See progress
        </Link>
      </main>
    );
  }

  return (
    <main className="page wide">
      <div className="hero">
        <h1>{session.title || 'Untitled pitch'}</h1>
        <p className="tagline">{session.diagram_type}</p>
      </div>

      {session.mermaid_code && (
        <div className="card">
          <DiagramView code={session.mermaid_code} />
        </div>
      )}

      {session.summary && (
        <div className="card">
          <h2>Summary</h2>
          <p>{session.summary}</p>
        </div>
      )}

      {session.key_concepts && session.key_concepts.length > 0 && (
        <div className="card">
          <h2>Key concepts</h2>
          <ul>
            {session.key_concepts.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="row">
        <button type="button" className="primary" onClick={copyShare}>
          {copied ? 'Copied!' : 'Copy share link'}
        </button>
        <Link to="/record" className="button">
          New recording
        </Link>
        <Link to="/" className="button ghost">
          Home
        </Link>
      </div>
    </main>
  );
}
