import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Recorder } from '../components/Recorder';
import { api } from '../lib/api';

type Phase = 'recording' | 'uploading' | 'error';

export function Recording() {
  const navigate = useNavigate();
  const { id: refineId } = useParams<{ id: string }>();
  const isRefine = !!refineId;
  const [phase, setPhase] = useState<Phase>('recording');
  const [error, setError] = useState<string | null>(null);

  async function handleStop(blob: Blob) {
    setPhase('uploading');
    setError(null);
    try {
      if (isRefine) {
        await api.refine(refineId, blob);
        navigate(`/processing/${refineId}`);
      } else {
        const { id } = await api.createSession();
        await api.uploadAudio(id, blob);
        navigate(`/processing/${id}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('error');
    }
  }

  return (
    <main className="page">
      <div className="hero">
        <h1>{isRefine ? 'Refine your diagram' : 'Record your pitch'}</h1>
        <p className="tagline">
          {isRefine
            ? 'Record a short follow-up — say what should change.'
            : 'Hit start, talk for up to 30 minutes, hit stop.'}
        </p>
      </div>
      <div className="card">
        {phase === 'recording' && <Recorder onStop={handleStop} />}
        {phase === 'uploading' && <p>{isRefine ? 'Refining…' : 'Uploading…'}</p>}
        {phase === 'error' && (
          <>
            <p className="error">{error}</p>
            <Link to={isRefine ? `/result/${refineId}` : '/'} className="button">
              {isRefine ? 'Back to diagram' : 'Back home'}
            </Link>
          </>
        )}
        {phase === 'recording' && (
          <Link to={isRefine ? `/result/${refineId}` : '/'} className="button ghost">
            Cancel
          </Link>
        )}
      </div>
    </main>
  );
}
