/* eslint-disable */
// AWP — Shared "tool view" chrome shared by Lista, Quadro and Gantt:
// the top action bar (Filter + Exportar + Gerenciar Estados + Adicionar Tarefa
// + fullscreen) and the Gerenciar Estados drawer + Criar/Editar Estado modal.

const ST = window.awpTokens;

window.sharedCss = `
/* ============================================================
   Shared view-actions bar (Lista · Quadro · Gantt)
   ============================================================ */
.va-bar {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 24px;
  border-bottom: 1px solid ${ST.line};
  background: ${ST.panel};
  flex: 0 0 auto;
}
.va-filter {
  position: relative;
  flex: 0 1 320px;
  display: flex; align-items: center;
}
.va-filter input {
  width: 100%;
  padding: 7px 11px 7px 32px;
  border: 1px solid ${ST.line};
  border-radius: 8px;
  background: ${ST.panel};
  color: ${ST.ink};
  font-size: 12.5px;
  font-family: inherit;
  outline: none;
  transition: border-color .12s ease, box-shadow .12s ease;
}
.va-filter input::placeholder { color: ${ST.mute}; }
.va-filter input:focus {
  border-color: ${ST.brand};
  box-shadow: 0 0 0 3px ${ST.brandSoft};
}
.va-filter > svg { position: absolute; left: 10px; color: ${ST.mute}; pointer-events: none; }
.va-filter .clear {
  position: absolute; right: 8px;
  width: 18px; height: 18px;
  display: inline-flex; align-items: center; justify-content: center;
  background: transparent; border: 0; padding: 0;
  color: ${ST.mute}; cursor: pointer; border-radius: 4px;
}
.va-filter .clear:hover { color: ${ST.ink}; background: ${ST.panel2}; }
.va-bar .spacer { flex: 1; }

.va-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 11px;
  border-radius: 8px;
  border: 1px solid ${ST.line};
  background: ${ST.panel};
  color: ${ST.ink};
  font-size: 12.5px; font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: background .12s ease, border-color .12s ease;
  white-space: nowrap;
}
.va-btn:hover { background: ${ST.panel2}; }
.va-btn .chev { color: ${ST.dim}; font-size: 10px; margin-left: 2px; }
.va-btn.primary {
  background: ${ST.brand}; border-color: ${ST.brand}; color: #fff; font-weight: 600;
}
.va-btn.primary:hover { background: ${ST.brandHover}; border-color: ${ST.brandHover}; }
.va-icon-btn {
  width: 30px; height: 30px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 7px;
  border: 1px solid transparent;
  background: transparent;
  color: ${ST.ink2};
  cursor: pointer;
  transition: background .12s ease, color .12s ease;
  padding: 0;
}
.va-icon-btn:hover { background: ${ST.panel2}; color: ${ST.ink}; }

/* Export dropdown */
.va-export-wrap { position: relative; }
.va-export-menu { position: absolute; left: 0; top: calc(100% + 4px); background: ${ST.panel}; border: 1px solid ${ST.line}; border-radius: 9px; box-shadow: 0 8px 24px -4px rgba(0,0,0,.14); z-index: 300; min-width: 152px; padding: 4px; }
.va-export-item { display: flex; align-items: center; gap: 8px; padding: 7px 12px; border-radius: 6px; font-size: 13px; cursor: pointer; color: ${ST.ink}; }
.va-export-item:hover { background: ${ST.panel2}; }
.va-export-item .badge { font-size: 10px; margin-left: auto; padding: 1px 5px; border-radius: 4px; background: ${ST.panel2}; color: ${ST.mute}; font-weight: 600; }

@media (max-width: 880px) {
  .va-bar { padding: 10px 14px; flex-wrap: wrap; row-gap: 8px; }
  .va-bar .spacer { display: none; }
  .va-filter { flex: 1 1 100%; }
}

/* ============================================================
   Gerenciar Estados — drawer
   ============================================================ */
.ms-backdrop {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.32);
  z-index: 90;
  animation: ms-fade .15s ease;
}
@keyframes ms-fade { from { opacity: 0; } to { opacity: 1; } }
.ms-drawer {
  position: fixed; top: 0; right: 0; bottom: 0;
  width: 420px; max-width: 100%;
  background: ${ST.panel};
  border-left: 1px solid ${ST.line};
  display: flex; flex-direction: column;
  z-index: 100;
  box-shadow: -8px 0 24px rgba(0,0,0,.16);
  animation: ms-slide .2s ease;
}
@keyframes ms-slide { from { transform: translateX(20px); opacity: 0; } to { transform: none; opacity: 1; } }

.ms-head {
  display: flex; align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid ${ST.line};
}
.ms-head .title {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 15px; font-weight: 600;
  color: ${ST.ink};
}
.ms-head .close {
  margin-left: auto;
  width: 28px; height: 28px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 6px;
  color: ${ST.dim};
  cursor: pointer;
  background: transparent;
  border: none;
  padding: 0;
}
.ms-head .close:hover { background: ${ST.panel2}; color: ${ST.ink}; }

.ms-info {
  display: flex; gap: 8px; align-items: flex-start;
  padding: 12px 20px;
  background: ${ST.panel2};
  font-size: 12.5px;
  color: ${ST.ink2};
  border-bottom: 1px solid ${ST.line};
  line-height: 1.45;
}
.ms-info svg { flex: 0 0 auto; color: ${ST.brand}; margin-top: 2px; }

.ms-body { flex: 1; overflow-y: auto; padding: 8px 20px; }

.ms-state {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 0;
  border-bottom: 1px solid ${ST.lineSoft};
}
.ms-state:last-child { border-bottom: 0; }
.ms-state .dot {
  width: 12px; height: 12px;
  border-radius: 999px;
  flex: 0 0 auto;
  box-shadow: inset 0 0 0 2px ${ST.panel};
}
.ms-state .info { flex: 1; min-width: 0; }
.ms-state .info .name { font-size: 13.5px; font-weight: 500; color: ${ST.ink}; }
.ms-state .info .meta {
  font-size: 11.5px; color: ${ST.dim};
  margin-top: 3px;
  display: inline-flex; align-items: center; gap: 4px;
}
.ms-state .info .meta svg { color: ${ST.high}; }
.ms-state .actions { display: flex; gap: 6px; flex: 0 0 auto; }
.ms-state .actions button {
  width: 32px; height: 28px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 7px;
  background: ${ST.panel2};
  border: 1px solid ${ST.line};
  color: ${ST.ink2};
  cursor: pointer;
  padding: 0;
  transition: background .12s ease, color .12s ease;
}
.ms-state .actions button:hover { background: ${ST.panel3}; color: ${ST.ink}; }
.ms-state .actions button.edit { background: ${ST.brandSoft}; border-color: ${ST.brandSoft}; color: ${ST.brand}; }
.ms-state .actions button.edit:hover { background: ${ST.brandSoft2}; }

.ms-foot {
  padding: 14px 20px;
  border-top: 1px solid ${ST.line};
}
.ms-add-btn {
  width: 100%;
  padding: 10px 14px;
  border-radius: 8px;
  background: ${ST.brand};
  border: 1px solid ${ST.brand};
  color: #fff;
  font-size: 13px; font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  transition: background .12s ease, border-color .12s ease;
}
.ms-add-btn:hover { background: ${ST.brandHover}; border-color: ${ST.brandHover}; }

/* ============================================================
   Criar / Editar Estado — modal
   ============================================================ */
.ms-modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.45);
  display: flex; align-items: center; justify-content: center;
  z-index: 110;
  animation: ms-fade .15s ease;
  padding: 16px;
}
.ms-modal {
  width: 480px; max-width: 100%;
  background: ${ST.panel};
  border: 1px solid ${ST.line};
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0,0,0,.32);
  display: flex; flex-direction: column;
  animation: ms-pop .15s ease;
}
@keyframes ms-pop { from { transform: scale(.96); opacity: 0; } to { transform: scale(1); opacity: 1; } }

.ms-modal-head {
  display: flex; align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid ${ST.line};
}
.ms-modal-head .title {
  font-size: 15px; font-weight: 600;
  color: ${ST.ink};
  display: inline-flex; align-items: center; gap: 8px;
}
.ms-modal-head .close {
  margin-left: auto;
  width: 28px; height: 28px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 6px;
  color: ${ST.dim};
  cursor: pointer;
  background: transparent;
  border: none;
  padding: 0;
}
.ms-modal-head .close:hover { background: ${ST.panel2}; color: ${ST.ink}; }

.ms-modal-body {
  padding: 18px 20px;
  display: flex; flex-direction: column; gap: 16px;
}
.ms-field { display: flex; flex-direction: column; gap: 6px; }
.ms-field label {
  font-size: 12px; font-weight: 600;
  color: ${ST.ink2};
}
.ms-field label .req { color: ${ST.high}; margin-left: 2px; }
.ms-field input[type="text"],
.ms-field input[type="number"] {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid ${ST.line};
  border-radius: 8px;
  background: ${ST.panel};
  color: ${ST.ink};
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color .12s ease, box-shadow .12s ease;
  box-sizing: border-box;
}
.ms-field input[type="text"]:focus,
.ms-field input[type="number"]:focus {
  border-color: ${ST.brand};
  box-shadow: 0 0 0 3px ${ST.brandSoft};
}
.ms-field input::placeholder { color: ${ST.mute}; }
.ms-field .help { font-size: 11.5px; color: ${ST.dim}; margin-top: 2px; }

.ms-color-row { display: flex; gap: 10px; align-items: center; }
.ms-color-row .swatch {
  width: 40px; height: 38px;
  border-radius: 8px;
  border: 1px solid ${ST.line};
  cursor: pointer;
  position: relative;
  overflow: hidden;
  flex: 0 0 auto;
}
.ms-color-row .swatch input[type="color"] {
  position: absolute; inset: -4px; opacity: 0; cursor: pointer; border: 0; width: calc(100% + 8px); height: calc(100% + 8px);
}
.ms-color-row .hex { flex: 1; }
.ms-color-row .hex input {
  font-family: 'Geist Mono', ui-monospace, monospace;
  text-transform: lowercase;
}

.ms-modal-foot {
  display: flex; justify-content: flex-end; gap: 8px;
  padding: 14px 20px;
  border-top: 1px solid ${ST.line};
  background: ${ST.panel2};
  border-radius: 0 0 12px 12px;
}
.ms-modal-foot button {
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 13px; font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  border: 1px solid ${ST.line};
  background: ${ST.panel};
  color: ${ST.ink};
}
.ms-modal-foot button:hover { background: ${ST.panel3}; }
.ms-modal-foot button.primary {
  background: ${ST.brand};
  border-color: ${ST.brand};
  color: #fff;
  font-weight: 600;
  display: inline-flex; align-items: center; gap: 6px;
}
.ms-modal-foot button.primary:hover { background: ${ST.brandHover}; }
.ms-modal-foot button.primary:disabled { opacity: 0.5; cursor: not-allowed; }
`;

// ============================================================
// Shared icons
// ============================================================
const FilterIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
  </svg>
);
const StatesIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2 2 7l10 5 10-5-10-5z"/>
    <path d="M2 17l10 5 10-5"/>
    <path d="M2 12l10 5 10-5"/>
  </svg>
);
const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

// ============================================================
// ViewActions — shared toolbar
// ============================================================
window.ViewActions = function ViewActions({
  filter, setFilter,
  onManageStates, onAddTask, onExport, onFullscreen, onSettings,
  showFullscreen = true,
}) {
  const { useState, useRef, useEffect } = React;
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef(null);
  useEffect(() => {
    function h(e) { if (exportRef.current && !exportRef.current.contains(e.target)) setExportOpen(false); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleAdd = onAddTask || (() => window.__openTaskModal && window.__openTaskModal());
  const handleManage = onManageStates || (() => window.__openManageStates && window.__openManageStates());
  return (
    <div className="va-bar">
      <div className="va-filter">
        <FilterIcon />
        <input
          type="text"
          placeholder="Filtrar tarefas…"
          value={filter || ''}
          onChange={(e) => setFilter && setFilter(e.target.value)}
        />
        {filter && (
          <button className="clear" onClick={() => setFilter && setFilter('')} aria-label="Limpar filtro">
            <CloseIcon />
          </button>
        )}
      </div>
      <div className="spacer"></div>
      <div className="va-export-wrap" ref={exportRef}>
        <button className="va-btn" onClick={() => setExportOpen(o => !o)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Exportar
          <span className="chev">▾</span>
        </button>
        {exportOpen && (
          <div className="va-export-menu">
            <div className="va-export-item" onClick={() => { onExport && onExport('pdf'); setExportOpen(false); }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
              PDF
              <span className="badge">.pdf</span>
            </div>
            <div className="va-export-item" onClick={() => { onExport && onExport('excel'); setExportOpen(false); }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/><line x1="15" y1="9" x2="15" y2="21"/></svg>
              Excel
              <span className="badge">.xlsx</span>
            </div>
          </div>
        )}
      </div>
      <button className="va-btn" onClick={handleManage}>
        <StatesIcon />
        Gerenciar Estados
      </button>
      <button className="va-btn primary" onClick={handleAdd}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Adicionar Tarefa
      </button>
      <button
        className="va-icon-btn"
        title="Configurações"
        onClick={() => {
          if (onSettings) onSettings();
          else if (window.__openCurrentViewSettings) window.__openCurrentViewSettings();
        }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
      </button>
      {showFullscreen && (
        <button className="va-icon-btn" title="Tela cheia" onClick={() => onFullscreen && onFullscreen()}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/></svg>
        </button>
      )}
    </div>
  );
};

// ============================================================
// Default system states (seed)
// ============================================================
const DEFAULT_STATES = [
  { id: 'todo',  name: 'A Fazer',       color: '#9ca3af', system: true },
  { id: 'doing', name: 'Em Andamento',  color: '#f59e0b', system: true },
  { id: 'done',  name: 'Concluído',     color: '#22c55e', system: true },
];

// ============================================================
// Manage States Drawer
// ============================================================
window.ManageStatesDrawer = function ManageStatesDrawer({ onClose }) {
  const { useState, useEffect } = React;
  // Persist between opens so edits stick
  const [states, setStates] = useState(() => window.__awpStates || DEFAULT_STATES);
  useEffect(() => { window.__awpStates = states; }, [states]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (s) => { setEditing(s); setModalOpen(true); };
  const onSave = (next) => {
    if (editing) {
      setStates(prev => prev.map(s => s.id === editing.id ? { ...s, ...next } : s));
    } else {
      setStates(prev => [...prev, { id: 'st-' + Date.now(), system: false, ...next }]);
    }
    setModalOpen(false);
  };

  // Close drawer on Esc unless modal is open
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !modalOpen) onClose && onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [modalOpen, onClose]);

  return (
    <>
      <div className="ms-backdrop" onClick={onClose}></div>
      <div className="ms-drawer" role="dialog" aria-label="Gerenciar Estados">
        <div className="ms-head">
          <div className="title">
            <StatesIcon />
            Gerenciar Estados
          </div>
          <button className="close" onClick={onClose} aria-label="Fechar">
            <CloseIcon />
          </button>
        </div>
        <div className="ms-info">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Os estados de sistema não podem ser eliminados mas podem ser renomeados e recoloridos.
        </div>
        <div className="ms-body">
          {states.map(s => (
            <div key={s.id} className="ms-state">
              <span className="dot" style={{ background: s.color }}></span>
              <div className="info">
                <div className="name">{s.name}</div>
                {s.system && (
                  <div className="meta">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9"/></svg>
                    Sistema
                  </div>
                )}
              </div>
              <div className="actions">
                <button title="Reordenar" aria-label="Reordenar">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                </button>
                <button className="edit" title="Editar" onClick={() => openEdit(s)} aria-label="Editar">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="ms-foot">
          <button className="ms-add-btn" onClick={openCreate}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Adicionar Estado
          </button>
        </div>
      </div>

      {modalOpen && (
        <window.StateModal
          initial={editing}
          onSave={onSave}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
};

// ============================================================
// State Modal — Criar / Editar Estado
// ============================================================
window.StateModal = function StateModal({ initial, onSave, onClose }) {
  const { useState, useEffect } = React;
  const [name, setName] = useState(initial?.name || '');
  const [color, setColor] = useState(initial?.color || '#6c5ce7');
  const [wip, setWip]   = useState(initial?.wip != null ? String(initial.wip) : '');

  const isEdit = !!initial;
  const valid = name.trim().length > 0;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose && onClose();
      if (e.key === 'Enter' && valid && (e.target.tagName !== 'TEXTAREA')) {
        e.preventDefault();
        submit();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  const submit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!valid) return;
    onSave({ name: name.trim(), color, wip: wip ? Number(wip) : null });
  };

  return (
    <div className="ms-modal-backdrop" onClick={onClose}>
      <form
        className="ms-modal"
        role="dialog"
        aria-label={isEdit ? 'Editar Estado' : 'Criar Estado'}
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}>
        <div className="ms-modal-head">
          <div className="title">
            <StatesIcon />
            {isEdit ? 'Editar Estado' : 'Criar Estado'}
          </div>
          <button type="button" className="close" onClick={onClose} aria-label="Fechar">
            <CloseIcon />
          </button>
        </div>
        <div className="ms-modal-body">
          <div className="ms-field">
            <label>Nome<span className="req">*</span></label>
            <input type="text" placeholder="Ex: Revisão" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="ms-field">
            <label>Cor</label>
            <div className="ms-color-row">
              <span className="swatch" style={{ background: color }}>
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label="Selecionar cor" />
              </span>
              <div className="hex">
                <input type="text" value={color} onChange={(e) => setColor(e.target.value)} maxLength={7} />
              </div>
            </div>
          </div>
          <div className="ms-field">
            <label>Limite WIP</label>
            <input type="number" placeholder="Opcional" value={wip} onChange={(e) => setWip(e.target.value)} min="1" />
            <div className="help">Tarefas máximas simultâneas. Vazio = sem limite.</div>
          </div>
        </div>
        <div className="ms-modal-foot">
          <button type="button" onClick={onClose}>Cancelar</button>
          <button type="submit" className="primary" disabled={!valid}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            Salvar
          </button>
        </div>
      </form>
    </div>
  );
};
