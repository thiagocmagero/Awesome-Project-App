import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getApiBase, apiFetch } from '../lib/api';
import { useParticles } from '../hooks/useParticles';

export default function ForgotPasswordPage() {
  const { t } = useTranslation('auth');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useParticles('particles-js-fp');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await apiFetch(`${getApiBase()}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
    } catch { /* silent — neutral response always */ }
    setSent(true);
    setLoading(false);
  }

  return (
    <div
      className="authentication-background authenticationcover-background position-relative"
      id="particles-js-fp"
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
                    <i className="ri-lock-password-line text-primary" style={{ fontSize: 56 }}></i>
                  </div>

                  {sent ? (
                    <div className="text-center">
                      <p className="h4 fw-semibold mb-2">{t('forgot_password.sent_title')}</p>
                      <p className="text-muted fs-14 mb-4">{t('forgot_password.sent_message')}</p>
                      <Link to="/login" className="btn btn-primary">{t('forgot_password.back_login')}</Link>
                    </div>
                  ) : (
                    <>
                      <p className="h4 fw-semibold mb-0 text-center">{t('forgot_password.title')}</p>
                      <p className="mb-3 text-muted fw-normal text-center">{t('forgot_password.subtitle')}</p>

                      <form onSubmit={handleSubmit} noValidate>
                        <div className="row gy-3">
                          <div className="col-xl-12">
                            <label htmlFor="fp-email" className="form-label text-default">{t('forgot_password.email')}</label>
                            <input
                              type="email"
                              id="fp-email"
                              className="form-control form-control-lg"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder={t('form.email_placeholder')}
                              required
                              autoComplete="email"
                            />
                          </div>
                        </div>
                        <div className="d-grid mt-4">
                          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                            {loading ? (
                              <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>{t('forgot_password.btn_send')}</>
                            ) : t('forgot_password.btn_send')}
                          </button>
                        </div>
                      </form>

                      <div className="text-center mt-3">
                        <Link to="/login" className="text-primary fs-14">{t('forgot_password.back_login')}</Link>
                      </div>
                    </>
                  )}

                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
