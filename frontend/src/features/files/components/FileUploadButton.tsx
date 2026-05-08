import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../../contexts/ToastContext';
import { parseErrorContext, formatUploadError } from '../errors';

interface Props {
  /** Callback que recebe o `File` escolhido — caller faz o POST. */
  onFile: (file: File) => Promise<void>;
  /** Desactiva o botão se a feature não estiver disponível. */
  disabled?: boolean;
  /** Optional override ao label do botão. */
  label?: string;
  /** Estilo do botão Bootstrap. */
  className?: string;
}

/**
 * Botão de upload com input file hidden. Multipart é tratado pelo caller
 * via `onFile(file)` — ver `useFiles.upload`. NUNCA define Content-Type
 * manualmente no fetch (browser injecta boundary para multipart).
 */
export function FileUploadButton({
  onFile,
  disabled,
  label,
  className = 'btn btn-primary',
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
      // O caller (`useFiles.upload`) atira `Error` cujo `.message` traz JSON do
      // body do erro — `{ "error_code": "...", "extension": "...", ... }`.
      // Interpolamos os campos no template i18n para mensagens precisas.
      const ctx = parseErrorContext(err);
      const message = formatUploadError(t, ctx);
      showToast('danger', message);
    } finally {
      setBusy(false);
      // permite reupload do mesmo file (input só dispara onChange se value mudar)
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
        <i className="ri-upload-2-line me-1" aria-hidden="true" />
        {label ?? t('actions.upload')}
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
