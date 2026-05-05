import type { ChangeEvent } from 'react';

export interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  disabled?: boolean;
  error?: string | null;
}

export function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
  rows = 3,
  disabled = false,
  error,
}: TextFieldProps) {
  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    onChange(e.target.value);
  };

  return (
    <div className="ak-editor__field">
      <label className="ak-editor__label" htmlFor={id}>
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
        />
      )}
      {error && (
        <span style={{ color: 'var(--ak-danger)', fontSize: 11 }}>{error}</span>
      )}
    </div>
  );
}
