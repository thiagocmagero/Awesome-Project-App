import { useTranslation } from 'react-i18next';
import type { FileScanStatus } from '../types';

interface Props {
  /** `null` = ficheiro fora do path secured (não mostra badge). */
  status: FileScanStatus | null;
  /** Indica que o ficheiro está em path secured. Se false E status null, sem badge. */
  isSecured: boolean;
}

/**
 * Badge visual do estado de scan AWS GuardDuty.
 * - null + !isSecured ⇒ sem badge (ficheiro normal).
 * - PENDING ⇒ cinza pulsante "A verificar...".
 * - CLEAN ⇒ verde "Verificado".
 * - INFECTED ⇒ vermelho "Bloqueado".
 *
 * Tooltip por título HTML (i18n) — keep it simple, sem tippy.js.
 */
export function ScanStatusBadge({ status, isSecured }: Props) {
  const { t } = useTranslation('files');
  if (!isSecured && status === null) return null;
  if (!status) return null;

  const variant = (() => {
    switch (status) {
      case 'CLEAN':
        return {
          cls: 'badge bg-success-transparent text-success',
          icon: 'ri-shield-check-line',
          label: t('scan.shield_clean'),
          tooltip: t('scan.tooltip_clean'),
        };
      case 'PENDING':
        return {
          cls: 'badge bg-secondary-transparent text-secondary',
          icon: 'ri-shield-line',
          label: t('scan.shield_pending'),
          tooltip: t('scan.tooltip_pending'),
        };
      case 'INFECTED':
        return {
          cls: 'badge bg-danger-transparent text-danger',
          icon: 'ri-shield-cross-line',
          label: t('scan.shield_infected'),
          tooltip: t('scan.tooltip_infected'),
        };
    }
  })();

  return (
    <span
      className={variant.cls}
      title={variant.tooltip}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
    >
      <i className={variant.icon} aria-hidden="true" />
      {variant.label}
    </span>
  );
}
