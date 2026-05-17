import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthLayout } from '../components/AuthLayout';
import { apiPost } from '../lib/api';
import { useLocale } from '../contexts/LocaleContext';

export function ResendConfirmationPage() {
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
      await apiPost('/auth/resend-confirmation', { email: email.trim() });
      setSent(true);
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 429) {
        setError(tc('errors.rate_limited'));
      } else {
        setError((err as Error).message || tc('errors.generic'));
      }
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <AuthLayout narrow pageTitle={t('resend_confirmation.sent_pagetitle')}>
        <div className="success-icon" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        </div>
        <h1 className="auth-title">{t('resend_confirmation.sent_pagetitle')}</h1>
        <p className="auth-sub">{t('signup.check_email.message', { email: email.trim() })}</p>
        <Link to={`/${urlLocale}/login`} className="text-link">{t('reset_password.back_login')}</Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout narrow pageTitle={t('resend_confirmation.title')}>
      <h1 className="auth-title">{t('resend_confirmation.title')}</h1>
      <p className="auth-sub">{t('resend_confirmation.subtitle')}</p>

      <form onSubmit={onSubmit} noValidate>
        <div className="form-row">
          <input
            type="email"
            className="input"
            id="email"
            placeholder={t('form.email')}
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
          {submitting ? t('signup.check_email.resending') : t('resend_confirmation.btn')}
        </button>
        <Link to={`/${urlLocale}/login`} className="text-link">{t('reset_password.back_login')}</Link>
      </form>
    </AuthLayout>
  );
}
