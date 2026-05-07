import { useState, useEffect, FormEvent } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth, toAuthUser } from '../contexts/AuthContext';
import type { ApiAuthUser } from '../contexts/AuthContext';
import { getApiBase, apiFetch } from '../lib/api';
import { useParticles } from '../hooks/useParticles';

type InviteCheckResult = { requiresAccount: boolean };

export default function CreatePasswordPage() {
  const { t } = useTranslation('auth');
  const { login } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token') ?? '';

  const [checking, setChecking] = useState(true);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token || token.length !== 64) {
      navigate('/error/token-expired', { replace: true });
      return;
    }

    apiFetch(`${getApiBase()}/auth/invite-check?token=${token}`)
      .then(async (res) => {
        if (!res.ok) {
          navigate('/error/token-expired', { replace: true });
          return;
        }
        const data = (await res.json()) as InviteCheckResult;
        if (!data.requiresAccount) {
          navigate('/login', { replace: true });
          return;
        }
        setChecking(false);
      })
      .catch(() => navigate('/error/token-expired', { replace: true }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useParticles('particles-js-ca', !checking);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError(t('create_account.errors.name_required'));
      return;
    }
    if (password.length < 8) {
      setError(t('create_account.errors.min_length'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('create_account.errors.mismatch'));
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch(`${getApiBase()}/auth/create-account-from-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name: name.trim(), password }),
      });

      if (res.ok) {
        const data = await res.json() as { user?: ApiAuthUser };
        if (data.user) {
          login(toAuthUser(data.user));
        }
        navigate('/dashboard', { replace: true });
      } else {
        const data = await res.json().catch(() => ({})) as { error_code?: string };
        if (data.error_code === 'TOKEN_ALREADY_USED') {
          navigate('/error/token-used', { replace: true });
        } else {
          navigate('/error/token-expired', { replace: true });
        }
      }
    } catch {
      setError(t('create_account.errors.generic'));
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
      id="particles-js-ca"
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
                    <i className="ri-user-add-line text-primary" style={{ fontSize: 56 }}></i>
                  </div>

                  <p className="h4 fw-semibold mb-0 text-center">{t('create_account.title')}</p>
                  <p className="mb-3 text-muted fw-normal text-center">{t('create_account.subtitle')}</p>

                  {error && (
                    <div className="alert alert-danger d-flex align-items-center py-2 px-3 mb-3" role="alert">
                      <i className="ri-error-warning-line me-2 fs-16"></i>
                      <span className="fs-14">{error}</span>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} noValidate>
                    <div className="row gy-3">

                      <div className="col-xl-12">
                        <label htmlFor="ca-name" className="form-label text-default">{t('create_account.name')}</label>
                        <input
                          type="text"
                          id="ca-name"
                          className="form-control form-control-lg"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder={t('create_account.name_placeholder')}
                          required
                          autoComplete="name"
                        />
                      </div>

                      <div className="col-xl-12">
                        <label htmlFor="ca-password" className="form-label text-default">{t('create_account.password')}</label>
                        <div className="position-relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            id="ca-password"
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
                        <label htmlFor="ca-confirm" className="form-label text-default">{t('create_account.confirm_password')}</label>
                        <div className="position-relative">
                          <input
                            type={showConfirm ? 'text' : 'password'}
                            id="ca-confirm"
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
                          <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>{t('create_account.btn_create')}</>
                        ) : t('create_account.btn_create')}
                      </button>
                    </div>
                  </form>

                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
