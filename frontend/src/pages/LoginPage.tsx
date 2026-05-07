import { useState, useEffect, useRef, FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, toAuthUser } from '../contexts/AuthContext';
import type { ApiAuthUser } from '../contexts/AuthContext';
import { getApiBase, apiFetch } from '../lib/api';
import { useTranslation } from 'react-i18next';
import { useToast } from '../contexts/ToastContext';
import { useParticles } from '../hooks/useParticles';

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation('auth');
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (user && ['PLATFORM_ADMIN', 'BASIC_USER'].includes(user.profileCode)) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const toastShownRef = useRef(false);
  // Show success toasts from redirects — ref guard prevents double-fire in React StrictMode
  useEffect(() => {
    if (toastShownRef.current) return;
    if (searchParams.get('confirmed') === 'true') {
      toastShownRef.current = true;
      showToast('success', t('confirmation_success'));
      navigate('/login', { replace: true });
    } else if (searchParams.get('reset') === 'true') {
      toastShownRef.current = true;
      showToast('success', t('password_reset_success'));
      navigate('/login', { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useParticles('particles-js');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await apiFetch(`${getApiBase()}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json() as { user?: ApiAuthUser; message?: string };

      if (!res.ok) {
        setError(data.message ?? t('errors.invalid_credentials'));
        return;
      }

      if (!data.user) {
        setError(t('errors.unexpected_response'));
        return;
      }

      if (!['PLATFORM_ADMIN', 'BASIC_USER'].includes(data.user.profile.code)) {
        setError(t('errors.unauthorized_profile'));
        return;
      }

      login(toAuthUser(data.user));
      navigate('/dashboard', { replace: true });
    } catch {
      setError(t('errors.network_error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="authentication-background authenticationcover-background position-relative"
      id="particles-js"
      style={{ height: '100vh' }}
    >
      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        <div className="row justify-content-center authentication authentication-basic align-items-center h-100">
          <div className="col-xxl-4 col-xl-5 col-lg-5 col-md-6 col-sm-8 col-12">

            {/* Logo */}
            <div className="mb-3 d-flex justify-content-center auth-logo">
              <a href="#">
                <img src="/assets/images/brand-logos/desktop-dark.png" alt="logo" className="desktop-dark" />
              </a>
            </div>

            {/* Card */}
            <div className="card custom-card my-4 border z-3 position-relative">
              <div className="card-body p-0">
                <div className="p-5">

                  {/* Icon */}
                  <div className="d-flex align-items-center justify-content-center mb-3">
                    <span className="auth-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
                        <path fill="#6446fe" d="M59,8H5A1,1,0,0,0,4,9V55a1,1,0,0,0,1,1H59a1,1,0,0,0,1-1V9A1,1,0,0,0,59,8ZM58,54H6V10H58Z" />
                        <path fill="#6446fe" d="M36,35H28a3,3,0,0,1-3-3V27a3,3,0,0,1,3-3h8a3,3,0,0,1,3,3v5A3,3,0,0,1,36,35Zm-8-9a1,1,0,0,0-1,1v5a1,1,0,0,0,1,1h8a1,1,0,0,0,1-1V27a1,1,0,0,0-1-1Z" />
                        <path fill="#6446fe" d="M36 26H28a1 1 0 0 1-1-1V24a5 5 0 0 1 10 0v1A1 1 0 0 1 36 26zm-7-2h6a3 3 0 0 0-6 0zM32 31a1 1 0 0 1-1-1V29a1 1 0 0 1 2 0v1A1 1 0 0 1 32 31z" />
                        <path fill="#6446fe" d="M59 8H5A1 1 0 0 0 4 9v8a1 1 0 0 0 1 1H20.08a1 1 0 0 0 .63-.22L25.36 14H59a1 1 0 0 0 1-1V9A1 1 0 0 0 59 8zm-1 4H25l-.21 0a1.09 1.09 0 0 0-.42.2L19.73 16H6V10H58zM50 49H14a1 1 0 0 1-1-1V39a1 1 0 0 1 1-1H50a1 1 0 0 1 1 1v9A1 1 0 0 1 50 49zM15 47H49V40H15z" />
                        <circle cx="19.5" cy="43.5" r="1.5" fill="#6446fe" />
                        <circle cx="24.5" cy="43.5" r="1.5" fill="#6446fe" />
                        <circle cx="29.5" cy="43.5" r="1.5" fill="#6446fe" />
                        <circle cx="34.5" cy="43.5" r="1.5" fill="#6446fe" />
                        <circle cx="39.5" cy="43.5" r="1.5" fill="#6446fe" />
                        <circle cx="44.5" cy="43.5" r="1.5" fill="#6446fe" />
                      </svg>
                    </span>
                  </div>

                  <p className="h4 fw-semibold mb-0 text-center">{t('page.title')}</p>
                  <p className="mb-3 text-muted fw-normal text-center">{t('page.welcome_back')}</p>

                  {/* Error alert */}
                  {error && (
                    <div className="alert alert-danger d-flex align-items-center py-2 px-3 mb-3" role="alert">
                      <i className="ri-error-warning-line me-2 fs-16"></i>
                      <span className="fs-14">{error}</span>
                    </div>
                  )}

                  {/* Form */}
                  <form onSubmit={handleSubmit} noValidate>
                    <div className="row gy-3">

                      {/* Email */}
                      <div className="col-xl-12">
                        <label htmlFor="login-email" className="form-label text-default">
                          {t('form.email')}
                        </label>
                        <input
                          type="email"
                          className="form-control form-control-lg"
                          id="login-email"
                          placeholder={t('form.email_placeholder')}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          autoComplete="email"
                        />
                      </div>

                      {/* Password */}
                      <div className="col-xl-12 mb-2">
                        <label htmlFor="login-password" className="form-label text-default d-flex justify-content-between align-items-center">
                          {t('form.password')}
                          <Link to="/forgot-password" className="text-primary fs-13 fw-normal">{t('links.forgot_password')}</Link>
                        </label>
                        <div className="position-relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            className="form-control form-control-lg"
                            id="login-password"
                            placeholder={t('form.password_placeholder')}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
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
                    </div>

                    {/* Submit */}
                    <div className="d-grid mt-4">
                      <button
                        type="submit"
                        className="btn btn-primary btn-lg"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            {t('messages.loading')}
                          </>
                        ) : (
                          t('actions.login')
                        )}
                      </button>
                    </div>
                  </form>

                  {/* Signup link */}
                  <div className="text-center mt-3">
                    <span className="text-muted fs-14">{t('links.no_account')}</span>
                    <Link to="/signup" className="text-primary fw-medium fs-14">
                      {t('links.register')}
                    </Link>
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
