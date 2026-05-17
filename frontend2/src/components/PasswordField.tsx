import { useState, type ChangeEvent } from 'react';

interface Props {
  id: string;
  name?: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  error?: boolean;
  disabled?: boolean;
}

/** Password input with show/hide eye toggle. Port do `.input.has-action`
 *  + `.input-action` em NewTemplate/auth.css. */
export function PasswordField({
  id, name, value, onChange, placeholder, autoComplete = 'current-password',
  required, minLength, error, disabled,
}: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="input-wrap">
      <input
        type={visible ? 'text' : 'password'}
        className={'input has-action' + (error ? ' error' : '')}
        id={id}
        name={name ?? id}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
      <button
        type="button"
        className="input-action"
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        onClick={() => setVisible((v) => !v)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>
    </div>
  );
}
