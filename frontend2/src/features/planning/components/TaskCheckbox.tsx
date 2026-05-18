// Checkbox circular "done" — visual conforme mockup. Visual-only nesta entrega
// (CRUD de tarefas diferido); `disabled` esconde affordance de click.

interface Props {
  done: boolean;
  disabled?: boolean;
  onChange?: (next: boolean) => void;
}

export function TaskCheckbox({ done, disabled = false, onChange }: Props) {
  return (
    <button
      type="button"
      aria-pressed={done}
      disabled={disabled}
      onClick={() => onChange?.(!done)}
      className={`check${done ? ' done' : ''}`}
      style={{
        width: 18, height: 18, borderRadius: '50%',
        border: `1.5px solid ${done ? 'var(--brand, #845adf)' : 'var(--line, #d1d5db)'}`,
        background: done ? 'var(--brand, #845adf)' : 'transparent',
        color: '#fff',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        padding: 0, lineHeight: 1, fontSize: 11,
      }}
    >
      {done ? '✓' : ''}
    </button>
  );
}
