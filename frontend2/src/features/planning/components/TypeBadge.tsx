// Badge de tipo da tarefa (task | milestone | project).

interface Props {
  type: string | null | undefined;
}

export function TypeBadge({ type }: Props) {
  if (!type) return <span style={{ color: 'var(--mute, #9ca3af)' }}>—</span>;
  return (
    <span style={{
      fontSize: 11, fontWeight: 500,
      textTransform: 'capitalize',
      color: 'var(--ink2, #4b5563)',
    }}>{type}</span>
  );
}
