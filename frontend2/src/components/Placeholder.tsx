import { useTranslation } from 'react-i18next';
import { T } from '../shell/tokens';

/** Generic placeholder shown for routes whose view hasn't been ported yet.
 *  Each route will replace this with the real port in its own Fase 2 sub-phase.
 *
 *  Takes an i18n key (e.g. `'nav.home'` resolved against the `common` namespace
 *  by default, or `'projects:nav.list'` to cross namespaces). */
export function Placeholder({ titleKey }: { titleKey: string }) {
  const { t: tc } = useTranslation('common');
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 12,
        color: T.dim,
        background: T.bg,
        padding: 24,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: T.panel,
          border: `1px solid ${T.line}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
          color: T.brand,
        }}
      >
        ◐
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, color: T.ink }}>{tc(titleKey)}</div>
    </div>
  );
}
