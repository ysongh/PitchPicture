import { HashRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import { Home } from './pages/Home';
import './App.css';

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Home />} />
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
