import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthLayout } from '../components/AuthLayout';
import { useLocale } from '../contexts/LocaleContext';

export function TokenExpiredPage() {
  const { t } = useTranslation('auth');
  const { urlLocale } = useLocale();
  return (
    <AuthLayout narrow pageTitle={t('error.token_expired.title')}>
      <div className="success-icon" aria-hidden="true" style={{ background: 'var(--errSoft)', color: 'var(--err)' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h1 className="auth-title">{t('error.token_expired.title')}</h1>
      <p className="auth-sub">{t('error.token_expired.message')}</p>
      <Link to={`/${urlLocale}/forgot-password`} className="text-link">{t('links.forgot_password')}</Link>
      <Link to={`/${urlLocale}/resend-confirmation`} className="text-link">{t('signup.check_email.resend')}</Link>
      <Link to={`/${urlLocale}/login`} className="text-link">{t('reset_password.back_login')}</Link>
    </AuthLayout>
  );
}
