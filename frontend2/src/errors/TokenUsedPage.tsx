import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthLayout } from '../components/AuthLayout';
import { useLocale } from '../contexts/LocaleContext';

export function TokenUsedPage() {
  const { t } = useTranslation('auth');
  const { urlLocale } = useLocale();
  return (
    <AuthLayout narrow pageTitle={t('error.token_used.title')}>
      <div className="success-icon" aria-hidden="true" style={{ background: 'var(--brandSoft)', color: 'var(--brand)' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 11l3 3 8-8" />
          <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" />
        </svg>
      </div>
      <h1 className="auth-title">{t('error.token_used.title')}</h1>
      <p className="auth-sub">{t('error.token_used.message')}</p>
      <Link to={`/${urlLocale}/login`} className="text-link">{t('reset_password.back_login')}</Link>
      <Link to={`/${urlLocale}/forgot-password`} className="text-link">{t('links.forgot_password')}</Link>
    </AuthLayout>
  );
}
