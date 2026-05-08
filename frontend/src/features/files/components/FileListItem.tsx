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

  const isInfected = file.scanStatus === 'INFECTED';
  const downloadDisabled = !canDownload || isInfected;

  return (
    <div
      className="d-flex align-items-center gap-3 p-3"
      style={{
        background: '#fff',
        border: '1px solid #e6e4f0',
        borderRadius: '8px',
        marginBottom: '8px',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <strong
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '100%',
            }}
            title={file.originalName}
          >
            {file.originalName}
          </strong>
          <ScanStatusBadge status={file.scanStatus} isSecured={file.isSecured} />
        </div>
        <div className="text-muted" style={{ fontSize: '11.5px', marginTop: '2px' }}>
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

      <div className="d-flex align-items-center gap-1">
        <button
          type="button"
          className="btn btn-sm btn-outline-primary"
          onClick={() => onDownload(file.publicId)}
          disabled={downloadDisabled}
          title={
            isInfected ? t('errors.infected') : t('actions.download')
          }
        >
          <i className="ri-download-2-line" aria-hidden="true" />
        </button>
        {canEdit && (
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => onReplace(file)}
            title={t('actions.replace')}
          >
            <i className="ri-refresh-line" aria-hidden="true" />
          </button>
        )}
        {canEdit && (
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => onRename(file)}
            title={t('actions.rename')}
          >
            <i className="ri-edit-line" aria-hidden="true" />
          </button>
        )}
        {canDelete && (
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
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
