import { type ReactNode } from 'react';
import { useParticles } from '../../hooks/useParticles';

interface Props {
  title: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
  icon?: ReactNode;
}

export default function ErrorLayout({ title, message, actionLabel, actionHref, icon }: Props) {
  useParticles('particles-js-error');

  return (
    <div
      className="authentication-background authenticationcover-background position-relative"
      id="particles-js-error"
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
                <div className="p-5 text-center">

                  <div className="d-flex align-items-center justify-content-center mb-4">
                    {icon ?? (
                      <span style={{ fontSize: 48 }}>
                        <i className="ri-error-warning-line text-warning" style={{ fontSize: 56 }}></i>
                      </span>
                    )}
                  </div>

                  <p className="h4 fw-semibold mb-2">{title}</p>
                  <p className="text-muted fs-14 mb-4">{message}</p>

                  {actionLabel && actionHref && (
                    <a href={actionHref} className="btn btn-primary">
                      {actionLabel}
                    </a>
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
