import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useTheme, type ThemePreference } from '../lib/theme';

function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  const opts: Array<{ key: ThemePreference; label: string }> = [
    { key: 'system', label: 'System' },
    { key: 'light', label: 'Light' },
    { key: 'dark', label: 'Dark' },
  ];
  return (
    <div className="theme-toggle" role="radiogroup" aria-label="Theme">
      {opts.map((o) => (
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={preference === o.key}
          className={preference === o.key ? 'active' : ''}
          onClick={() => setPreference(o.key)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Home() {
  const { session, signIn, signUp, signOut, loading } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (loading) {
    return (
      <main className="page">
        <p>Loading…</p>
      </main>
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
      <main className="page">
        <div className="hero">
          <h1>Pitch Picture</h1>
          <p className="tagline">Pitch your idea, see the picture.</p>
        </div>
        <form className="card" onSubmit={handleSubmit}>
          <h2>{mode === 'signin' ? 'Sign in' : 'Create account'}</h2>
          <div className="auth-tabs" role="tablist">
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
          <label>
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>
          <label>
            Password
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
          <button type="submit" disabled={submitting} className="primary">
            {submitting
              ? mode === 'signin'
                ? 'Signing in…'
                : 'Creating account…'
              : mode === 'signin'
                ? 'Sign in'
                : 'Sign up'}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="hero">
        <h1>Pitch Picture</h1>
        <p className="tagline">Pitch your idea, see the picture.</p>
      </div>
      <div className="card">
        <p>
          Signed in as <strong>{session.user.email}</strong>
        </p>
        <div className="row">
          <Link to="/record" className="primary button">
            Start recording
          </Link>
          <Link to="/history" className="button">
            History
          </Link>
          <button type="button" onClick={signOut} className="ghost">
            Sign out
          </button>
        </div>
        <ThemeToggle />
      </div>
    </main>
  );
}
