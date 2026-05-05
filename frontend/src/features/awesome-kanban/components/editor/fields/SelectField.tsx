import type { ChangeEvent } from 'react';
import type { Id } from '../../../types';

export interface SelectFieldOption {
  id: Id;
  label: string;
}

export interface SelectFieldProps {
  id: string;
  label: string;
  value: Id | undefined;
  options: SelectFieldOption[];
  onChange: (value: Id | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function SelectField({
  id,
  label,
  value,
  options,
  onChange,
  placeholder,
  disabled = false,
}: SelectFieldProps) {
  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    if (!next) {
      onChange(undefined);
      return;
    }
    const matched = options.find((o) => String(o.id) === next);
    onChange(matched?.id);
  };

  return (
    <div className="ak-editor__field">
      <label className="ak-editor__label" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        value={value === undefined ? '' : String(value)}
        onChange={handleChange}
        disabled={disabled}
      >
        <option value="">{placeholder ?? '—'}</option>
        {options.map((option) => (
          <option key={String(option.id)} value={String(option.id)}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
