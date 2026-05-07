import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getApiBase, apiFetch } from '../lib/api';
import { useParticles } from '../hooks/useParticles';

export default function ConfirmEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation('auth');
  const [status, setStatus] = useState<'verifying' | 'done' | 'error'>('verifying');

  useParticles('particles-js-confirm');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token || token.length !== 64) {
      navigate('/error/token-expired', { replace: true });
      return;
    }

    apiFetch(`${getApiBase()}/auth/confirm-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        if (res.ok) {
          setStatus('done');
          setTimeout(() => navigate('/login?confirmed=true', { replace: true }), 1500);
        } else {
          const data = await res.json().catch(() => ({})) as { error_code?: string };
          if (data.error_code === 'TOKEN_ALREADY_USED') {
            navigate('/error/token-used', { replace: true });
          } else {
            navigate('/error/token-expired', { replace: true });
          }
        }
      })
      .catch(() => navigate('/error/token-expired', { replace: true }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="authentication-background authenticationcover-background position-relative"
      id="particles-js-confirm"
      style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div className="text-center" style={{ position: 'relative', zIndex: 1 }}>
        {status === 'verifying' && (
          <>
            <span className="spinner-border text-primary mb-3" role="status" style={{ width: 48, height: 48 }}></span>
            <p className="text-muted">{t('confirm_email.verifying')}</p>
          </>
        )}
        {status === 'done' && (
          <>
            <i className="ri-checkbox-circle-line text-success mb-3" style={{ fontSize: 56, display: 'block' }}></i>
            <p className="text-success">{t('confirm_email.success')}</p>
          </>
        )}
      </div>
    </div>
  );
}
