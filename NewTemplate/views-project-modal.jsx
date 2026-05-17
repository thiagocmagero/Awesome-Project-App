/* eslint-disable */
// AWP — Novo Projeto modal (tabbed: Geral + Região e Idioma).
// Opens from the workspace home "Novo projeto" button or the topbar "Criar > Projeto".

const { useState: useStateNP, useEffect: useEffectNP, useMemo: useMemoNP } = React;

// ============================================================
// CSS
// ============================================================

const npCss = `
.np-backdrop {
  position: fixed; inset: 0;
  background: rgba(var(--backdrop-rgb), .5);
  z-index: 95;
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
  -webkit-backdrop-filter: blur(3px);
  backdrop-filter: blur(3px);
  animation: np-fade .16s ease;
}
@keyframes np-fade { from { opacity: 0; } to { opacity: 1; } }

.np-modal {
  width: 720px; max-width: 100%;
  max-height: calc(100vh - 48px);
  background: var(--panel);
  border-radius: 14px;
  border: 1px solid var(--line);
  box-shadow: var(--shadow-pop);
  display: flex; flex-direction: column;
  overflow: hidden;
  animation: np-in .22s cubic-bezier(.2,.7,.2,1);
}
@keyframes np-in { from { transform: translateY(8px) scale(.98); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }

.np-head {
  padding: 16px 22px 12px;
  display: flex; align-items: center; gap: 12px;
}
.np-head .ic {
  width: 32px; height: 32px; border-radius: 9px;
  background: var(--brandSoft); color: var(--brand);
  display: inline-flex; align-items: center; justify-content: center;
}
.np-head .tt { font-size: 17px; font-weight: 600; }
.np-head .close {
  width: 30px; height: 30px;
  border-radius: 7px;
  background: transparent; border: none;
  color: var(--dim); cursor: pointer;
  margin-left: auto;
  display: inline-flex; align-items: center; justify-content: center;
}
.np-head .close:hover { background: var(--panel3); color: var(--ink); }

.np-tabs {
  display: grid; grid-template-columns: 1fr 1fr;
  border-bottom: 1px solid var(--line);
  padding: 0 14px;
  gap: 4px;
}
.np-tab {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  padding: 12px 16px;
  font-size: 13.5px; font-weight: 500;
  color: var(--dim);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  border-radius: 8px 8px 0 0;
  transition: color .12s, background .12s;
}
.np-tab:hover { color: var(--ink); background: var(--panel2); }
.np-tab.active {
  color: var(--brand);
  border-bottom-color: var(--brand);
  font-weight: 600;
  background: var(--brandSoft);
}
[data-theme="dark"] .np-tab.active { background: oklch(0.32 0.10 264 / 0.25); }
.np-tab .ic {
  width: 22px; height: 22px; border-radius: 999px;
  background: var(--panel2);
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--dim);
}
.np-tab.active .ic { background: var(--brandSoft); color: var(--brand); }

.np-body {
  padding: 22px 22px 8px;
  overflow-y: auto;
}
.np-pane { display: flex; flex-direction: column; gap: 18px; }

.np-field { display: flex; flex-direction: column; gap: 6px; }
.np-field .lab {
  font-size: 12.5px; font-weight: 600; color: var(--ink2);
  display: flex; align-items: center; gap: 8px;
}
.np-field .lab .req { color: oklch(0.60 0.22 25); margin-left: -4px; }
.np-field .lab .hint { font-size: 11px; font-weight: 400; color: var(--mute); }

.np-input, .np-select, .np-textarea {
  width: 100%;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--panel);
  color: var(--ink);
  font-family: var(--font); font-size: 13.5px;
}
.np-input, .np-select { height: 38px; }
.np-textarea { min-height: 96px; padding: 10px 12px; resize: vertical; line-height: 1.45; }
.np-input:focus, .np-select:focus, .np-textarea:focus {
  outline: none; border-color: var(--brand); box-shadow: 0 0 0 3px var(--brandSoft);
}
.np-input::placeholder, .np-textarea::placeholder { color: var(--mute); }

.np-select {
  appearance: none; -webkit-appearance: none;
  padding-right: 32px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 10 10'%3E%3Cpath d='M1 3l4 4 4-4' stroke='%23888' stroke-width='1.3' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  cursor: pointer;
}

.np-input-with-icon {
  position: relative;
}
.np-input-with-icon .ic {
  position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
  color: var(--dim); pointer-events: none;
}
.np-input-with-icon input { padding-left: 38px; }

.np-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

/* Manager (gestor) — option avatars */
.np-manager-picker {
  position: relative;
}
.np-manager-display {
  display: flex; align-items: center; gap: 10px;
  height: 38px;
  padding: 0 32px 0 10px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--panel);
  cursor: pointer;
  font-size: 13.5px;
}
.np-manager-display:hover { background: var(--panel2); }
.np-manager-display.open { border-color: var(--brand); box-shadow: 0 0 0 3px var(--brandSoft); }
.np-manager-display .empty { color: var(--mute); }
.np-manager-display .chev {
  position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
  color: var(--dim); pointer-events: none;
}
.np-manager-pop {
  position: absolute; top: calc(100% + 4px); left: 0; right: 0;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
  box-shadow: var(--shadow-pop);
  z-index: 5;
  padding: 4px;
  max-height: 250px; overflow-y: auto;
}
.np-manager-opt {
  display: flex; align-items: center; gap: 10px;
  padding: 7px 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}
.np-manager-opt:hover { background: var(--panel2); }
.np-manager-opt.on { background: var(--brandSoft); color: var(--brand); font-weight: 600; }
[data-theme="dark"] .np-manager-opt.on { background: oklch(0.32 0.10 264 / 0.3); }
.np-manager-opt .em { font-size: 11.5px; color: var(--dim); font-weight: 400; }
.np-manager-opt.on .em { color: var(--brand); opacity: 0.85; }

/* Priority chips */
.np-pri-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.np-pri-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 12px;
  border-radius: 8px;
  border: 1.5px solid var(--line);
  background: var(--panel);
  cursor: pointer;
  font-size: 12.5px; font-weight: 500;
  color: var(--ink2);
  transition: border-color .12s, background .12s;
}
.np-pri-chip .sq { width: 10px; height: 10px; border-radius: 3px; }
.np-pri-chip:hover { background: var(--panel2); }
.np-pri-chip.on {
  border-color: var(--brand);
  background: var(--brandSoft);
  color: var(--brand);
  font-weight: 600;
}
[data-theme="dark"] .np-pri-chip.on { background: oklch(0.32 0.10 264 / 0.3); }

/* Hours range */
.np-hours { display: grid; grid-template-columns: 1fr auto 1fr; gap: 10px; align-items: center; max-width: 280px; }
.np-hours .sep { color: var(--dim); font-size: 14px; }
.np-hours input { text-align: center; font-family: var(--mono); font-size: 14px; font-weight: 600; }

/* Date format preview */
.np-preview {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 12px;
  background: var(--panel2);
  border-radius: 8px;
  font-size: 12.5px;
  color: var(--dim);
}
.np-preview .v { color: var(--brand); font-family: var(--mono); font-weight: 600; }

.np-footer {
  padding: 14px 22px;
  border-top: 1px solid var(--line);
  display: flex; gap: 10px; justify-content: flex-end;
  background: var(--panel2);
}
.np-footer .left-info {
  margin-right: auto;
  font-size: 11.5px; color: var(--mute);
  display: flex; align-items: center; gap: 8px;
}
.np-cancel {
  height: 36px; padding: 0 16px;
  border-radius: 8px;
  background: transparent; border: 1px solid var(--line);
  color: var(--ink);
  font-weight: 500; font-size: 13px;
  cursor: pointer;
}
.np-cancel:hover { background: var(--panel3); }
.np-save {
  height: 36px; padding: 0 16px;
  border-radius: 8px;
  background: var(--brand); color: #fff; border: none;
  font-weight: 600; font-size: 13px; cursor: pointer;
  display: inline-flex; align-items: center; gap: 7px;
  box-shadow: 0 1px 0 oklch(0.40 0.18 264 / 0.35);
}
.np-save:hover { background: var(--brandHover); }
.np-save:disabled { opacity: 0.55; cursor: not-allowed; }

/* Project color/icon block — small visual sugar */
.np-color-row { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.np-color-grid { display: flex; gap: 6px; flex-wrap: wrap; }
.np-color-sw {
  width: 22px; height: 22px;
  border-radius: 6px;
  cursor: pointer;
  border: 2px solid var(--panel);
  outline: 1px solid var(--line);
}
.np-color-sw.on { outline: 2px solid var(--brand); outline-offset: 1px; }
.np-color-sw.on::after {
  content: '✓'; color: #fff; text-shadow: 0 1px 1px rgba(0,0,0,.4);
  font-size: 13px; line-height: 18px; display: block; text-align: center;
}

@media (max-width: 760px) {
  .np-backdrop { padding: 0; align-items: flex-end; }
  .np-modal { border-radius: 14px 14px 0 0; align-self: flex-end; max-height: 92vh; width: 100%; }
  .np-tabs { padding: 0 8px; }
  .np-tab { padding: 12px 8px; font-size: 13px; }
  .np-grid-2 { grid-template-columns: 1fr; }
  .np-hours { max-width: 100%; }
}
`;

// ============================================================
// Data
// ============================================================

const npManagers = [
  { id: 'tm', name: 'Thiago Mágero',   email: 'thiagocmagero@gmail.com', initials: 'TM', color: '#e8704c' },
  { id: 'lm', name: 'Lara Mendes',     email: 'lara.mendes@magero.pt',   initials: 'LM', color: '#4a89c4' },
  { id: 'jr', name: 'João Ribeiro',    email: 'joao.r@magero.pt',        initials: 'JR', color: '#d97a86' },
  { id: 'pc', name: 'Patrícia Costa',  email: 'p.costa@magero.pt',       initials: 'PC', color: '#8c5cc4' },
];

const npPriorities = [
  { id: 'none', label: 'Sem prioridade', color: 'var(--mute)' },
  { id: 'low',  label: 'Baixa',          color: 'var(--pri-low)' },
  { id: 'med',  label: 'Média',          color: 'var(--pri-med)' },
  { id: 'high', label: 'Alta',           color: 'var(--pri-high)' },
];

const npStatuses = [
  { id: 'active',   label: 'Ativo' },
  { id: 'planning', label: 'Em planeamento' },
  { id: 'paused',   label: 'Pausado' },
  { id: 'archived', label: 'Arquivado' },
];

const npColors = [
  'oklch(0.55 0.20 264)', // brand
  'oklch(0.66 0.16 320)', // magenta
  'oklch(0.62 0.14 130)', // green
  'oklch(0.68 0.13 70)',  // amber
  'oklch(0.64 0.14 210)', // cyan
  'oklch(0.62 0.18 30)',  // orange-red
  'oklch(0.60 0.16 200)', // teal
];

const npDateFormats = [
  { id: 'dmy', label: 'Dia/Mês/Ano',     sample: '31/12/2025', fn: (d) => `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}` },
  { id: 'mdy', label: 'Mês/Dia/Ano',     sample: '12/31/2025', fn: (d) => `${pad(d.getMonth()+1)}/${pad(d.getDate())}/${d.getFullYear()}` },
  { id: 'ymd', label: 'Ano-Mês-Dia',     sample: '2025-12-31', fn: (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}` },
  { id: 'long',label: 'Por extenso (PT)',sample: '31 dez 2025',fn: (d) => `${d.getDate()} ${['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][d.getMonth()]} ${d.getFullYear()}` },
];

function pad(n) { return n < 10 ? '0' + n : '' + n; }

// ============================================================
// Manager picker
// ============================================================

function ManagerPicker({ value, onChange }) {
  const [open, setOpen] = useStateNP(false);
  const sel = npManagers.find(m => m.id === value);

  useEffectNP(() => {
    if (!open) return;
    function onDoc(e) {
      const target = e.target;
      if (target && target.closest && target.closest('.np-manager-picker')) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div className="np-manager-picker">
      <div className={'np-manager-display' + (open ? ' open' : '')} onClick={() => setOpen(o => !o)}>
        {sel ? (
          <React.Fragment>
            <div className="avatar sm" style={{ background: sel.color, width: 22, height: 22, fontSize: 9 }}>{sel.initials}</div>
            <span>{sel.name}</span>
          </React.Fragment>
        ) : (
          <span className="empty">Nenhum gestor atribuído</span>
        )}
        <svg className="chev" width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M1 3l4 4 4-4"/></svg>
      </div>
      {open && (
        <div className="np-manager-pop">
          <div className={'np-manager-opt' + (!value ? ' on' : '')} onClick={() => { onChange(null); setOpen(false); }}>
            <div style={{ width: 22, height: 22, borderRadius: 999, border: '1px dashed var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--mute)', fontSize: 11 }}>—</div>
            <span style={{ flex: 1 }}>Sem gestor</span>
          </div>
          {npManagers.map(m => (
            <div key={m.id} className={'np-manager-opt' + (m.id === value ? ' on' : '')}
                 onClick={() => { onChange(m.id); setOpen(false); }}>
              <div className="avatar sm" style={{ background: m.color, width: 22, height: 22, fontSize: 9 }}>{m.initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div>{m.name}</div>
                <div className="em">{m.email}</div>
              </div>
              {m.id === value && <span>✓</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Main modal
// ============================================================

function NewProjectModal({ onClose, onCreate }) {
  const [tab,    setTab]    = useStateNP('geral');
  // Geral
  const [name,   setName]   = useStateNP('');
  const [desc,   setDesc]   = useStateNP('');
  const [color,  setColor]  = useStateNP(npColors[0]);
  const [manager,setManager]= useStateNP(null);
  const [start,  setStart]  = useStateNP('');
  const [end,    setEnd]    = useStateNP('');
  const [pri,    setPri]    = useStateNP('none');
  const [status, setStatus] = useStateNP('active');
  // Região e Idioma
  const [hStart, setHStart] = useStateNP('09');
  const [hEnd,   setHEnd]   = useStateNP('18');
  const [df,     setDf]     = useStateNP('dmy');

  useEffectNP(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const canSave = name.trim().length > 0;
  const dateFmt = npDateFormats.find(f => f.id === df) || npDateFormats[0];
  const previewNow  = useMemoNP(() => dateFmt.fn(new Date()), [df]);
  const previewTime = useMemoNP(() => {
    const d = new Date();
    return `${dateFmt.fn(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }, [df]);

  function submit() {
    if (!canSave) return;
    onCreate && onCreate({
      name: name.trim(), desc: desc.trim(),
      color, manager, start, end, pri, status,
      hours: { start: hStart, end: hEnd }, dateFormat: df,
    });
    onClose();
  }

  return (
    <div className="np-backdrop" onClick={onClose}>
      <div className="np-modal" onClick={e => e.stopPropagation()} role="dialog" aria-label="Novo projeto">
        <div className="np-head">
          <div className="ic">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
          </div>
          <div className="tt">Novo projeto</div>
          <button className="close" onClick={onClose} aria-label="Fechar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>
          </button>
        </div>

        <div className="np-tabs">
          <div className={'np-tab' + (tab === 'geral' ? ' active' : '')} onClick={() => setTab('geral')}>
            <span className="ic">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            </span>
            Geral
          </div>
          <div className={'np-tab' + (tab === 'regiao' ? ' active' : '')} onClick={() => setTab('regiao')}>
            <span className="ic">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><line x1="3" y1="12" x2="21" y2="12"/><path d="M12 3a13.5 13.5 0 0 1 0 18M12 3a13.5 13.5 0 0 0 0 18"/></svg>
            </span>
            Região e idioma
          </div>
        </div>

        <div className="np-body">
          {tab === 'geral' && (
            <div className="np-pane">
              <div className="np-field">
                <span className="lab">Nome <span className="req">*</span></span>
                <input className="np-input" autoFocus placeholder="Nome do projeto"
                       value={name} onChange={e => setName(e.target.value)} />
              </div>

              <div className="np-field">
                <span className="lab">Descrição <span className="hint">opcional, suporta markdown leve</span></span>
                <textarea className="np-textarea" placeholder="Para que serve este projeto, quem trabalha nele, onde está documentado…"
                          value={desc} onChange={e => setDesc(e.target.value)}></textarea>
              </div>

              <div className="np-field">
                <span className="lab">Cor & ícone <span className="hint">para distinguir no sidebar e gráficos</span></span>
                <div className="np-color-row">
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18 }}>
                    {name.trim() ? name.trim()[0].toUpperCase() : '·'}
                  </div>
                  <div className="np-color-grid">
                    {npColors.map(c => (
                      <div key={c} className={'np-color-sw' + (c === color ? ' on' : '')}
                           style={{ background: c }} onClick={() => setColor(c)}></div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="np-grid-2">
                <div className="np-field">
                  <span className="lab">Gestor <span className="hint">gestor operacional do projeto</span></span>
                  <ManagerPicker value={manager} onChange={setManager} />
                </div>
                <div className="np-field">
                  <span className="lab">Status</span>
                  <select className="np-select" value={status} onChange={e => setStatus(e.target.value)}>
                    {npStatuses.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="np-grid-2">
                <div className="np-field">
                  <span className="lab">Data de início</span>
                  <div className="np-input-with-icon">
                    <span className="ic">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    </span>
                    <input className="np-input" type="date" value={start} onChange={e => setStart(e.target.value)} />
                  </div>
                </div>
                <div className="np-field">
                  <span className="lab">Data de fim</span>
                  <div className="np-input-with-icon">
                    <span className="ic">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    </span>
                    <input className="np-input" type="date" value={end} onChange={e => setEnd(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="np-field">
                <span className="lab">Prioridade</span>
                <div className="np-pri-chips">
                  {npPriorities.map(p => (
                    <div key={p.id} className={'np-pri-chip' + (pri === p.id ? ' on' : '')}
                         onClick={() => setPri(p.id)}>
                      <span className="sq" style={{ background: p.color }}></span>
                      {p.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'regiao' && (
            <div className="np-pane">
              <div className="np-field">
                <span className="lab">Horário de trabalho <span className="hint">janela diária (formato 24h) para tarefas por hora · padrão 09:00–18:00</span></span>
                <div className="np-hours">
                  <input className="np-input" type="number" min="0" max="23" value={hStart}
                         onChange={e => setHStart(e.target.value.replace(/\D/g, '').slice(0,2))} />
                  <span className="sep">—</span>
                  <input className="np-input" type="number" min="1" max="24" value={hEnd}
                         onChange={e => setHEnd(e.target.value.replace(/\D/g, '').slice(0,2))} />
                </div>
              </div>

              <div className="np-field">
                <span className="lab">Formato de data <span className="hint">determina como datas são exibidas neste projeto</span></span>
                <select className="np-select" value={df} onChange={e => setDf(e.target.value)}>
                  {npDateFormats.map(f => <option key={f.id} value={f.id}>{f.label} — {f.sample}</option>)}
                </select>
              </div>

              <div className="np-preview">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span>Pré-visualização:</span>
                <span className="v">{previewNow}</span>
                <span style={{ color: 'var(--line)' }}>·</span>
                <span className="v">{previewTime}</span>
              </div>

              <div className="np-field">
                <span className="lab">Fuso horário <span className="hint">usado em alertas, prazos e relatórios</span></span>
                <select className="np-select" defaultValue="Europe/Lisbon">
                  <option value="Europe/Lisbon">Europe/Lisbon — UTC+1</option>
                  <option value="Europe/Madrid">Europe/Madrid — UTC+1</option>
                  <option value="Europe/London">Europe/London — UTC+0</option>
                  <option value="America/Sao_Paulo">America/Sao_Paulo — UTC-3</option>
                  <option value="America/New_York">America/New_York — UTC-5</option>
                </select>
              </div>

              <div className="np-field">
                <span className="lab">Primeiro dia da semana</span>
                <select className="np-select" defaultValue="mon">
                  <option value="mon">Segunda-feira</option>
                  <option value="sun">Domingo</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="np-footer">
          <div className="left-info">
            <span style={{ width: 8, height: 8, borderRadius: 999, background: canSave ? 'var(--st-done)' : 'var(--line)' }}></span>
            <span>{canSave ? 'Pronto a criar' : 'Preencha o nome do projeto para continuar'}</span>
          </div>
          <button className="np-cancel" onClick={onClose}>Cancelar</button>
          <button className="np-save" onClick={submit} disabled={!canSave}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            Criar projeto
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { NewProjectModal, npCss });
