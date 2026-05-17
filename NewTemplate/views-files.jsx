/* eslint-disable */
// AWP — Ficheiros do projeto (project-level files view).
// Reuses the task modal's .tm-files-* styles for visual coherence with the
// Files tab inside a task. Adds an "Origem" column so files inserted via tasks
// are surfaced here alongside files uploaded directly to the project. A
// secondary "Adicionados recentemente em tarefas" section at the top
// highlights the most recent task-attached uploads.

const FT = window.awpTokens;

window.filesCss = `
/* ============================================================
   Ficheiros — wrap
   ============================================================ */
.fv-wrap {
  flex: 1;
  display: flex; flex-direction: column;
  overflow: hidden;
  background: ${FT.bg};
  min-width: 0;
}

.fv-actions {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 24px;
  border-bottom: 1px solid ${FT.line};
  background: ${FT.panel};
  flex: 0 0 auto;
}
.fv-actions .spacer { flex: 1; }

.fv-filter {
  position: relative;
  flex: 0 1 320px;
  display: flex; align-items: center;
}
.fv-filter input {
  width: 100%;
  padding: 7px 11px 7px 32px;
  border: 1px solid ${FT.line};
  border-radius: 8px;
  background: ${FT.panel};
  color: ${FT.ink};
  font-size: 12.5px;
  font-family: inherit;
  outline: none;
  transition: border-color .12s ease, box-shadow .12s ease;
}
.fv-filter input::placeholder { color: ${FT.mute}; }
.fv-filter input:focus {
  border-color: ${FT.brand};
  box-shadow: 0 0 0 3px ${FT.brandSoft};
}
.fv-filter > svg { position: absolute; left: 10px; color: ${FT.mute}; pointer-events: none; }
.fv-filter .clear {
  position: absolute; right: 8px;
  width: 18px; height: 18px;
  display: inline-flex; align-items: center; justify-content: center;
  background: transparent; border: 0; padding: 0;
  color: ${FT.mute}; cursor: pointer; border-radius: 4px;
}
.fv-filter .clear:hover { color: ${FT.ink}; background: ${FT.panel2}; }

.fv-actions .send-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 13px;
  border-radius: 8px;
  background: ${FT.brand};
  border: 1px solid ${FT.brand};
  color: #fff;
  font-size: 12.5px; font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background .12s ease;
  white-space: nowrap;
}
.fv-actions .send-btn:hover { background: ${FT.brandHover}; border-color: ${FT.brandHover}; }

.fv-icon-btn {
  width: 30px; height: 30px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 7px;
  border: 1px solid transparent;
  background: transparent;
  color: ${FT.ink2};
  cursor: pointer;
  padding: 0;
  transition: background .12s ease, color .12s ease;
}
.fv-icon-btn:hover { background: ${FT.panel2}; color: ${FT.ink}; }

/* === Body === */
.fv-body {
  flex: 1;
  overflow-y: auto;
  padding: 18px 24px 24px;
  min-height: 0;
}

.fv-section { margin-bottom: 22px; }
.fv-section:last-child { margin-bottom: 0; }
.fv-section-head {
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 14px;
}
.fv-section-head .t {
  font-size: 14px; font-weight: 600;
  color: ${FT.ink};
  display: inline-flex; align-items: center; gap: 7px;
}
.fv-section-head .t svg { color: ${FT.brand}; }
.fv-section-head .n {
  font-family: 'Geist Mono', ui-monospace, monospace;
  font-size: 10.5px;
  color: ${FT.mute};
  padding: 1px 7px;
  border-radius: 999px;
  background: ${FT.panel2};
  font-weight: 500;
}
.fv-section-head .sub {
  font-size: 12px; color: ${FT.dim};
  margin-left: 4px;
}
.fv-section-head .grow { flex: 1; }
.fv-section-head .link {
  font-size: 12px; color: ${FT.brand};
  cursor: pointer; font-weight: 500;
}
.fv-section-head .link:hover { text-decoration: underline; }

/* Filter chips */
.fv-chips { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; }
.fv-chip {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 5px 12px;
  border: 1px solid ${FT.line};
  border-radius: 999px;
  background: ${FT.panel};
  color: ${FT.ink2};
  font-size: 12px;
  cursor: pointer;
  transition: border-color .12s ease, background .12s ease, color .12s ease;
}
.fv-chip:hover { border-color: ${FT.mute}; }
.fv-chip.active { background: ${FT.brandSoft}; border-color: ${FT.brandSoft2}; color: ${FT.brand}; font-weight: 600; }
.fv-chip .n {
  font-family: 'Geist Mono', ui-monospace, monospace;
  font-size: 10.5px;
  color: ${FT.mute};
}
.fv-chip.active .n { color: ${FT.brand}; }

/* Per-page bar */
.fv-pp-bar {
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 6px;
  padding: 0 4px;
}
.fv-pp-bar .lbl { font-size: 11.5px; color: ${FT.dim}; }
.fv-pp-sel {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 10px;
  background: ${FT.panel};
  border: 1px solid ${FT.line};
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  color: ${FT.ink};
}
.fv-pp-sel::after {
  content: '';
  border-left: 3.5px solid transparent;
  border-right: 3.5px solid transparent;
  border-top: 4px solid ${FT.mute};
  margin-left: 3px;
}

/* Table */
.fv-table {
  background: ${FT.panel};
  border: 1px solid ${FT.line};
  border-radius: 10px;
  overflow: hidden;
}
.fv-row {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) 140px 110px 180px 130px 44px;
  gap: 14px;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid ${FT.lineSoft};
  cursor: pointer;
  transition: background .12s ease;
}
.fv-row:last-child { border-bottom: 0; }
.fv-row:hover { background: ${FT.panel2}; }
.fv-row.head {
  background: ${FT.panel2};
  padding: 9px 16px;
  cursor: default;
}
.fv-row.head:hover { background: ${FT.panel2}; }
.fv-row.head .col {
  font-size: 10.5px;
  color: ${FT.mute};
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  display: inline-flex; align-items: center; gap: 4px;
  cursor: pointer;
}
.fv-row.head .col:hover { color: ${FT.ink}; }
.fv-row.head .col svg { opacity: 0.6; }

.fv-row .name-cell {
  display: flex; align-items: center; gap: 12px;
  min-width: 0;
}
.fv-row .name-cell .icn {
  width: 32px; height: 32px;
  border-radius: 7px;
  display: flex; align-items: center; justify-content: center;
  background: var(--fv-soft);
  color: var(--fv-color);
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  flex: 0 0 auto;
}
.fv-row .name-cell .nm {
  font-size: 13px;
  color: ${FT.ink};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fv-source { display: inline-flex; align-items: center; gap: 6px; min-width: 0; }
.fv-source .proj-badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 2px 8px;
  background: ${FT.panel2};
  color: ${FT.ink2};
  font-size: 11px;
  border-radius: 999px;
  font-weight: 500;
}
.fv-source .task-badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 2px 8px;
  background: ${FT.brandSoft};
  color: ${FT.brand};
  font-size: 11px;
  border-radius: 999px;
  font-weight: 500;
  cursor: pointer;
  max-width: 100%;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.fv-source .task-badge svg { flex: 0 0 auto; }
.fv-source .task-badge:hover { background: ${FT.brandSoft2}; }
.fv-source .task-badge .nm { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.fv-row .size, .fv-row .date {
  font-size: 12px;
  color: ${FT.dim};
  font-family: 'Geist Mono', ui-monospace, monospace;
  font-variant-numeric: tabular-nums;
}
.fv-row .who {
  display: inline-flex; align-items: center; gap: 7px;
  font-size: 12px;
  color: ${FT.ink};
  min-width: 0;
}
.fv-row .who .nm { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fv-row .more {
  width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 6px;
  background: ${FT.brandSoft};
  color: ${FT.brand};
  cursor: pointer;
  font-size: 16px;
  line-height: 0;
  letter-spacing: 1px;
  user-select: none;
}
.fv-row .more:hover { background: ${FT.brandSoft2}; }

.fv-empty {
  padding: 24px;
  text-align: center;
  color: ${FT.mute};
  font-size: 13px;
}

/* Recent-from-tasks compact card */
.fv-recent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 10px;
}
.fv-recent-card {
  display: flex; align-items: center; gap: 12px;
  padding: 12px;
  background: ${FT.panel};
  border: 1px solid ${FT.line};
  border-radius: 9px;
  cursor: pointer;
  transition: border-color .12s ease, box-shadow .12s ease;
  min-width: 0;
}
.fv-recent-card:hover { border-color: ${FT.brandSoft2}; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.fv-recent-card .icn {
  width: 36px; height: 36px;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  background: var(--fv-soft);
  color: var(--fv-color);
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  flex: 0 0 auto;
}
.fv-recent-card .body { flex: 1; min-width: 0; }
.fv-recent-card .body .nm {
  font-size: 13px;
  color: ${FT.ink};
  font-weight: 500;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  display: block;
}
.fv-recent-card .body .meta {
  display: flex; align-items: center; gap: 6px;
  font-size: 11.5px;
  color: ${FT.dim};
  margin-top: 3px;
}
.fv-recent-card .body .meta .dot { width: 3px; height: 3px; border-radius: 999px; background: currentColor; flex: 0 0 auto; opacity: 0.6; }
.fv-recent-card .body .task {
  display: inline-flex; align-items: center; gap: 4px;
  color: ${FT.brand};
  font-weight: 500;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

/* Storage indicator */
.fv-storage {
  margin-top: 22px;
  padding: 12px 14px;
  background: ${FT.panel2};
  border: 1px solid ${FT.line};
  border-radius: 10px;
  display: flex; align-items: center; gap: 12px;
}
.fv-storage .ico { color: ${FT.brand}; display: inline-flex; flex: 0 0 auto; }
.fv-storage .body { flex: 1; }
.fv-storage .lbl { font-size: 13px; color: ${FT.ink}; display: flex; align-items: center; gap: 8px; }
.fv-storage .lbl b { color: ${FT.brand}; font-family: 'Geist Mono', ui-monospace, monospace; font-weight: 700; }
.fv-storage .bar {
  height: 4px;
  background: ${FT.lineSoft};
  border-radius: 999px;
  margin-top: 6px;
  overflow: hidden;
}
.fv-storage .bar .fill { height: 100%; background: ${FT.brand}; border-radius: 999px; }

/* Responsive */
@media (max-width: 1100px) {
  .fv-row { grid-template-columns: minmax(180px, 1fr) 130px 90px 140px 36px; }
  .fv-row .date-col, .fv-row .date { display: none; }
  .fv-row.head .col.date-h { display: none; }
}
@media (max-width: 760px) {
  .fv-body { padding: 12px 16px 20px; }
  .fv-row { grid-template-columns: minmax(160px, 1fr) 100px 36px; gap: 10px; }
  .fv-row .who, .fv-row .who-cell { display: none; }
  .fv-row.head .col.who-h { display: none; }
  .fv-row .size { display: block; font-size: 11px; }
}
`;

// ============================================================
// File-kind icon palette (matches task modal's fcol/fsoft)
// ============================================================
const FV_KIND_STYLE = {
  PDF:  { color: 'oklch(0.55 0.18 25)',  soft: 'oklch(0.95 0.06 25)' },
  DOCX: { color: 'oklch(0.50 0.16 264)', soft: 'oklch(0.94 0.06 264)' },
  DOC:  { color: 'oklch(0.50 0.16 264)', soft: 'oklch(0.94 0.06 264)' },
  XLSX: { color: 'oklch(0.50 0.16 155)', soft: 'oklch(0.94 0.06 155)' },
  XLS:  { color: 'oklch(0.50 0.16 155)', soft: 'oklch(0.94 0.06 155)' },
  CSV:  { color: 'oklch(0.50 0.16 155)', soft: 'oklch(0.94 0.06 155)' },
  PNG:  { color: 'oklch(0.55 0.16 70)',  soft: 'oklch(0.95 0.06 70)' },
  JPG:  { color: 'oklch(0.55 0.16 70)',  soft: 'oklch(0.95 0.06 70)' },
  GIF:  { color: 'oklch(0.55 0.16 70)',  soft: 'oklch(0.95 0.06 70)' },
  ZIP:  { color: 'oklch(0.55 0.02 250)', soft: 'oklch(0.95 0.005 250)' },
  TXT:  { color: 'oklch(0.55 0.02 250)', soft: 'oklch(0.95 0.005 250)' },
};
const FV_DEFAULT_KIND_STYLE = { color: 'oklch(0.55 0.02 250)', soft: 'oklch(0.95 0.005 250)' };

function kindOf(filename) {
  const ext = (filename.split('.').pop() || '').toUpperCase();
  return ext;
}
function kindFilterOf(kind) {
  if (['PDF'].includes(kind)) return 'pdf';
  if (['DOC', 'DOCX', 'TXT', 'RTF', 'ODT'].includes(kind)) return 'docs';
  if (['XLS', 'XLSX', 'CSV', 'NUMBERS'].includes(kind)) return 'sheet';
  if (['PNG', 'JPG', 'JPEG', 'GIF', 'WEBP', 'SVG'].includes(kind)) return 'img';
  return 'other';
}
function styleFor(kind) {
  return FV_KIND_STYLE[kind] || FV_DEFAULT_KIND_STYLE;
}

// ============================================================
// Sample data
// ============================================================
// Files uploaded directly to the project. `source: null` means project-level.
// `source: { task, taskId }` indicates the file was attached via a task.
const FV_FILES = [
  { id: 1, name: 'files.zip',
    size: '14.0 kB', date: '13/05/2026',
    who: { name: 'Ana Monteiro', initials: 'AM', color: '#c47a4a' },
    source: null,
  },
  { id: 2, name: '20260504_Runbook_instalacao_Interactive_Applications_EnterpriseManager_TICKET-339625.docx',
    size: '640.9 kB', date: '13/05/2026',
    who: { name: 'Ana Monteiro', initials: 'AM', color: '#c47a4a' },
    source: null,
  },
  { id: 3, name: '2025_Condicoes_Gerais_Bomb32_vPT_signed.pdf',
    size: '506.4 kB', date: '13/05/2026',
    who: { name: 'Ana Monteiro', initials: 'AM', color: '#c47a4a' },
    source: null,
  },
  { id: 4, name: 'Contrato_ST34_Thiago_Dias_Magero_signed.pdf',
    size: '374.9 kB', date: '13/05/2026',
    who: { name: 'Ana Monteiro', initials: 'AM', color: '#c47a4a' },
    source: null,
  },
  { id: 5, name: 'design_specs_v2.pdf',
    size: '892.1 kB', date: '12/05/2026',
    who: { name: 'Thiago Mágero', initials: 'TM', color: '#e8704c' },
    source: { task: 'Nova tarefa', taskId: 't1' },
  },
  { id: 6, name: 'screenshot_homepage.png',
    size: '215.7 kB', date: '11/05/2026',
    who: { name: 'Lara Mendes', initials: 'LM', color: '#4a89c4' },
    source: { task: 'Subatividade · Nova tarefa', taskId: 't1.1' },
  },
  { id: 7, name: 'orcamento_q2_2026.xlsx',
    size: '78.4 kB', date: '10/05/2026',
    who: { name: 'Patrícia Costa', initials: 'PC', color: '#8c5cc4' },
    source: { task: 'Implementar sistema de Tags', taskId: 't3' },
  },
  { id: 8, name: 'mockup_perfil.png',
    size: '410.2 kB', date: '09/05/2026',
    who: { name: 'Rita Faria', initials: 'RF', color: '#5a9c7a' },
    source: { task: 'Onboarding · primeira sessão', taskId: 't8' },
  },
];

// Filter chip definitions
const FV_FILTERS = [
  { key: 'all',   label: 'Todos' },
  { key: 'pdf',   label: 'PDF' },
  { key: 'docs',  label: 'Documentos' },
  { key: 'sheet', label: 'Planilhas' },
  { key: 'img',   label: 'Imagens' },
  { key: 'other', label: 'Outros' },
];

// ============================================================
// Icons
// ============================================================
const FIcons = {
  paperclip: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>,
  search:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>,
  upload:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  close:     () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  sort:      () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="9" y1="18" x2="15" y2="18"/></svg>,
  db:        () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
  clock:     () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>,
  link:      () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  task:      () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  folder:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
};

// ============================================================
// Source cell
// ============================================================
function SourceCell({ source }) {
  if (!source) {
    return (
      <div className="fv-source">
        <span className="proj-badge">
          <FIcons.folder /> Projeto
        </span>
      </div>
    );
  }
  return (
    <div className="fv-source">
      <span className="task-badge" title={source.task}>
        <FIcons.task />
        <span className="nm">{source.task}</span>
      </span>
    </div>
  );
}

// ============================================================
// FilesView
// ============================================================
window.FilesView = function FilesView() {
  const { useState, useMemo } = React;

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [perPage, setPerPage] = useState(10);

  const filteredFiles = useMemo(() => {
    return FV_FILES.filter(f => {
      const kind = kindOf(f.name);
      const kf = kindFilterOf(kind);
      if (filter !== 'all' && kf !== filter) return false;
      if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [search, filter]);

  // Counts per filter chip (post-search)
  const counts = useMemo(() => {
    const base = FV_FILES.filter(f => !search || f.name.toLowerCase().includes(search.toLowerCase()));
    const out = { all: base.length, pdf: 0, docs: 0, sheet: 0, img: 0, other: 0 };
    base.forEach(f => {
      const kf = kindFilterOf(kindOf(f.name));
      out[kf] = (out[kf] || 0) + 1;
    });
    return out;
  }, [search]);

  // Recently added from tasks (top 4)
  const recentTaskFiles = useMemo(() => {
    return FV_FILES.filter(f => f.source).slice(0, 4);
  }, []);

  return (
    <div className="fv-wrap">
      {/* Top action bar — matches the unified pattern */}
      <div className="fv-actions">
        <div className="fv-filter">
          <FIcons.search />
          <input
            type="text"
            placeholder="Filtrar ficheiros…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="clear" onClick={() => setSearch('')} aria-label="Limpar">
              <FIcons.close />
            </button>
          )}
        </div>
        <div className="spacer"></div>
        <button className="send-btn">
          <FIcons.upload />
          Enviar Ficheiro
        </button>
        <button className="fv-icon-btn" title="Tela cheia">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/></svg>
        </button>
      </div>

      <div className="fv-body">
        {/* Recent task files */}
        {recentTaskFiles.length > 0 && (
          <div className="fv-section">
            <div className="fv-section-head">
              <span className="t">
                <FIcons.clock />
                Adicionados recentemente em tarefas
              </span>
              <span className="n">{recentTaskFiles.length}</span>
              <span className="grow"></span>
              <span className="link">Ver tudo →</span>
            </div>
            <div className="fv-recent-grid">
              {recentTaskFiles.map(f => {
                const kind = kindOf(f.name);
                const st = styleFor(kind);
                return (
                  <div key={f.id} className="fv-recent-card" style={{ '--fv-color': st.color, '--fv-soft': st.soft }}>
                    <div className="icn">{kind}</div>
                    <div className="body">
                      <span className="nm" title={f.name}>{f.name}</span>
                      <div className="meta">
                        <span className="task" title={f.source.task}>
                          <FIcons.link /> {f.source.task}
                        </span>
                        <span className="dot"></span>
                        <span>{f.date}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Main file table */}
        <div className="fv-section">
          <div className="fv-section-head">
            <span className="t">
              <FIcons.paperclip />
              Todos os ficheiros
            </span>
            <span className="n">{filteredFiles.length}</span>
            <span className="sub">do projeto e das tarefas</span>
          </div>

          <div className="fv-chips">
            {FV_FILTERS.map(f => (
              <span key={f.key} className={'fv-chip' + (filter === f.key ? ' active' : '')} onClick={() => setFilter(f.key)}>
                {f.label}<span className="n">{counts[f.key] || 0}</span>
              </span>
            ))}
          </div>

          <div className="fv-pp-bar">
            <span className="lbl">Por página</span>
            <span className="fv-pp-sel" onClick={() => setPerPage(p => p === 10 ? 25 : p === 25 ? 50 : 10)}>{perPage}</span>
          </div>

          <div className="fv-table">
            <div className="fv-row head">
              <span className="col">Nome <FIcons.sort /></span>
              <span className="col origem-h">Origem <FIcons.sort /></span>
              <span className="col size-h">Tamanho <FIcons.sort /></span>
              <span className="col who-h">Enviado por <FIcons.sort /></span>
              <span className="col date-h">Data <FIcons.sort /></span>
              <span></span>
            </div>
            {filteredFiles.slice(0, perPage).map(f => {
              const kind = kindOf(f.name);
              const st = styleFor(kind);
              return (
                <div key={f.id} className="fv-row" style={{ '--fv-color': st.color, '--fv-soft': st.soft }}>
                  <div className="name-cell">
                    <div className="icn">{kind}</div>
                    <span className="nm" title={f.name}>{f.name}</span>
                  </div>
                  <SourceCell source={f.source} />
                  <span className="size">{f.size}</span>
                  <span className="who who-cell">
                    <div className="avatar sm" style={{ background: f.who.color, width: 22, height: 22, fontSize: 9 }}>{f.who.initials}</div>
                    <span className="nm">{f.who.name}</span>
                  </span>
                  <span className="date">{f.date}</span>
                  <span className="more" title="Mais opções">⋮</span>
                </div>
              );
            })}
            {filteredFiles.length === 0 && (
              <div className="fv-empty">Nenhum ficheiro corresponde aos filtros.</div>
            )}
          </div>

          <div className="fv-storage">
            <div className="ico"><FIcons.db /></div>
            <div className="body">
              <div className="lbl"><b>2%</b> de 500 MB usados</div>
              <div className="bar"><div className="fill" style={{ width: '2%' }}></div></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
