// Port adaptado de `frontend/src/features/files/components/FileUploadButton.tsx` (regra 4).
// Adaptações face ao legacy:
//   - Default `className` muda de Bootstrap `btn btn-primary` para a classe
//     `.tm-files-head .send` do template (vide views-task-modal.jsx:1138).
//   - Ícone `ri-upload-2-line` substituído por SVG inline.

import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../../contexts/ToastContext';
import { parseErrorContext, formatUploadError } from '../errors';

interface Props {
  onFile: (file: File) => Promise<void>;
  disabled?: boolean;
  label?: string;
  className?: string;
}

function UploadIcon({ s = 13 }: { s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  );
}

export function FileUploadButton({
  onFile,
  disabled,
  label,
  className = 'tm-btn-send',
}: Props) {
  const { t } = useTranslation('files');
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleClick = () => {
    if (busy || disabled) return;
    inputRef.current?.click();
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      await onFile(file);
    } catch (err) {
      const ctx = parseErrorContext(err);
      const message = formatUploadError(t, ctx);
      showToast('danger', message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={handleClick}
        disabled={busy || disabled}
      >
        <UploadIcon /> {label ?? t('actions.upload')}
      </button>
      <input
        ref={inputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={handleChange}
      />
    </>
  );
}
