import { type ChangeEvent, useRef, useState } from 'react';
import type { Attachment, Card, Id } from '../../../types';
import { generateId } from '../../../core/ordering';

export interface FilesFieldProps {
  card: Card;
  /** Optional uploader. When provided, called with each picked file BEFORE
   *  attaching. The function should return either the final URL or the full
   *  Attachment object to merge in. */
  uploadURL?:
    | string
    | ((rec: { id: Id; file: File }) => Promise<unknown>);
  onAdd: (attachment: Attachment) => void;
  onRemove: (attachmentId: Id) => void;
}

function formatBytes(bytes?: number): string {
  if (bytes === undefined || bytes === null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function iconForMime(mime?: string): string {
  if (!mime) return 'ti-file';
  if (mime.startsWith('image/')) return 'ti-photo';
  if (mime.startsWith('video/')) return 'ti-video';
  if (mime.startsWith('audio/')) return 'ti-music';
  if (mime === 'application/pdf') return 'ti-file-type-pdf';
  if (mime.includes('zip') || mime.includes('tar')) return 'ti-file-zip';
  if (mime.includes('json') || mime.includes('javascript')) return 'ti-code';
  if (mime.startsWith('text/')) return 'ti-file-text';
  return 'ti-file';
}

export function FilesField({
  card,
  uploadURL,
  onAdd,
  onRemove,
}: FilesFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  const attachments = card.attached ?? [];

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        const id = generateId('att');
        let url = '';
        let extra: Partial<Attachment> = {};

        if (typeof uploadURL === 'function') {
          const result = await uploadURL({ id, file });
          if (typeof result === 'string') {
            url = result;
          } else if (result && typeof result === 'object') {
            const r = result as Partial<Attachment>;
            url = r.url ?? '';
            extra = r;
          }
        } else if (typeof uploadURL === 'string') {
          // Naive multipart POST. Apps with auth or progress tracking can
          // pass a function form instead.
          const form = new FormData();
          form.append('file', file);
          const res = await fetch(uploadURL, { method: 'POST', body: form });
          const json = (await res.json().catch(() => ({}))) as Partial<Attachment>;
          url = json.url ?? '';
          extra = json;
        } else {
          // No uploader configured — preserve via blob URL so the user can at
          // least preview within the session. Apps SHOULD provide uploadURL
          // for production.
          url = URL.createObjectURL(file);
        }

        onAdd({
          id,
          name: file.name,
          url,
          size: file.size,
          mimeType: file.type,
          ...extra,
        });
      }
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="ak-editor__field">
      <span className="ak-editor__label">Attachments</span>

      <ul className="ak-files">
        {attachments.length === 0 && (
          <li className="ak-files__empty">No attachments.</li>
        )}
        {attachments.map((att) => (
          <li key={att.id} className="ak-files__item">
            <span className="ak-files__icon">
              <i className={`ti ${iconForMime(att.mimeType)}`} aria-hidden="true" />
            </span>
            <a
              className="ak-files__name"
              href={att.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {att.name}
            </a>
            <span className="ak-files__size">{formatBytes(att.size)}</span>
            <button
              type="button"
              className="ak-files__remove"
              onClick={() => onRemove(att.id)}
              aria-label={`Remove ${att.name}`}
            >
              <i className="ti ti-x" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>

      <div className="ak-files__upload">
        <input
          ref={inputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            void handleFiles(e.target.files)
          }
        />
        <button
          type="button"
          className="ak-toolbar__btn"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          <i className="ti ti-paperclip" aria-hidden="true" />{' '}
          {busy ? 'Uploading...' : 'Attach files'}
        </button>
      </div>
    </div>
  );
}
