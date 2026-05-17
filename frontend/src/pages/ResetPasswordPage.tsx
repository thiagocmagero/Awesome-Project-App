import { useState, useEffect, FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getApiBase, apiFetch } from '../lib/api';
import { useParticles } from '../hooks/useParticles';
import { useLocale } from '../contexts/LocaleContext';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';

export default function ResetPasswordPage() {
  const { t } = useTranslation('auth');
  const [searchParams] = useSearchParams();
  const navigate = useLocalizedNavigate();
  const { urlLocale } = useLocale();

  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const token = searchParams.get('token') ?? '';

  useEffect(() => {
    if (!token || token.length !== 64) {
      navigate('/error/token-expired', { replace: true });
      return;
    }

    apiFetch(`${getApiBase()}/auth/token-check?token=${token}&type=PASSWORD_RESET`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({})) as { error_code?: string };
          if (data.error_code === 'TOKEN_ALREADY_USED') {
            navigate('/error/token-used', { replace: true });
          } else {
            navigate('/error/token-expired', { replace: true });
          }
          return;
        }
        setChecking(false);
      })
      .catch(() => navigate('/error/token-expired', { replace: true }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useParticles('particles-js-rp', !checking);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError(t('reset_password.errors.min_length'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('reset_password.errors.mismatch'));
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch(`${getApiBase()}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      if (res.ok) {
        navigate('/login?reset=true', { replace: true });
      } else {
        const data = await res.json().catch(() => ({})) as { error_code?: string };
        if (data.error_code === 'SAME_PASSWORD') {
          setError(t('reset_password.errors.same_password'));
        } else if (data.error_code === 'TOKEN_ALREADY_USED') {
          navigate('/error/token-used', { replace: true });
        } else {
          navigate('/error/token-expired', { replace: true });
        }
      }
    } catch {
      setError(t('reset_password.errors.generic'));
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div
        className="authentication-background authenticationcover-background position-relative"
        style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <span className="spinner-border text-primary" role="status" style={{ width: 48, height: 48 }}></span>
      </div>
    );
  }

  return (
    <div
      className="authentication-background authenticationcover-background position-relative"
      id="particles-js-rp"
      style={{ height: '100vh' }}
    >
      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        <div className="row justify-content-center authentication authentication-basic align-items-center h-100">
          <div className="col-xxl-4 col-xl-5 col-lg-5 col-md-6 col-sm-8 col-12">

            <div className="mb-3 d-flex justify-content-center auth-logo">
              <a href="/login">
                <img src="/assets/images/brand-logos/desktop-dark.png" alt="logo" className="desktop-dark" />
              </a>
            </div>

            <div className="card custom-card my-4 border z-3 position-relative">
              <div className="card-body p-0">
                <div className="p-5">

                  <div className="d-flex align-items-center justify-content-center mb-3">
                    <i className="ri-shield-keyhole-line text-primary" style={{ fontSize: 56 }}></i>
                  </div>

                  <p className="h4 fw-semibold mb-0 text-center">{t('reset_password.title')}</p>
                  <p className="mb-3 text-muted fw-normal text-center">{t('reset_password.subtitle')}</p>

                  {error && (
                    <div className="alert alert-danger d-flex align-items-center py-2 px-3 mb-3" role="alert">
                      <i className="ri-error-warning-line me-2 fs-16"></i>
                      <span className="fs-14">{error}</span>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} noValidate>
                    <div className="row gy-3">

                      <div className="col-xl-12">
                        <label htmlFor="rp-password" className="form-label text-default">{t('reset_password.new_password')}</label>
                        <div className="position-relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            id="rp-password"
                            className="form-control form-control-lg"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={t('form.password_placeholder')}
                            required
                            autoComplete="new-password"
                          />
                          <button
                            type="button"
                            className="show-password-button text-muted btn p-0 border-0 bg-transparent"
                            onClick={() => setShowPassword((v) => !v)}
                            tabIndex={-1}
                          >
                            <i className={`${showPassword ? 'ri-eye-line' : 'ri-eye-off-line'} align-middle`}></i>
                          </button>
                        </div>
                      </div>

                      <div className="col-xl-12 mb-2">
                        <label htmlFor="rp-confirm" className="form-label text-default">{t('reset_password.confirm_password')}</label>
                        <div className="position-relative">
                          <input
                            type={showConfirm ? 'text' : 'password'}
                            id="rp-confirm"
                            className="form-control form-control-lg"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder={t('form.password_placeholder')}
                            required
                            autoComplete="new-password"
                          />
                          <button
                            type="button"
                            className="show-password-button text-muted btn p-0 border-0 bg-transparent"
                            onClick={() => setShowConfirm((v) => !v)}
                            tabIndex={-1}
                          >
                            <i className={`${showConfirm ? 'ri-eye-line' : 'ri-eye-off-line'} align-middle`}></i>
                          </button>
                        </div>
                      </div>

                    </div>

                    <div className="d-grid mt-4">
                      <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                        {loading ? (
                          <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>{t('reset_password.btn_reset')}</>
                        ) : t('reset_password.btn_reset')}
                      </button>
                    </div>
                  </form>

                  <div className="text-center mt-3">
                    <Link to={`/${urlLocale}/login`} className="text-primary fs-14">{t('reset_password.back_login')}</Link>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
