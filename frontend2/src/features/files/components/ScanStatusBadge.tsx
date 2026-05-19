// Port adaptado de `frontend/src/features/files/components/ScanStatusBadge.tsx` (regra 4).
// Adaptações face ao legacy:
//   - Classes Bootstrap (`badge bg-success-transparent`) → tokens próprios do
//     template: `.tm-scan-badge` + `.is-{clean|pending|infected}`.
//   - Ícones `ri-shield-*` substituídos por SVG inline (frontend2 não tem RemixIcon).

import { useTranslation } from 'react-i18next';
import type { FileScanStatus } from '../types';

interface Props {
  /** `null` = ficheiro fora do path secured (não mostra badge). */
  status: FileScanStatus | null;
  /** Indica que o ficheiro está em path secured. Se false E status null, sem badge. */
  isSecured: boolean;
}

function ShieldCheck({ s = 12 }: { s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <polyline points="9 12 11 14 15 10"/>
    </svg>
  );
}
function ShieldDot({ s = 12 }: { s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );
}
function ShieldX({ s = 12 }: { s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <line x1="9" y1="9" x2="15" y2="15"/>
      <line x1="15" y1="9" x2="9" y2="15"/>
    </svg>
  );
}

export function ScanStatusBadge({ status, isSecured }: Props) {
  const { t } = useTranslation('files');
  if (!isSecured && status === null) return null;
  if (!status) return null;

  const variant = (() => {
    switch (status) {
      case 'CLEAN':
        return { cls: 'tm-scan-badge is-clean',    icon: <ShieldCheck/>, label: t('scan.shield_clean'),    tooltip: t('scan.tooltip_clean') };
      case 'PENDING':
        return { cls: 'tm-scan-badge is-pending',  icon: <ShieldDot/>,   label: t('scan.shield_pending'),  tooltip: t('scan.tooltip_pending') };
      case 'INFECTED':
        return { cls: 'tm-scan-badge is-infected', icon: <ShieldX/>,     label: t('scan.shield_infected'), tooltip: t('scan.tooltip_infected') };
    }
  })();

  return (
    <span className={variant.cls} title={variant.tooltip}>
      {variant.icon}
      {variant.label}
    </span>
  );
}
