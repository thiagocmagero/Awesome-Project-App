import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthLayout } from '../components/AuthLayout';
import { PasswordField } from '../components/PasswordField';
import { apiPost } from '../lib/api';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { useLocale } from '../contexts/LocaleContext';

export function ResetPasswordPage() {
  const { t } = useTranslation('auth');
  const { t: tc } = useTranslation('common');
  const [params] = useSearchParams();
  const navigate = useLocalizedNavigate();
  const { urlLocale } = useLocale();
  const token = params.get('token') ?? '';

  const [pwd1, setPwd1] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) navigate('/error/token-expired', { replace: true });
  }, [token, navigate]);

  const ok1 = pwd1.length >= 8;
  const ok2 = pwd2.length >= 8;
  const match = pwd1 === pwd2;
  const canSubmit = ok1 && ok2 && match && !submitting;
  const pwd2Error = ok1 && ok2 && !match;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      await apiPost('/auth/reset-password', { token, password: pwd1 });
      navigate('/login?reset=true', { replace: true });
    } catch (err) {
      const msg = (err as Error).message;
      if (msg === 'TOKEN_ALREADY_USED') {
        navigate('/error/token-used', { replace: true });
      } else if (msg === 'INVALID_OR_EXPIRED_TOKEN' || (err as { status?: number }).status === 400) {
        navigate('/error/token-expired', { replace: true });
      } else {
        setError(msg || t('reset_password.errors.generic'));
        setSubmitting(false);
      }
    }
  }

  return (
    <AuthLayout narrow pageTitle={t('reset_password.title')}>
      <h1 className="auth-title">{t('reset_password.title')}</h1>
      <p className="helper">{t('reset_password.subtitle')}</p>

      <form onSubmit={onSubmit} noValidate>
        <div className="form-row tight">
          <PasswordField
            id="pwd1"
            value={pwd1}
            onChange={(e) => setPwd1(e.target.value)}
            placeholder={t('reset_password.new_password')}
            autoComplete="new-password"
            required
            minLength={8}
            error={pwd1.length > 0 && pwd1.length < 8}
          />
          {pwd1.length > 0 && pwd1.length < 8 && (
            <div className="field-error">{t('reset_password.errors.min_length')}</div>
          )}
        </div>
        <div className="form-row">
          <PasswordField
            id="pwd2"
            value={pwd2}
            onChange={(e) => setPwd2(e.target.value)}
            placeholder={t('reset_password.confirm_password')}
            autoComplete="new-password"
            required
            minLength={8}
            error={pwd2Error}
          />
          {pwd2Error && <div className="field-error">{t('reset_password.errors.mismatch')}</div>}
        </div>

        {error && <div className="form-error" role="alert">{error}</div>}
        <button type="submit" className="btn-auth-primary" disabled={!canSubmit}>
          {submitting ? tc('messages.saving') : t('reset_password.btn_reset')}
        </button>
        <Link to={`/${urlLocale}/login`} className="text-link">{t('reset_password.back_login')}</Link>
      </form>
    </AuthLayout>
  );
}
