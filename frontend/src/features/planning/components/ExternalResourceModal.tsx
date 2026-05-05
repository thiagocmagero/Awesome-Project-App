import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { ExternalResource, UserTypeLookup } from '../types';

// ── Create / Edit modal ───────────────────────────────────────────────────────

export interface ExternalResourceModalProps {
  editingExt: ExternalResource | null;
  extForm: { text: string; userTypeId: string; hoursPerDay: string };
  setExtForm: (form: ExternalResourceModalProps['extForm']) => void;
  extFormError: string;
  extFormLoading: boolean;
  userTypes: UserTypeLookup[];
  setShowExtModal: (v: boolean) => void;
  handleExtSubmit: (e: FormEvent) => Promise<void>;
}

export function ExternalResourceModal({
  editingExt, extForm, setExtForm, extFormError, extFormLoading,
  userTypes, setShowExtModal, handleExtSubmit,
}: ExternalResourceModalProps) {
  const { t } = useTranslation('planning');
  const { t: tc } = useTranslation('common');

  return (
    <>
      <div className="modal fade show d-block" tabIndex={-1}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                {editingExt ? t('ext.modal_edit_title') : t('ext.modal_create_title')}
              </h5>
              <button type="button" className="btn-close" onClick={() => setShowExtModal(false)} />
            </div>
            <form onSubmit={handleExtSubmit}>
              <div className="modal-body">
                {extFormError && <div className="alert alert-danger py-2">{extFormError}</div>}
                <div className="row gy-3">
                  <div className="col-12">
                    <label className="form-label">
                      {t('ext.form.name')} <span className="text-danger">*</span>
                    </label>
                    <input
                      className="form-control"
                      placeholder={t('ext.form.name_placeholder')}
                      value={extForm.text}
                      onChange={(e) => setExtForm({ ...extForm, text: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label">
                      {t('ext.form.user_type')} <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      value={extForm.userTypeId}
                      onChange={(e) => setExtForm({ ...extForm, userTypeId: e.target.value })}
                      required
                    >
                      <option value="">{t('ext.form.user_type_select')}</option>
                      {userTypes.map((ut) => (
                        <option key={ut.publicId} value={ut.publicId}>{ut.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">{t('ext.form.hours')}</label>
                    <div className="input-group">
                      <input
                        type="number"
                        className="form-control"
                        min={0}
                        max={24}
                        step={0.5}
                        value={extForm.hoursPerDay}
                        onChange={(e) => setExtForm({ ...extForm, hoursPerDay: e.target.value })}
                      />
                      <span className="input-group-text">h</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-light" onClick={() => setShowExtModal(false)}>
                  {tc('actions.cancel')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={extFormLoading}>
                  {extFormLoading
                    ? <><span className="spinner-border spinner-border-sm me-2" />{tc('messages.saving')}</>
                    : editingExt ? tc('actions.save') : t('ext.btn_create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" onClick={() => setShowExtModal(false)} />
    </>
  );
}

// ── Delete confirm modal ──────────────────────────────────────────────────────

export interface DeleteExtModalProps {
  deletingExt: ExternalResource;
  deleteExtLoading: boolean;
  setShowDeleteExt: (v: boolean) => void;
  handleDeleteExt: () => Promise<void>;
}

export function DeleteExtModal({ deletingExt, deleteExtLoading, setShowDeleteExt, handleDeleteExt }: DeleteExtModalProps) {
  const { t } = useTranslation('planning');
  const { t: tc } = useTranslation('common');

  return (
    <>
      <div className="modal fade show d-block" tabIndex={-1}>
        <div className="modal-dialog modal-sm modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title text-danger">{t('ext.delete_title')}</h5>
              <button type="button" className="btn-close" onClick={() => setShowDeleteExt(false)} />
            </div>
            <div className="modal-body">
              <p className="mb-1">{t('ext.delete_confirm', { name: deletingExt.text })}</p>
              <p className="text-muted fs-13 mb-0">{t('ext.delete_warning')}</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-light btn-sm" onClick={() => setShowDeleteExt(false)}>
                {tc('actions.cancel')}
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={handleDeleteExt}
                disabled={deleteExtLoading}
              >
                {deleteExtLoading
                  ? <span className="spinner-border spinner-border-sm" />
                  : tc('actions.delete')}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" onClick={() => setShowDeleteExt(false)} />
    </>
  );
}
