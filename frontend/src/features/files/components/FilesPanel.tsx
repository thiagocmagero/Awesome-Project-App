import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../../contexts/ToastContext';
import {
  ProjectAction,
  useProjectPermissions,
} from '../../../hooks/useProjectPermissions';
import { useFiles, useUploadsAvailability } from '../useFiles';
import { FileUploadButton } from './FileUploadButton';
import { FileListItem } from './FileListItem';
import { parseErrorContext, formatUploadError } from '../errors';
import type { AppFile } from '../types';

interface Props {
  projectPublicId: string | null;
  /** Se definido, lista apenas ficheiros desta task. Sem isto, project-level. */
  taskPublicId?: string | null;
  /** Quando true (default false), só busca quando o tab está visível. */
  enabled?: boolean;
}

/**
 * Painel reutilizável de ficheiros — usado tanto na tab "Ficheiros" do
 * `TaskModal` (com `taskPublicId`) como na tab "Ficheiros do Projeto" da
 * `PlanningPage` (sem `taskPublicId`, scope='project').
 *
 * Inclui upload, lista, escudo de scan, replace, rename, delete + download
 * em URL presigned.
 */
export function FilesPanel({
  projectPublicId,
  taskPublicId = null,
  enabled = true,
}: Props) {
  const { t } = useTranslation('files');
  const { t: tc } = useTranslation('common');
  const { showToast } = useToast();
  const { can, loading: permLoading } = useProjectPermissions(projectPublicId ?? undefined);
  const uploadsAvailable = useUploadsAvailability();

  const canView = can(ProjectAction.FILE_VIEW);
  const canUpload = can(ProjectAction.FILE_UPLOAD);
  const canRename = can(ProjectAction.FILE_RENAME);
  const canDelete = can(ProjectAction.FILE_DELETE);

  const { files, loading, refresh, upload, replace, rename, remove, getDownloadUrl } =
    useFiles({
      projectPublicId,
      taskPublicId,
      scope: taskPublicId ? 'all' : 'project',
      enabled: enabled && canView,
    });

  const [renameTarget, setRenameTarget] = useState<AppFile | null>(null);
  const [replaceTarget, setReplaceTarget] = useState<AppFile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AppFile | null>(null);

  if (permLoading) {
    return <div className="text-muted">…</div>;
  }
  if (!canView) {
    return null; // ou empty state? canView=false ⇒ não devia ter chegado aqui
  }

  const isEmpty = !loading && files.length === 0;

  const handleUpload = async (file: File) => {
    await upload(file);
    showToast('success', t('upload.btn_submit'));
  };

  const handleReplace = async (file: File) => {
    if (!replaceTarget) return;
    try {
      await replace(replaceTarget.publicId, file);
      showToast('success', t('actions.replace'));
    } catch (err) {
      // Replace passa pela mesma validação de upload (size + magic bytes +
      // MIME + extension) — interpolar contexto rico para o user perceber
      // qual extensão/tipo foi rejeitado.
      showToast('danger', formatUploadError(t, parseErrorContext(err)));
    } finally {
      setReplaceTarget(null);
    }
  };

  const handleDownload = async (publicId: string) => {
    try {
      const info = await getDownloadUrl(publicId);
      if (info?.url) {
        window.open(info.url, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      showToast('danger', formatUploadError(t, parseErrorContext(err)));
    }
  };

  const handleRename = async () => {
    if (!renameTarget) return;
    const input = document.getElementById('files-rename-input') as HTMLInputElement | null;
    const newName = input?.value.trim() ?? '';
    if (!newName) return;
    try {
      await rename(renameTarget.publicId, newName);
      showToast('success', t('actions.rename'));
    } catch (err) {
      showToast('danger', formatUploadError(t, parseErrorContext(err)));
    } finally {
      setRenameTarget(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await remove(deleteTarget.publicId);
      showToast('success', t('actions.delete'));
    } catch (err) {
      showToast('danger', formatUploadError(t, parseErrorContext(err)));
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div>
      <div className="files-header">
        <h6>
          <i className="ri-attachment-2" aria-hidden="true" />
          {t('page.tab_label')}
          {!loading && files.length > 0 && (
            <span className="tab-count">{files.length}</span>
          )}
        </h6>
        {canUpload && uploadsAvailable !== false && (
          <FileUploadButton
            onFile={handleUpload}
            disabled={uploadsAvailable === null}
            className="btn btn-purple btn-sm"
            label={t('upload.btn_send_file')}
          />
        )}
      </div>

      {canUpload && uploadsAvailable !== false && (
        <div className="dropzone">
          <i className="ri-upload-cloud-2-line" aria-hidden="true" />
          <div className="dropzone-main">{t('upload.dropzone_main')}</div>
          <div className="dropzone-hint">{t('upload.dropzone_hint')}</div>
        </div>
      )}

      {isEmpty && !canUpload && (
        <div className="text-muted text-center p-4">
          {t('list.empty_readonly')}
        </div>
      )}

      <div>
        {files.map((f) => (
          <FileListItem
            key={f.publicId}
            file={f}
            canDownload
            canEdit={canRename}
            canDelete={canDelete}
            onDownload={handleDownload}
            onRename={setRenameTarget}
            onReplace={setReplaceTarget}
            onDelete={setDeleteTarget}
          />
        ))}
      </div>

      {/* Modal: rename */}
      {renameTarget && (
        <>
          <div
            className="modal fade show d-block"
            role="dialog"
            tabIndex={-1}
            aria-modal="true"
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">{t('rename.title')}</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setRenameTarget(null)}
                  />
                </div>
                <div className="modal-body">
                  <label className="form-label">{t('rename.label')}</label>
                  <input
                    id="files-rename-input"
                    type="text"
                    className="form-control"
                    defaultValue={renameTarget.originalName}
                    autoFocus
                  />
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setRenameTarget(null)}
                  >
                    {tc('actions.cancel')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleRename}
                  >
                    {t('rename.btn_save')}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" />
        </>
      )}

      {/* Modal: replace */}
      {replaceTarget && (
        <>
          <div
            className="modal fade show d-block"
            role="dialog"
            tabIndex={-1}
            aria-modal="true"
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">{t('actions.replace')}</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setReplaceTarget(null)}
                  />
                </div>
                <div className="modal-body">
                  <p className="text-muted small">{replaceTarget.originalName}</p>
                  <FileUploadButton
                    onFile={handleReplace}
                    label={t('upload.btn_choose')}
                    className="btn btn-primary"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" />
        </>
      )}

      {/* Modal: delete */}
      {deleteTarget && (
        <>
          <div
            className="modal fade show d-block"
            role="dialog"
            tabIndex={-1}
            aria-modal="true"
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">{t('delete.title')}</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setDeleteTarget(null)}
                  />
                </div>
                <div className="modal-body">
                  <p>
                    {t('delete.confirm', { name: deleteTarget.originalName })}
                  </p>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setDeleteTarget(null)}
                  >
                    {tc('actions.cancel')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleDelete}
                  >
                    {t('delete.btn_confirm')}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" />
        </>
      )}
    </div>
  );
}
