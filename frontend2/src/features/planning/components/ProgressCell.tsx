// Célula de progresso — número 0–100% (input é 0–1).

interface Props {
  progress: number | null | undefined;
}

export function ProgressCell({ progress }: Props) {
  if (progress === null || progress === undefined) {
    return <span style={{ color: 'var(--mute, #9ca3af)' }}>—</span>;
  }
  const pct = Math.round(progress * 100);
  return (
    <span style={{
      fontSize: 12, fontVariantNumeric: 'tabular-nums', color: 'var(--ink2, #4b5563)',
    }}>{pct}%</span>
  );
}
