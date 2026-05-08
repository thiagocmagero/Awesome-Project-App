import { FileIcon, defaultStyles } from 'react-file-icon';
import { useTranslation } from 'react-i18next';
import { ScanStatusBadge } from './ScanStatusBadge';
import { useResolvedDateFormat } from '../../../contexts/ProjectDateFormatContext';
import { formatDate } from '../../../lib/dateFormatting';
import type { AppFile } from '../types';

interface Props {
  file: AppFile;
  /** Pode descarregar (FILE_VIEW + scanStatus !== INFECTED). */
  canDownload: boolean;
  /** Pode renomear / substituir (FILE_RENAME). */
  canEdit: boolean;
  /** Pode eliminar (FILE_DELETE). */
  canDelete: boolean;
  onDownload: (publicId: string) => void;
  onRename: (file: AppFile) => void;
  onReplace: (file: AppFile) => void;
  onDelete: (file: AppFile) => void;
}

/** Formata bytes em "X.X kB / MB / GB" — sem dependência externa. */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

/** Devolve a extensão minúscula do filename (ou string vazia). */
function extOf(name: string): string {
  const idx = name.lastIndexOf('.');
  return idx === -1 ? '' : name.slice(idx + 1).toLowerCase();
}

export function FileListItem({
  file,
  canDownload,
  canEdit,
  canDelete,
  onDownload,
  onRename,
  onReplace,
  onDelete,
}: Props) {
  const { t } = useTranslation('files');
  const dateFormat = useResolvedDateFormat();

  const ext = extOf(file.originalName);
  const isInfected = file.scanStatus === 'INFECTED';
  const downloadDisabled = !canDownload || isInfected || file.scanStatus === 'PENDING';

  return (
    <div className="file-row">
      <span className="file-icon-svg-wrap" aria-hidden="true">
        <FileIcon
          extension={ext || undefined}
          {...(defaultStyles[ext] ?? {})}
          radius={4}
        />
      </span>

      <div className="file-row-body">
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <span
            className={`file-row-name${!downloadDisabled ? ' file-row-name--clickable' : ''}`}
            onClick={!downloadDisabled ? () => onDownload(file.publicId) : undefined}
            title={!downloadDisabled ? t('actions.download') : file.originalName}
          >
            {file.originalName}
          </span>
          <ScanStatusBadge status={file.scanStatus} isSecured={file.isSecured} />
        </div>
        <div className="file-row-sub">
          {formatBytes(file.sizeBytes)}
          {file.uploadedBy ? (
            <>
              {' · '}
              {t('list.uploaded_by', { name: file.uploadedBy.name })}
            </>
          ) : null}
          {' · '}
          {t('list.uploaded_at', { date: formatDate(file.uploadedAt, dateFormat) })}
        </div>
      </div>

      <div className="file-row-actions">
        <button
          type="button"
          className="task-icon-btn"
          onClick={() => onDownload(file.publicId)}
          disabled={downloadDisabled}
          title={isInfected ? t('errors.infected') : t('actions.download')}
        >
          <i className="ri-download-2-line" aria-hidden="true" />
        </button>
        {canEdit && (
          <button
            type="button"
            className="task-icon-btn"
            onClick={() => onReplace(file)}
            title={t('actions.replace')}
          >
            <i className="ri-refresh-line" aria-hidden="true" />
          </button>
        )}
        {canEdit && (
          <button
            type="button"
            className="task-icon-btn"
            onClick={() => onRename(file)}
            title={t('actions.rename')}
          >
            <i className="ri-edit-line" aria-hidden="true" />
          </button>
        )}
        {canDelete && (
          <button
            type="button"
            className="task-icon-btn is-danger"
            onClick={() => onDelete(file)}
            title={t('actions.delete')}
          >
            <i className="ri-delete-bin-line" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
