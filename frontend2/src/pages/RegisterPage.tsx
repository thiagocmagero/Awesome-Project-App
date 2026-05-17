import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthLayout } from '../components/AuthLayout';
import { PasswordField } from '../components/PasswordField';
import { apiPost } from '../lib/api';
import { useLocale } from '../contexts/LocaleContext';

export function RegisterPage() {
  const { t } = useTranslation('auth');
  const { t: tc } = useTranslation('common');
  const { urlLocale } = useLocale();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [terms, setTerms] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const canSubmit =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 8 &&
    terms &&
    !submitting;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      await apiPost('/auth/register', {
        name: name.trim(),
        email: email.trim(),
        password,
        marketingOptIn: marketing,
      });
      setSent(true);
    } catch (err) {
      const status = (err as { status?: number }).status;
      const msg = (err as Error).message;
      if (status === 409 && msg === 'EMAIL_ALREADY_EXISTS') {
        setError(tc('errors.email_already_exists'));
      } else if (status === 409 && msg === 'CONFIRMATION_EMAIL_ALREADY_SENT') {
        setError(t('errors.confirmation_already_sent'));
      } else {
        setError(msg || t('errors.register_failed'));
      }
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <AuthLayout pageTitle={t('signup.check_email.title')}>
        <div className="success-icon" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        </div>
        <h1 className="auth-title">{t('signup.check_email.title')}</h1>
        <p className="auth-sub">
          {/* signup.check_email.message tem placeholder {{email}} */}
          {t('signup.check_email.message', { email: email.trim() })}
        </p>
        <p className="auth-sub" style={{ marginBottom: 14 }}>
          {t('links.have_account')} <Link to={`/${urlLocale}/login`}>{t('actions.login')}</Link>
        </p>
        <Link to={`/${urlLocale}/resend-confirmation`} className="text-link">{t('signup.check_email.resend')}</Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout pageTitle={t('signup.title')}>
      <h1 className="auth-title">{t('signup.title')}</h1>
      <p className="auth-sub">{t('links.have_account')} <Link to={`/${urlLocale}/login`}>{t('actions.login')}</Link></p>

      <form onSubmit={onSubmit} noValidate>
        <div className="form-row">
          <input
            type="text"
            className="input"
            id="name"
            name="name"
            placeholder={t('signup.form.name_placeholder')}
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="form-row">
          <input
            type="email"
            className="input"
            id="email"
            name="email"
            placeholder={t('signup.form.email_placeholder')}
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
            placeholder={t('signup.form.password_placeholder')}
            autoComplete="new-password"
            required
            minLength={8}
          />
        </div>

        <div className="consent-list">
          <label className="consent">
            <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />
            <span>{t('signup.consent.marketing')}</span>
          </label>
          <label className="consent">
            <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
            <span>{t('signup.consent.terms')}</span>
          </label>
        </div>

        {error && <div className="form-error" role="alert">{error}</div>}
        <button type="submit" className="btn-auth-primary" disabled={!canSubmit}>
          {submitting ? t('signup.btn.loading') : t('signup.btn.submit')}
        </button>
      </form>
    </AuthLayout>
  );
}
