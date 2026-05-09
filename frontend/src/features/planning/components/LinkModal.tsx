import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { LINK_TYPES } from '../types';
import type { Task } from '../types';

export interface LinkModalProps {
  tasks: Task[];
  linkForm: { source: string; target: string; type: string; lag: string };
  setLinkForm: (form: LinkModalProps['linkForm']) => void;
  linkFormError: string;
  linkFormLoading: boolean;
  setShowLinkModal: (v: boolean) => void;
  handleLinkSubmit: (e: FormEvent) => Promise<void>;
}

export function LinkModal({
  tasks, linkForm, setLinkForm, linkFormError, linkFormLoading,
  setShowLinkModal, handleLinkSubmit,
}: LinkModalProps) {
  const { t } = useTranslation('planning');
  const { t: tc } = useTranslation('common');

  return (
    <>
      <div className="modal fade show d-block" tabIndex={-1}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{t('link.modal_title')}</h5>
              <button type="button" className="btn-close" onClick={() => setShowLinkModal(false)} />
            </div>
            <form onSubmit={handleLinkSubmit}>
              <div className="modal-body">
                {linkFormError && (
                  <div className="alert alert-danger py-2">{linkFormError}</div>
                )}
                <div className="row gy-3">
                  <div className="col-12">
                    <label className="form-label">{t('link.form.source')} <span className="text-danger">*</span></label>
                    <select
                      className="form-select"
                      value={linkForm.source}
                      required
                      onChange={(e) =>
                        setLinkForm({
                          ...linkForm,
                          source: e.target.value,
                          target: linkForm.target === e.target.value ? '' : linkForm.target,
                        })
                      }
                    >
                      <option value="">{tc('form.select')}</option>
                      {tasks.map((tk) => (
                        <option key={tk.publicId} value={String(tk.id)}>{tk.text}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label">{t('link.form.target')} <span className="text-danger">*</span></label>
                    <select
                      className="form-select"
                      value={linkForm.target}
                      required
                      onChange={(e) => setLinkForm({ ...linkForm, target: e.target.value })}
                    >
                      <option value="">{tc('form.select')}</option>
                      {tasks
                        .filter((tk) => String(tk.id) !== linkForm.source)
                        .map((tk) => (
                          <option key={tk.publicId} value={String(tk.id)}>{tk.text}</option>
                        ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">{t('link.form.type')}</label>
                    <select
                      className="form-select"
                      value={linkForm.type}
                      onChange={(e) => setLinkForm({ ...linkForm, type: e.target.value })}
                    >
                      {LINK_TYPES.map((o) => (
                        <option key={o.value} value={o.value}>{t(`link.type.${o.value}` as Parameters<typeof t>[0])}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">{t('link.form.lag')}</label>
                    <input
                      type="number"
                      className="form-control"
                      value={linkForm.lag}
                      onChange={(e) => setLinkForm({ ...linkForm, lag: e.target.value })}
                    />
                    <div className="form-text">{t('link.form.lag_hint')}</div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-light" onClick={() => setShowLinkModal(false)}>
                  {tc('actions.cancel')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={linkFormLoading}>
                  {linkFormLoading
                    ? <><span className="spinner-border spinner-border-sm me-2" />{tc('messages.processing')}</>
                    : t('link.btn_create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" />
    </>
  );
}
