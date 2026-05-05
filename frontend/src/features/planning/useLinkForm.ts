// Hook: gestão de estado e handlers do formulário de dependência (link)
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { getApiBase, apiFetch } from '../../lib/api';
import { EMPTY_LINK_FORM } from './types';
import type { GanttTask, GanttLink, ShowToastFn } from './types';

export interface UseLinkFormProps {
  projectId: string | undefined;
  token: string | null;
  tasks: GanttTask[];
  loadAll: () => Promise<void>;
  showToast: ShowToastFn;
}

export interface UseLinkFormReturn {
  showLinkModal: boolean;
  setShowLinkModal: React.Dispatch<React.SetStateAction<boolean>>;
  linkForm: typeof EMPTY_LINK_FORM;
  setLinkForm: React.Dispatch<React.SetStateAction<typeof EMPTY_LINK_FORM>>;
  linkFormError: string;
  linkFormLoading: boolean;
  deleteLinkLoading: string | null;
  handleLinkSubmit: (e: FormEvent) => Promise<void>;
  handleDeleteLink: (link: GanttLink) => Promise<void>;
}

export function useLinkForm({
  projectId, token, tasks, loadAll, showToast,
}: UseLinkFormProps): UseLinkFormReturn {
  const { t } = useTranslation('planning');
  const { t: tc } = useTranslation('common');
  const api = getApiBase();

  const [showLinkModal, setShowLinkModal]       = useState(false);
  const [linkForm, setLinkForm]                 = useState({ ...EMPTY_LINK_FORM });
  const [linkFormError, setLinkFormError]       = useState('');
  const [linkFormLoading, setLinkFormLoading]   = useState(false);
  const [deleteLinkLoading, setDeleteLinkLoading] = useState<string | null>(null);

  function h() {
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  }

  async function handleLinkSubmit(e: FormEvent) {
    e.preventDefault();
    setLinkFormError('');
    setLinkFormLoading(true);
    try {
      const body = {
        source: Number(linkForm.source),
        target: Number(linkForm.target),
        type: linkForm.type,
        lag: Number(linkForm.lag),
      };
      const res = await apiFetch(`${api}/projects/${projectId}/planning/links`, {
        method: 'POST',
        headers: h(),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message.join(' · ') : data.message;
        throw new Error(msg || t('link.error_create'));
      }
      setShowLinkModal(false);
      showToast('success', t('link.success_created'));
      await loadAll();
    } catch (e: unknown) {
      setLinkFormError(e instanceof Error ? e.message : tc('errors.generic'));
    } finally {
      setLinkFormLoading(false);
    }
  }

  async function handleDeleteLink(link: GanttLink) {
    const srcTask = tasks.find((tk) => tk.id === link.source);
    const tgtTask = tasks.find((tk) => tk.id === link.target);
    if (!confirm(t('link.confirm_delete', { src: srcTask?.text ?? String(link.source), tgt: tgtTask?.text ?? String(link.target) }))) return;
    setDeleteLinkLoading(link.id);
    try {
      const res = await apiFetch(
        `${api}/projects/${projectId}/planning/links/${link.publicId}`,
        { method: 'DELETE', headers: h() },
      );
      if (!res.ok) throw new Error(t('link.error_delete'));
      showToast('success', t('link.success_deleted'));
      await loadAll();
    } catch (e: unknown) {
      showToast('danger', e instanceof Error ? e.message : tc('errors.generic'));
    } finally {
      setDeleteLinkLoading(null);
    }
  }

  return {
    showLinkModal, setShowLinkModal,
    linkForm, setLinkForm,
    linkFormError,
    linkFormLoading,
    deleteLinkLoading,
    handleLinkSubmit, handleDeleteLink,
  };
}
