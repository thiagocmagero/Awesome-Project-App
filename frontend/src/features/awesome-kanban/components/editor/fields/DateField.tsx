import type { ChangeEvent } from 'react';

export interface DateFieldProps {
  id: string;
  label: string;
  value: Date | string | undefined;
  onChange: (value: string | undefined) => void;
  disabled?: boolean;
}

function toInputValue(value: Date | string | undefined): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export function DateField({
  id,
  label,
  value,
  onChange,
  disabled,
}: DateFieldProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value || undefined);
  };

  return (
    <div className="ak-editor__field">
      <label className="ak-editor__label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={toInputValue(value)}
        onChange={handleChange}
        disabled={disabled}
      />
    </div>
  );
}
