/* eslint-disable */
// AWP — Workspace settings: Tipos de membro & Feriados.
// Each workspace owns its own member types and holiday lists.

const { useState: useStateW, useEffect: useEffectW, useMemo: useMemoW } = React;

// ============================================================
// Shared mock data
// ============================================================

// Member types — global default seed, used by Pessoas as well.
const wsMemberTypes = [
  { id: '019dfa61', code: 'DEVELOPER',       label: 'Developer',        color: 'oklch(0.62 0.16 264)', active: true,  used: 4 },
  { id: '02af3210', code: 'QA',              label: 'Quality Assurance',color: 'oklch(0.62 0.15 155)', active: true,  used: 2 },
  { id: '03bf8821', code: 'DESIGNER',        label: 'Designer',         color: 'oklch(0.66 0.15 320)', active: true,  used: 2 },
  { id: '04cd9991', code: 'PROJECT_MANAGER', label: 'Project Manager',  color: 'oklch(0.66 0.15 70)',  active: true,  used: 1 },
  { id: '05de0011', code: 'DEVOPS',          label: 'DevOps',           color: 'oklch(0.62 0.14 220)', active: true,  used: 1 },
  { id: '06ef1122', code: 'PRODUCT_OWNER',   label: 'Product Owner',    color: 'oklch(0.62 0.18 30)',  active: false, used: 0 },
];

// Expose for views-people.jsx to consume.
if (typeof window !== 'undefined') window.wsMemberTypes = wsMemberTypes;

// Calendars (holiday lists) — name + optional description + active flag.
// Each date is a simple {name, date, active} row.
const wsHolidayLists = [
  {
    id: 'list-nat',  name: 'Nacionais Portugal', description: 'Feriados nacionais oficiais de Portugal.', active: true,
    dates: [
      { id: 'h1', name: 'Ano Novo',               date: '2026-01-01', active: true },
      { id: 'h2', name: 'Sexta-feira Santa',      date: '2026-04-03', active: true },
      { id: 'h3', name: 'Páscoa',                 date: '2026-04-05', active: true },
      { id: 'h4', name: 'Dia da Liberdade',       date: '2026-04-25', active: true },
      { id: 'h5', name: 'Dia do Trabalhador',     date: '2026-05-01', active: true },
      { id: 'h6', name: 'Dia de Camões',          date: '2026-06-10', active: true },
      { id: 'h7', name: 'Assunção de Nossa Sra.', date: '2026-08-15', active: true },
      { id: 'h8', name: 'Implantação República',  date: '2026-10-05', active: true },
      { id: 'h9', name: 'Todos os Santos',        date: '2026-11-01', active: true },
      { id: 'h10',name: 'Natal',                  date: '2026-12-25', active: true },
    ],
  },
  {
    id: 'list-lis', name: 'Município de Lisboa', description: 'Feriado municipal aplicável à região de Lisboa.', active: true,
    dates: [
      { id: 'l1', name: 'Santo António', date: '2026-06-13', active: true },
    ],
  },
  {
    id: 'list-emp', name: 'Empresa Mágero', description: 'Datas internas da empresa.', active: true,
    dates: [
      { id: 'e1', name: 'Aniversário da empresa', date: '2026-09-12', active: true },
      { id: 'e2', name: 'Ponte de Natal',         date: '2026-12-24', active: true },
      { id: 'e3', name: 'Ponte de Ano Novo',      date: '2026-12-31', active: false },
    ],
  },
  {
    id: 'list-br', name: 'Nacionais Brasil', description: 'Feriados nacionais oficiais do Brasil.', active: false,
    dates: [
      { id: 'b1', name: 'Carnaval',         date: '2026-02-17', active: true },
      { id: 'b2', name: 'Independência',    date: '2026-09-07', active: true },
      { id: 'b3', name: 'Proclamação Rep.', date: '2026-11-15', active: true },
    ],
  },
];

// ============================================================
// Shared CSS
// ============================================================

const wsCss = `
/* Generic page chrome shared by ws-settings views (tipos, feriados) */
.ws-page { flex: 1; overflow: auto; background: var(--bg); display: flex; flex-direction: column; }
.ws-head {
  padding: 22px 28px 18px;
  background: var(--panel);
  border-bottom: 1px solid var(--line);
  display: grid; grid-template-columns: 1fr auto; gap: 14px 24px; align-items: end;
}
.ws-head .title { font-size: 22px; font-weight: 600; letter-spacing: -0.5px; display: flex; align-items: center; gap: 12px; }
.ws-head .sub { font-size: 13px; color: var(--dim); margin-top: 2px; max-width: 56ch; line-height: 1.45; }
.ws-head .right { display: flex; align-items: center; gap: 12px; }

.ws-toolbar {
  padding: 12px 28px;
  background: var(--panel);
  border-bottom: 1px solid var(--line);
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
}
.ws-toolbar .ws-search {
  display: flex; align-items: center; gap: 8px;
  height: 32px; padding: 0 12px;
  background: var(--panel2);
  border: 1px solid transparent;
  border-radius: 8px;
  color: var(--dim);
  min-width: 240px; flex: 0 1 320px;
}
.ws-toolbar .ws-search:focus-within { background: var(--panel); border-color: var(--brand); box-shadow: 0 0 0 3px var(--brandSoft); color: var(--ink); }
.ws-toolbar .ws-search input { flex: 1; background: transparent; border: none; outline: none; color: var(--ink); font-size: 13px; min-width: 0; }
.ws-toolbar .count-chip {
  margin-left: auto;
  padding: 4px 10px; background: var(--brandSoft); color: var(--brand);
  font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
  border-radius: 999px;
}

.ws-body { flex: 1; padding: 18px 28px 32px; overflow: auto; }

.ws-btn-primary {
  height: 36px; padding: 0 16px;
  border-radius: 8px;
  background: var(--brand); color: #fff; border: none;
  font-weight: 600; font-size: 13px; cursor: pointer;
  display: inline-flex; align-items: center; gap: 7px;
  box-shadow: 0 1px 0 oklch(0.40 0.18 264 / 0.35);
}
.ws-btn-primary:hover { background: var(--brandHover); }
.ws-btn-primary:disabled, .ws-btn-primary[disabled] { opacity: 0.5; cursor: not-allowed; }
.ws-btn-ghost {
  height: 32px; padding: 0 12px;
  border-radius: 7px;
  background: var(--panel); color: var(--ink2); border: 1px solid var(--line);
  font-size: 13px; cursor: pointer;
  display: inline-flex; align-items: center; gap: 6px;
}
.ws-btn-ghost:hover { background: var(--panel2); color: var(--ink); }
.ws-btn-icon {
  width: 32px; height: 32px; border-radius: 7px;
  background: transparent; border: 1px solid transparent;
  color: var(--dim); cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
}
.ws-btn-icon:hover { background: var(--panel3); color: var(--ink); border-color: var(--line); }
.ws-btn-icon.danger:hover { color: oklch(0.50 0.20 25); border-color: oklch(0.85 0.10 25); background: oklch(0.96 0.05 25); }
[data-theme="dark"] .ws-btn-icon.danger:hover { color: oklch(0.85 0.18 25); border-color: oklch(0.40 0.12 25 / 0.6); background: oklch(0.30 0.10 25 / 0.4); }

.ws-table-card {
  display: block;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 12px;
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

/* ========== Tipos de membro — table ========== */
.tipos-card-head {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--line);
}
.tipos-card-head .ic {
  width: 30px; height: 30px;
  border-radius: 8px;
  background: var(--brandSoft); color: var(--brand);
  display: inline-flex; align-items: center; justify-content: center;
  flex: 0 0 auto;
}
.tipos-card-head .body { flex: 1; min-width: 0; }
.tipos-card-head .tt { font-size: 14.5px; font-weight: 600; color: var(--ink); }
.tipos-card-head .sb { font-size: 12px; color: var(--dim); margin-top: 2px; }
.tipos-card-head .right { display: flex; align-items: center; gap: 8px; }
.tipos-card-head .chip {
  display: inline-flex; align-items: center;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--brandSoft); color: var(--brand);
  font-size: 11px; font-weight: 700; letter-spacing: 0.03em;
}

.tipos-row {
  display: grid;
  grid-template-columns: 110px minmax(140px, 1fr) minmax(180px, 2fr) 110px 90px;
  align-items: center;
  gap: 14px;
  padding: 0 18px;
}
.tipos-head-row {
  height: 42px;
  font-size: 11px; color: var(--mute);
  font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase;
  background: var(--panel2);
  border-bottom: 1px solid var(--line);
}
.tipos-head-row .act-col { text-align: right; }
.tipos-body-row {
  min-height: 58px; padding-top: 11px; padding-bottom: 11px;
  border-bottom: 1px solid var(--lineSoft);
  transition: background .12s;
}
.tipos-body-row:last-child { border-bottom: none; }
.tipos-body-row:hover { background: var(--panel2); }
.tipos-body-row.inactive { opacity: 0.55; }

.tipo-id {
  font-family: var(--mono);
  font-size: 11.5px;
  color: var(--mute);
  letter-spacing: 0.02em;
}

.tipo-code {
  display: inline-flex; align-items: center;
  padding: 4px 10px;
  border-radius: 6px;
  font-family: var(--mono); font-size: 11px; font-weight: 700;
  letter-spacing: 0.04em;
  background: var(--tp-soft, var(--brandSoft));
  color: var(--tp-ink, var(--brand));
  border: 1px solid var(--tp-line, transparent);
  width: max-content;
  max-width: 100%;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
[data-theme="dark"] .tipo-code {
  background: var(--tp-soft-d, var(--brandSoft));
  color: var(--tp-ink-d, var(--brand));
  border-color: var(--tp-line-d, transparent);
}

.tipo-label { font-size: 13.5px; color: var(--ink); font-weight: 500; }

.pp-pill.st-active   { background: oklch(0.92 0.10 155); color: oklch(0.34 0.10 155); }
[data-theme="dark"] .pp-pill.st-active   { background: oklch(0.35 0.10 155 / 0.5); color: oklch(0.86 0.10 155); }
.pp-pill.st-inactive { background: var(--panel3); color: var(--dim); }

.ws-actions { display: flex; gap: 4px; justify-content: flex-end; }

/* ========== Modal ========== */
.ws-modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(var(--backdrop-rgb), .5);
  z-index: 95;
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
  -webkit-backdrop-filter: blur(3px);
  backdrop-filter: blur(3px);
  animation: ws-fade .16s ease;
}
@keyframes ws-fade { from { opacity: 0; } to { opacity: 1; } }

.ws-modal {
  width: 480px; max-width: 100%;
  max-height: calc(100vh - 48px);
  background: var(--panel);
  border-radius: 14px;
  border: 1px solid var(--line);
  box-shadow: var(--shadow-pop);
  display: flex; flex-direction: column;
  overflow: hidden;
  animation: ws-modal-in .22s cubic-bezier(.2,.7,.2,1);
}
@keyframes ws-modal-in { from { transform: translateY(8px) scale(.98); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
.ws-modal.wide { width: 580px; }
.ws-modal .mh {
  padding: 18px 22px 14px;
  border-bottom: 1px solid var(--line);
  display: flex; align-items: center; gap: 10px;
}
.ws-modal .mh .ic {
  width: 28px; height: 28px;
  border-radius: 8px;
  background: var(--brandSoft); color: var(--brand);
  display: inline-flex; align-items: center; justify-content: center;
}
.ws-modal .mh .tt { font-size: 15.5px; font-weight: 600; }
.ws-modal .mh .close {
  width: 30px; height: 30px;
  border-radius: 7px;
  background: transparent; border: none;
  color: var(--dim); cursor: pointer;
  margin-left: auto;
  display: inline-flex; align-items: center; justify-content: center;
}
.ws-modal .mh .close:hover { background: var(--panel3); color: var(--ink); }
.ws-modal .mb { padding: 20px 22px 8px; overflow-y: auto; }
.ws-modal .mf {
  padding: 14px 22px;
  border-top: 1px solid var(--line);
  display: flex; gap: 10px; justify-content: flex-end;
  background: var(--panel2);
}

.ws-field { margin-bottom: 16px; }
.ws-field label.lab { display: block; font-size: 12px; font-weight: 600; color: var(--ink2); margin-bottom: 6px; }
.ws-field label.lab .req { color: oklch(0.60 0.22 25); margin-left: 3px; }
.ws-field .hint { font-size: 11px; color: var(--mute); margin-top: 5px; }
.ws-input {
  width: 100%;
  height: 38px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--panel);
  color: var(--ink);
  font-size: 13.5px;
  font-family: var(--font);
}
.ws-input.mono { font-family: var(--mono); letter-spacing: 0.02em; text-transform: uppercase; }
.ws-input:focus { outline: none; border-color: var(--brand); box-shadow: 0 0 0 3px var(--brandSoft); }
.ws-input::placeholder { color: var(--mute); }

.ws-color-grid { display: flex; gap: 8px; flex-wrap: wrap; }
.ws-color-sw {
  width: 28px; height: 28px;
  border-radius: 8px;
  cursor: pointer;
  border: 2px solid var(--panel);
  outline: 1px solid var(--line);
  position: relative;
}
.ws-color-sw.on { outline: 2px solid var(--brand); outline-offset: 1px; }
.ws-color-sw.on::after {
  content: '✓'; position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 13px; text-shadow: 0 1px 2px rgba(0,0,0,.4);
}

.ws-cancel {
  height: 36px; padding: 0 16px;
  border-radius: 8px;
  background: transparent; border: 1px solid var(--line);
  color: var(--ink);
  font-weight: 500; font-size: 13px;
  cursor: pointer;
}
.ws-cancel:hover { background: var(--panel3); }

.ws-switch {
  display: inline-flex; align-items: center; gap: 10px;
  font-size: 13px; color: var(--ink); cursor: pointer;
  user-select: none;
}
.ws-switch .toggle {
  width: 36px; height: 20px;
  border-radius: 999px;
  background: var(--panel3);
  position: relative;
  transition: background .14s;
}
.ws-switch .toggle::after {
  content: ''; position: absolute; top: 2px; left: 2px;
  width: 16px; height: 16px; border-radius: 999px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,.2);
  transition: left .16s;
}
.ws-switch.on .toggle { background: var(--brand); }
.ws-switch.on .toggle::after { left: 18px; }

/* ========== Calendários — master/detail layout ========== */
.cal-grid {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 16px;
  align-items: flex-start;
}

/* ----- Master ----- */
.cal-master {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 12px;
  box-shadow: var(--shadow-card);
  overflow: hidden;
  display: flex; flex-direction: column;
}
.cal-master-head {
  padding: 14px 16px;
  border-bottom: 1px solid var(--line);
  display: flex; align-items: center; gap: 10px;
}
.cal-master-head .ic {
  width: 26px; height: 26px;
  border-radius: 7px;
  background: var(--brandSoft); color: var(--brand);
  display: inline-flex; align-items: center; justify-content: center;
}
.cal-master-head .title { font-size: 14px; font-weight: 600; color: var(--ink); }
.cal-master-head .right { margin-left: auto; }

.cal-list { padding: 8px; display: flex; flex-direction: column; gap: 4px; }
.cal-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 6px 8px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background .12s, border-color .12s;
}
.cal-row:hover { background: var(--panel2); }
.cal-row.active {
  background: var(--brandSoft);
  border-color: var(--brandSoft2);
}
[data-theme="dark"] .cal-row.active { background: oklch(0.30 0.10 264 / 0.28); border-color: oklch(0.42 0.14 264 / 0.5); }
.cal-row .nm {
  font-size: 13.5px; font-weight: 600; color: var(--ink);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.cal-row.active .nm { color: var(--brand); }
[data-theme="dark"] .cal-row.active .nm { color: oklch(0.86 0.16 264); }
.cal-row .acts {
  display: flex; gap: 2px;
  opacity: 0; transition: opacity .12s;
}
.cal-row:hover .acts, .cal-row.active .acts { opacity: 1; }
.cal-row .meta {
  grid-column: 1 / -1;
  display: flex; align-items: center; gap: 6px;
}
.cal-count {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 2px 8px;
  border-radius: 5px;
  background: var(--panel3);
  font-family: var(--mono);
  font-size: 10.5px; color: var(--ink2);
  font-weight: 600;
  letter-spacing: 0.02em;
}
.cal-count svg { color: var(--mute); }

/* ----- Detail ----- */
.cal-detail {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 12px;
  box-shadow: var(--shadow-card);
  overflow: hidden;
  display: flex; flex-direction: column;
  min-width: 0;
}
.cal-detail-head {
  padding: 14px 18px;
  border-bottom: 1px solid var(--line);
  display: flex; align-items: center; gap: 10px;
  flex-wrap: wrap;
}
.cal-detail-head .ic {
  width: 28px; height: 28px;
  border-radius: 8px;
  background: var(--brandSoft); color: var(--brand);
  display: inline-flex; align-items: center; justify-content: center;
}
.cal-detail-head .tt { font-size: 15px; font-weight: 600; color: var(--ink); }
.cal-detail-head .desc {
  flex-basis: 100%;
  font-size: 12.5px; color: var(--dim);
  margin-top: 2px; padding-left: 38px;
  line-height: 1.45;
}
.cal-detail-head .right { margin-left: auto; display: flex; align-items: center; gap: 8px; }

/* ----- Dates table ----- */
.cal-table {}
.cal-table-row {
  display: grid;
  grid-template-columns: minmax(220px, 2fr) 160px 110px 96px;
  align-items: center;
  gap: 14px;
  padding: 0 18px;
}
.cal-table-head {
  height: 38px;
  font-size: 10.5px; color: var(--mute);
  font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;
  background: var(--panel2);
  border-bottom: 1px solid var(--line);
}
.cal-table-head .act-col { text-align: right; }
.cal-table-body { display: flex; flex-direction: column; }
.cal-table-body .cal-table-row {
  min-height: 52px;
  padding-top: 10px; padding-bottom: 10px;
  border-bottom: 1px solid var(--lineSoft);
  transition: background .12s;
}
.cal-table-body .cal-table-row:last-child { border-bottom: none; }
.cal-table-body .cal-table-row:hover { background: var(--panel2); }
.cal-table-body .cal-table-row.inactive { opacity: 0.6; }

.cal-cell-name {
  font-size: 13.5px; font-weight: 500; color: var(--ink);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.cal-cell-date {
  display: inline-flex; align-items: center; gap: 7px;
  font-family: var(--mono); font-size: 12.5px; color: var(--ink2);
}
.cal-cell-date svg { color: var(--brand); }
.cal-cell-acts { display: flex; justify-content: flex-end; gap: 4px; }

.cal-empty {
  padding: 56px 24px 64px;
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  color: var(--dim);
  text-align: center;
}
.cal-empty .glyph {
  width: 56px; height: 56px;
  border-radius: 14px;
  background: var(--brandSoft); color: var(--brand);
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 4px;
}
.cal-empty .tt { font-size: 14.5px; font-weight: 600; color: var(--ink); }
.cal-empty .sd { font-size: 12.5px; max-width: 36ch; line-height: 1.45; }

/* Textarea (used by ListModal description) */
.ws-textarea {
  width: 100%;
  min-height: 84px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--panel);
  color: var(--ink);
  font-size: 13.5px;
  font-family: var(--font);
  resize: vertical;
  line-height: 1.5;
}
.ws-textarea:focus { outline: none; border-color: var(--brand); box-shadow: 0 0 0 3px var(--brandSoft); }
.ws-textarea::placeholder { color: var(--mute); }

@media (max-width: 1100px) {
  .cal-grid { grid-template-columns: 1fr; }
}
@media (max-width: 1024px) {
  .ws-head { padding: 16px 16px 12px; }
  .ws-toolbar { padding: 10px 16px; }
  .ws-body { padding: 14px 16px 24px; }
  .tipos-row { grid-template-columns: 90px minmax(110px, 1fr) 90px 80px; gap: 10px; padding: 0 14px; }
  .tipos-row .col-label { display: none; }
  .cal-table-row { grid-template-columns: 1fr 120px 90px 80px; gap: 10px; padding: 0 14px; }
}
@media (max-width: 760px) {
  .ws-head { grid-template-columns: 1fr; }
  .cal-table-row { grid-template-columns: 1fr 100px 80px; }
  .cal-table-row .col-status { display: none; }
}
`;

// ============================================================
// Confirm dialog (compact)
// ============================================================

function ConfirmDialog({ title, message, onCancel, onConfirm, danger }) {
  return (
    <div className="ws-modal-backdrop" onClick={onCancel}>
      <div className="ws-modal" onClick={e => e.stopPropagation()} style={{ width: 420 }}>
        <div className="mh">
          <div className="ic" style={danger ? { background: 'oklch(0.94 0.06 25)', color: 'oklch(0.50 0.20 25)' } : null}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div className="tt">{title}</div>
          <button className="close" onClick={onCancel}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>
          </button>
        </div>
        <div className="mb">
          <div style={{ fontSize: 13.5, color: 'var(--ink2)', lineHeight: 1.5 }}>{message}</div>
        </div>
        <div className="mf">
          <button className="ws-cancel" onClick={onCancel}>Cancelar</button>
          <button className="ws-btn-primary"
                  onClick={onConfirm}
                  style={danger ? { background: 'oklch(0.55 0.20 25)' } : null}
                  onMouseEnter={e => danger && (e.currentTarget.style.background = 'oklch(0.50 0.22 25)')}
                  onMouseLeave={e => danger && (e.currentTarget.style.background = 'oklch(0.55 0.20 25)')}>
            {danger ? 'Eliminar' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MEMBER TYPES
// ============================================================

const tipoColors = [
  'oklch(0.62 0.16 264)','oklch(0.62 0.15 155)','oklch(0.66 0.15 320)',
  'oklch(0.66 0.15 70)','oklch(0.62 0.14 220)','oklch(0.62 0.18 30)',
  'oklch(0.60 0.16 200)','oklch(0.62 0.16 130)',
];
// Stable color for a code (used when no explicit color set)
function autoColorFor(code) {
  let h = 0;
  for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) & 0xffffffff;
  return tipoColors[Math.abs(h) % tipoColors.length];
}
// Soft / ink tints derived from a base oklch color for the pill background.
function tipoTints(base) {
  // base like 'oklch(0.62 0.16 264)' — extract hue & chroma loosely.
  const m = /oklch\(\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)/.exec(base);
  if (!m) return { soft: 'var(--brandSoft)', ink: 'var(--brand)', line: 'transparent' };
  const c = m[2], h = m[3];
  return {
    soft: `oklch(0.95 ${Math.min(parseFloat(c), 0.08)} ${h})`,
    ink:  `oklch(0.42 ${c} ${h})`,
    line: `oklch(0.88 ${Math.min(parseFloat(c) + 0.02, 0.10)} ${h})`,
    softDark: `oklch(0.34 ${c} ${h} / 0.42)`,
    inkDark:  `oklch(0.86 ${Math.min(parseFloat(c), 0.14)} ${h})`,
    lineDark: `oklch(0.40 ${c} ${h} / 0.5)`,
  };
}

function TipoModal({ initial, onClose, onSave, existingCodes }) {
  const [code,  setCode]  = useStateW(initial ? initial.code : '');
  const [label, setLabel] = useStateW(initial ? initial.label : '');

  function submit() {
    const c = code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    const l = label.trim();
    if (!c || !l) return;
    if (!initial && existingCodes.includes(c)) return;
    const baseColor = initial && initial.color ? initial.color : autoColorFor(c);
    onSave({
      id: initial ? initial.id : Math.random().toString(16).slice(2, 10),
      code: c, label: l,
      color: baseColor,
      active: initial ? initial.active : true,
      used: initial ? initial.used : 0,
    });
    onClose();
  }
  const canSave = code.trim().length > 0 && label.trim().length > 0;

  useEffectW(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="ws-modal-backdrop" onClick={onClose}>
      <div className="ws-modal" onClick={e => e.stopPropagation()}>
        <div className="mh">
          <div className="ic">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </div>
          <div className="tt">{initial ? 'Editar tipo' : 'Novo Tipo'}</div>
          <button className="close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>
          </button>
        </div>

        <div className="mb">
          <div className="ws-field">
            <label className="lab">Código <span className="req">*</span></label>
            <input className="ws-input mono" placeholder="EX: DEVELOPER"
                   value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                   disabled={!!initial}
                   autoFocus />
            <div className="hint">{initial ? 'O código é imutável após criação.' : 'Apenas letras maiúsculas e underscores.'}</div>
          </div>

          <div className="ws-field">
            <label className="lab">Label <span className="req">*</span></label>
            <input className="ws-input" placeholder="Rótulo visível"
                   value={label} onChange={e => setLabel(e.target.value)} />
          </div>
        </div>

        <div className="mf">
          <button className="ws-cancel" onClick={onClose}>Cancelar</button>
          <button className="ws-btn-primary" onClick={submit} disabled={!canSave}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            {initial ? 'Salvar' : 'Criar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function MemberTypesView({ workspaceName }) {
  const [types,    setTypes]    = useStateW(wsMemberTypes);
  const [modal,    setModal]    = useStateW(null);
  const [confirm,  setConfirm]  = useStateW(null);

  function save(t) {
    setTypes(list => {
      const idx = list.findIndex(x => x.id === t.id);
      if (idx >= 0) { const cp = list.slice(); cp[idx] = t; return cp; }
      return [t, ...list];
    });
    window.wsMemberTypes = types;
  }
  function remove(t) {
    setTypes(list => list.filter(x => x.id !== t.id));
    setConfirm(null);
  }
  function toggleActive(t) {
    setTypes(list => list.map(x => x.id === t.id ? { ...x, active: !x.active } : x));
  }

  return (
    <div className="ws-page">
      <div className="ws-head">
        <div>
          <div className="title">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--brand)' }}><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="9" y1="4" x2="9" y2="20"/></svg>
            Tipos de membro
          </div>
          <div className="sub">Categorias funcionais que podem ser atribuídas a cada pessoa do <b>{workspaceName}</b> — usadas em filtros, relatórios e regras de timesheet.</div>
        </div>
        <div className="right">
          <button className="ws-btn-primary" onClick={() => setModal({ kind: 'create' })}>
            <span style={{ fontSize: 16, lineHeight: 0 }}>+</span>
            Novo Tipo
          </button>
        </div>
      </div>

      <div className="ws-body">
        <div className="ws-table-card">
          <div className="tipos-card-head">
            <div className="ic">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="9" y1="4" x2="9" y2="20"/></svg>
            </div>
            <div className="body">
              <div className="tt">Tipos de membro</div>
              <div className="sb">Categorias funcionais dos membros da plataforma</div>
            </div>
            <div className="right">
              <span className="chip">{types.length} registro{types.length !== 1 ? 's' : ''}</span>
            </div>
          </div>

          <div className="tipos-row tipos-head-row">
            <span>#</span>
            <span>Código</span>
            <span className="col-label">Label</span>
            <span>Status</span>
            <span className="act-col">Ações</span>
          </div>
          {types.map(t => {
            const tint = tipoTints(t.color || autoColorFor(t.code));
            const pillStyle = {
              '--tp-soft': tint.soft,
              '--tp-ink':  tint.ink,
              '--tp-line': tint.line,
              '--tp-soft-d': tint.softDark,
              '--tp-ink-d':  tint.inkDark,
              '--tp-line-d': tint.lineDark,
            };
            return (
              <div key={t.id} className={'tipos-row tipos-body-row' + (!t.active ? ' inactive' : '')}>
                <span className="tipo-id">{t.id}</span>
                <span>
                  <span className="tipo-code" style={pillStyle}>{t.code}</span>
                </span>
                <span className="tipo-label col-label">{t.label}</span>
                <span>
                  <span className={'pp-pill ' + (t.active ? 'st-active' : 'st-inactive')}
                        onClick={() => toggleActive(t)}
                        style={{ cursor: 'pointer' }}
                        title={t.active ? 'Clique para desativar' : 'Clique para ativar'}>
                    {t.active ? 'Ativo' : 'Inativo'}
                  </span>
                </span>
                <span className="ws-actions">
                  <button className="ws-btn-icon" title="Editar" onClick={() => setModal({ kind: 'edit', value: t })}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button className="ws-btn-icon danger" title="Eliminar" onClick={() => setConfirm(t)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                  </button>
                </span>
              </div>
            );
          })}
          {types.length === 0 && (
            <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--dim)', fontSize: 13 }}>
              Sem tipos cadastrados. Clique em <b>+ Novo Tipo</b> para começar.
            </div>
          )}
        </div>
      </div>

      {modal && (
        <TipoModal
          initial={modal.kind === 'edit' ? modal.value : null}
          existingCodes={types.map(t => t.code)}
          onSave={save}
          onClose={() => setModal(null)}
        />
      )}
      {confirm && (
        <ConfirmDialog
          title="Eliminar tipo de membro?"
          message={confirm.used > 0
            ? `Existem ${confirm.used} pessoas com este tipo atribuído. Após eliminar, ficam sem tipo. Esta ação não pode ser revertida.`
            : 'Esta ação não pode ser revertida. O tipo será removido permanentemente.'}
          danger
          onCancel={() => setConfirm(null)}
          onConfirm={() => remove(confirm)}
        />
      )}
    </div>
  );
}

// ============================================================
// HOLIDAYS — Lists & Dates
// ============================================================

const monthsPT = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];

function fmtDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
function fmtFull(iso) {
  const [y, m, d] = iso.split('-');
  const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  const day = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'][date.getDay()];
  const month = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'][parseInt(m)-1];
  return `${day}, ${parseInt(d)} ${month}`;
}

function ListModal({ initial, onClose, onSave }) {
  const [name,   setName]   = useStateW(initial ? initial.name : '');
  const [desc,   setDesc]   = useStateW(initial ? (initial.description || '') : '');
  const [active, setActive] = useStateW(initial ? initial.active : true);

  useEffectW(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const canSave = name.trim().length > 0;
  function submit() {
    if (!canSave) return;
    onSave({
      id: initial ? initial.id : 'list-' + Math.random().toString(16).slice(2, 8),
      name: name.trim(),
      description: desc.trim(),
      active,
      dates: initial ? initial.dates : [],
    });
    onClose();
  }

  return (
    <div className="ws-modal-backdrop" onClick={onClose}>
      <div className="ws-modal" onClick={e => e.stopPropagation()}>
        <div className="mh">
          <div className="ic">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <div className="tt">{initial ? 'Editar calendário' : 'Novo calendário'}</div>
          <button className="close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>
          </button>
        </div>
        <div className="mb">
          <div className="ws-field">
            <label className="lab">Nome <span className="req">*</span></label>
            <input className="ws-input" placeholder="Nome do calendário" autoFocus
                   value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="ws-field">
            <label className="lab">Descrição</label>
            <textarea className="ws-textarea" placeholder="Descrição opcional"
                      value={desc} onChange={e => setDesc(e.target.value)}></textarea>
          </div>
          <div className="ws-field">
            <div className={'ws-switch' + (active ? ' on' : '')} onClick={() => setActive(a => !a)}>
              <span className="toggle"></span>
              <span><b>{active ? 'Ativo' : 'Inativo'}</b> · {active ? 'Datas aplicam-se aos cálculos' : 'Datas ignoradas nos cálculos'}</span>
            </div>
          </div>
        </div>
        <div className="mf">
          <button className="ws-cancel" onClick={onClose}>Cancelar</button>
          <button className="ws-btn-primary" onClick={submit} disabled={!canSave}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

function DateModal({ initial, onClose, onSave }) {
  const [name, setName] = useStateW(initial ? initial.name : '');
  const [date, setDate] = useStateW(initial ? initial.date : '');
  const [active, setActive] = useStateW(initial ? (initial.active !== false) : true);

  useEffectW(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const canSave = name.trim() && date;
  function submit() {
    if (!canSave) return;
    onSave({
      id: initial ? initial.id : 'd' + Math.random().toString(16).slice(2, 8),
      name: name.trim(), date, active,
    });
    onClose();
  }

  return (
    <div className="ws-modal-backdrop" onClick={onClose}>
      <div className="ws-modal" onClick={e => e.stopPropagation()}>
        <div className="mh">
          <div className="ic">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>
          </div>
          <div className="tt">{initial ? 'Editar data' : 'Adicionar Data'}</div>
          <button className="close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>
          </button>
        </div>
        <div className="mb">
          <div className="ws-field">
            <label className="lab">Nome do Feriado <span className="req">*</span></label>
            <input className="ws-input" placeholder="Ex: Natal" autoFocus
                   value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="ws-field">
            <label className="lab">Data <span className="req">*</span></label>
            <input className="ws-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="ws-field">
            <div className={'ws-switch' + (active ? ' on' : '')} onClick={() => setActive(a => !a)}>
              <span className="toggle"></span>
              <span><b>{active ? 'Ativo' : 'Inativo'}</b></span>
            </div>
          </div>
        </div>
        <div className="mf">
          <button className="ws-cancel" onClick={onClose}>Cancelar</button>
          <button className="ws-btn-primary" onClick={submit} disabled={!canSave}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg>
            {initial ? 'Salvar' : 'Adicionar Data'}
          </button>
        </div>
      </div>
    </div>
  );
}

function fmtBR(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function HolidaysView({ workspaceName }) {
  const [lists, setLists] = useStateW(wsHolidayLists);
  const [activeId, setActiveId] = useStateW(wsHolidayLists[0].id);
  const [listModal, setListModal] = useStateW(null);
  const [dateModal, setDateModal] = useStateW(null);
  const [confirm,  setConfirm]    = useStateW(null);

  const active = lists.find(l => l.id === activeId) || lists[0];

  function saveList(l) {
    setLists(curr => {
      const idx = curr.findIndex(x => x.id === l.id);
      if (idx >= 0) { const cp = curr.slice(); cp[idx] = l; return cp; }
      return [...curr, l];
    });
    setActiveId(l.id);
  }
  function removeList(l) {
    setLists(curr => curr.filter(x => x.id !== l.id));
    if (active && active.id === l.id) {
      const next = lists.find(x => x.id !== l.id);
      setActiveId(next ? next.id : null);
    }
    setConfirm(null);
  }
  function saveDate(d) {
    setLists(curr => curr.map(l => {
      if (l.id !== active.id) return l;
      const idx = l.dates.findIndex(x => x.id === d.id);
      const dates = idx >= 0
        ? l.dates.map((x, i) => i === idx ? d : x)
        : [...l.dates, d];
      dates.sort((a, b) => a.date.localeCompare(b.date));
      return { ...l, dates };
    }));
  }
  function removeDate(d) {
    setLists(curr => curr.map(l => l.id === active.id ? { ...l, dates: l.dates.filter(x => x.id !== d.id) } : l));
  }

  return (
    <div className="ws-page">
      <div className="ws-head">
        <div>
          <div className="title">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--brand)' }}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Calendários
          </div>
          <div className="sub">Calendários de feriados aplicados aos projetos do <b>{workspaceName}</b>. As datas não são contabilizadas em prazos nem em horas trabalhadas.</div>
        </div>
        <div className="right">
          <button className="ws-btn-primary" onClick={() => setListModal({ kind: 'create' })}>
            <span style={{ fontSize: 16, lineHeight: 0 }}>+</span>
            Novo calendário
          </button>
        </div>
      </div>

      <div className="ws-body">
        <div className="cal-grid">

          {/* Master — list of calendars */}
          <div className="cal-master">
            <div className="cal-master-head">
              <div className="ic">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <div className="title">Calendários</div>
              <div className="right">
                <button className="ws-btn-icon" title="Novo calendário" onClick={() => setListModal({ kind: 'create' })}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
              </div>
            </div>
            <div className="cal-list">
              {lists.map(l => (
                <div key={l.id} className={'cal-row' + (l.id === activeId ? ' active' : '')}
                     onClick={() => setActiveId(l.id)}>
                  <div className="nm">{l.name}</div>
                  <div className="acts">
                    <button className="ws-btn-icon" title="Editar" onClick={e => { e.stopPropagation(); setListModal({ kind: 'edit', value: l }); }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button className="ws-btn-icon danger" title="Eliminar" onClick={e => { e.stopPropagation(); setConfirm(l); }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                    </button>
                  </div>
                  <div className="meta">
                    <span className="cal-count">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>
                      {l.dates.length} {l.dates.length === 1 ? 'data' : 'datas'}
                    </span>
                    <span className={'pp-pill ' + (l.active ? 'st-active' : 'st-inactive')}>{l.active ? 'Ativo' : 'Inativo'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detail — selected calendar dates */}
          <div className="cal-detail">
            {active ? (
              <React.Fragment>
                <div className="cal-detail-head">
                  <div className="ic">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>
                  </div>
                  <div className="tt">{active.name}</div>
                  <span className={'pp-pill ' + (active.active ? 'st-active' : 'st-inactive')}>{active.active ? 'Ativo' : 'Inativo'}</span>
                  <div className="right">
                    <button className="ws-btn-primary" onClick={() => setDateModal({ kind: 'create' })}>
                      <span style={{ fontSize: 15, lineHeight: 0 }}>+</span>
                      Adicionar Data
                    </button>
                  </div>
                  {active.description && (
                    <div className="desc">{active.description}</div>
                  )}
                </div>

                {active.dates.length === 0 ? (
                  <div className="cal-empty">
                    <div className="glyph">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>
                    </div>
                    <div className="tt">Ainda não há datas neste calendário</div>
                    <div className="sd">Adicione a primeira data para começar.</div>
                    <button className="ws-btn-primary" style={{ marginTop: 4 }} onClick={() => setDateModal({ kind: 'create' })}>
                      <span style={{ fontSize: 15, lineHeight: 0 }}>+</span> Adicionar Data
                    </button>
                  </div>
                ) : (
                  <div className="cal-table">
                    <div className="cal-table-row cal-table-head">
                      <span>Nome</span>
                      <span>Data</span>
                      <span className="col-status">Status</span>
                      <span className="act-col">Ações</span>
                    </div>
                    <div className="cal-table-body">
                      {active.dates.map(d => (
                        <div key={d.id} className={'cal-table-row' + (d.active === false ? ' inactive' : '')}>
                          <span className="cal-cell-name">{d.name}</span>
                          <span className="cal-cell-date">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                            {fmtBR(d.date)}
                          </span>
                          <span className="col-status">
                            <span className={'pp-pill ' + (d.active === false ? 'st-inactive' : 'st-active')}>{d.active === false ? 'Inativo' : 'Ativo'}</span>
                          </span>
                          <span className="cal-cell-acts">
                            <button className="ws-btn-icon" title="Editar" onClick={() => setDateModal({ kind: 'edit', value: d })}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button className="ws-btn-icon danger" title="Eliminar" onClick={() => removeDate(d)}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                            </button>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </React.Fragment>
            ) : (
              <div className="cal-empty">
                <div className="glyph">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>
                </div>
                <div className="tt">Crie o primeiro calendário</div>
                <div className="sd">Os calendários permitem agrupar feriados e aplicá-los aos seus projetos.</div>
                <button className="ws-btn-primary" style={{ marginTop: 4 }} onClick={() => setListModal({ kind: 'create' })}>
                  <span style={{ fontSize: 15, lineHeight: 0 }}>+</span> Novo calendário
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {listModal && (
        <ListModal
          initial={listModal.kind === 'edit' ? listModal.value : null}
          onSave={saveList}
          onClose={() => setListModal(null)}
        />
      )}
      {dateModal && (
        <DateModal
          initial={dateModal.kind === 'edit' ? dateModal.value : null}
          onSave={saveDate}
          onClose={() => setDateModal(null)}
        />
      )}
      {confirm && (
        <ConfirmDialog
          title={`Eliminar o calendário "${confirm.name}"?`}
          message={`Todas as ${confirm.dates.length} datas associadas serão removidas. Esta ação não pode ser revertida.`}
          danger
          onCancel={() => setConfirm(null)}
          onConfirm={() => removeList(confirm)}
        />
      )}
    </div>
  );
}

Object.assign(window, { MemberTypesView, HolidaysView, wsCss });
