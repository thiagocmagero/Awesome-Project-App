import type { RefObject } from 'react';
import { Popover } from './Popover';
import { localeFlagUrl, type ActiveLocale } from '../lib/localeFlag';

/** Port 1:1 de NewTemplate/app-dark.jsx:1883-1896.
 *  Consome `activeLocales` do `LocaleContext` (backend `/i18n/locales/active`)
 *  e chama `setLocale(code)` via `onPick` para alterar simultaneamente o
 *  segmento URL, o i18next e o `User.locale` (via `LocaleContext.setLocale`). */
export function LanguageMenu({ anchorRef, onClose, currentLang, locales, onPick }: {
  anchorRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  currentLang: string;
  locales: readonly ActiveLocale[];
  onPick: (code: string) => void;
}) {
  return (
    <Popover anchorRef={anchorRef} onClose={onClose} panelClass="lang-menu" placement="below-end" offset={8}>
      {locales.map((l) => (
        <div
          key={l.code}
          className={'menu-item' + (l.code === currentLang ? ' active' : '')}
          onClick={() => { onPick(l.code); onClose(); }}
        >
          <img src={localeFlagUrl(l)} alt={l.name} />
          <span>{l.name}</span>
          {l.code === currentLang && <span className="check">✓</span>}
        </div>
      ))}
    </Popover>
  );
}
