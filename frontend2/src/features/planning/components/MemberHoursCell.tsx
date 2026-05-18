// Célula editável de "Horas por dia" para a tabela Team Members.
// Markup canónico `.rv-hpd > input + .unit` (NewTemplate/app-dark.jsx:1635-1640).
//
// Comportamento:
// - Valor inicial = `hoursPerDay` recebido (ou 8 default).
// - Auto-save em onBlur ou Enter, se o valor mudou e é válido [0.5, 24].
// - Toast success em OK; revert + toast danger em erro.
// - Sem permissão `MEMBER_HOURS_MANAGE`: input disabled.

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../../contexts/ToastContext';

interface Props {
  userPublicId: string;
  initial: number;
  canEdit: boolean;
  onSave: (userPublicId: string, hoursPerDay: number) => Promise<void>;
}

function isValid(v: number): boolean {
  if (!Number.isFinite(v)) return false;
  if (v < 0.5 || v > 24) return false;
  return true;
}

export function MemberHoursCell({ userPublicId, initial, canEdit, onSave }: Props) {
  const { t } = useTranslation('planning');
  const { showToast } = useToast();
  const [value, setValue] = useState<string>(String(initial));
  const lastSavedRef = useRef<number>(initial);
  const [busy, setBusy] = useState(false);

  // Re-sincroniza se o `initial` mudar (ex.: refresh do bundle após mutação).
  useEffect(() => {
    setValue(String(initial));
    lastSavedRef.current = initial;
  }, [initial]);

  async function commit() {
    const num = Number(value.replace(',', '.'));
    if (!isValid(num) || num === lastSavedRef.current) {
      setValue(String(lastSavedRef.current));
      return;
    }
    setBusy(true);
    try {
      await onSave(userPublicId, num);
      lastSavedRef.current = num;
      showToast('success', t('resources.success.hours_updated'));
    } catch (err) {
      setValue(String(lastSavedRef.current));
      const msg = err instanceof Error ? err.message : String(err);
      showToast('danger', msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rv-hpd">
      <input
        type="number"
        min={0.5}
        max={24}
        step={0.5}
        value={value}
        disabled={!canEdit || busy}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          } else if (e.key === 'Escape') {
            setValue(String(lastSavedRef.current));
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
      <span className="unit">h</span>
    </div>
  );
}
