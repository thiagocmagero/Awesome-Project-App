import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthLayout } from '../components/AuthLayout';
import { apiPost } from '../lib/api';
import { useLocale } from '../contexts/LocaleContext';

export function ForgotPasswordPage() {
  const { t } = useTranslation('auth');
  const { t: tc } = useTranslation('common');
  const { urlLocale } = useLocale();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes('@') || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await apiPost('/auth/forgot-password', { email: email.trim() });
      setSent(true);
    } catch (err) {
      setError((err as Error).message || tc('errors.generic'));
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <AuthLayout narrow pageTitle={t('forgot_password.sent_title')}>
        <div className="success-icon" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        </div>
        <h1 className="auth-title">{t('forgot_password.sent_title')}</h1>
        <p className="auth-sub">{t('forgot_password.sent_message')}</p>
        <p className="auth-sub" style={{ marginBottom: 14 }}>
          {t('links.have_account')} <Link to={`/${urlLocale}/login`}>{t('actions.login')}</Link>
        </p>
        <button
          type="button"
          className="provider-btn"
          style={{ marginTop: 4 }}
          onClick={() => { setSent(false); setEmail(''); }}
        >
          {t('forgot_password.retry_other_email')}
        </button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout narrow pageTitle={t('forgot_password.title')}>
      <h1 className="auth-title">{t('forgot_password.title')}</h1>
      <p className="auth-sub">{t('links.have_account')} <Link to={`/${urlLocale}/login`}>{t('actions.login')}</Link></p>

      <form onSubmit={onSubmit} noValidate>
        <div className="form-row">
          <input
            type="email"
            className="input"
            id="email"
            name="email"
            placeholder={t('forgot_password.email')}
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        {error && <div className="form-error" role="alert">{error}</div>}
        <button
          type="submit"
          className="btn-auth-primary"
          disabled={!email.includes('@') || submitting}
        >
          {submitting ? tc('messages.processing') : t('forgot_password.btn_send')}
        </button>
      </form>
    </AuthLayout>
  );
}
