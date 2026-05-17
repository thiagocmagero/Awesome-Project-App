import { useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { BrandMark } from './BrandMark';
import '../styles/auth.css';

interface Props {
  children: ReactNode;
  narrow?: boolean;
  /** Optional <title> override for the browser tab. */
  pageTitle?: string;
}

/** Shared auth page chrome — background gradient, centered card, footer. */
export function AuthLayout({ children, narrow = false, pageTitle }: Props) {
  const { t: tc } = useTranslation('common');
  useEffect(() => {
    if (pageTitle) document.title = `${pageTitle} · Awesome Project App`;
  }, [pageTitle]);

  return (
    <div className="auth-root">
      <div className="auth-shell">
        <main className={'auth-card' + (narrow ? ' narrow' : '')} role="main">
          <BrandMark />
          {children}
        </main>
      </div>
      <footer className="auth-footer">
        <a href="#">{tc('footer.terms')}</a>
        <span className="sep" />
        <a href="#">{tc('footer.privacy')}</a>
        <span className="sep" />
        <a href="#">{tc('footer.help')}</a>
      </footer>
    </div>
  );
}
