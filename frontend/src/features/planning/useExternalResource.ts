// Hook: gestão de estado e handlers do formulário de recurso externo
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { getApiBase, apiFetch } from '../../lib/api';
import type { ExternalResource, UserTypeLookup, ShowToastFn } from './types';

export interface UseExternalResourceProps {
  projectId: string | undefined;
  token: string | null;
  userTypes: UserTypeLookup[];
  loadAll: () => Promise<void>;
  showToast: ShowToastFn;
}

export interface UseExternalResourceReturn {
  showExtModal: boolean;
  setShowExtModal: React.Dispatch<React.SetStateAction<boolean>>;
  editingExt: ExternalResource | null;
  extForm: { text: string; userTypeId: string; hoursPerDay: string };
  setExtForm: React.Dispatch<React.SetStateAction<{ text: string; userTypeId: string; hoursPerDay: string }>>;
  extFormError: string;
  extFormLoading: boolean;
  showDeleteExt: boolean;
  setShowDeleteExt: React.Dispatch<React.SetStateAction<boolean>>;
  deletingExt: ExternalResource | null;
  setDeletingExt: React.Dispatch<React.SetStateAction<ExternalResource | null>>;
  deleteExtLoading: boolean;
  openCreateExt: () => void;
  openEditExt: (r: ExternalResource) => void;
  handleExtSubmit: (e: FormEvent) => Promise<void>;
  handleDeleteExt: () => Promise<void>;
}

export function useExternalResource({
  projectId, token, userTypes: _userTypes, loadAll, showToast,
}: UseExternalResourceProps): UseExternalResourceReturn {
  const { t } = useTranslation('planning');
  const { t: tc } = useTranslation('common');
  const api = getApiBase();

  const [showExtModal, setShowExtModal]       = useState(false);
  const [editingExt, setEditingExt]           = useState<ExternalResource | null>(null);
  const [extForm, setExtForm]                 = useState({ text: '', userTypeId: '', hoursPerDay: '8' });
  const [extFormError, setExtFormError]       = useState('');
  const [extFormLoading, setExtFormLoading]   = useState(false);

  const [showDeleteExt, setShowDeleteExt]     = useState(false);
  const [deletingExt, setDeletingExt]         = useState<ExternalResource | null>(null);
  const [deleteExtLoading, setDeleteExtLoading] = useState(false);

  function h() {
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  }

  function openCreateExt() {
    setEditingExt(null);
    setExtForm({ text: '', userTypeId: '', hoursPerDay: '8' });
    setExtFormError('');
    setShowExtModal(true);
  }

  function openEditExt(r: ExternalResource) {
    setEditingExt(r);
    setExtForm({ text: r.text, userTypeId: r.userType.publicId, hoursPerDay: String(r.hoursPerDay) });
    setExtFormError('');
    setShowExtModal(true);
  }

  async function handleExtSubmit(e: FormEvent) {
    e.preventDefault();
    setExtFormError('');
    if (!extForm.text.trim()) { setExtFormError(t('ext.form.name') + ' ' + tc('errors.required')); return; }
    if (!extForm.userTypeId) { setExtFormError(t('ext.form.user_type') + ' ' + tc('errors.required')); return; }
    const hpd = parseFloat(extForm.hoursPerDay);
    if (isNaN(hpd) || hpd < 0 || hpd > 24) { setExtFormError(t('ext.hours_range_error')); return; }
    setExtFormLoading(true);
    try {
      const body: Record<string, unknown> = {
        text: extForm.text.trim(),
        userTypeId: extForm.userTypeId,
        hoursPerDay: hpd,
      };
      const url = editingExt
        ? `${api}/projects/${projectId}/planning/resources/${editingExt.publicId}`
        : `${api}/projects/${projectId}/planning/resources`;
      const method = editingExt ? 'PUT' : 'POST';
      const res = await apiFetch(url, { method, headers: h(), body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message.join(' · ') : data.message;
        throw new Error(msg || t('ext.error_save'));
      }
      setShowExtModal(false);
      showToast('success', editingExt ? t('ext.success_updated') : t('ext.success_created'));
      await loadAll();
    } catch (e: unknown) {
      setExtFormError(e instanceof Error ? e.message : tc('errors.generic'));
    } finally {
      setExtFormLoading(false);
    }
  }

  async function handleDeleteExt() {
    if (!deletingExt) return;
    setDeleteExtLoading(true);
    try {
      const res = await apiFetch(
        `${api}/projects/${projectId}/planning/resources/${deletingExt.publicId}`,
        { method: 'DELETE', headers: h() },
      );
      if (!res.ok) throw new Error(t('ext.error_delete'));
      setShowDeleteExt(false);
      setDeletingExt(null);
      showToast('success', t('ext.success_deleted'));
      await loadAll();
    } catch (e: unknown) {
      showToast('danger', e instanceof Error ? e.message : tc('errors.generic'));
    } finally {
      setDeleteExtLoading(false);
    }
  }

  return {
    showExtModal, setShowExtModal,
    editingExt,
    extForm, setExtForm,
    extFormError,
    extFormLoading,
    showDeleteExt, setShowDeleteExt,
    deletingExt, setDeletingExt,
    deleteExtLoading,
    openCreateExt, openEditExt,
    handleExtSubmit, handleDeleteExt,
  };
}
