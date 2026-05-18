// Badge de prioridade — quadrado colorido + label (HIGH/MED/LOW).
// 0=LOW, 1=MED, 2=HIGH, 3=URGENT (mapeamento legacy).

interface Props {
  priority: number | null | undefined;
}

const PRIORITY_MAP: Record<number, { label: string; color: string }> = {
  0: { label: 'LOW',    color: '#22c55e' },
  1: { label: 'MED',    color: '#f59e0b' },
  2: { label: 'HIGH',   color: '#ef4444' },
  3: { label: 'URGENT', color: '#dc2626' },
};

export function PriorityBadge({ priority }: Props) {
  if (priority === null || priority === undefined) {
    return <span className="pri-cell" style={{ color: 'var(--mute, #9ca3af)' }}>—</span>;
  }
  const conf = PRIORITY_MAP[priority];
  if (!conf) return <span className="pri-cell">—</span>;
  return (
    <span className="pri-cell" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{
        width: 12, height: 12, borderRadius: 3, background: conf.color, display: 'inline-block',
      }} />
      <span style={{ fontSize: 11, fontWeight: 600, color: conf.color }}>{conf.label}</span>
    </span>
  );
}
