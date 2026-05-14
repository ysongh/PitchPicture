import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { Home } from './pages/Home';
import { Recording } from './pages/Recording';
import { Processing } from './pages/Processing';
import type { ReactNode } from 'react';
import './App.css';

function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <main className="page">
        <p>Loading…</p>
      </main>
    );
  }
  if (!session) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
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
            path="/processing/:id"
            element={
              <RequireAuth>
                <Processing />
              </RequireAuth>
            }
          />
          <Route
            path="*"
            element={
              <main className="page">
                <p>Not found.</p>
              </main>
            }
          />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}
