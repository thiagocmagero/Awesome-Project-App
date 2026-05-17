import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { T } from './tokens';

/** Port de NewTemplate/app-dark.jsx:1796-1854.
 *  `onCreate` é async; o modal espera a resolução e só fecha depois (ou mostra
 *  o erro inline se falhar). A navegação pós-criação é responsabilidade do caller. */
export function NewWorkspaceModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}) {
  const { t: tc } = useTranslation('common');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = name.trim().length > 0 && !submitting;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !submitting) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, submitting]);

  const submit = async () => {
    if (!valid) return;
    setError(null);
    setSubmitting(true);
    try {
      await onCreate(name.trim());
      // caller fecha o modal e navega — não tocamos no setSubmitting depois disso.
    } catch (err) {
      const status = (err as { status?: number }).status;
      const msg = (err as Error).message;
      if (status === 403) setError(tc('errors.forbidden'));
      else if (msg === 'WORKSPACE_NAME_TOO_LONG') setError(tc('workspaces.errors.name_too_long'));
      else setError(msg || tc('errors.generic'));
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 24 }}
      onClick={onClose}
    >
      <div
        style={{ width: 480, maxWidth: '100%', background: T.panel, border: `1px solid ${T.line}`, borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,.28)', overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={tc('workspaces.new_modal_title')}
      >
        <div style={{ display: 'flex', alignItems: 'center', padding: '18px 22px 14px', borderBottom: `1px solid ${T.line}` }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 17, fontWeight: 600, color: T.ink }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.brand} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            {tc('workspaces.new_modal_title')}
          </span>
          <button
            onClick={onClose}
            aria-label={tc('actions.close')}
            style={{ marginLeft: 'auto', width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, border: 'none', background: 'transparent', color: T.dim, cursor: 'pointer' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div style={{ padding: '22px 22px 12px' }}>
          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: T.ink2, marginBottom: 8 }}>
            {tc('workspaces.name_label')} <span style={{ color: T.high }}>*</span>
          </label>
          <input
            type="text"
            placeholder={tc('workspaces.name_placeholder')}
            value={name}
            autoFocus
            disabled={submitting}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }}
            style={{
              width: '100%', padding: '10px 13px', border: `1px solid ${T.line}`, borderRadius: 9,
              background: T.panel, color: T.ink, font: 'inherit', fontSize: 14, outline: 'none', boxSizing: 'border-box',
              borderColor: name ? T.brand : T.line,
              boxShadow: name ? `0 0 0 3px ${T.brandSoft}` : 'none',
              transition: 'border-color .12s, box-shadow .12s',
            }}
          />
          {error && (
            <div style={{
              marginTop: 10, padding: '8px 11px',
              background: 'oklch(0.96 0.04 25)', color: 'oklch(0.50 0.18 25)',
              border: '1px solid oklch(0.85 0.10 25)', borderRadius: 8,
              fontSize: 12.5, lineHeight: 1.4,
            }} role="alert">
              {error}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 22px 18px' }}>
          <button
            onClick={onClose}
            disabled={submitting}
            style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${T.line}`, background: T.panel, color: T.ink, font: 'inherit', fontSize: 13, cursor: submitting ? 'not-allowed' : 'pointer' }}
          >
            {tc('actions.cancel')}
          </button>
          <button
            onClick={() => void submit()}
            disabled={!valid}
            style={{
              padding: '8px 18px', borderRadius: 8,
              border: `1px solid ${valid ? T.brand : T.line}`,
              background: valid ? T.brand : T.panel3,
              color: valid ? '#fff' : T.mute,
              font: 'inherit', fontSize: 13, fontWeight: 600,
              cursor: valid ? 'pointer' : 'not-allowed', transition: 'all .12s',
            }}
          >
            {submitting ? tc('messages.processing') : tc('workspaces.create_btn')}
          </button>
        </div>
      </div>
    </div>
  );
}
