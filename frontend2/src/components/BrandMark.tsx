import { Link } from 'react-router-dom';
import { useLocale } from '../contexts/LocaleContext';

/** Brand logomark + app name, used across all auth pages.
 *  Port 1:1 do <svg> em NewTemplate/login.html (e siblings). */
export function BrandMark() {
  const { urlLocale } = useLocale();
  return (
    <Link to={`/${urlLocale}/`} className="brand" aria-label="Awesome Project App">
      <span className="mark" aria-hidden="true">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="awp-brand-m1" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%"  stopColor="oklch(0.62 0.20 264)" />
              <stop offset="100%" stopColor="oklch(0.50 0.22 264)" />
            </linearGradient>
            <linearGradient id="awp-brand-m2" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%"  stopColor="oklch(0.74 0.16 290)" />
              <stop offset="100%" stopColor="oklch(0.60 0.20 270)" />
            </linearGradient>
          </defs>
          <rect x="1.5"  y="1.5"  width="9" height="9" rx="2.2" fill="url(#awp-brand-m1)" />
          <rect x="13.5" y="1.5"  width="9" height="9" rx="2.2" fill="url(#awp-brand-m2)" />
          <rect x="1.5"  y="13.5" width="9" height="9" rx="2.2" fill="url(#awp-brand-m2)" />
          <rect x="13.5" y="13.5" width="9" height="9" rx="2.2" fill="url(#awp-brand-m1)" />
        </svg>
      </span>
      <span className="name">Awesome Project App</span>
    </Link>
  );
}
