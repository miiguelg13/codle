import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { errorMessage, useI18n } from '../lib/i18n';

export default function AuthPage() {
  const { t } = useI18n();
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const mode = params.get('mode') === 'register' ? 'register' : 'login';
  const next = params.get('next') || '/';

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const merged = mode === 'register' ? await register(email, username, password) : await login(loginId, password);
      navigate(next.startsWith('/') ? next : '/', { replace: true, state: merged ? { merged } : undefined });
    } catch (err) {
      setError(errorMessage(t, err));
    } finally {
      setBusy(false);
    }
  };

  const switchTo = mode === 'register' ? 'login' : 'register';
  const switchHref = `/login?mode=${switchTo}${next !== '/' ? `&next=${encodeURIComponent(next)}` : ''}`;

  return (
    <main className="page auth-page">
      <form className="auth-card" onSubmit={onSubmit} noValidate>
        <h1>{mode === 'register' ? t('register') : t('login')}</h1>
        <p className="muted small">{t('guestNote')}</p>

        {mode === 'register' ? (
          <>
            <label>
              <span>{t('email')}</span>
              <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label>
              <span>{t('username')}</span>
              <input
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                minLength={3}
                maxLength={20}
                required
              />
              <small className="muted">{t('usernameHint')}</small>
            </label>
          </>
        ) : (
          <label>
            <span>{t('emailOrUser')}</span>
            <input autoComplete="username" value={loginId} onChange={(e) => setLoginId(e.target.value)} required />
          </label>
        )}
        <label>
          <span>{t('password')}</span>
          <input
            type="password"
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
          {mode === 'register' && <small className="muted">{t('passwordHint')}</small>}
        </label>

        {error && <p className="error-box">{error}</p>}

        <button className="btn primary block" type="submit" disabled={busy}>
          {busy ? t('loading') : mode === 'register' ? t('register') : t('login')}
        </button>
        <p className="small muted center">
          {mode === 'register' ? t('haveAccount') : t('noAccount')}{' '}
          <Link to={switchHref} className="link">
            {mode === 'register' ? t('login') : t('register')}
          </Link>
        </p>
      </form>
    </main>
  );
}
