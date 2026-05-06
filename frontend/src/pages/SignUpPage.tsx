import { useState, useEffect, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { getApiBase, apiFetch } from '../lib/api';
import type { AuthUser } from '../contexts/AuthContext';

interface ApiRegisterUser {
  publicId: string;
  email: string;
  name: string;
  status: string;
  profile: { publicId: string; code: string; label: string };
  userType: { publicId: string; code: string; label: string } | null;
  level: { publicId: string; code: string; label: string; order: number } | null;
  createdAt: string;
  updatedAt: string;
  planCode: string | null;
  planName: string | null;
  timezone: string | null;
  locale: string | null;
}

export default function SignUpPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation('auth');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (user && ['PLATFORM_ADMIN', 'BASIC_USER'].includes(user.profileCode)) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // Load particles background
  useEffect(() => {
    const loadScript = (src: string): Promise<void> =>
      new Promise((resolve) => {
        if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
        const s = document.createElement('script');
        s.src = src;
        s.onload = () => resolve();
        s.onerror = () => resolve();
        document.body.appendChild(s);
      });

    loadScript('/assets/libs/particles.js/particles.js').then(() => {
      if (typeof window.particlesJS !== 'undefined') {
        window.particlesJS('particles-js', {
          particles: {
            number: { value: 80, density: { enable: true, value_area: 800 } },
            color: { value: '#6366f1' },
            shape: { type: 'circle' },
            opacity: { value: 0.2, random: true },
            size: { value: 3, random: true },
            line_linked: { enable: true, distance: 150, color: '#6366f1', opacity: 0.1, width: 1 },
            move: { enable: true, speed: 1.5, random: false, out_mode: 'out' },
          },
          interactivity: {
            detect_on: 'canvas',
            events: { onhover: { enable: false }, onclick: { enable: false } },
          },
          retina_detect: true,
        });
      }
    });

    return () => {
      const canvas = document.querySelector('#particles-js canvas');
      canvas?.remove();
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    // Frontend validation
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError(t('signup.errors.generic'));
      return;
    }
    if (password.length < 8) {
      setError(t('signup.errors.generic'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('signup.errors.passwords_mismatch'));
      return;
    }

    setLoading(true);

    try {
      const res = await apiFetch(`${getApiBase()}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });

      const data = await res.json() as {
        requiresConfirmation?: boolean;
        user?: ApiRegisterUser;
        message?: string | string[];
      };

      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message.join(' ') : (data.message ?? t('signup.errors.generic'));
        setError(msg);
        return;
      }

      if (data.requiresConfirmation) {
        setCheckEmail(true);
        return;
      }

      if (!data.user) {
        setError(t('signup.errors.generic'));
        return;
      }

      const authUser: AuthUser = {
        publicId: data.user.publicId,
        email: data.user.email,
        name: data.user.name,
        status: data.user.status,
        profileCode: data.user.profile.code,
        profileLabel: data.user.profile.label,
        userTypeCode: data.user.userType?.code ?? null,
        userTypeLabel: data.user.userType?.label ?? null,
        levelCode: data.user.level?.code ?? null,
        levelLabel: data.user.level?.label ?? null,
        planCode: data.user.planCode ?? null,
        planName: data.user.planName ?? null,
        timezone: data.user.timezone ?? null,
        locale: data.user.locale ?? null,
      };

      login(authUser);
      navigate('/dashboard', { replace: true });
    } catch {
      setError(t('signup.errors.generic'));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResendLoading(true);
    setResendMsg('');
    try {
      await apiFetch(`${getApiBase()}/auth/resend-confirmation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } catch { /* silent */ }
    setResendMsg(t('signup.check_email.resent'));
    setResendLoading(false);
  }

  if (checkEmail) {
    return (
      <div
        className="authentication-background authenticationcover-background position-relative"
        id="particles-js"
        style={{ minHeight: '100vh' }}
      >
        <div className="container">
          <div className="row justify-content-center authentication authentication-basic align-items-center h-100">
            <div className="col-xxl-4 col-xl-5 col-lg-5 col-md-6 col-sm-8 col-12">
              <div className="mb-3 d-flex justify-content-center auth-logo">
                <a href="/login">
                  <img src="/assets/images/brand-logos/desktop-dark.png" alt="logo" className="desktop-dark" />
                </a>
              </div>
              <div className="card custom-card my-4 border z-3 position-relative">
                <div className="card-body p-0">
                  <div className="p-5 text-center">
                    <div className="mb-4">
                      <i className="ri-mail-check-line text-primary" style={{ fontSize: 56 }}></i>
                    </div>
                    <p className="h4 fw-semibold mb-2">{t('signup.check_email.title')}</p>
                    <p className="text-muted fs-14 mb-4">
                      {t('signup.check_email.message', { email })}
                    </p>
                    {resendMsg ? (
                      <p className="text-success fs-13 mb-3">{resendMsg}</p>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-sm mb-3"
                        onClick={handleResend}
                        disabled={resendLoading}
                      >
                        {resendLoading ? (
                          <><span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>{t('signup.check_email.resending')}</>
                        ) : t('signup.check_email.resend')}
                      </button>
                    )}
                    <div>
                      <Link to="/login" className="text-primary fs-14">{t('signup.check_email.go_login')}</Link>
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

  return (
    <div
      className="authentication-background authenticationcover-background position-relative"
      id="particles-js"
      style={{ minHeight: '100vh' }}
    >
      <div className="container">
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

                  <p className="h4 fw-semibold mb-0 text-center">{t('signup.title')}</p>
                  <p className="mb-3 text-muted fw-normal text-center">{t('signup.subtitle')}</p>

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

                      {/* Full Name */}
                      <div className="col-xl-12">
                        <label htmlFor="signup-name" className="form-label text-default">
                          {t('signup.form.name')}
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-lg"
                          id="signup-name"
                          placeholder={t('signup.form.name_placeholder')}
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                          autoComplete="name"
                        />
                      </div>

                      {/* Email */}
                      <div className="col-xl-12">
                        <label htmlFor="signup-email" className="form-label text-default">
                          {t('signup.form.email')}
                        </label>
                        <input
                          type="email"
                          className="form-control form-control-lg"
                          id="signup-email"
                          placeholder={t('signup.form.email_placeholder')}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          autoComplete="email"
                        />
                      </div>

                      {/* Password */}
                      <div className="col-xl-12">
                        <label htmlFor="signup-password" className="form-label text-default">
                          {t('signup.form.password')}
                        </label>
                        <div className="position-relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            className="form-control form-control-lg"
                            id="signup-password"
                            placeholder={t('signup.form.password_placeholder')}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
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

                      {/* Confirm Password */}
                      <div className="col-xl-12 mb-2">
                        <label htmlFor="signup-confirm" className="form-label text-default">
                          {t('signup.form.confirm_password')}
                        </label>
                        <div className="position-relative">
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            className="form-control form-control-lg"
                            id="signup-confirm"
                            placeholder={t('signup.form.confirm_password_placeholder')}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            autoComplete="new-password"
                          />
                          <button
                            type="button"
                            className="show-password-button text-muted btn p-0 border-0 bg-transparent"
                            onClick={() => setShowConfirmPassword((v) => !v)}
                            tabIndex={-1}
                          >
                            <i className={`${showConfirmPassword ? 'ri-eye-line' : 'ri-eye-off-line'} align-middle`}></i>
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
                            {t('signup.btn.loading')}
                          </>
                        ) : (
                          t('signup.btn.submit')
                        )}
                      </button>
                    </div>
                  </form>

                  {/* Login link */}
                  <div className="text-center mt-3">
                    <span className="text-muted fs-14">{t('signup.link.login_hint')} </span>
                    <Link to="/login" className="text-primary fw-medium fs-14">
                      {t('signup.link.login')}
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
