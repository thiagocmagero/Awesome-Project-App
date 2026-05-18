// Pill de Estado da tarefa. Usa `label` (custom) ou `labelKey` (sistema, i18n).
// Cor de fundo é o `color` do estado com transparência; texto na mesma cor.

import { useTranslation } from 'react-i18next';
import type { ITaskState } from '../states-types';

interface Props {
  state: ITaskState | null | undefined;
}

const FALLBACK_COLOR = '#6b7280';

export function StateBadge({ state }: Props) {
  const { t } = useTranslation('planning');
  if (!state) return <span className="status-cell">—</span>;
  const label = state.label ?? (state.labelKey ? t(state.labelKey) : '—');
  const color = state.color ?? FALLBACK_COLOR;
  return (
    <span
      className="status-cell"
      style={{
        background: `${color}20`,
        color,
        border: `1px solid ${color}40`,
      }}
    >
      {label}
    </span>
  );
}
