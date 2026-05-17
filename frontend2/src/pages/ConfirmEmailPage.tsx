import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthLayout } from '../components/AuthLayout';
import { apiPost } from '../lib/api';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { useLocale } from '../contexts/LocaleContext';

type Phase = 'pending' | 'success' | 'error';

export function ConfirmEmailPage() {
  const { t } = useTranslation('auth');
  const [params] = useSearchParams();
  const navigate = useLocalizedNavigate();
  const { urlLocale } = useLocale();
  const token = params.get('token') ?? '';
  const [phase, setPhase] = useState<Phase>(token ? 'pending' : 'error');
  const [error, setError] = useState<string | null>(null);
  const sentRef = useRef(false);

  useEffect(() => {
    if (!token || sentRef.current) return;
    sentRef.current = true;
    (async () => {
      try {
        await apiPost('/auth/confirm-email', { token });
        setPhase('success');
        setTimeout(() => navigate('/login?confirmed=true', { replace: true }), 1500);
      } catch (err) {
        const msg = (err as Error).message;
        if (msg === 'TOKEN_ALREADY_USED') {
          navigate('/error/token-used', { replace: true });
        } else {
          navigate('/error/token-expired', { replace: true });
        }
        setError(msg);
        setPhase('error');
      }
    })();
  }, [token, navigate]);

  return (
    <AuthLayout narrow pageTitle={t('confirm_email.verifying')}>
      {phase === 'pending' && (
        <>
          <h1 className="auth-title">{t('confirm_email.verifying')}</h1>
          <p className="auth-sub">{t('confirm_email.verifying_subtitle')}</p>
        </>
      )}
      {phase === 'success' && (
        <>
          <div className="success-icon" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="auth-title">{t('confirm_email.success')}</h1>
          <p className="auth-sub">{t('confirm_email.success_subtitle')}</p>
          <Link to={`/${urlLocale}/login`} className="text-link">{t('actions.login')}</Link>
        </>
      )}
      {phase === 'error' && (
        <>
          <h1 className="auth-title">{t('confirm_email.error_title')}</h1>
          <p className="auth-sub">{error || t('error.token_expired.message')}</p>
          <Link to={`/${urlLocale}/resend-confirmation`} className="text-link">{t('resend_confirmation.cta_request')}</Link>
        </>
      )}
    </AuthLayout>
  );
}
