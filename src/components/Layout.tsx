import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { isStaffMode } from '../utils/staffMode';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
  showNav?: boolean;
  rightAction?: ReactNode;
}

export function Layout({
  children,
  title,
  showBack = false,
  showNav = true,
  rightAction,
}: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const staffMode = isStaffMode();

  return (
    <div className="app">
      {title && (
        <header className="header">
          <div className="header-content">
            <div className="flex items-center gap-2">
              {showBack && (
                <button className="back-button" onClick={() => navigate(-1)}>
                  ←
                </button>
              )}
              <h1>{title}</h1>
            </div>
            {rightAction}
          </div>
        </header>
      )}

      <main className="main-content">{children}</main>

      {showNav && (
        <nav className="nav">
          <div className="nav-content">
            <Link
              to="/"
              className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M3 10h18" />
              </svg>
              <span>チケット</span>
            </Link>
            <Link
              to="/scan"
              className={`nav-item ${location.pathname === '/scan' ? 'active' : ''}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                <rect x="7" y="7" width="10" height="10" />
              </svg>
              <span>スキャン</span>
            </Link>
            {staffMode && (
              <Link
                to="/manage"
                className={`nav-item ${location.pathname.startsWith('/manage') ? 'active' : ''}`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
                <span>管理</span>
              </Link>
            )}
            <Link
              to="/settings"
              className={`nav-item ${location.pathname === '/settings' ? 'active' : ''}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span>設定</span>
            </Link>
          </div>
        </nav>
      )}
    </div>
  );
}
