import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { AppShell } from '../components/AppShell';
import { MicIcon } from '../components/icons';

export function Home() {
  const { session, signIn, signUp, loading } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="pp-fallback">
        <p className="pp-muted">Loading…</p>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
      } else {
        const { needsConfirmation } = await signUp(email, password);
        if (needsConfirmation) {
          setNotice('Check your email to confirm your account, then sign in.');
          setMode('signin');
          setPassword('');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (!session) {
    return (
      <AppShell minimal>
        <div className="pp-auth">
          <div className="pp-auth-head">
            <h1>Pitch Picture</h1>
            <p>Pitch your idea, see the picture.</p>
          </div>
          <form className="pp-card pp-auth-card" onSubmit={handleSubmit}>
            <div className="pp-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'signin'}
                className={mode === 'signin' ? 'active' : ''}
                onClick={() => {
                  setMode('signin');
                  setError(null);
                  setNotice(null);
                }}
              >
                Sign in
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'signup'}
                className={mode === 'signup' ? 'active' : ''}
                onClick={() => {
                  setMode('signup');
                  setError(null);
                  setNotice(null);
                }}
              >
                Sign up
              </button>
            </div>
            <label className="pp-field">
              <span>Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </label>
            <label className="pp-field">
              <span>Password</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                minLength={mode === 'signup' ? 6 : undefined}
              />
            </label>
            {error && <p className="error">{error}</p>}
            {notice && <p className="notice">{notice}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="pp-btn pp-btn--primary pp-btn--block"
            >
              {submitting
                ? mode === 'signin'
                  ? 'Signing in…'
                  : 'Creating account…'
                : mode === 'signin'
                  ? 'Sign in'
                  : 'Sign up'}
            </button>
          </form>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell active="home">
      <section className="pp-hero">
        <div className="eyebrow">Welcome back</div>
        <h1>What's the idea?</h1>
        <p>
          Talk it through for up to 30 minutes — Pitch Picture turns the recording into a
          diagram you can share.
        </p>
        <div className="pp-hero-actions">
          <Link to="/record" className="pp-btn pp-btn--primary pp-btn--large">
            <MicIcon /> Start recording
          </Link>
          <Link to="/history" className="pp-link">
            or browse your history →
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
