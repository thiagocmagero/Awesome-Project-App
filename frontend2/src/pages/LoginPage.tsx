import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthLayout } from '../components/AuthLayout';
import { PasswordField } from '../components/PasswordField';
import { apiPost } from '../lib/api';
import { toAuthUser, useAuth, type ApiAuthUser } from '../contexts/AuthContext';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { useLocale } from '../contexts/LocaleContext';

interface LoginResponse {
  user: ApiAuthUser;
  /** Cookies HttpOnly são definidos pelo Set-Cookie da resposta. */
  accessToken?: string;
  refreshToken?: string;
}

export function LoginPage() {
  const { t } = useTranslation('auth');
  const { t: tc } = useTranslation('common');
  const navigate = useLocalizedNavigate();
  const navigateRaw = useNavigate();
  const location = useLocation();
  const { urlLocale } = useLocale();
  const { user, login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [confirmedBanner, setConfirmedBanner] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('confirmed') === 'true') setConfirmedBanner(t('confirmation_success'));
    if (params.get('reset') === 'true')     setConfirmedBanner(t('password_reset_success'));
  }, [location.search, t]);

  useEffect(() => {
    if (!user) return;
    const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
    if (from) navigateRaw(from, { replace: true });
    else navigate('/home', { replace: true });
  }, [user, location.state, navigate, navigateRaw]);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      const data = await apiPost<LoginResponse>('/auth/login', { email: email.trim(), password });
      login(toAuthUser(data.user));
    } catch (err) {
      const status = (err as { status?: number }).status;
      const msg = (err as Error).message;
      if (status === 403 && msg === 'EMAIL_NOT_CONFIRMED') {
        setError(t('errors.email_not_confirmed'));
      } else if (status === 401) {
        setError(t('errors.invalid_credentials'));
      } else {
        setError(msg || t('errors.login_failed'));
      }
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout pageTitle={t('actions.login')}>
      <h1 className="auth-title">{t('page.welcome_back')}</h1>
      <p className="auth-sub">{t('links.no_account')} <Link to={`/${urlLocale}/signup`}>{t('actions.signup')}</Link></p>

      {confirmedBanner && (
        <div style={{
          margin: '0 0 14px', padding: '10px 12px',
          background: 'var(--brandSoft)', color: 'var(--brand)',
          borderRadius: 8, fontSize: 12.5, textAlign: 'center',
        }}>
          {confirmedBanner}
        </div>
      )}

      <form onSubmit={onSubmit} noValidate>
        <div className="form-row">
          <input
            type="email"
            className="input"
            name="email"
            id="email"
            placeholder={t('form.email')}
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="form-row">
          <PasswordField
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('form.password')}
            autoComplete="current-password"
            required
          />
        </div>
        {error && <div className="form-error" role="alert">{error}</div>}
        <button type="submit" className="btn-auth-primary" disabled={!canSubmit}>
          {submitting ? tc('messages.processing') : t('actions.login')}
        </button>
        <Link to={`/${urlLocale}/forgot-password`} className="text-link">{t('links.forgot_password')}</Link>
      </form>
    </AuthLayout>
  );
}
