import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';
import { useTheme } from '../lib/theme';
import { storage } from '../lib/storage';
import { CircleHelp, LogIn, LogOut, Moon, Settings, BarChart3, Sun, UserPlus } from 'lucide-react';
import { HowToPlay, openHowToPlay } from './HowToPlay';
import { Tally } from './Tally';

function Logo() {
  const letters = ['C', 'O', 'D', 'L', 'E'];
  const tones = ['tone-pass', 'tone-empty', 'tone-partial', 'tone-pass', 'tone-empty'];
  return (
    <Link to="/" className="logo" aria-label="Codle">
      {letters.map((l, i) => (
        <span key={i} className={`logo-tile ${tones[i]}`}>
          {l}
        </span>
      ))}
    </Link>
  );
}

function LangToggle() {
  const { lang, setLang } = useI18n();
  return (
    <div className="seg" role="group" aria-label="Idioma / Language">
      <button className={lang === 'es' ? 'active' : ''} onClick={() => setLang('es')}>
        ES
      </button>
      <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>
        EN
      </button>
    </div>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const { lang } = useI18n();
  const label =
    theme === 'dark'
      ? lang === 'es' ? 'Cambiar a modo claro' : 'Switch to light mode'
      : lang === 'es' ? 'Cambiar a modo oscuro' : 'Switch to dark mode';
  return (
    <button className="icon-btn theme-btn" onClick={toggle} title={label} aria-label={label}>
      {theme === 'dark' ? <Sun strokeWidth={1.75} /> : <Moon strokeWidth={1.75} />}
    </button>
  );
}

function StreakChip() {
  const { t } = useI18n();
  const { streak } = useAuth();
  if (!streak) return null;
  return (
    <Link
      to="/stats"
      className={`streak-chip ${streak.todayDone ? 'done' : streak.current ? 'pending' : ''}`}
      title={t('streakTitle')}
      aria-label={`${t('streakField')}: ${streak.current}`}
    >
      <span className="field hide-sm">{t('streakField')}</span>
      <Tally n={streak.current} max={5} />
      <strong>{streak.current}</strong>
    </Link>
  );
}

function AccountMenu() {
  const { t, lang } = useI18n();
  const { theme, toggle: toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const next = encodeURIComponent(location.pathname);

  return (
    <div className="account" ref={ref}>
      <button
        className={`account-btn ${user ? 'logged' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {user ? (
          <>
            <span className="avatar">{user.username.slice(0, 1).toUpperCase()}</span>
            <span className="hide-sm">{user.username}</span>
          </>
        ) : (
          t('login')
        )}
      </button>
      {open && (
        <div className="menu" role="menu">
          {user ? (
            <>
              <div className="menu-head">
                <strong>{user.username}</strong>
                <span className="muted small">{user.email}</span>
              </div>
              <Link to="/stats" role="menuitem">
                <BarChart3 strokeWidth={1.75} /> {t('stats')}
              </Link>
              {user.isAdmin && (
                <Link to="/admin" role="menuitem">
                  <Settings strokeWidth={1.75} /> Admin
                </Link>
              )}
            </>
          ) : (
            <>
              <Link to={`/login?next=${next}`} role="menuitem">
                <LogIn strokeWidth={1.75} /> {t('login')}
              </Link>
              <Link to={`/login?mode=register&next=${next}`} role="menuitem">
                <UserPlus strokeWidth={1.75} /> {t('register')}
              </Link>
            </>
          )}
          <button role="menuitem" onClick={() => { setOpen(false); openHowToPlay(); }}>
            <CircleHelp strokeWidth={1.75} /> {lang === 'es' ? 'Cómo se juega' : 'How to play'}
          </button>
          <button role="menuitem" className="show-sm" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun strokeWidth={1.75} /> : <Moon strokeWidth={1.75} />}
            {theme === 'dark'
              ? lang === 'es' ? 'Modo claro' : 'Light mode'
              : lang === 'es' ? 'Modo oscuro' : 'Dark mode'}
          </button>
          <div className="menu-lang">
            <LangToggle />
          </div>
          {user && (
            <button
              role="menuitem"
              onClick={async () => {
                setOpen(false);
                await logout();
                navigate('/');
              }}
            >
              <LogOut strokeWidth={1.75} /> {t('logout')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function Layout() {
  const { t, lang } = useI18n();
  const [help, setHelp] = useState(() => storage.get('seenHelp') !== '1');
  useEffect(() => {
    const open = () => setHelp(true);
    window.addEventListener('codle:how-to-play', open);
    return () => window.removeEventListener('codle:how-to-play', open);
  }, []);
  const closeHelp = useCallback(() => {
    storage.set('seenHelp', '1');
    setHelp(false);
  }, []);
  const helpLabel = lang === 'es' ? 'Cómo se juega' : 'How to play';
  return (
    <div className="app">
      <header className="topbar">
        <Logo />
        <nav className="nav">
          <NavLink to="/" end>
            {t('today')}
          </NavLink>
          <NavLink to="/archive">
            <span className="long">{t('archive')}</span>
            <span className="short">{t('archiveShort')}</span>
          </NavLink>
          <NavLink to="/stats">
            <span className="long">{t('stats')}</span>
            <span className="short">{t('statsShort')}</span>
          </NavLink>
        </nav>
        <div className="topbar-right">
          <StreakChip />
          <button className="icon-btn help-btn" onClick={() => setHelp(true)} title={helpLabel} aria-label={helpLabel}>
            <CircleHelp strokeWidth={1.75} />
          </button>
          <ThemeToggle />
          <div className="hide-sm">
            <LangToggle />
          </div>
          <AccountMenu />
        </div>
      </header>
      <Outlet />
      {help && <HowToPlay onClose={closeHelp} />}
    </div>
  );
}
