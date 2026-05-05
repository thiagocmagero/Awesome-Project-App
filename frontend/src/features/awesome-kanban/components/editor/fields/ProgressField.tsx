import type { ChangeEvent } from 'react';

export interface ProgressFieldProps {
  id: string;
  label: string;
  value: number | undefined;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function ProgressField({
  id,
  label,
  value = 0,
  onChange,
  disabled,
}: ProgressFieldProps) {
  const safeValue = Math.max(0, Math.min(100, value ?? 0));

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const next = Number(e.target.value);
    if (Number.isFinite(next)) onChange(next);
  };

  return (
    <div className="ak-editor__field">
      <label className="ak-editor__label" htmlFor={id}>
        {label}
        <span
          style={{
            float: 'right',
            fontFamily: 'var(--ak-font-mono)',
            color: 'var(--ak-text)',
          }}
        >
          {Math.round(safeValue)}%
        </span>
      </label>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        value={safeValue}
        onChange={handleChange}
        disabled={disabled}
        style={{ accentColor: 'var(--ak-primary)' }}
      />
    </div>
  );
}
