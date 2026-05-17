/* eslint-disable */
// AWP — Pessoas (Workspace members)
// Inspired by Asana / Monday / ClickUp members management.
// Renders inside the workspace context. Uses the global theme tokens.

const PT = window.awpTokens; // shared design tokens
const { useState: useStateP, useEffect: useEffectP, useRef: useRefP } = React;

// ============================================================
// Mock data
// ============================================================

const wsMembers = [
  { id: 1, name: 'Thiago Mágero',    email: 'thiagocmagero@gmail.com', initials: 'TM', color: '#5fb6c9',
    level: 'Licenciado', status: 'active',  joined: '07/05/2026', role: 'Owner', type: 'PROJECT_MANAGER',
    projects: [{ id: 'awp', role: 'Owner' }, { id: 'mkt', role: 'Contributor' }, { id: 'int', role: 'Contributor' }] },
  { id: 2, name: 'Lara Mendes',      email: 'lara.mendes@magero.pt',   initials: 'LM', color: '#4a89c4',
    level: 'Licenciado', status: 'active',  joined: '09/05/2026', role: 'Admin', type: 'DESIGNER',
    projects: [{ id: 'awp', role: 'Contributor' }, { id: 'mkt', role: 'Owner' }] },
  { id: 3, name: 'João Ribeiro',     email: 'joao.r@magero.pt',        initials: 'JR', color: '#d97a86',
    level: 'Básico',     status: 'active',  joined: '11/05/2026', role: 'Membro', type: 'DEVELOPER',
    projects: [{ id: 'int', role: 'Owner' }] },
  { id: 4, name: 'Patrícia Costa',   email: 'p.costa@magero.pt',       initials: 'PC', color: '#8c5cc4',
    level: 'Licenciado', status: 'active',  joined: '14/05/2026', role: 'Membro', type: 'DEVELOPER',
    projects: [{ id: 'awp', role: 'Contributor' }, { id: 'brd', role: 'Contributor' }] },
  { id: 5, name: 'Rita Faria',       email: 'rita.f@magero.pt',        initials: 'RF', color: '#5a9c7a',
    level: 'Básico',     status: 'pending', joined: '02/06/2026', role: 'Convidada', type: 'QA',
    projects: [{ id: 'mkt', role: 'Reader' }] },
  { id: 6, name: 'André Lopes',      email: 'andre.l@external.com',    initials: 'AL', color: '#c47a4a',
    level: 'Básico',     status: 'pending', joined: '04/06/2026', role: 'Convidada', type: null,
    projects: [] },
  { id: 7, name: 'Thiago Teste 3',   email: 'thiagomagerobr@gmail.com',initials: 'TT', color: '#2f9d6e',
    level: 'Básico',     status: 'active',  joined: '07/05/2026', role: 'Membro', type: 'DEVOPS',
    projects: [{ id: 'awp', role: 'Reader' }] },
  { id: 8, name: 'Thiago Teste 2',   email: 'tmagero@gmail.com',       initials: 'TT', color: '#8c5cc4',
    level: 'Básico',     status: 'active',  joined: '07/05/2026', role: 'Membro', type: 'DEVELOPER',
    projects: [] },
];

const wsProjectsList = [
  { id: 'awp', name: 'Awesome Project App',  color: PT.brand },
  { id: 'mkt', name: 'Marketing Site 2026',  color: 'oklch(0.66 0.16 320)' },
  { id: 'int', name: 'Internal Tools',       color: 'oklch(0.62 0.14 130)' },
  { id: 'brd', name: 'Brand Refresh',        color: 'oklch(0.68 0.13 70)' },
  { id: 'mob', name: 'Mobile App v2',        color: 'oklch(0.60 0.16 264)' },
  { id: 'onb', name: 'Onboarding Flow',      color: 'oklch(0.64 0.14 210)' },
];

const projectRoles = [
  { id: 'reader',      label: 'Reader',      desc: 'Apenas visualizar tarefas e ficheiros.' },
  { id: 'contributor', label: 'Contributor', desc: 'Criar e editar tarefas atribuídas.' },
  { id: 'owner',       label: 'Owner',       desc: 'Controlo total do projeto.' },
];

// ============================================================
// CSS
// ============================================================

const peopleCss = `
.pp-page { flex: 1; overflow: auto; background: var(--bg); display: flex; flex-direction: column; }
.pp-head {
  padding: 22px 28px 18px;
  background: var(--panel);
  border-bottom: 1px solid var(--line);
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 18px 24px;
  align-items: end;
}
.pp-head .title { font-size: 22px; font-weight: 600; letter-spacing: -0.5px; display: flex; align-items: center; gap: 12px; }
.pp-head .sub { font-size: 13px; color: var(--dim); margin-top: 2px; }

.pp-head .right { display: flex; align-items: center; gap: 14px; }
.pp-seats {
  display: flex; flex-direction: column; align-items: flex-end; gap: 2px;
}
.pp-seats .lab { font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--mute); }
.pp-seats .val { font-family: var(--mono); font-size: 14px; color: var(--ink); font-weight: 600; }
.pp-seats .val small { color: var(--dim); font-weight: 500; margin-left: 6px; }
.pp-seats .meter { width: 160px; height: 4px; background: var(--panel3); border-radius: 999px; overflow: hidden; margin-top: 4px; }
.pp-seats .meter .fill { height: 100%; background: var(--brand); border-radius: 999px; }

.pp-btn-primary {
  height: 36px; padding: 0 16px;
  border-radius: 8px;
  background: var(--brand); color: #fff; border: none;
  font-weight: 600; font-size: 13px; cursor: pointer;
  display: inline-flex; align-items: center; gap: 7px;
  box-shadow: 0 1px 0 oklch(0.40 0.18 264 / 0.35);
}
.pp-btn-primary:hover { background: var(--brandHover); }
.pp-btn-ghost {
  height: 32px; padding: 0 12px;
  border-radius: 7px;
  background: var(--panel); color: var(--ink2); border: 1px solid var(--line);
  font-size: 13px; cursor: pointer;
  display: inline-flex; align-items: center; gap: 6px;
}
.pp-btn-ghost:hover { background: var(--panel2); color: var(--ink); }
.pp-btn-danger {
  height: 36px; padding: 0 14px;
  width: 100%;
  border-radius: 8px;
  background: oklch(0.95 0.04 25);
  color: oklch(0.50 0.20 25);
  border: 1px solid oklch(0.88 0.08 25);
  font-weight: 600; font-size: 13px; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center; gap: 7px;
}
.pp-btn-danger:hover { background: oklch(0.92 0.06 25); border-color: oklch(0.82 0.10 25); }
[data-theme="dark"] .pp-btn-danger {
  background: oklch(0.30 0.10 25 / 0.4);
  color: oklch(0.82 0.16 25);
  border-color: oklch(0.40 0.12 25 / 0.6);
}
[data-theme="dark"] .pp-btn-danger:hover { background: oklch(0.34 0.12 25 / 0.55); }

.pp-toolbar {
  padding: 12px 28px;
  background: var(--panel);
  border-bottom: 1px solid var(--line);
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
}
.pp-search {
  display: flex; align-items: center; gap: 8px;
  height: 32px; padding: 0 12px;
  background: var(--panel2);
  border: 1px solid transparent;
  border-radius: 8px;
  color: var(--dim);
  min-width: 240px; flex: 0 1 320px;
}
.pp-search:focus-within { background: var(--panel); border-color: var(--brand); box-shadow: 0 0 0 3px var(--brandSoft); color: var(--ink); }
.pp-search input { flex: 1; background: transparent; border: none; outline: none; color: var(--ink); font-size: 13px; min-width: 0; }
.pp-tabs { display: inline-flex; padding: 3px; background: var(--panel2); border-radius: 8px; gap: 0; }
.pp-tab { padding: 5px 11px; border-radius: 6px; font-size: 12px; cursor: pointer; color: var(--dim); display: inline-flex; align-items: center; gap: 5px; }
.pp-tab:hover { color: var(--ink); }
.pp-tab.active { background: var(--panel); color: var(--ink); font-weight: 600; box-shadow: 0 1px 2px rgba(0,0,0,.06), 0 0 0 1px var(--line); }
.pp-tab .ct { font-family: var(--mono); font-size: 10px; color: var(--mute); padding: 1px 5px; border-radius: 999px; background: var(--panel3); }
.pp-tab.active .ct { background: var(--brandSoft); color: var(--brand); }

.pp-list-wrap { flex: 1; overflow: auto; padding: 18px 28px 32px; }
.pp-table {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--shadow-card);
}
.pp-row {
  display: grid;
  grid-template-columns: minmax(220px, 1.8fr) 120px 100px 140px 130px 90px 44px;
  align-items: center;
  padding: 0 18px;
  gap: 12px;
}
.pp-head-row {
  height: 40px;
  font-size: 11px; color: var(--mute);
  font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase;
  background: var(--panel2);
  border-bottom: 1px solid var(--line);
}
.pp-body-row {
  min-height: 60px; padding-top: 10px; padding-bottom: 10px;
  border-bottom: 1px solid var(--lineSoft);
  cursor: default;
  transition: background .12s;
}
.pp-body-row:last-child { border-bottom: none; }
.pp-body-row:hover { background: var(--panel2); }

.pp-user { display: flex; align-items: center; gap: 12px; min-width: 0; }
.pp-user .avatar { flex: 0 0 auto; }
.pp-user .meta { min-width: 0; display: flex; flex-direction: column; line-height: 1.25; }
.pp-user .nm { font-size: 13.5px; font-weight: 600; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pp-user .em { font-size: 12px; color: var(--dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.pp-pill {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 9px;
  border-radius: 6px;
  font-size: 11.5px; font-weight: 600;
  white-space: nowrap;
}
.pp-pill.lvl-basico    { background: oklch(0.94 0.06 35);  color: oklch(0.42 0.16 35); }
.pp-pill.lvl-licenciado{ background: var(--brandSoft);     color: var(--brand); }

.pp-type-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 3px 8px;
  border-radius: 6px;
  font-family: var(--mono);
  font-size: 10.5px; font-weight: 600;
  letter-spacing: 0.04em;
  background: var(--panel2);
  border: 1px solid var(--line);
  color: var(--ink2);
  max-width: 130px;
  overflow: hidden;
}
.pp-type-chip .pp-type-dot { width: 7px; height: 7px; border-radius: 2px; flex: 0 0 auto; }
.pp-type-chip .pp-type-code { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.pp-type-select {
  position: relative;
  display: flex; align-items: center;
  height: 38px;
  padding: 0 32px 0 36px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
  cursor: pointer;
}
.pp-type-select:focus-within { border-color: var(--brand); box-shadow: 0 0 0 3px var(--brandSoft); }
.pp-type-select .pp-type-sw {
  position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
  width: 14px; height: 14px; border-radius: 4px;
  border: 1px solid var(--line);
}
.pp-type-select .pp-type-chev {
  position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
  color: var(--dim); pointer-events: none;
}
.pp-type-select select {
  flex: 1; appearance: none; -webkit-appearance: none;
  background: transparent; border: none; outline: none;
  font-family: var(--font); font-size: 13.5px;
  color: var(--ink);
  cursor: pointer;
  width: 100%;
}
.pp-pill.st-active   { background: oklch(0.92 0.10 155); color: oklch(0.34 0.10 155); }
.pp-pill.st-pending  { background: oklch(0.94 0.08 80);  color: oklch(0.42 0.12 80); }
[data-theme="dark"] .pp-pill.lvl-basico    { background: oklch(0.32 0.10 35 / 0.45);  color: oklch(0.85 0.14 35); }
[data-theme="dark"] .pp-pill.st-active     { background: oklch(0.35 0.10 155 / 0.5); color: oklch(0.86 0.10 155); }
[data-theme="dark"] .pp-pill.st-pending    { background: oklch(0.38 0.10 80 / 0.45); color: oklch(0.88 0.12 80); }

.pp-pill .dot { width: 6px; height: 6px; border-radius: 999px; background: currentColor; }

.pp-projects-cell {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 12px; color: var(--dim);
}
.pp-projects-cell .swatches { display: inline-flex; gap: 3px; }
.pp-projects-cell .sw { width: 8px; height: 8px; border-radius: 2px; }

.pp-joined { font-family: var(--mono); font-size: 12px; color: var(--dim); }

.pp-more-btn {
  width: 30px; height: 30px;
  border-radius: 7px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--mute);
  cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 16px;
  margin-left: auto;
}
.pp-more-btn:hover { background: var(--panel3); color: var(--ink); border-color: var(--line); }
.pp-body-row:hover .pp-more-btn { background: var(--panel); border-color: var(--line); }

.pp-empty {
  padding: 60px 16px; text-align: center; color: var(--dim);
}
.pp-empty .ic { font-size: 40px; color: var(--brand); opacity: 0.6; }
.pp-empty .tt { font-size: 15px; color: var(--ink); margin-top: 8px; font-weight: 600; }
.pp-empty .sd { font-size: 12.5px; margin-top: 4px; }

/* ============================================================
   Drawer — Gerenciar pessoa (off-canvas right)
   ============================================================ */
.pp-backdrop {
  position: fixed; inset: 0;
  background: rgba(var(--backdrop-rgb), .42);
  z-index: 90;
  -webkit-backdrop-filter: blur(2px);
  backdrop-filter: blur(2px);
  animation: pp-fade .18s ease;
}
@keyframes pp-fade { from { opacity: 0; } to { opacity: 1; } }

.pp-drawer {
  position: fixed; top: 0; right: 0; bottom: 0;
  width: 440px; max-width: 92vw;
  background: var(--panel);
  border-left: 1px solid var(--line);
  z-index: 91;
  display: flex; flex-direction: column;
  box-shadow: -20px 0 60px -20px rgba(0,0,0,.3);
  animation: pp-slide-in .26s cubic-bezier(.2,.7,.2,1);
}
@keyframes pp-slide-in { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

.pp-drawer .dh {
  padding: 16px 20px;
  display: flex; align-items: center; gap: 12px;
  border-bottom: 1px solid var(--line);
}
.pp-drawer .dh .tt { font-size: 16px; font-weight: 600; }
.pp-drawer .close {
  width: 32px; height: 32px;
  border-radius: 7px;
  background: transparent; border: none;
  color: var(--dim); cursor: pointer;
  margin-left: auto;
  display: inline-flex; align-items: center; justify-content: center;
}
.pp-drawer .close:hover { background: var(--panel3); color: var(--ink); }

.pp-drawer .db { flex: 1; overflow-y: auto; padding: 20px 22px 16px; }
.pp-drawer .df {
  padding: 14px 22px;
  border-top: 1px solid var(--line);
  background: var(--panel);
}

.pp-userblock {
  display: flex; align-items: center; gap: 14px;
  padding: 4px 0 18px;
  border-bottom: 1px solid var(--lineSoft);
  margin-bottom: 18px;
}
.pp-userblock .avatar { width: 48px; height: 48px; font-size: 16px; }
.pp-userblock .nm { font-size: 14.5px; font-weight: 600; color: var(--ink); }
.pp-userblock .em { font-size: 12.5px; color: var(--dim); margin-top: 2px; }

.pp-section { margin-bottom: 20px; }
.pp-section .slabel {
  font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--mute);
  margin-bottom: 8px;
  display: flex; align-items: center; gap: 8px;
}
.pp-section .shint { font-size: 11.5px; color: var(--mute); margin-top: 6px; line-height: 1.45; }

.pp-seg {
  display: inline-flex;
  padding: 3px;
  background: var(--panel2);
  border: 1px solid var(--line);
  border-radius: 9px;
  gap: 0;
}
.pp-seg .opt {
  padding: 6px 16px;
  border-radius: 6px;
  font-size: 12.5px; font-weight: 600;
  cursor: pointer;
  color: var(--dim);
  display: inline-flex; align-items: center; gap: 6px;
}
.pp-seg .opt:hover { color: var(--ink); }
.pp-seg .opt.active { background: var(--brand); color: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.1); }

.pp-projlist {
  display: flex; flex-direction: column; gap: 8px;
}
.pp-projrow {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
  transition: border-color .12s, background .12s;
}
.pp-projrow:hover { border-color: var(--lineSoft); background: var(--panel2); }
.pp-projrow.checked { border-color: var(--brand); background: var(--brandSoft); }
[data-theme="dark"] .pp-projrow.checked { background: oklch(0.32 0.10 264 / 0.25); }
.pp-projrow .pdot { width: 10px; height: 10px; border-radius: 3px; flex: 0 0 auto; }
.pp-projrow .pn { flex: 1; font-size: 13px; color: var(--ink); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pp-projrow .pcheck {
  width: 18px; height: 18px;
  border-radius: 5px;
  border: 1.5px solid var(--line);
  background: var(--panel);
  display: inline-flex; align-items: center; justify-content: center;
  color: transparent;
  flex: 0 0 auto;
  transition: background .12s, border-color .12s, color .12s;
}
.pp-projrow .pcheck.on { background: var(--brand); border-color: var(--brand); color: #fff; }

.pp-select {
  height: 30px; padding: 0 26px 0 10px;
  border-radius: 6px;
  border: 1px solid var(--line);
  background: var(--panel);
  color: var(--ink);
  font-size: 12.5px; font-weight: 500;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath d='M1 3l4 4 4-4' stroke='%2399a' stroke-width='1.4' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
}
.pp-select:disabled { opacity: 0.4; cursor: not-allowed; }
.pp-select:focus { outline: none; border-color: var(--brand); box-shadow: 0 0 0 3px var(--brandSoft); }

.pp-invite-card {
  padding: 12px 14px;
  border-radius: 8px;
  background: var(--panel2);
  border: 1px solid var(--line);
  display: flex; align-items: center; gap: 12px;
}
.pp-invite-card .icon {
  width: 32px; height: 32px;
  border-radius: 8px;
  background: var(--brandSoft);
  color: var(--brand);
  display: inline-flex; align-items: center; justify-content: center;
  flex: 0 0 auto;
}
.pp-invite-card .body { flex: 1; min-width: 0; }
.pp-invite-card .lt { font-size: 13px; font-weight: 600; color: var(--ink); }
.pp-invite-card .ls { font-size: 11.5px; color: var(--dim); margin-top: 2px; }
.pp-invite-card .resend {
  padding: 6px 11px;
  border-radius: 6px;
  background: var(--panel);
  border: 1px solid var(--line);
  color: var(--brand);
  font-weight: 600; font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
}
.pp-invite-card .resend:hover { background: var(--brandSoft); border-color: var(--brand); }

/* ============================================================
   Modal — Adicionar pessoa
   ============================================================ */
.pp-modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(var(--backdrop-rgb), .5);
  z-index: 95;
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
  -webkit-backdrop-filter: blur(3px);
  backdrop-filter: blur(3px);
  animation: pp-fade .16s ease;
}
.pp-modal {
  width: 540px; max-width: 100%;
  max-height: calc(100vh - 48px);
  background: var(--panel);
  border-radius: 14px;
  border: 1px solid var(--line);
  box-shadow: var(--shadow-pop);
  display: flex; flex-direction: column;
  overflow: hidden;
  animation: pp-modal-in .22s cubic-bezier(.2,.7,.2,1);
}
@keyframes pp-modal-in { from { transform: translateY(8px) scale(.98); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }

.pp-modal .mh {
  padding: 18px 22px 14px;
  border-bottom: 1px solid var(--line);
  display: flex; align-items: center; gap: 12px;
}
.pp-modal .mh .tt { font-size: 16px; font-weight: 600; }
.pp-modal .mh .close {
  width: 30px; height: 30px;
  border-radius: 7px;
  background: transparent; border: none;
  color: var(--dim); cursor: pointer;
  margin-left: auto;
  display: inline-flex; align-items: center; justify-content: center;
}
.pp-modal .mh .close:hover { background: var(--panel3); color: var(--ink); }

.pp-modal .mb { padding: 20px 22px 8px; overflow-y: auto; }
.pp-modal .mf {
  padding: 14px 22px;
  border-top: 1px solid var(--line);
  display: flex; gap: 10px; justify-content: flex-end;
  background: var(--panel2);
}

.pp-field { margin-bottom: 18px; }
.pp-field label.lab {
  display: block;
  font-size: 11.5px; font-weight: 600;
  color: var(--ink2);
  margin-bottom: 6px;
  letter-spacing: 0.01em;
}
.pp-field .opt-hint { color: var(--mute); font-weight: 400; }
.pp-input {
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
.pp-input:focus { outline: none; border-color: var(--brand); box-shadow: 0 0 0 3px var(--brandSoft); }
.pp-input::placeholder { color: var(--mute); }

.pp-level-cards {
  display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
}
.pp-level-card {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 12px 14px;
  border-radius: 9px;
  border: 1.5px solid var(--line);
  background: var(--panel);
  cursor: pointer;
  transition: border-color .14s, background .14s;
}
.pp-level-card:hover { border-color: var(--lineSoft); background: var(--panel2); }
.pp-level-card.on { border-color: var(--brand); background: var(--brandSoft); }
[data-theme="dark"] .pp-level-card.on { background: oklch(0.32 0.10 264 / 0.25); }
.pp-level-card .radio {
  width: 16px; height: 16px;
  border-radius: 999px;
  border: 1.5px solid var(--line);
  flex: 0 0 auto;
  margin-top: 2px;
  position: relative;
  background: var(--panel);
}
.pp-level-card.on .radio { border-color: var(--brand); background: var(--brand); }
.pp-level-card.on .radio::after {
  content: ''; position: absolute; inset: 3px; border-radius: 999px; background: #fff;
}
.pp-level-card .body { display: block; min-width: 0; grid-template-columns: none; }
.pp-level-card .tt { font-size: 13.5px; font-weight: 600; color: var(--ink); }
.pp-level-card .dd { font-size: 11.5px; color: var(--dim); margin-top: 3px; line-height: 1.4; }

.pp-pickerlist {
  display: flex; flex-direction: column; gap: 6px;
  max-height: 220px;
  padding: 6px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
  overflow-y: auto;
}
.pp-pickerlist .pp-projrow { border: none; background: transparent; padding: 7px 8px; }
.pp-pickerlist .pp-projrow:hover { background: var(--panel2); }
.pp-pickerlist .pp-projrow.checked { background: var(--brandSoft); }
[data-theme="dark"] .pp-pickerlist .pp-projrow.checked { background: oklch(0.32 0.10 264 / 0.25); }

.pp-note {
  display: flex; gap: 8px; align-items: flex-start;
  margin-top: 12px;
  padding: 10px 12px;
  background: var(--panel2);
  border-radius: 8px;
  font-size: 11.5px; color: var(--dim); line-height: 1.45;
}
.pp-note .ic { color: var(--brand); flex: 0 0 auto; margin-top: 1px; }

.pp-modal-cancel {
  height: 36px; padding: 0 16px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid var(--line);
  color: var(--ink);
  font-weight: 500; font-size: 13px;
  cursor: pointer;
}
.pp-modal-cancel:hover { background: var(--panel3); }

/* ============================================================
   Responsive
   ============================================================ */
@media (max-width: 1200px) {
  .pp-row { grid-template-columns: minmax(220px, 2fr) 110px 100px 130px 90px 44px; }
  .pp-row .pp-cell-projects { display: none; }
}
@media (max-width: 1024px) {
  .pp-head { padding: 18px 18px 14px; }
  .pp-list-wrap { padding: 14px 16px 24px; }
  .pp-toolbar { padding: 10px 16px; }
}
@media (max-width: 760px) {
  .pp-head { grid-template-columns: 1fr; }
  .pp-head .right { flex-wrap: wrap; gap: 12px; }
  .pp-seats { align-items: flex-start; }
  .pp-table { border-radius: 10px; }
  .pp-head-row { display: none; }
  .pp-row.pp-body-row {
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-areas:
      "user more"
      "meta meta"
      "foot foot";
    row-gap: 8px;
    padding: 14px 16px;
  }
  .pp-row.pp-body-row > .pp-cell-user     { grid-area: user; }
  .pp-row.pp-body-row > .pp-cell-level    { grid-area: meta; justify-self: start; }
  .pp-row.pp-body-row > .pp-cell-status   { grid-area: meta; justify-self: start; transform: translateX(120px); }
  .pp-row.pp-body-row > .pp-cell-type     { grid-area: foot; justify-self: start; }
  .pp-row.pp-body-row > .pp-cell-projects { display: none; }
  .pp-row.pp-body-row > .pp-cell-joined   { grid-area: foot; justify-self: end; font-size: 11.5px; color: var(--mute); }
  .pp-row.pp-body-row > .pp-cell-more     { grid-area: more; align-self: start; }

  .pp-drawer { width: 100%; max-width: 100%; }
  .pp-modal { border-radius: 14px 14px 0 0; align-self: flex-end; max-height: 88vh; width: 100%; }
  .pp-modal-backdrop { padding: 0; align-items: flex-end; }
  .pp-level-cards { grid-template-columns: 1fr; }
}
`;

// ============================================================
// Sub-components
// ============================================================

function Avatar({ name, initials, color, size }) {
  const s = size || 32;
  return (
    <div className="avatar"
         title={name}
         style={{ width: s, height: s, background: color, fontSize: Math.round(s * 0.4) }}>
      {initials}
    </div>
  );
}

function ProjectsCell({ projects }) {
  if (!projects || projects.length === 0) {
    return <span className="pp-projects-cell" style={{ color: 'var(--mute)' }}>—</span>;
  }
  return (
    <span className="pp-projects-cell">
      <span className="swatches">
        {projects.slice(0, 4).map((p, i) => {
          const meta = wsProjectsList.find(x => x.id === p.id);
          return <span key={i} className="sw" style={{ background: meta ? meta.color : 'var(--mute)' }}></span>;
        })}
      </span>
      <span>{projects.length} {projects.length === 1 ? 'projeto' : 'projetos'}</span>
    </span>
  );
}

function StatusPill({ status }) {
  if (status === 'pending') {
    return <span className="pp-pill st-pending"><span className="dot"></span>Pendente</span>;
  }
  return <span className="pp-pill st-active"><span className="dot"></span>Ativo</span>;
}

function LevelPill({ level }) {
  const cls = level === 'Licenciado' ? 'lvl-licenciado' : 'lvl-basico';
  return <span className={'pp-pill ' + cls}>{level}</span>;
}

function TypePill({ code }) {
  if (!code) return <span style={{ fontSize: 12, color: 'var(--mute)' }}>—</span>;
  const types = (typeof window !== 'undefined' && window.wsMemberTypes) || [];
  const t = types.find(x => x.code === code);
  if (!t) return <span style={{ fontSize: 12, color: 'var(--mute)' }}>{code}</span>;
  return (
    <span className="pp-type-chip" title={t.label}>
      <span className="pp-type-dot" style={{ background: t.color }}></span>
      <span className="pp-type-code">{t.code}</span>
    </span>
  );
}

function TypeSelect({ value, onChange }) {
  const types = (typeof window !== 'undefined' && window.wsMemberTypes) || [];
  const active = types.filter(t => t.active);
  const sel = types.find(t => t.code === value);
  return (
    <div className="pp-type-select">
      <span className="pp-type-sw" style={{ background: sel ? sel.color : 'transparent', borderColor: sel ? 'transparent' : 'var(--line)' }}></span>
      <select value={value || ''} onChange={e => onChange(e.target.value || null)}>
        <option value="">— Sem tipo</option>
        {active.map(t => <option key={t.code} value={t.code}>{t.label}  ·  {t.code}</option>)}
      </select>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="pp-type-chev"><path d="M1 3l4 4 4-4"/></svg>
    </div>
  );
}

// ============================================================
// Drawer — Manage user
// ============================================================

function ManageUserDrawer({ user, onClose, onUpdate, onRemove }) {
  const [level, setLevel] = useStateP(user.level);
  const [type,  setType ] = useStateP(user.type || '');
  const [projAssign, setProjAssign] = useStateP(() => {
    const map = {};
    wsProjectsList.forEach(p => {
      const found = user.projects.find(x => x.id === p.id);
      map[p.id] = { checked: !!found, role: found ? found.role : 'Contributor' };
    });
    return map;
  });
  const [savedTick, setSavedTick] = useStateP(false);

  function toggleProj(id) {
    setProjAssign(s => ({ ...s, [id]: { ...s[id], checked: !s[id].checked } }));
  }
  function setRole(id, role) {
    setProjAssign(s => ({ ...s, [id]: { ...s[id], role } }));
  }
  function save() {
    const list = wsProjectsList
      .filter(p => projAssign[p.id].checked)
      .map(p => ({ id: p.id, role: projAssign[p.id].role }));
    onUpdate && onUpdate({ ...user, level, type: type || null, projects: list });
    setSavedTick(true);
    setTimeout(() => setSavedTick(false), 1400);
  }

  // Escape closes
  useEffectP(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <React.Fragment>
      <div className="pp-backdrop" onClick={onClose}></div>
      <aside className="pp-drawer" role="dialog" aria-label="Gerenciar pessoa">
        <div className="dh">
          <div className="tt">Gerenciar pessoa</div>
          <button className="close" onClick={onClose} aria-label="Fechar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>
          </button>
        </div>

        <div className="db">
          <div className="pp-userblock">
            <Avatar {...user} size={48} />
            <div>
              <div className="nm">{user.name}</div>
              <div className="em">{user.email}</div>
            </div>
          </div>

          {/* Nível de acesso */}
          <div className="pp-section">
            <div className="slabel">Nível de acesso na plataforma</div>
            <div className="pp-seg" role="tablist">
              <div className={'opt' + (level === 'Básico' ? ' active' : '')} onClick={() => setLevel('Básico')}>Básico</div>
              <div className={'opt' + (level === 'Licenciado' ? ' active' : '')} onClick={() => setLevel('Licenciado')}>Licenciado</div>
            </div>
            <div className="shint">
              {level === 'Básico'
                ? 'Acesso às features do plano base. Não consome um assento licenciado.'
                : 'Acesso completo às features do plano. Consome 1 assento licenciado.'}
            </div>
          </div>

          {/* Tipo de membro */}
          <div className="pp-section">
            <div className="slabel">Tipo de membro</div>
            <TypeSelect value={type} onChange={setType} />
            <div className="shint">Categoria funcional usada em filtros, relatórios e regras de timesheet.</div>
          </div>

          {/* Projetos */}
          <div className="pp-section">
            <div className="slabel">
              <span>Projetos do workspace</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--dim)', fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>
                {Object.values(projAssign).filter(x => x.checked).length} / {wsProjectsList.length} atribuídos
              </span>
            </div>
            <div className="pp-projlist">
              {wsProjectsList.map(p => {
                const st = projAssign[p.id];
                return (
                  <div key={p.id} className={'pp-projrow' + (st.checked ? ' checked' : '')}
                       onClick={() => toggleProj(p.id)}>
                    <span className={'pcheck' + (st.checked ? ' on' : '')}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </span>
                    <span className="pdot" style={{ background: p.color }}></span>
                    <span className="pn">{p.name}</span>
                    <select className="pp-select"
                            value={st.role}
                            disabled={!st.checked}
                            onClick={e => e.stopPropagation()}
                            onChange={e => setRole(p.id, e.target.value)}>
                      <option value="Reader">Reader</option>
                      <option value="Contributor">Contributor</option>
                      <option value="Owner">Owner</option>
                    </select>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Convite */}
          <div className="pp-section">
            <div className="slabel">Convite</div>
            <div className="pp-invite-card">
              <div className="icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              </div>
              <div className="body">
                <div className="lt">{user.status === 'pending' ? 'Convite por aceitar' : 'Aceite em ' + user.joined}</div>
                <div className="ls">{user.email}</div>
              </div>
              <button className="resend">Reenviar</button>
            </div>
          </div>
        </div>

        <div className="df">
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button className="pp-btn-primary" onClick={save} style={{ height: 36, flex: 1, justifyContent: 'center' }}>
              {savedTick ? (
                <React.Fragment>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Alterações guardadas
                </React.Fragment>
              ) : 'Guardar alterações'}
            </button>
          </div>
          <div style={{ marginTop: 10 }}>
            <button className="pp-btn-danger" onClick={() => onRemove && onRemove(user)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
              Remover do workspace
            </button>
          </div>
        </div>
      </aside>
    </React.Fragment>
  );
}

// ============================================================
// Modal — Add user
// ============================================================

function AddUserModal({ onClose, onAdd, _preProject }) {
  const [email, setEmail] = useStateP('');
  const [name, setName] = useStateP('');
  const [level, setLevel] = useStateP('Básico');
  const [type,  setType ] = useStateP('');
  const [projAssign, setProjAssign] = useStateP(() => {
    const map = {};
    wsProjectsList.forEach(p => { map[p.id] = { checked: p.id === _preProject, role: 'Contributor' }; });
    return map;
  });

  useEffectP(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function toggleProj(id) {
    setProjAssign(s => ({ ...s, [id]: { ...s[id], checked: !s[id].checked } }));
  }
  function setRole(id, role) {
    setProjAssign(s => ({ ...s, [id]: { ...s[id], role } }));
  }
  function submit() {
    if (!email.trim()) return;
    const list = wsProjectsList
      .filter(p => projAssign[p.id].checked)
      .map(p => ({ id: p.id, role: projAssign[p.id].role }));
    const initials = (name.trim() || email.split('@')[0]).substring(0, 2).toUpperCase();
    const colors = ['#e8704c','#4a89c4','#d97a86','#8c5cc4','#5a9c7a','#c47a4a','#2f9d6e'];
    const u = {
      id: Date.now(),
      name: name.trim() || email,
      email,
      initials,
      color: colors[Math.floor(Math.random() * colors.length)],
      level, status: 'pending',
      joined: new Date().toLocaleDateString('pt-PT'),
      role: 'Convidada',
      type: type || null,
      projects: list,
    };
    onAdd && onAdd(u);
    onClose();
  }

  const canSubmit = !!email.trim() && email.includes('@');
  const seatHint = level === 'Licenciado' ? 'Este convite consome 1 assento licenciado.' : 'Este convite não consome assento.';

  return (
    <div className="pp-modal-backdrop" onClick={onClose}>
      <div className="pp-modal" role="dialog" aria-label="Adicionar pessoa" onClick={e => e.stopPropagation()}>
        <div className="mh">
          <div className="tt">Convidar pessoa para o workspace</div>
          <button className="close" onClick={onClose} aria-label="Fechar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>
          </button>
        </div>

        <div className="mb">
          <div className="pp-field">
            <label className="lab">Email</label>
            <input className="pp-input" type="email" placeholder="nome@empresa.com"
                   value={email} onChange={e => setEmail(e.target.value)} autoFocus />
          </div>

          <div className="pp-field">
            <label className="lab">Nome <span className="opt-hint">(opcional)</span></label>
            <input className="pp-input" type="text" placeholder="Como deve aparecer no workspace"
                   value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div className="pp-field">
            <label className="lab">Nível de acesso</label>
            <div className="pp-level-cards">
              <div className={'pp-level-card' + (level === 'Básico' ? ' on' : '')} onClick={() => setLevel('Básico')}>
                <span className="radio"></span>
                <div className="body">
                  <div className="tt">Básico</div>
                  <div className="dd">Acesso às features do plano base. Não consome assento.</div>
                </div>
              </div>
              <div className={'pp-level-card' + (level === 'Licenciado' ? ' on' : '')} onClick={() => setLevel('Licenciado')}>
                <span className="radio"></span>
                <div className="body">
                  <div className="tt">Licenciado</div>
                  <div className="dd">Acesso completo às features do plano. Consome 1 assento.</div>
                </div>
              </div>
            </div>
          </div>

          <div className="pp-field">
            <label className="lab">Tipo de membro <span className="opt-hint">(opcional)</span></label>
            <TypeSelect value={type} onChange={setType} />
          </div>

          <div className="pp-field">
            <label className="lab">Adicionar a projetos <span className="opt-hint">(opcional)</span></label>
            <div className="pp-pickerlist">
              {wsProjectsList.map(p => {
                const st = projAssign[p.id];
                return (
                  <div key={p.id} className={'pp-projrow' + (st.checked ? ' checked' : '')}
                       onClick={() => toggleProj(p.id)}>
                    <span className={'pcheck' + (st.checked ? ' on' : '')}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </span>
                    <span className="pdot" style={{ background: p.color }}></span>
                    <span className="pn">{p.name}</span>
                    <select className="pp-select"
                            value={st.role}
                            disabled={!st.checked}
                            onClick={e => e.stopPropagation()}
                            onChange={e => setRole(p.id, e.target.value)}>
                      <option value="Reader">Reader</option>
                      <option value="Contributor">Contributor</option>
                      <option value="Owner">Owner</option>
                    </select>
                  </div>
                );
              })}
            </div>

            <div className="pp-note">
              <span className="ic">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </span>
              <span>Para emails sem conta, os projetos são atribuídos quando a pessoa aceitar o convite. {seatHint}</span>
            </div>
          </div>
        </div>

        <div className="mf">
          <button className="pp-modal-cancel" onClick={onClose}>Cancelar</button>
          <button className="pp-btn-primary" onClick={submit} disabled={!canSubmit}
                  style={canSubmit ? null : { opacity: 0.55, cursor: 'not-allowed' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            Enviar convite
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Main page
// ============================================================

function PeopleView({ workspaceName, onGoHome, onOpenWorkspace }) {
  const [members, setMembers]   = useStateP(wsMembers);
  const [drawer,  setDrawer]    = useStateP(null);    // user being managed
  const [addOpen, setAddOpen]   = useStateP(false);
  const [filter,  setFilter]    = useStateP('all');
  const [query,   setQuery]     = useStateP('');

  const filtered = members.filter(m => {
    if (filter === 'licensed' && m.level !== 'Licenciado') return false;
    if (filter === 'basic'    && m.level !== 'Básico')     return false;
    if (filter === 'pending'  && m.status !== 'pending')   return false;
    if (query) {
      const q = query.toLowerCase();
      if (!m.name.toLowerCase().includes(q) && !m.email.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const counts = {
    all:      members.length,
    licensed: members.filter(m => m.level === 'Licenciado').length,
    basic:    members.filter(m => m.level === 'Básico').length,
    pending:  members.filter(m => m.status === 'pending').length,
  };

  const totalSeats = 15;
  const usedSeats  = counts.licensed;

  function updateUser(u) {
    setMembers(list => list.map(m => m.id === u.id ? u : m));
    setDrawer(u);
  }
  function removeUser(u) {
    setMembers(list => list.filter(m => m.id !== u.id));
    setDrawer(null);
  }
  function addUser(u) {
    setMembers(list => [u, ...list]);
  }

  return (
    <div className="pp-page">
      <div className="pp-head">
        <div>
          <div className="title">
            Pessoas do workspace
          </div>
          <div className="sub">Gere quem tem acesso a este workspace e a cada um dos seus projetos.</div>
        </div>

        <div className="right">
          <div className="pp-seats" title="Assentos licenciados usados / total">
            <div className="lab">Assentos licenciados</div>
            <div className="val">{usedSeats}<small>/ {totalSeats} · Plano Pro</small></div>
            <div className="meter"><div className="fill" style={{ width: `${(usedSeats / totalSeats) * 100}%` }}></div></div>
          </div>
          <button className="pp-btn-primary" onClick={() => setAddOpen(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
            Adicionar pessoa
          </button>
        </div>
      </div>

      <div className="pp-toolbar">
        <div className="pp-search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7"/><line x1="20" y1="20" x2="16.65" y2="16.65"/>
          </svg>
          <input placeholder="Procurar por nome ou email…"
                 value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <div className="pp-tabs">
          {[
            ['all',      'Todos',      counts.all],
            ['licensed', 'Licenciados',counts.licensed],
            ['basic',    'Básicos',    counts.basic],
            ['pending',  'Pendentes',  counts.pending],
          ].map(([k, l, c]) => (
            <div key={k} className={'pp-tab' + (filter === k ? ' active' : '')} onClick={() => setFilter(k)}>
              <span>{l}</span>
              <span className="ct">{c}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="pp-list-wrap">
        <div className="pp-table">
          <div className="pp-row pp-head-row">
            <span>Pessoa</span>
            <span>Nível de acesso</span>
            <span>Status</span>
            <span className="pp-cell-type">Tipo</span>
            <span className="pp-cell-projects">Projetos</span>
            <span>Entrou em</span>
            <span style={{ textAlign: 'right' }}></span>
          </div>

          {filtered.length === 0 && (
            <div className="pp-empty">
              <div className="ic">○</div>
              <div className="tt">Nenhuma pessoa encontrada</div>
              <div className="sd">Ajuste os filtros ou convide alguém para começar.</div>
            </div>
          )}

          {filtered.map(m => (
            <div key={m.id} className="pp-row pp-body-row">
              <div className="pp-cell-user pp-user">
                <Avatar {...m} size={34} />
                <div className="meta">
                  <div className="nm">{m.name}</div>
                  <div className="em">{m.email}</div>
                </div>
              </div>
              <div className="pp-cell-level"><LevelPill level={m.level} /></div>
              <div className="pp-cell-status"><StatusPill status={m.status} /></div>
              <div className="pp-cell-type"><TypePill code={m.type} /></div>
              <div className="pp-cell-projects"><ProjectsCell projects={m.projects} /></div>
              <div className="pp-cell-joined pp-joined">{m.joined}</div>
              <div className="pp-cell-more">
                <button className="pp-more-btn" onClick={() => setDrawer(m)} aria-label="Mais ações">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {drawer  && <ManageUserDrawer user={drawer} onClose={() => setDrawer(null)} onUpdate={updateUser} onRemove={removeUser} />}
      {addOpen && <AddUserModal onClose={() => setAddOpen(false)} onAdd={addUser} />}
    </div>
  );
}

Object.assign(window, { PeopleView, peopleCss });

// Expose the invite modal globally so sidebar and project overview can open it.
window.InvitePersonModal = function InvitePersonModal({ onClose, onAdd, preSelectedProject }) {
  return React.createElement(AddUserModal, {
    onClose,
    onAdd,
    _preProject: preSelectedProject,
  });
};
