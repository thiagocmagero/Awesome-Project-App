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

interface IconResolution {
  cls: string;
  icon: string;
}

function resolveIcon(name: string, mime: string): IconResolution {
  const ext = extOf(name);
  if (ext === 'pdf' || mime === 'application/pdf') return { cls: 'file-icon--pdf',  icon: 'ri-file-pdf-line' };
  if (['xlsx', 'xls', 'csv'].includes(ext) || mime.includes('spreadsheet') || mime === 'text/csv') {
    return { cls: 'file-icon--xlsx', icon: 'ri-file-excel-line' };
  }
  if (['doc', 'docx', 'odt', 'rtf'].includes(ext) || mime.includes('msword') || mime.includes('wordprocessing')) {
    return { cls: 'file-icon--doc',  icon: 'ri-file-word-line' };
  }
  if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif', 'heic', 'bmp', 'ico'].includes(ext)) {
    return { cls: 'file-icon--img',  icon: 'ri-image-line' };
  }
  return { cls: 'file-icon--default', icon: 'ri-file-line' };
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
  const { cls: iconCls, icon } = resolveIcon(file.originalName, file.mimeType);

  return (
    <div className="file-row">
      <span className={`file-icon ${iconCls}`} aria-hidden="true">
        <i className={icon} />
      </span>

      <div className="file-row-body">
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <span className="file-row-name" title={file.originalName}>
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
