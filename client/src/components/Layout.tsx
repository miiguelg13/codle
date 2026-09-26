import { NavLink, Outlet, Link } from 'react-router-dom';
import { useI18n } from '../lib/i18n';

function Logo() {
  const letters = ['C', 'O', 'D', 'L', 'E'];
  const tones = ['tone-pass', 'tone-none', 'tone-partial', 'tone-pass', 'tone-none'];
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

export function Layout() {
  const { t, lang, setLang } = useI18n();
  return (
    <div className="app">
      <header className="topbar">
        <Logo />
        <nav className="nav">
          <NavLink to="/" end>
            {t('today')}
          </NavLink>
          <NavLink to="/archive">{t('archive')}</NavLink>
        </nav>
        <div className="topbar-right">
          <div className="seg" role="group" aria-label="Idioma / Language">
            <button className={lang === 'es' ? 'active' : ''} onClick={() => setLang('es')}>
              ES
            </button>
            <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>
              EN
            </button>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
