import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthLayout } from '../components/AuthLayout';
import { PasswordField } from '../components/PasswordField';
import { apiGet, apiPost } from '../lib/api';
import { toAuthUser, useAuth, type ApiAuthUser } from '../contexts/AuthContext';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { useLocale } from '../contexts/LocaleContext';

interface InviteCheckResponse { requiresAccount: boolean; }
interface CreateAccountResponse { user: ApiAuthUser; }

export function CreateAccountFromInvitePage() {
  const { t } = useTranslation('auth');
  const { t: tc } = useTranslation('common');
  const [params] = useSearchParams();
  const navigate = useLocalizedNavigate();
  const { urlLocale } = useLocale();
  const { login } = useAuth();
  const token = params.get('token') ?? '';

  const [checking, setChecking] = useState(true);
  const [requiresAccount, setRequiresAccount] = useState(false);

  const [name, setName] = useState('');
  const [pwd1, setPwd1] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { navigate('/error/token-expired', { replace: true }); return; }
    (async () => {
      try {
        const data = await apiGet<InviteCheckResponse>(`/auth/invite-check?token=${encodeURIComponent(token)}`);
        if (!data.requiresAccount) {
          navigate('/login', { replace: true });
          return;
        }
        setRequiresAccount(true);
      } catch (err) {
        const msg = (err as Error).message;
        if (msg === 'TOKEN_ALREADY_USED') navigate('/error/token-used', { replace: true });
        else navigate('/error/token-expired', { replace: true });
      } finally {
        setChecking(false);
      }
    })();
  }, [token, navigate]);

  const ok1 = pwd1.length >= 8;
  const ok2 = pwd2.length >= 8;
  const match = pwd1 === pwd2;
  const canSubmit = name.trim().length > 0 && ok1 && ok2 && match && !submitting;
  const pwd2Error = ok1 && ok2 && !match;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      const data = await apiPost<CreateAccountResponse>('/auth/create-account-from-invite', {
        token, name: name.trim(), password: pwd1,
      });
      login(toAuthUser(data.user));
      navigate('/home', { replace: true });
    } catch (err) {
      const msg = (err as Error).message;
      if (msg === 'TOKEN_ALREADY_USED') navigate('/error/token-used', { replace: true });
      else if (msg === 'INVALID_OR_EXPIRED_TOKEN') navigate('/error/token-expired', { replace: true });
      else {
        setError(msg || t('create_account.errors.generic'));
        setSubmitting(false);
      }
    }
  }

  if (checking) {
    return (
      <AuthLayout narrow pageTitle={t('invite.checking_title')}>
        <h1 className="auth-title">{t('invite.checking_title')}</h1>
        <p className="auth-sub">{tc('loading')}</p>
      </AuthLayout>
    );
  }

  if (!requiresAccount) return null;

  return (
    <AuthLayout pageTitle={t('create_account.accept_invite_title')}>
      <h1 className="auth-title">{t('create_account.accept_invite_title')}</h1>
      <p className="auth-sub">{t('create_account.subtitle')}</p>

      <form onSubmit={onSubmit} noValidate>
        <div className="form-row">
          <input
            type="text"
            className="input"
            id="name"
            placeholder={t('create_account.name_placeholder')}
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="form-row tight">
          <PasswordField
            id="pwd1"
            value={pwd1}
            onChange={(e) => setPwd1(e.target.value)}
            placeholder={t('create_account.password')}
            autoComplete="new-password"
            required
            minLength={8}
            error={pwd1.length > 0 && pwd1.length < 8}
          />
          {pwd1.length > 0 && pwd1.length < 8 && (
            <div className="field-error">{t('create_account.errors.min_length')}</div>
          )}
        </div>
        <div className="form-row">
          <PasswordField
            id="pwd2"
            value={pwd2}
            onChange={(e) => setPwd2(e.target.value)}
            placeholder={t('create_account.confirm_password')}
            autoComplete="new-password"
            required
            minLength={8}
            error={pwd2Error}
          />
          {pwd2Error && <div className="field-error">{t('create_account.errors.mismatch')}</div>}
        </div>

        {error && <div className="form-error" role="alert">{error}</div>}
        <button type="submit" className="btn-auth-primary" disabled={!canSubmit}>
          {submitting ? tc('messages.processing') : t('create_account.btn_create')}
        </button>
        <Link to={`/${urlLocale}/login`} className="text-link">{t('links.have_account_login')}</Link>
      </form>
    </AuthLayout>
  );
}
