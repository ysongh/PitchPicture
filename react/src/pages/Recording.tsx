import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Recorder } from '../components/Recorder';
import { AppShell } from '../components/AppShell';
import { api } from '../lib/api';

type Phase = 'recording' | 'uploading' | 'error';

export function Recording() {
  const navigate = useNavigate();
  const { id: refineId } = useParams<{ id: string }>();
  const isRefine = !!refineId;
  const [phase, setPhase] = useState<Phase>('recording');
  const [error, setError] = useState<string | null>(null);

  const cancelTo = isRefine ? `/result/${refineId}` : '/';

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
    <AppShell active="home">
      <section className="pp-record">
        <div className="pp-record-head">
          <h1>{isRefine ? 'Refine your diagram' : 'Record your pitch'}</h1>
          <p>
            {isRefine
              ? 'Record a short follow-up — say what should change.'
              : 'Hit start, talk for up to 30 minutes, hit stop.'}
          </p>
        </div>

        {phase === 'recording' && <Recorder onStop={handleStop} cancelTo={cancelTo} />}

        {phase === 'uploading' && (
          <div className="pp-row pp-row--center">
            <span className="pp-spinner" aria-hidden />
            <span className="pp-muted">{isRefine ? 'Refining…' : 'Uploading…'}</span>
          </div>
        )}

        {phase === 'error' && (
          <>
            <p className="error">{error}</p>
            <Link to={cancelTo} className="pp-btn pp-btn--secondary">
              {isRefine ? 'Back to diagram' : 'Back home'}
            </Link>
          </>
        )}
      </section>
    </AppShell>
  );
}
