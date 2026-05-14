import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Recorder } from '../components/Recorder';
import { api } from '../lib/api';

type Phase = 'recording' | 'uploading' | 'error';

export function Recording() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('recording');
  const [error, setError] = useState<string | null>(null);

  async function handleStop(blob: Blob) {
    setPhase('uploading');
    setError(null);
    try {
      const { id } = await api.createSession();
      await api.uploadAudio(id, blob);
      navigate(`/processing/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('error');
    }
  }

  return (
    <main className="page">
      <div className="hero">
        <h1>Record your pitch</h1>
        <p className="tagline">Hit start, talk for up to 30 minutes, hit stop.</p>
      </div>
      <div className="card">
        {phase === 'recording' && <Recorder onStop={handleStop} />}
        {phase === 'uploading' && <p>Uploading…</p>}
        {phase === 'error' && (
          <>
            <p className="error">{error}</p>
            <Link to="/" className="button">
              Back home
            </Link>
          </>
        )}
        {phase === 'recording' && (
          <Link to="/" className="button ghost">
            Cancel
          </Link>
        )}
      </div>
    </main>
  );
}
