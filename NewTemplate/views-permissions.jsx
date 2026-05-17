/* eslint-disable */
// AWP — Project Permissions Modal
// Two-tab interface: Members (accordion) + Permissions (role matrix).
// Triggered by the "Permissões" button in ProjectOverview.

const PX = window.awpTokens;

window.permissionsCss = `
/* ============================================================
   Permissions Modal
   ============================================================ */
.perm-backdrop {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.45);
  display: flex; align-items: center; justify-content: center;
  z-index: 200;
  padding: 24px 16px;
  animation: perm-fade .15s ease;
}
@keyframes perm-fade { from { opacity: 0; } to { opacity: 1; } }
.perm-modal {
  width: 860px; max-width: 100%;
  max-height: calc(100vh - 48px);
  background: ${PX.panel};
  border: 1px solid ${PX.line};
  border-radius: 14px;
  box-shadow: 0 24px 64px rgba(0,0,0,.28);
  display: flex; flex-direction: column;
  overflow: hidden;
  animation: perm-pop .18s cubic-bezier(.2,.7,.2,1);
}
@keyframes perm-pop { from { transform: translateY(10px) scale(.98); opacity: 0; } to { transform: none; opacity: 1; } }

/* Header */
.perm-head {
  display: flex; align-items: flex-start;
  padding: 20px 24px 16px;
  border-bottom: 1px solid ${PX.line};
  flex: 0 0 auto;
}
.perm-head .info { flex: 1; }
.perm-head .title {
  display: inline-flex; align-items: center; gap: 9px;
  font-size: 17px; font-weight: 600;
  color: ${PX.ink};
}
.perm-head .title svg { color: ${PX.brand}; }
.perm-head .proj { font-size: 12.5px; color: ${PX.dim}; margin-top: 3px; }
.perm-close {
  width: 30px; height: 30px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 7px; border: none; background: transparent;
  color: ${PX.dim}; cursor: pointer; padding: 0;
}
.perm-close:hover { background: ${PX.panel2}; color: ${PX.ink}; }

/* Tabs */
.perm-tabs {
  display: grid; grid-template-columns: 1fr 1fr;
  border-bottom: 1px solid ${PX.line};
  margin: 0 24px;
  gap: 4px;
  flex: 0 0 auto;
}
.perm-tab {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  padding: 12px 16px;
  font: inherit; font-size: 13.5px; font-weight: 500;
  color: ${PX.dim}; cursor: pointer;
  border: none; background: transparent;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color .12s, background .12s;
}
.perm-tab:hover { color: ${PX.ink}; background: ${PX.panel2}; }
.perm-tab.active {
  color: ${PX.brand};
  border-bottom-color: ${PX.brand};
  font-weight: 600;
  background: ${PX.brandSoft};
}
[data-theme="dark"] .perm-tab.active { background: oklch(0.32 0.10 264 / 0.25); }
.perm-tab .ic {
  width: 22px; height: 22px; border-radius: 999px;
  background: ${PX.panel2};
  display: inline-flex; align-items: center; justify-content: center;
  color: ${PX.dim};
}
.perm-tab.active .ic { background: ${PX.brandSoft}; color: ${PX.brand}; }
.perm-tab .count {
  font-family: 'Geist Mono', ui-monospace, monospace;
  font-size: 11px; padding: 1px 6px;
  background: ${PX.brandSoft};
  color: ${PX.brand};
  border-radius: 999px;
}
.perm-tab.active .count { background: ${PX.brandSoft2}; }

/* Body */
.perm-body { flex: 1; overflow-y: auto; padding: 14px 24px 8px; min-height: 0; }

/* Owner row */
.perm-owner {
  display: flex; align-items: center; gap: 14px;
  padding: 16px 14px;
  margin-bottom: 8px;
  background: ${PX.panel2};
  border-radius: 10px;
  border: 1px solid ${PX.line};
}
.perm-owner .av {
  width: 40px; height: 40px;
  border-radius: 999px;
  color: #fff;
  font-size: 13px; font-weight: 700;
  display: inline-flex; align-items: center; justify-content: center;
  flex: 0 0 auto;
}
.perm-owner .info { flex: 1; min-width: 0; }
.perm-owner .nm { font-size: 16px; font-weight: 600; color: ${PX.ink}; }
.perm-owner .em { font-size: 12.5px; color: ${PX.dim}; }
.perm-owner .badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 10px;
  background: oklch(0.94 0.06 70);
  color: oklch(0.48 0.14 70);
  border-radius: 6px;
  font-size: 12.5px; font-weight: 600;
}
[data-theme="dark"] .perm-owner .badge {
  background: oklch(0.42 0.12 70 / .35);
  color: oklch(0.86 0.12 70);
}

/* Member accordion row */
.perm-member {
  border: 1px solid ${PX.line};
  border-radius: 10px;
  margin-bottom: 8px;
  overflow: hidden;
}
.perm-member-head {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 14px;
  cursor: pointer;
  background: ${PX.panel};
  transition: background .12s ease;
}
.perm-member-head:hover { background: ${PX.panel2}; }
.perm-member-head .av {
  width: 30px; height: 30px;
  border-radius: 999px;
  color: #fff;
  font-size: 11px; font-weight: 700;
  display: inline-flex; align-items: center; justify-content: center;
  flex: 0 0 auto;
}
.perm-member-head .info { flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.perm-member-head .nm { font-size: 13.5px; font-weight: 600; color: ${PX.ink}; }
.perm-member-head .em { font-size: 12px; color: ${PX.dim}; }
.perm-member-head .team {
  font-size: 11px; font-weight: 600;
  color: ${PX.brand};
  padding: 2px 7px;
  background: ${PX.brandSoft};
  border-radius: 4px;
}
.perm-role-sel {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 11px;
  border-radius: 6px;
  border: 1px solid ${PX.line};
  background: ${PX.panel};
  color: ${PX.ink2};
  font: inherit; font-size: 12.5px;
  cursor: pointer;
}
.perm-role-sel:hover { border-color: ${PX.brand}; }
.perm-chev {
  width: 26px; height: 26px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 6px; border: none; background: transparent;
  color: ${PX.mute}; cursor: pointer; padding: 0;
  transition: transform .18s ease;
}
.perm-chev.open { transform: rotate(180deg); }
.perm-chev:hover { background: ${PX.panel2}; }

/* Per-member permission groups */
.perm-member-body { background: ${PX.panel2}; border-top: 1px solid ${PX.line}; }
.perm-group { border-bottom: 1px solid ${PX.line}; }
.perm-group:last-child { border-bottom: 0; }
.perm-group-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px;
  font-size: 13.5px; font-weight: 600;
  color: ${PX.ink};
  cursor: pointer;
  background: transparent;
  border: none; width: 100%; text-align: left;
  transition: background .12s ease;
}
.perm-group-head:hover { background: ${PX.lineSoft}; }
.perm-group-head .g-chev { color: ${PX.mute}; transition: transform .15s ease; }
.perm-group-head .g-chev.open { transform: rotate(180deg); }

/* Permission table */
.perm-table { width: 100%; border-collapse: collapse; }
.perm-table-head th {
  padding: 8px 14px;
  font-size: 11px; font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: ${PX.mute};
  border-bottom: 1px solid ${PX.line};
  text-align: left;
  background: ${PX.panel};
}
.perm-table-head th.center { text-align: center; }
.perm-table td {
  padding: 10px 14px;
  font-size: 13px;
  color: ${PX.ink};
  border-bottom: 1px solid ${PX.lineSoft};
  vertical-align: middle;
}
.perm-table tr:last-child td { border-bottom: 0; }
.perm-table td.center { text-align: center; }
.perm-table tr:hover td { background: oklch(from var(--panel2) l c h / .5); }

/* Icons */
.perm-check { color: oklch(0.50 0.15 155); }
.perm-cross { color: ${PX.mute}; }
.perm-lock  { color: ${PX.mute}; }

/* Small toggle for individual/matrix */
.perm-toggle {
  width: 28px; height: 16px;
  background: ${PX.panel3};
  border-radius: 999px;
  position: relative;
  cursor: pointer; border: none; padding: 0;
  transition: background .14s ease;
  flex: 0 0 auto; display: inline-block;
}
.perm-toggle::after {
  content: '';
  position: absolute; left: 2px; top: 2px;
  width: 12px; height: 12px;
  background: #fff; border-radius: 999px;
  transition: left .14s ease;
  box-shadow: 0 1px 2px rgba(0,0,0,.15);
}
.perm-toggle.on { background: ${PX.brand}; }
.perm-toggle.on::after { left: 14px; }

/* Default badge */
.perm-default {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px;
  background: oklch(0.94 0.06 155);
  color: oklch(0.44 0.14 155);
  border-radius: 999px;
  font-size: 11px; font-weight: 600;
}
[data-theme="dark"] .perm-default {
  background: oklch(0.38 0.10 155 / .4);
  color: oklch(0.92 0.06 155);
}

/* Footer */
.perm-footer {
  display: flex; justify-content: flex-end;
  padding: 14px 24px;
  border-top: 1px solid ${PX.line};
  flex: 0 0 auto;
  background: ${PX.panel2};
}
.perm-footer .close-btn {
  padding: 9px 18px;
  border-radius: 8px;
  border: 1px solid ${PX.line};
  background: ${PX.panel};
  color: ${PX.ink};
  font: inherit; font-size: 13.5px; font-weight: 500;
  cursor: pointer;
}
.perm-footer .close-btn:hover { background: ${PX.panel3}; }
`;

// ============================================================
// Data
// ============================================================
const PX_GROUPS = [
  { key: 'projeto', label: 'Projeto', actions: [
    { key: 'ver-proj',     label: 'Ver projeto',     contrib: true,  reader: true,  delegatable: false },
    { key: 'editar-proj',  label: 'Editar projeto',  contrib: true,  reader: false, delegatable: false },
    { key: 'excluir-proj', label: 'Excluir projeto', contrib: false, reader: false, delegatable: false },
  ]},
  { key: 'membros', label: 'Membros e Equipes', actions: [
    { key: 'convidar',   label: 'Convidar membros',      contrib: false, reader: false, delegatable: true },
    { key: 'remover-m',  label: 'Remover membros',       contrib: false, reader: false, delegatable: true },
    { key: 'alterar-r',  label: 'Alterar role de membros', contrib: false, reader: false, delegatable: true },
    { key: 'ger-eq',     label: 'Gerenciar equipes',     contrib: false, reader: false, delegatable: true },
    { key: 'ger-perm',   label: 'Gerenciar permissões',  contrib: false, reader: false, delegatable: true },
  ]},
  { key: 'tarefas', label: 'Tarefas e Dependências', actions: [
    { key: 'criar-t',    label: 'Criar tarefas',          contrib: true,  reader: false, delegatable: true },
    { key: 'editar-t',   label: 'Editar tarefas',         contrib: true,  reader: false, delegatable: true },
    { key: 'excluir-t',  label: 'Excluir tarefas',        contrib: false, reader: false, delegatable: true },
    { key: 'criar-dep',  label: 'Criar dependências',     contrib: true,  reader: false, delegatable: true },
    { key: 'remover-dep',label: 'Remover dependências',   contrib: true,  reader: false, delegatable: true },
  ]},
  { key: 'recursos', label: 'Recursos', actions: [
    { key: 'ver-rec',    label: 'Ver recursos',      contrib: true,  reader: true,  delegatable: false },
    { key: 'alocar',     label: 'Alocar recursos',   contrib: true,  reader: false, delegatable: true },
    { key: 'rm-aloc',    label: 'Remover alocação',  contrib: false, reader: false, delegatable: true },
  ]},
  { key: 'config', label: 'Configuração', actions: [
    { key: 'ed-config',  label: 'Editar configurações',     contrib: false, reader: false, delegatable: false },
    { key: 'ger-est',    label: 'Gerenciar estados',        contrib: false, reader: false, delegatable: true },
    { key: 'ger-tipos',  label: 'Gerenciar tipos de evento',contrib: false, reader: false, delegatable: true },
  ]},
  { key: 'estados', label: 'Estados', actions: [
    { key: 'criar-est',  label: 'Criar estados',   contrib: true,  reader: false, delegatable: true },
    { key: 'editar-est', label: 'Editar estados',  contrib: true,  reader: false, delegatable: true },
    { key: 'excl-est',   label: 'Excluir estados', contrib: false, reader: false, delegatable: true },
  ]},
  { key: 'quadro', label: 'Quadro', actions: [
    { key: 'ver-quad',   label: 'Ver quadro',        contrib: true, reader: true,  delegatable: false },
    { key: 'conf-quad',  label: 'Configurar quadro', contrib: true, reader: false, delegatable: true },
  ]},
  { key: 'calendario', label: 'Calendário', actions: [
    { key: 'ver-cal',    label: 'Ver calendário',  contrib: true, reader: true,  delegatable: false },
    { key: 'criar-ev',   label: 'Criar eventos',   contrib: true, reader: false, delegatable: true },
    { key: 'editar-ev',  label: 'Editar eventos',  contrib: true, reader: false, delegatable: true },
  ]},
  { key: 'timesheet', label: 'Timesheet', actions: [
    { key: 'ver-ts',     label: 'Ver timesheet',       contrib: true,  reader: true,  delegatable: false },
    { key: 'submeter-ts',label: 'Submeter timesheet',   contrib: true,  reader: false, delegatable: true },
    { key: 'aprovar-ts', label: 'Aprovar timesheet',    contrib: false, reader: false, delegatable: false },
  ]},
  { key: 'arquivos', label: 'Arquivos', actions: [
    { key: 'ver-arq',    label: 'Ver arquivos',    contrib: true,  reader: true,  delegatable: false },
    { key: 'enviar-arq', label: 'Enviar arquivos', contrib: true,  reader: false, delegatable: true },
    { key: 'excl-arq',   label: 'Excluir arquivos',contrib: false, reader: false, delegatable: true },
  ]},
];

const PX_MEMBERS = [
  { id: 'am', name: 'Ana Monteiro',  email: 'ana@ana.com',               initials: 'AM', color: '#c47a4a', role: 'owner' },
  { id: 'tm', name: 'Thiago Mágero', email: 'thiagocmagero@gmail.com',    initials: 'TM', color: '#e8704c', role: 'reader',      team: 'Grande equipa' },
  { id: 'lm', name: 'Lara Mendes',   email: 'lara.mendes@magero.pt',      initials: 'LM', color: '#4a89c4', role: 'contributor', team: 'Grande equipa' },
];

// ============================================================
// Shared icons
// ============================================================
const PxCheck  = () => <svg className="perm-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const PxCross  = () => <svg className="perm-cross" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const PxLock   = () => <svg className="perm-lock"  width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const PxChevD  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>;
const PxShield = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;

// ============================================================
// Toggle
// ============================================================
function Toggle({ on, onChange }) {
  return <button className={'perm-toggle' + (on ? ' on' : '')} onClick={() => onChange && onChange(!on)} aria-pressed={on ? 'true' : 'false'}></button>;
}

// ============================================================
// Permission group inside a member row
// ============================================================
function MemberGroup({ group, role }) {
  const { useState } = React;
  const [open, setOpen] = useState(false);
  const [overrides, setOverrides] = useState({});
  const setOv = (key, val) => setOverrides(s => ({ ...s, [key]: val }));

  const hasRole = (a) => role === 'contributor' ? a.contrib : a.reader;

  return (
    <div className="perm-group">
      <button className="perm-group-head" onClick={() => setOpen(o => !o)}>
        {group.label}
        <span className={'g-chev' + (open ? ' open' : '')}><PxChevD /></span>
      </button>
      {open && (
        <table className="perm-table">
          <thead className="perm-table-head">
            <tr>
              <th>Ação</th>
              <th className="center">Role</th>
              <th className="center">Individual</th>
            </tr>
          </thead>
          <tbody>
            {group.actions.map(a => {
              const byRole = hasRole(a);
              const indiv = overrides[a.key];
              return (
                <tr key={a.key}>
                  <td>{a.label}</td>
                  <td className="center">{byRole ? <PxCheck /> : <PxCross />}</td>
                  <td className="center">
                    {a.delegatable
                      ? <Toggle on={indiv !== undefined ? indiv : false} onChange={(v) => setOv(a.key, v)} />
                      : <PxLock />}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ============================================================
// Member row (accordion)
// ============================================================
function MemberRow({ member }) {
  const { useState } = React;
  const [open, setOpen]     = useState(false);
  const [role, setRole]     = useState(member.role);

  return (
    <div className="perm-member">
      <div className="perm-member-head">
        <span className="av" style={{ background: member.color }}>{member.initials}</span>
        <div className="info">
          <span className="nm">{member.name}</span>
          <span className="em">{member.email}</span>
          {member.team && <span className="team">{member.team}</span>}
        </div>
        <select
          className="perm-role-sel"
          value={role}
          onChange={e => setRole(e.target.value)}
          onClick={e => e.stopPropagation()}>
          <option value="contributor">Contribuidor</option>
          <option value="reader">Leitor</option>
        </select>
        <button className={'perm-chev' + (open ? ' open' : '')} onClick={() => setOpen(o => !o)} aria-label="Expandir permissões">
          <PxChevD />
        </button>
      </div>
      {open && (
        <div className="perm-member-body">
          {PX_GROUPS.map(g => <MemberGroup key={g.key} group={g} role={role} />)}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Tab: Membros
// ============================================================
function MembersTab() {
  const owner   = PX_MEMBERS.find(m => m.role === 'owner');
  const members = PX_MEMBERS.filter(m => m.role !== 'owner');
  return (
    <div>
      {/* Owner */}
      <div className="perm-owner">
        <span className="av" style={{ background: owner.color }}>{owner.initials}</span>
        <div className="info">
          <div className="nm">{owner.name}</div>
          <div className="em">{owner.email}</div>
        </div>
        <span className="badge">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          Dono
        </span>
      </div>
      {/* Other members */}
      {members.map(m => <MemberRow key={m.id} member={m} />)}
    </div>
  );
}

// ============================================================
// Tab: Permissões (role matrix)
// ============================================================
function MatrixGroup({ group, initialOpen }) {
  const { useState } = React;
  const [open, setOpen]      = useState(!!initialOpen);
  const [toggles, setToggles] = useState({});
  const setTg = (key, role, val) => setToggles(s => ({ ...s, [key + ':' + role]: val }));

  const cellFor = (a, role) => {
    const isDefault = role === 'contributor' ? a.contrib : a.reader;
    const key = a.key + ':' + role;
    const toggled = toggles[key];

    if (isDefault) return <span className="perm-default"><PxCheck /> Default</span>;
    if (!a.delegatable) return <PxLock />;
    return <Toggle on={toggled !== undefined ? toggled : false} onChange={(v) => setTg(a.key, role, v)} />;
  };

  return (
    <div className="perm-group">
      <button className="perm-group-head" onClick={() => setOpen(o => !o)}>
        {group.label}
        <span className={'g-chev' + (open ? ' open' : '')}><PxChevD /></span>
      </button>
      {open && (
        <table className="perm-table">
          <thead className="perm-table-head">
            <tr>
              <th>Ação</th>
              <th className="center">Contribuidor</th>
              <th className="center">Leitor</th>
            </tr>
          </thead>
          <tbody>
            {group.actions.map(a => (
              <tr key={a.key}>
                <td>{a.label}</td>
                <td className="center">{cellFor(a, 'contributor')}</td>
                <td className="center">{cellFor(a, 'reader')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function PermissionsTab() {
  return (
    <div>
      {PX_GROUPS.map((g, i) => <MatrixGroup key={g.key} group={g} initialOpen={i === 0} />)}
    </div>
  );
}

// ============================================================
// PermissionsModal
// ============================================================
window.PermissionsModal = function PermissionsModal({ onClose, projectName }) {
  const { useState, useEffect } = React;
  const [tab, setTab] = useState('members');
  const nonOwners = PX_MEMBERS.filter(m => m.role !== 'owner').length;

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="perm-backdrop" onClick={onClose}>
      <div className="perm-modal" role="dialog" aria-label="Permissões do Projeto" onClick={e => e.stopPropagation()}>
        <div className="perm-head">
          <div className="info">
            <div className="title"><PxShield /> Permissões do Projeto</div>
            <div className="proj">{projectName || 'Awesome Project App'}</div>
          </div>
          <button className="perm-close" onClick={onClose} aria-label="Fechar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="perm-tabs">
          <button className={'perm-tab' + (tab === 'members' ? ' active' : '')} onClick={() => setTab('members')}>
            <span className="ic"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>
            Membros
            <span className="count">{PX_MEMBERS.length}</span>
          </button>
          <button className={'perm-tab' + (tab === 'permissions' ? ' active' : '')} onClick={() => setTab('permissions')}>
            <span className="ic"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></span>
            Permissões
          </button>
        </div>

        <div className="perm-body">
          {tab === 'members'     && <MembersTab />}
          {tab === 'permissions' && <PermissionsTab />}
        </div>

        <div className="perm-footer">
          <button className="close-btn" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
};
