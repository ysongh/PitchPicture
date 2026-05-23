import { HashRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { ThemeProvider } from './lib/theme';
import { Home } from './pages/Home';
import { Recording } from './pages/Recording';
import { Processing } from './pages/Processing';
import { Result } from './pages/Result';
import { Share } from './pages/Share';
import { History } from './pages/History';
import type { ReactNode } from 'react';
import './App.css';

function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <div className="pp-fallback">
        <p className="pp-muted">Loading…</p>
      </div>
    );
  }
  if (!session) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <HashRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/record"
            element={
              <RequireAuth>
                <Recording />
              </RequireAuth>
            }
          />
          <Route
            path="/refine/:id"
            element={
              <RequireAuth>
                <Recording />
              </RequireAuth>
            }
          />
          <Route
            path="/processing/:id"
            element={
              <RequireAuth>
                <Processing />
              </RequireAuth>
            }
          />
          <Route
            path="/result/:id"
            element={
              <RequireAuth>
                <Result />
              </RequireAuth>
            }
          />
          <Route
            path="/history"
            element={
              <RequireAuth>
                <History />
              </RequireAuth>
            }
          />
          <Route path="/s/:token" element={<Share />} />
          <Route
            path="*"
            element={
              <div className="pp-fallback">
                <h1>Page not found</h1>
                <Link to="/" className="pp-btn pp-btn--secondary">
                  Go home
                </Link>
              </div>
            }
          />
          </Routes>
        </HashRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
