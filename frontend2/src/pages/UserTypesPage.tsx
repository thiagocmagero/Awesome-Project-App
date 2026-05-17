import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../contexts/ToastContext';
import { useWorkspaces } from '../contexts/WorkspacesContext';
import { useWorkspaceUserTypes, type WorkspaceUserType } from '../hooks/useWorkspaceUserTypes';
import { TipoModal } from '../shell/TipoModal';
import { ConfirmDialog } from '../shell/ConfirmDialog';
import '../styles/ws-settings.css';

/**
 * Port literal de `NewTemplate/views-ws-settings.jsx:MemberTypesView`.
 * Mantém classes `ws-*` / `tipos-*` para preservar layout idêntico ao mockup.
 * Dados reais via `useWorkspaceUserTypes` (backend `/user-types`).
 */
export function UserTypesPage() {
  const { t: tu } = useTranslation('users');
  const { t: tc } = useTranslation('common');
  const { activeWorkspace } = useWorkspaces();
  const { showToast } = useToast();
  const { types, loading, create, update, toggleActive, remove } = useWorkspaceUserTypes();

  const [modal, setModal] = useState<{ kind: 'create' } | { kind: 'edit'; value: WorkspaceUserType } | null>(null);
  const [confirm, setConfirm] = useState<WorkspaceUserType | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const existingCodes = types.map((t) => t.code);

  async function handleSave(input: { code: string; label: string; publicId?: string }) {
    try {
      if (input.publicId) {
        await update(input.publicId, { label: input.label });
        showToast('success', tc('messages.success_updated'));
      } else {
        await create({ code: input.code, label: input.label });
        showToast('success', tc('messages.success_created'));
      }
      setModal(null);
    } catch (err) {
      const msg = (err as Error).message;
      showToast('danger', msg || tc('errors.generic'));
      throw err; // re-throw so the modal keeps open + sets internal error
    }
  }

  async function handleToggle(t: WorkspaceUserType) {
    if (busyId) return;
    setBusyId(t.publicId);
    try {
      await toggleActive(t);
    } catch (err) {
      showToast('danger', (err as Error).message || tc('errors.generic'));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete() {
    if (!confirm) return;
    setBusyId(confirm.publicId);
    try {
      const result = await remove(confirm.publicId);
      const msg = result.usageCount > 0
        ? tu('types.toast_deleted_with_reassignment', { count: result.usageCount })
        : tc('messages.success_deleted');
      showToast('success', msg);
      setConfirm(null);
    } catch (err) {
      showToast('danger', (err as Error).message || tc('errors.generic'));
    } finally {
      setBusyId(null);
    }
  }

  const workspaceName = activeWorkspace?.name ?? '';

  return (
    <div className="ws-page">
      {/* Page header */}
      <div className="ws-head">
        <div>
          <div className="title">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--brand)' }}>
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <line x1="3" y1="10" x2="21" y2="10" />
              <line x1="9" y1="4" x2="9" y2="20" />
            </svg>
            {tu('types.page_title')}
          </div>
          <div className="sub">
            {tu('types.page_subtitle_intro')}{' '}
            <b>{workspaceName}</b>
            {' '}— {tu('types.page_subtitle_outro')}
          </div>
        </div>
        <div className="right">
          <button type="button" className="ws-btn-primary" onClick={() => setModal({ kind: 'create' })}>
            <span style={{ fontSize: 16, lineHeight: 0 }}>+</span>
            {tu('types.btn_new')}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="ws-body">
        <div className="ws-table-card">
          {/* Card head */}
          <div className="tipos-card-head">
            <div className="ic">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <line x1="9" y1="4" x2="9" y2="20" />
              </svg>
            </div>
            <div className="body">
              <div className="tt">{tu('types.card_title')}</div>
              <div className="sb">{tu('types.card_subtitle')}</div>
            </div>
            <div className="right">
              <span className="chip">{tc('table.count', { count: types.length })}</span>
            </div>
          </div>

          {/* Table head */}
          <div className="tipos-row tipos-head-row">
            <span>#</span>
            <span>{tu('types.table_code')}</span>
            <span>{tu('types.table_label')}</span>
            <span>{tc('table.status')}</span>
            <span className="act-col">{tc('table.actions')}</span>
          </div>

          {/* Body rows */}
          {loading && types.length === 0 ? (
            <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--dim)', fontSize: 13 }}>
              {tc('loading')}
            </div>
          ) : types.length === 0 ? (
            <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--dim)', fontSize: 13 }}>
              {tu('types.empty')}
            </div>
          ) : (
            types.map((t) => {
              const tints = tipoTints(autoColorFor(t.code));
              const pillStyle: React.CSSProperties & Record<string, string> = {
                '--tp-soft': tints.soft,
                '--tp-ink': tints.ink,
                '--tp-line': tints.line,
                '--tp-soft-d': tints.softDark,
                '--tp-ink-d': tints.inkDark,
                '--tp-line-d': tints.lineDark,
              };
              const isActive = t.status === 'ACTIVE';
              return (
                <div
                  key={t.publicId}
                  className={'tipos-row tipos-body-row' + (!isActive ? ' inactive' : '')}
                >
                  <span className="tipo-id">{t.publicId.slice(0, 8)}</span>
                  <span>
                    <span className="tipo-code" style={pillStyle}>{t.code}</span>
                  </span>
                  <span className="tipo-label">{t.label}</span>
                  <span>
                    <button
                      type="button"
                      className={'pp-pill ' + (isActive ? 'st-active' : 'st-inactive')}
                      onClick={() => handleToggle(t)}
                      disabled={busyId === t.publicId}
                      style={{ cursor: busyId === t.publicId ? 'wait' : 'pointer', border: 'none', font: 'inherit' }}
                      title={isActive ? tu('types.toggle_to_inactive') : tu('types.toggle_to_active')}
                    >
                      {tc(isActive ? 'status.active' : 'status.inactive')}
                    </button>
                  </span>
                  <span className="ws-actions">
                    <button
                      type="button"
                      className="ws-btn-icon"
                      title={tc('actions.edit')}
                      onClick={() => setModal({ kind: 'edit', value: t })}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="ws-btn-icon danger"
                      title={tc('actions.delete')}
                      onClick={() => setConfirm(t)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6M14 11v6" />
                      </svg>
                    </button>
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {modal && (
        <TipoModal
          initial={modal.kind === 'edit' ? modal.value : null}
          existingCodes={existingCodes}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
      {confirm && (
        <ConfirmDialog
          title={tu('types.confirm_delete_title')}
          message={
            confirm.usageCount > 0
              ? tu('types.confirm_delete_with_usage', { count: confirm.usageCount, code: confirm.code })
              : tu('types.confirm_delete_text', { code: confirm.code })
          }
          danger
          onCancel={() => setConfirm(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

// ─── Helpers (port literal de NewTemplate/views-ws-settings.jsx) ────────────

const TIPO_COLORS = [
  'oklch(0.62 0.16 264)', 'oklch(0.62 0.15 155)', 'oklch(0.66 0.15 320)',
  'oklch(0.66 0.15 70)', 'oklch(0.62 0.14 220)', 'oklch(0.62 0.18 30)',
  'oklch(0.60 0.16 200)', 'oklch(0.62 0.16 130)',
];

/** Cor estável derivada do código (mesmo algoritmo do template). */
function autoColorFor(code: string): string {
  let h = 0;
  for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) & 0xffffffff;
  return TIPO_COLORS[Math.abs(h) % TIPO_COLORS.length];
}

/** Derivação de tints soft/ink/line a partir duma cor base `oklch(L C H)`. */
function tipoTints(base: string) {
  const m = /oklch\(\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)/.exec(base);
  if (!m) {
    return { soft: 'var(--brandSoft)', ink: 'var(--brand)', line: 'transparent', softDark: 'var(--brandSoft)', inkDark: 'var(--brand)', lineDark: 'transparent' };
  }
  const c = m[2]; const h = m[3];
  const cn = parseFloat(c);
  return {
    soft: `oklch(0.95 ${Math.min(cn, 0.08)} ${h})`,
    ink: `oklch(0.42 ${c} ${h})`,
    line: `oklch(0.88 ${Math.min(cn + 0.02, 0.10)} ${h})`,
    softDark: `oklch(0.34 ${c} ${h} / 0.42)`,
    inkDark: `oklch(0.86 ${Math.min(cn, 0.14)} ${h})`,
    lineDark: `oklch(0.40 ${c} ${h} / 0.5)`,
  };
}
