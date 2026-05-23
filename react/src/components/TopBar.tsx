import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useTheme, type ThemePreference } from '../lib/theme';
import { Menu } from './Menu';
import { BrandMark } from './icons';

const THEMES: ThemePreference[] = ['system', 'light', 'dark'];

function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  return (
    <div className="pp-theme" role="group" aria-label="Theme">
      {THEMES.map((v) => (
        <button
          key={v}
          type="button"
          aria-pressed={preference === v}
          onClick={() => setPreference(v)}
        >
          {v[0].toUpperCase() + v.slice(1)}
        </button>
      ))}
    </div>
  );
}

interface Props {
  active?: 'home' | 'history';
  /** Minimal bar — brand + theme only. Used on public / signed-out pages. */
  minimal?: boolean;
}

export function TopBar({ active, minimal }: Props) {
  const { session, signOut } = useAuth();
  const email = session?.user?.email ?? '';
  const initial = email ? email[0].toUpperCase() : '?';
  const showAccount = !minimal && !!session;

  return (
    <header className="pp-topbar">
      <Link className="pp-brand" to="/">
        <span className="pp-brand-mark">
          <BrandMark />
        </span>
        <span>Pitch Picture</span>
      </Link>

      {!minimal && (
        <nav className="pp-nav">
          <Link to="/" className={active === 'home' ? 'active' : ''}>
            Home
          </Link>
          <Link to="/history" className={active === 'history' ? 'active' : ''}>
            History
          </Link>
        </nav>
      )}

      <div className="pp-topbar-right">
        <ThemeToggle />
        {showAccount && (
          <Menu
            align="end"
            trigger={({ open, toggle }) => (
              <button
                type="button"
                className="pp-account"
                onClick={toggle}
                aria-expanded={open}
                aria-haspopup="menu"
              >
                <span className="pp-avatar">{initial}</span>
                <span className="pp-account-email">{email}</span>
              </button>
            )}
          >
            {(close) => (
              <button
                type="button"
                className="pp-menu-item pp-menu-item--danger"
                role="menuitem"
                onClick={() => {
                  close();
                  void signOut();
                }}
              >
                Sign out
              </button>
            )}
          </Menu>
        )}
      </div>
    </header>
  );
}
