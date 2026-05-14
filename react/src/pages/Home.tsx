import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export function Home() {
  const { session, signIn, signOut, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return (
      <main className="page">
        <p>Loading…</p>
      </main>
    );
  }

  async function handleSignIn(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
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
        <form className="card" onSubmit={handleSignIn}>
          <h2>Sign in</h2>
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
              autoComplete="current-password"
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={submitting} className="primary">
            {submitting ? 'Signing in…' : 'Sign in'}
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
      </div>
    </main>
  );
}
