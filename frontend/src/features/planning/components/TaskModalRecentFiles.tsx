import { useTranslation } from 'react-i18next';
import { useFiles } from '../../files/useFiles';
import { useResolvedDateFormat } from '../../../contexts/ProjectDateFormatContext';
import { formatDate } from '../../../lib/dateFormatting';
import { useToast } from '../../../contexts/ToastContext';
import type { AppFile } from '../../files/types';

interface Props {
  projectPublicId: string | null;
  taskPublicId: string;
  enabled: boolean;
  onViewAll: () => void;
}

/**
 * Sidebar — top 3 ficheiros mais recentes da task. Reutiliza o hook `useFiles`.
 * Click "Ver todos →" muda para a tab Arquivos.
 */
export function TaskModalRecentFiles({
  projectPublicId,
  taskPublicId,
  enabled,
  onViewAll,
}: Props) {
  const { t } = useTranslation('planning');
  const { t: tf } = useTranslation('files');
  const { t: tc } = useTranslation('common');
  const dateFormat = useResolvedDateFormat();
  const { showToast } = useToast();

  const { files, loading, getDownloadUrl } = useFiles({
    projectPublicId,
    taskPublicId,
    scope: 'all',
    enabled,
  });

  async function handleDownload(f: AppFile) {
    if (f.scanStatus === 'INFECTED' || f.scanStatus === 'PENDING') return;
    try {
      const info = await getDownloadUrl(f.publicId);
      if (info?.url) window.open(info.url, '_blank', 'noopener,noreferrer');
    } catch {
      showToast('danger', tc('errors.generic'));
    }
  }

  if (!enabled) return null;

  const recent = files.slice(0, 3);

  return (
    <section className="task-section">
      <div className="task-section-title-row">
        <h6 className="task-section-title">
          <i className="ri-attachment-2" aria-hidden="true" />
          {t('task.recent_files.title')}
        </h6>
        {files.length > 3 && (
          <button
            type="button"
            onClick={onViewAll}
            className="ms-auto"
            style={{
              background: 'transparent', border: 'none',
              color: 'var(--task-purple-700)', fontSize: 12.5, fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {t('task.recent_files.view_all')}
          </button>
        )}
      </div>
      {loading ? (
        <div style={{ color: 'var(--task-muted)', fontSize: 12.5 }}>…</div>
      ) : recent.length === 0 ? (
        <div style={{ color: 'var(--task-muted)', fontSize: 12.5 }}>—</div>
      ) : (
        <div className="files-mini">
          {recent.map((f) => {
            const blocked = f.scanStatus === 'INFECTED' || f.scanStatus === 'PENDING';
            return (
            <button
              key={f.publicId}
              type="button"
              className={`fmini-row${blocked ? ' fmini-row--blocked' : ''}`}
              onClick={() => handleDownload(f)}
              disabled={blocked}
              title={blocked ? undefined : tf('actions.download')}
            >
              <span className={`fmini-thumb ${miniThumbClass(f)}`}>
                <i className={miniThumbIcon(f)} aria-hidden="true" />
              </span>
              <span className="fmini-body">
                <span className="fmini-name" title={f.originalName}>{f.originalName}</span>
                <span className="fmini-sub">
                  {formatDate(f.uploadedAt, dateFormat)}
                  {f.uploadedBy ? ` · ${f.uploadedBy.name}` : ''}
                </span>
              </span>
            </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function miniThumbClass(f: AppFile): string {
  const ext = extOf(f.originalName);
  if (ext === 'pdf') return 'fmini-pdf';
  if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') return 'fmini-xlsx';
  if (ext === 'doc' || ext === 'docx') return 'fmini-doc';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif', 'heic'].includes(ext)) return 'fmini-img';
  return 'fmini-default';
}

function miniThumbIcon(f: AppFile): string {
  const ext = extOf(f.originalName);
  if (ext === 'pdf') return 'ri-file-pdf-line';
  if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') return 'ri-file-excel-line';
  if (ext === 'doc' || ext === 'docx') return 'ri-file-word-line';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif', 'heic'].includes(ext)) return 'ri-image-line';
  return 'ri-file-line';
}

function extOf(name: string): string {
  const idx = name.lastIndexOf('.');
  return idx === -1 ? '' : name.slice(idx + 1).toLowerCase();
}
