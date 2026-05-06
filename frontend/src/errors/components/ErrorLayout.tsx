import { useEffect, type ReactNode } from 'react';

interface Props {
  title: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
  icon?: ReactNode;
}

export default function ErrorLayout({ title, message, actionLabel, actionHref, icon }: Props) {
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
        window.particlesJS('particles-js-error', {
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
      const canvas = document.querySelector('#particles-js-error canvas');
      canvas?.remove();
    };
  }, []);

  return (
    <div
      className="authentication-background authenticationcover-background position-relative"
      id="particles-js-error"
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
