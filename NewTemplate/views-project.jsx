/* eslint-disable */
// AWP — Visão geral do projecto. Reutiliza tokens (window.awpTokens) e
// estilos genéricos de home (home-card, home-tabs, home-cols, home-scroll).

const PT = window.awpTokens;

// ============================================================
// CSS específico — injetado depois de homeCss
// ============================================================
const projectCss = `

/* HERO contextual ("about") */
.po-hero { position: relative; background: ${PT.panel}; border: 1px solid ${PT.line}; border-radius: 14px; overflow: hidden; }
.po-hero .stripe { height: 5px; background: var(--p-color, ${PT.brand}); }
.po-hero .inner { padding: 18px 22px 18px; display: grid; grid-template-columns: 1fr auto; gap: 22px; align-items: flex-start; }
.po-hero .left { min-width: 0; }
.po-hero .desc { font-size: 14px; color: ${PT.ink2}; line-height: 1.5; max-width: 720px; }
.po-hero .desc b { font-weight: 600; color: ${PT.ink}; }
.po-hero .meta { margin-top: 14px; display: flex; gap: 22px; flex-wrap: wrap; }
.po-hero .meta .m { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.po-hero .meta .m .l { font-size: 10.5px; color: ${PT.mute}; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
.po-hero .meta .m .v { font-size: 13px; color: ${PT.ink}; font-weight: 500; display: flex; align-items: center; gap: 7px; }
.po-hero .meta .m .v .icon-dot { width: 8px; height: 8px; border-radius: 999px; flex: 0 0 auto; }
.po-hero .right { display: flex; gap: 8px; flex-wrap: wrap; }

/* PROGRESSO GLOBAL */
.po-progress { background: ${PT.panel}; border: 1px solid ${PT.line}; border-radius: 14px; padding: 20px 22px; display: grid; grid-template-columns: minmax(0, 1fr) 280px; gap: 26px; align-items: stretch; }
.po-progress .main { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.po-progress .nums { display: flex; gap: 36px; align-items: baseline; flex-wrap: wrap; }
.po-progress .nums .n { display: flex; flex-direction: column; gap: 2px; }
.po-progress .nums .n .l { font-size: 11px; color: ${PT.mute}; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
.po-progress .nums .n .v { font-size: 36px; font-weight: 600; line-height: 1; color: ${PT.ink}; letter-spacing: -0.8px; font-family: ${PT.mono}; }
.po-progress .nums .n .v .pct { font-size: 18px; color: ${PT.dim}; margin-left: 2px; font-weight: 500; }
.po-progress .nums .n.work .v { color: ${PT.brand}; }
.po-progress .nums .n.time .v { color: ${PT.ink2}; }
.po-progress .nums .gap { padding: 6px 11px; border-radius: 8px; background: oklch(0.95 0.08 30); color: ${PT.high}; font-size: 12px; font-weight: 600; align-self: center; display: inline-flex; align-items: center; gap: 6px; }
.po-progress .nums .gap.ok { background: oklch(0.94 0.07 155); color: oklch(0.40 0.13 155); }

.po-progress .bars { display: flex; flex-direction: column; gap: 10px; }
.po-progress .bar { display: grid; grid-template-columns: 96px 1fr 60px; align-items: center; gap: 12px; font-size: 11.5px; color: ${PT.dim}; }
.po-progress .bar .lab { font-weight: 600; color: ${PT.ink}; }
.po-progress .bar .track { position: relative; height: 10px; border-radius: 999px; background: ${PT.panel3}; overflow: hidden; }
.po-progress .bar .fill { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 999px; transition: width .4s; }
.po-progress .bar.work .fill { background: ${PT.brand}; }
.po-progress .bar.time .fill { background: linear-gradient(90deg, ${PT.dim} 0%, ${PT.dim} 95%, ${PT.ink} 100%); opacity: 0.55; }
.po-progress .bar .pct { text-align: right; font-family: ${PT.mono}; color: ${PT.ink}; font-weight: 600; font-size: 12px; }

.po-progress .milestone { background: linear-gradient(180deg, ${PT.brandSoft} 0%, ${PT.panel} 80%); border: 1px solid ${PT.brandSoft2}; border-radius: 12px; padding: 14px 16px; display: flex; flex-direction: column; gap: 4px; }
.po-progress .milestone .l { font-size: 10.5px; color: ${PT.brand}; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.po-progress .milestone .v { font-size: 16px; font-weight: 600; color: ${PT.ink}; line-height: 1.2; }
.po-progress .milestone .when { font-size: 12px; color: ${PT.dim}; margin-top: 4px; font-family: ${PT.mono}; }
.po-progress .milestone .countdown { margin-top: 8px; padding-top: 8px; border-top: 1px solid ${PT.brandSoft2}; font-size: 11px; color: ${PT.dim}; display: flex; align-items: baseline; gap: 6px; }
.po-progress .milestone .countdown .big { font-size: 24px; font-weight: 700; color: ${PT.brand}; font-family: ${PT.mono}; line-height: 1; }

/* ATALHOS para ferramentas */
.po-tools { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; }
.po-tool { background: ${PT.panel}; border: 1px solid ${PT.line}; border-radius: 12px; padding: 14px 16px; cursor: pointer; transition: transform .14s, box-shadow .14s, border-color .14s; display: flex; flex-direction: column; gap: 10px; position: relative; overflow: hidden; min-width: 0; }
.po-tool::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--tool-color); }
.po-tool:hover { transform: translateY(-2px); box-shadow: 0 10px 22px -10px rgba(20,20,40,.20); border-color: var(--tool-color); }
.po-tool .top { display: flex; align-items: center; gap: 8px; }
.po-tool .ic { width: 26px; height: 26px; border-radius: 7px; background: var(--tool-soft); color: var(--tool-color); display: flex; align-items: center; justify-content: center; flex: 0 0 auto; }
.po-tool .nm { font-size: 13.5px; font-weight: 600; color: ${PT.ink}; }
.po-tool .big { font-size: 22px; font-weight: 600; color: ${PT.ink}; line-height: 1; font-family: ${PT.mono}; letter-spacing: -0.4px; }
.po-tool .big .u { font-size: 11.5px; color: ${PT.dim}; margin-left: 4px; font-weight: 500; font-family: ${PT.font}; letter-spacing: 0; }
.po-tool .sub { font-size: 11.5px; color: ${PT.dim}; min-height: 14px; }
.po-tool .sub b { color: var(--tool-color); font-weight: 600; }

/* PULSO */
.po-pulse { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.po-pcard { background: ${PT.panel}; border: 1px solid ${PT.line}; border-radius: 12px; padding: 14px 16px; cursor: pointer; transition: border-color .14s; }
.po-pcard:hover { border-color: ${PT.brandSoft2}; }
.po-pcard .top { display: flex; align-items: center; gap: 7px; font-size: 11.5px; color: ${PT.dim}; }
.po-pcard .top .swatch { width: 8px; height: 8px; border-radius: 2px; flex: 0 0 auto; }
.po-pcard .vv { margin-top: 4px; font-size: 26px; font-weight: 600; color: ${PT.ink}; line-height: 1.05; letter-spacing: -0.5px; font-family: ${PT.mono}; }
.po-pcard .vv .u { font-size: 12px; color: ${PT.dim}; margin-left: 4px; font-weight: 500; font-family: ${PT.font}; letter-spacing: 0; }
.po-pcard .vv .frac { font-size: 14px; color: ${PT.dim}; font-weight: 500; margin-left: 4px; }
.po-pcard .delta { margin-top: 3px; font-size: 11px; color: ${PT.dim}; font-family: ${PT.mono}; }
.po-pcard .delta.up { color: ${PT.high}; }
.po-pcard .delta.dn { color: oklch(0.50 0.13 155); }
.po-pcard .delta.flat { color: ${PT.mute}; }

/* MARCOS — timeline horizontal */
.po-milestones { padding: 22px 22px 18px; overflow-x: auto; -webkit-overflow-scrolling: touch; }
.po-milestones .track { position: relative; min-width: 720px; padding: 18px 8px 64px; }
.po-milestones .line { position: absolute; top: 30px; left: 4%; right: 4%; height: 2px; background: ${PT.line}; }
.po-milestones .line .done-fill { position: absolute; left: 0; top: 0; bottom: 0; background: linear-gradient(90deg, oklch(0.65 0.16 155), ${PT.brand}); }
.po-milestones .points { position: relative; display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 8px; }
.po-milestones .ms { display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer; }
.po-milestones .ms .dot { width: 14px; height: 14px; border-radius: 999px; border: 3px solid ${PT.panel}; flex: 0 0 auto; box-shadow: 0 0 0 1px ${PT.line}; }
.po-milestones .ms.done .dot { background: oklch(0.55 0.14 155); box-shadow: 0 0 0 1px oklch(0.55 0.14 155); }
.po-milestones .ms.fail .dot { background: ${PT.high}; box-shadow: 0 0 0 1px ${PT.high}; }
.po-milestones .ms.now .dot { background: ${PT.brand}; box-shadow: 0 0 0 1px ${PT.brand}, 0 0 0 7px ${PT.brandSoft}; animation: po-pulse 1.8s ease-in-out infinite; }
.po-milestones .ms.future .dot { background: ${PT.panel}; }
@keyframes po-pulse { 0%, 100% { box-shadow: 0 0 0 1px ${PT.brand}, 0 0 0 6px ${PT.brandSoft}; } 50% { box-shadow: 0 0 0 1px ${PT.brand}, 0 0 0 11px transparent; } }
.po-milestones .ms .date { font-size: 11px; color: ${PT.dim}; font-family: ${PT.mono}; }
.po-milestones .ms .name { font-size: 12px; color: ${PT.ink}; font-weight: 500; text-align: center; max-width: 130px; line-height: 1.3; }
.po-milestones .ms.now .name { color: ${PT.brand}; font-weight: 600; }
.po-milestones .ms.fail .name { color: ${PT.high}; }
.po-milestones .ms.done .name { color: ${PT.ink2}; }

/* Próximas entregas list */
.po-due { padding: 10px 4px 10px; display: grid; grid-template-columns: 1fr auto auto auto; gap: 12px; align-items: center; border-bottom: 1px solid ${PT.lineSoft}; cursor: pointer; }
.po-due:last-child { border-bottom: none; }
.po-due:hover { background: ${PT.panel2}; margin: 0 -8px; padding-left: 12px; padding-right: 12px; border-radius: 6px; border-bottom-color: transparent; }
.po-due .body { min-width: 0; }
.po-due .body .t { font-size: 13.5px; color: ${PT.ink}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.po-due .body .meta { margin-top: 3px; font-size: 11.5px; color: ${PT.dim}; display: inline-flex; gap: 7px; align-items: center; }
.po-due .due-when { font-size: 12px; font-family: ${PT.mono}; color: ${PT.dim}; flex: 0 0 auto; }
.po-due .due-when.late { color: ${PT.high}; font-weight: 600; }
.po-due .stat { font-size: 10.5px; padding: 2px 8px; border-radius: 5px; font-weight: 600; flex: 0 0 auto; }

/* Conversas em destaque */
.po-conv { padding: 12px 4px; border-bottom: 1px solid ${PT.lineSoft}; cursor: pointer; }
.po-conv:last-child { border-bottom: none; }
.po-conv:hover { background: ${PT.panel2}; margin: 0 -8px; padding-left: 12px; padding-right: 12px; border-radius: 6px; border-bottom-color: transparent; }
.po-conv .head { display: flex; align-items: center; gap: 10px; }
.po-conv .head .who { font-size: 12.5px; color: ${PT.ink2}; }
.po-conv .head .who b { color: ${PT.ink}; font-weight: 600; }
.po-conv .head .replies { margin-left: auto; font-size: 11px; color: ${PT.brand}; font-weight: 600; padding: 2px 8px; border-radius: 999px; background: ${PT.brandSoft}; }
.po-conv .task { margin-top: 6px; font-size: 11px; color: ${PT.dim}; display: inline-flex; align-items: center; gap: 6px; }
.po-conv .task .dot { width: 6px; height: 6px; border-radius: 999px; background: ${PT.brand}; }
.po-conv .body { margin-top: 4px; font-size: 13px; color: ${PT.ink2}; line-height: 1.45; padding: 6px 10px; background: ${PT.panel2}; border-radius: 8px; border-left: 2px solid ${PT.line}; }
.po-conv .foot { margin-top: 4px; font-size: 10.5px; color: ${PT.mute}; font-family: ${PT.mono}; }

/* Equipa */
.po-team { display: flex; flex-direction: column; gap: 0; }
.po-team-row { display: flex; align-items: center; gap: 10px; padding: 9px 4px; border-bottom: 1px solid ${PT.lineSoft}; }
.po-team-row:last-child { border-bottom: none; }
.po-team-row .body { flex: 1; min-width: 0; }
.po-team-row .nm { font-size: 13px; color: ${PT.ink}; font-weight: 500; display: flex; align-items: center; gap: 7px; }
.po-team-row .role-pill { font-size: 9.5px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; padding: 1px 6px; border-radius: 3px; }
.po-team-row .role-pill.own { background: ${PT.brandSoft}; color: ${PT.brand}; }
.po-team-row .role-pill.contrib { background: ${PT.panel2}; color: ${PT.dim}; }
.po-team-row .role-pill.ext { background: oklch(0.94 0.07 30); color: ${PT.high}; }
.po-team-row .sub { font-size: 11px; color: ${PT.dim}; margin-top: 1px; }
.po-team-row .act { width: 8px; height: 8px; border-radius: 999px; flex: 0 0 auto; }
.po-team-row .act.now { background: oklch(0.55 0.14 155); box-shadow: 0 0 0 3px oklch(0.94 0.08 155); }
.po-team-row .act.recent { background: ${PT.med}; }
.po-team-row .act.idle { background: ${PT.panel3}; }
.po-invite-pending { margin-top: 8px; padding: 9px 12px; background: ${PT.panel2}; border: 1px dashed ${PT.line}; border-radius: 8px; font-size: 12px; color: ${PT.dim}; display: flex; align-items: center; gap: 8px; }
.po-invite-pending b { color: ${PT.ink}; font-weight: 600; }

/* Ficheiros */
.po-file { display: flex; align-items: center; gap: 10px; padding: 9px 4px; border-bottom: 1px solid ${PT.lineSoft}; cursor: pointer; }
.po-file:last-child { border-bottom: none; }
.po-file:hover { background: ${PT.panel2}; margin: 0 -8px; padding-left: 12px; padding-right: 12px; border-radius: 6px; border-bottom-color: transparent; }
.po-file .icn { width: 28px; height: 28px; border-radius: 6px; background: var(--ft-soft); color: var(--ft-color); display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; font-family: ${PT.mono}; flex: 0 0 auto; }
.po-file .nm { flex: 1; min-width: 0; font-size: 13px; color: ${PT.ink}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.po-file .meta { font-size: 10.5px; color: ${PT.dim}; font-family: ${PT.mono}; text-align: right; line-height: 1.3; flex: 0 0 auto; }
.po-file .safe { width: 7px; height: 7px; border-radius: 999px; flex: 0 0 auto; }
.po-file .safe.ok { background: oklch(0.60 0.14 155); }
.po-file .safe.pending { background: ${PT.med}; }

/* Calendários */
.po-cal { background: ${PT.panel2}; border-radius: 10px; padding: 12px 14px; display: flex; flex-direction: column; gap: 8px; }
.po-cal .row { display: flex; align-items: center; gap: 10px; font-size: 12.5px; color: ${PT.ink2}; }
.po-cal .row .l { color: ${PT.mute}; font-size: 10.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; min-width: 80px; }
.po-cal .row b { font-weight: 600; color: ${PT.ink}; }
.po-cal .row .pill { font-family: ${PT.mono}; font-size: 11px; padding: 1px 7px; background: ${PT.panel}; border: 1px solid ${PT.line}; border-radius: 4px; }
.po-cal .holiday { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: ${PT.dim}; }
.po-cal .holiday .d { font-family: ${PT.mono}; color: ${PT.high}; font-weight: 600; }

/* Notas do projecto — wiki-light */
.po-notes { background: ${PT.panel}; border: 1px solid ${PT.line}; border-radius: 12px; }
.po-notes .head { padding: 12px 16px; border-bottom: 1px solid ${PT.line}; display: flex; align-items: center; gap: 10px; }
.po-notes .head .t { font-size: 13px; font-weight: 600; color: ${PT.ink}; display: inline-flex; gap: 8px; align-items: center; }
.po-notes .head .ed { margin-left: auto; font-size: 11.5px; color: ${PT.brand}; cursor: pointer; }
.po-notes .body { padding: 14px 16px; font-size: 13px; color: ${PT.ink2}; line-height: 1.6; outline: none; }
.po-notes .body h4 { margin: 14px 0 6px; font-size: 12px; color: ${PT.ink}; font-weight: 600; letter-spacing: 0.02em; text-transform: uppercase; }
.po-notes .body h4:first-child { margin-top: 0; }
.po-notes .body ul { margin: 6px 0; padding-left: 18px; }
.po-notes .body li { margin: 3px 0; }
.po-notes .body a { color: ${PT.brand}; text-decoration: none; }

/* Atividade compacta — reutiliza .ra de homeCss para consistência */

/* =========================================================
   RESPONSIVE
   ========================================================= */
@media (max-width: 1100px) {
  .po-tools { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .po-pulse { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .po-progress { grid-template-columns: 1fr; }
  .po-progress .milestone { max-width: 360px; }
}
@media (max-width: 1024px) {
  .po-hero .inner { grid-template-columns: 1fr; }
  .po-hero .right { width: 100%; }
}
@media (max-width: 768px) {
  .po-tools { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .po-progress { padding: 16px; gap: 16px; }
  .po-progress .nums { gap: 22px; }
  .po-progress .nums .n .v { font-size: 30px; }
  .po-progress .bar { grid-template-columns: 64px 1fr 48px; gap: 8px; }
  .po-hero .inner { padding: 14px 16px; }
  .po-hero .right { flex-wrap: wrap; }
  .po-due { grid-template-columns: 1fr auto; row-gap: 4px; }
  .po-due .due-when { grid-column: 2; }
  .po-due .stat { grid-column: 1 / -1; justify-self: start; }
}
@media (max-width: 480px) {
  .po-tools { grid-template-columns: 1fr; }
  .po-pulse { grid-template-columns: 1fr 1fr; }
}

/* =========================================================
   DARK MODE TWEAKS
   ========================================================= */
[data-theme="dark"] .po-progress .nums .gap     { background: oklch(0.30 0.12 25);  color: oklch(0.90 0.13 25); }
[data-theme="dark"] .po-progress .nums .gap.ok  { background: oklch(0.30 0.12 155); color: oklch(0.90 0.12 155); }
[data-theme="dark"] .po-team-row .act.now       { background: oklch(0.68 0.16 155); box-shadow: 0 0 0 3px oklch(0.55 0.14 155 / 0.30); }
[data-theme="dark"] .po-team-row .role-pill.ext { background: oklch(0.32 0.14 30);  color: oklch(0.92 0.12 30); }
[data-theme="dark"] .po-milestones .ms.done .dot { background: oklch(0.68 0.16 155); box-shadow: 0 0 0 1px oklch(0.68 0.16 155); }
[data-theme="dark"] .po-cal .holiday .d         { color: var(--pri-high); }
[data-theme="dark"] .po-file .icn               { filter: brightness(1.15) saturate(0.9); }
[data-theme="dark"] .po-tool .ic                { filter: brightness(1.1) saturate(0.95); }
`;

window.projectCss = projectCss;

// ============================================================
// Data — Awesome Project App
// ============================================================
const poProject = {
  name: 'Awesome Project App',
  color: PT.brand,
  description: 'Plataforma colaborativa de gestão de projectos — concorrente directa de Asana e Monday, focada em equipas pequenas/médias com necessidade de timesheet integrado.',
  status: { key: 'risk', label: 'Em risco', color: PT.med },
  start: '1 abr 2026',
  end: '14 jun 2026',
  owner: { name: 'Thiago Mágero', initials: 'TM', color: '#e8704c' },
  manager: { name: 'Lara Mendes', initials: 'LM', color: '#4a89c4' },
};

const poProgress = {
  workPct: 42,
  timePct: 67,
  nextMilestone: { name: 'Beta interno', date: '25 mai 2026', daysLeft: 11 },
};

const poTools = [
  { key: 'list',     name: 'Planeamento', color: PT.brand, soft: PT.brandSoft, big: 28, unit: 'tarefas', sub: <><b>3</b> a começar hoje</>, icon:
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> },
  { key: 'timeline', name: 'Gantt', color: 'oklch(0.62 0.15 295)', soft: 'oklch(0.94 0.05 295)', big: 6, unit: 'marcos', sub: <><b>1</b> esta semana</>, icon:
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="14" height="3" rx="1"/><rect x="7" y="11" width="14" height="3" rx="1"/><rect x="5" y="16" width="10" height="3" rx="1"/></svg> },
  { key: 'board',    name: 'Quadro', color: 'oklch(0.60 0.15 155)', soft: 'oklch(0.94 0.06 155)', big: 7, unit: 'em curso', sub: <>fluxo Kanban</>, icon:
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="10" rx="1"/><rect x="17" y="4" width="4" height="14" rx="1"/></svg> },
  { key: 'calendar', name: 'Calendário', color: 'oklch(0.66 0.16 70)', soft: 'oklch(0.95 0.06 70)', big: 5, unit: 'eventos', sub: <>esta semana</>, icon:
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
  { key: 'files',    name: 'Timesheet', color: 'oklch(0.60 0.16 25)', soft: 'oklch(0.95 0.06 25)', big: 8, unit: 'horas', sub: <><b>por submeter</b></>, icon:
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg> },
];

const poPulse = [
  { label: 'Em curso',       value: 7,   delta: '+1 vs sem. passada', deltaTone: 'up',   swatch: PT.doing },
  { label: 'Concluídas',     value: 12,  delta: '+3 esta semana',     deltaTone: 'dn',   swatch: PT.done },
  { label: 'Em atraso',      value: 2,   delta: '⚠ requer revisão',  deltaTone: 'up',   swatch: PT.high },
  { label: 'Por iniciar',    value: 5,   delta: 'sem alteração',     deltaTone: 'flat', swatch: PT.todo },
  { label: 'Horas / semana', value: 86,  unit: 'h', frac: '/ 120h est.', delta: '72% do estimado', deltaTone: 'flat', swatch: PT.brand },
  { label: 'Marcos cumpridos', value: 3, frac: '/ 6', delta: '1 falhou', deltaTone: 'up',  swatch: 'oklch(0.55 0.14 155)' },
  { label: 'Ficheiros novos', value: 4,  delta: 'esta semana',        deltaTone: 'flat', swatch: 'oklch(0.62 0.13 220)' },
  { label: 'Conversas activas', value: 6, delta: '3 mencionam-no',    deltaTone: 'flat', swatch: 'oklch(0.62 0.16 295)' },
];

const poMilestones = [
  { date: '1 abr',  name: 'Kickoff',           state: 'done' },
  { date: '22 abr', name: 'Specs aprovadas',   state: 'done' },
  { date: '6 mai',  name: 'Refactor BD',       state: 'fail' },
  { date: '16 mai', name: 'Sistema de Tags',   state: 'now' },
  { date: '25 mai', name: 'Beta interno',      state: 'future' },
  { date: '8 jun',  name: 'Beta público',      state: 'future' },
  { date: '14 jun', name: 'Launch',            state: 'future' },
];

const poUpcomingTasks = [
  { id: 1, t: 'Editor rich text Tiptap — finalizar', when: 'Hoje · 18:00', late: false, status: 'doing',  who: { i: 'TM', c: '#e8704c' } },
  { id: 2, t: 'Sistema de Tags — review final',     when: '16 mai',        late: false, status: 'review', who: { i: 'LM', c: '#4a89c4' } },
  { id: 3, t: 'Bug — Salvar sem data de início',    when: '9 mai',         late: true,  status: 'doing',  who: { i: 'JR', c: '#d97a86' } },
  { id: 4, t: 'Documentar API de tags',             when: '12 mai',        late: true,  status: 'todo',   who: { i: 'PC', c: '#8c5cc4' } },
  { id: 5, t: 'Onboarding · primeira sessão',       when: '18 mai',        late: false, status: 'todo',   who: { i: 'RF', c: '#5a9c7a' } },
];

const poConversations = [
  { who: 'Lara Mendes', initials: 'LM', color: '#4a89c4', task: 'Sistema de Tags',
    body: 'Achas que faz sentido usar enum em vez de string livre? Limitaria a M11 categorias mas dava-nos validação grátis.',
    replies: 4, when: 'há 12 min' },
  { who: 'João Ribeiro', initials: 'JR', color: '#d97a86', task: 'Mudar path S3',
    body: 'A migração ficou completa. Vou correr os smoke tests amanhã de manhã.',
    replies: 2, when: 'há 2 h' },
  { who: 'Patrícia Costa', initials: 'PC', color: '#8c5cc4', task: 'Onboarding · primeira sessão',
    body: 'Reparei que o passo 3 está demasiado denso. Posso propor uma versão alternativa em duas etapas?',
    replies: 7, when: 'ontem' },
];

const poTeam = [
  { name: 'Thiago Mágero', initials: 'TM', color: '#e8704c', role: 'own',     fn: 'Tech Lead / Founder', activity: 'now',    sub: 'Activo agora · 8h hoje' },
  { name: 'Lara Mendes',   initials: 'LM', color: '#4a89c4', role: 'contrib', fn: 'Frontend Developer',  activity: 'now',    sub: '6.5h hoje · submeteu ontem' },
  { name: 'João Ribeiro',  initials: 'JR', color: '#d97a86', role: 'contrib', fn: 'Backend Developer',   activity: 'recent', sub: '4h ontem · sem actividade hoje' },
  { name: 'Patrícia Costa',initials: 'PC', color: '#8c5cc4', role: 'contrib', fn: 'QA Engineer',         activity: 'now',    sub: 'Submeteu timesheet · 8h hoje' },
  { name: 'Rita Faria',    initials: 'RF', color: '#5a9c7a', role: 'contrib', fn: 'Product Designer',    activity: 'idle',   sub: 'Sem actividade há 2 dias' },
  { name: 'Pedro Silva',   initials: 'PS', color: '#c47a4a', role: 'ext',     fn: 'DevOps · Contractor', activity: 'idle',   sub: 'Externo · sem actividade há 5 dias' },
];

const poFiles = [
  { name: 'spec-sistema-tags-v3.pdf',    who: 'Lara Mendes',    when: 'há 4 h',  size: '1.2 MB', kind: 'PDF', col: 'oklch(0.55 0.18 25)', soft: 'oklch(0.95 0.06 25)', safe: 'ok' },
  { name: 'wireframes-onboarding.fig',   who: 'Rita Faria',     when: 'ontem',   size: '4.8 MB', kind: 'FIG', col: 'oklch(0.60 0.16 295)', soft: 'oklch(0.95 0.05 295)', safe: 'ok' },
  { name: 'api-tags-schema.json',        who: 'João Ribeiro',   when: '2 mai',   size: '12 KB',  kind: 'JSON', col: 'oklch(0.55 0.14 130)', soft: 'oklch(0.94 0.07 130)', safe: 'ok' },
  { name: 'demo-beta-recording.mov',     who: 'Thiago Mágero',  when: '1 mai',   size: '74 MB',  kind: 'MOV', col: 'oklch(0.58 0.16 220)', soft: 'oklch(0.94 0.06 220)', safe: 'pending' },
  { name: 'briefing-cliente-rev2.docx',  who: 'Lara Mendes',    when: '28 abr',  size: '380 KB', kind: 'DOC', col: 'oklch(0.55 0.16 264)', soft: 'oklch(0.94 0.06 264)', safe: 'ok' },
];

const poActivity = [
  { ico: '✓', body: <span><b>Lara Mendes</b> concluiu <b>Refactor de queries</b></span>, time: 'há 14 min' },
  { ico: '✎', body: <span><b>Patrícia Costa</b> comentou em <b>Onboarding</b></span>, time: 'há 1 h' },
  { ico: '+', body: <span><b>Thiago Mágero</b> criou <b>Mover bucket S3</b></span>, time: 'há 3 h' },
  { ico: '⇪', body: <span><b>Rita Faria</b> carregou <b>wireframes-onboarding.fig</b></span>, time: 'ontem' },
  { ico: '⇄', body: <span>Estado de <b>PR #482</b> mudou para Em revisão</span>, time: 'ontem' },
  { ico: '⏱', body: <span><b>João Ribeiro</b> submeteu 32h da semana 19</span>, time: '2 dias atrás' },
  { ico: '👥', body: <span><b>Pedro Silva</b> foi adicionado como contractor</span>, time: '5 dias atrás' },
];

// ============================================================
// Componente
// ============================================================

function ProjectOverview({ setView }) {
  const sm = window.awpStatusMeta || {
    doing:  { label: 'Em curso', color: PT.doing,  ink: PT.doingInk },
    todo:   { label: 'A fazer',  color: PT.todo,   ink: PT.todoInk },
    review: { label: 'Revisão',  color: PT.review, ink: PT.reviewInk },
    done:   { label: 'Feito',    color: PT.done,   ink: PT.doneInk },
  };
  const workGap = poProgress.timePct - poProgress.workPct;

  return (
    <div className="home-scroll">
      <div className="home-wrap" style={{ '--p-color': poProject.color }}>

        {/* HERO contextual */}
        <div className="po-hero">
          <div className="stripe"></div>
          <div className="inner">
            <div className="left">
              <div className="desc">
                <b>Plataforma colaborativa</b> de gestão de projectos — concorrente directa de Asana e Monday, focada em equipas pequenas/médias com necessidade de timesheet integrado. Beta interno previsto para <b>25 mai</b>, launch público <b>14 jun</b>.
              </div>
              <div className="meta">
                <div className="m">
                  <span className="l">Início</span>
                  <span className="v">{poProject.start}</span>
                </div>
                <div className="m">
                  <span className="l">Fim previsto</span>
                  <span className="v">{poProject.end}</span>
                </div>
                <div className="m">
                  <span className="l">Owner</span>
                  <span className="v">
                    <div className="avatar sm" style={{ background: poProject.owner.color }}>{poProject.owner.initials}</div>
                    {poProject.owner.name}
                  </span>
                </div>
                <div className="m">
                  <span className="l">Gestor</span>
                  <span className="v">
                    <div className="avatar sm" style={{ background: poProject.manager.color }}>{poProject.manager.initials}</div>
                    {poProject.manager.name}
                  </span>
                </div>
              </div>
            </div>
            <div className="right">
              <button className="btn-ghost">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
                Editar
              </button>
              <button className="btn-ghost" onClick={() => window.__openInvite && window.__openInvite('awp')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                Convidar
              </button>
              <button className="btn-ghost" onClick={() => window.__openPermissions && window.__openPermissions()}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Permissões
              </button>
              <button className="btn-ghost">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
                Arquivar
              </button>
            </div>
          </div>
        </div>

        {/* PROGRESSO GLOBAL */}
        <div className="po-progress">
          <div className="main">
            <div className="nums">
              <div className="n work">
                <span className="l">Trabalho concluído</span>
                <span className="v">{poProgress.workPct}<span className="pct">%</span></span>
              </div>
              <div className="n time">
                <span className="l">Tempo decorrido</span>
                <span className="v">{poProgress.timePct}<span className="pct">%</span></span>
              </div>
              <div className={'gap' + (workGap <= 5 ? ' ok' : '')}>
                {workGap > 5 ? '⚠ ' : '✓ '}
                {workGap > 5
                  ? `Trabalho ${workGap} pp atrás do tempo`
                  : `Trabalho alinhado com tempo`}
              </div>
            </div>
            <div className="bars">
              <div className="bar work">
                <span className="lab">Trabalho</span>
                <div className="track"><div className="fill" style={{ width: `${poProgress.workPct}%` }}></div></div>
                <span className="pct">{poProgress.workPct}%</span>
              </div>
              <div className="bar time">
                <span className="lab">Tempo</span>
                <div className="track"><div className="fill" style={{ width: `${poProgress.timePct}%` }}></div></div>
                <span className="pct">{poProgress.timePct}%</span>
              </div>
            </div>
          </div>
          <div className="milestone">
            <span className="l">Próximo marco</span>
            <span className="v">{poProgress.nextMilestone.name}</span>
            <span className="when">{poProgress.nextMilestone.date}</span>
            <div className="countdown">
              <span className="big">{poProgress.nextMilestone.daysLeft}</span>
              <span>dias úteis restantes</span>
            </div>
          </div>
        </div>

        {/* ATALHOS para ferramentas */}
        <div>
          <div className="home-card-head" style={{ paddingBottom: 8 }}>
            <div className="title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
              Ferramentas
            </div>
          </div>
          <div className="po-tools">
            {poTools.map(t => (
              <div key={t.key} className="po-tool"
                style={{ '--tool-color': t.color, '--tool-soft': t.soft }}
                onClick={() => setView && setView(t.key)}>
                <div className="top">
                  <div className="ic">{t.icon}</div>
                  <span className="nm">{t.name}</span>
                </div>
                <div className="big">{t.big}<span className="u">{t.unit}</span></div>
                <div className="sub">{t.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* PULSO */}
        <div>
          <div className="home-card-head" style={{ paddingBottom: 8 }}>
            <div className="title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              Pulso do projecto
            </div>
            <span className="action">Relatórios</span>
          </div>
          <div className="po-pulse">
            {poPulse.map((p, i) => (
              <div key={i} className="po-pcard">
                <div className="top">
                  <span className="swatch" style={{ background: p.swatch }}></span>
                  <span>{p.label}</span>
                </div>
                <div className="vv">
                  {p.value}
                  {p.unit && <span className="u">{p.unit}</span>}
                  {p.frac && <span className="frac">{p.frac}</span>}
                </div>
                <div className={'delta ' + (p.deltaTone || 'flat')}>{p.delta}</div>
              </div>
            ))}
          </div>
        </div>

        {/* MARCOS — timeline */}
        <div className="home-card" style={{ padding: 0 }}>
          <div className="home-card-head" style={{ padding: '14px 18px 0' }}>
            <div className="title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
              Marcos e fases
            </div>
            <span className="count">{poMilestones.length}</span>
            <span className="action" onClick={() => setView && setView('timeline')}>Abrir no Gantt →</span>
          </div>
          <div className="po-milestones">
            <div className="track">
              <div className="line">
                <div className="done-fill" style={{ width: `${(3 / (poMilestones.length - 1)) * 100}%` }}></div>
              </div>
              <div className="points">
                {poMilestones.map((m, i) => (
                  <div key={i} className={'ms ' + m.state}>
                    <span className="date">{m.date}</span>
                    <span className="dot"></span>
                    <span className="name">{m.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* TWO-COLUMN: detail */}
        <div className="home-cols">
          {/* MAIN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Próximas entregas */}
            <div className="home-card">
              <div className="home-card-head">
                <div className="title">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/></svg>
                  Próximas entregas
                </div>
                <span className="count">{poUpcomingTasks.length}</span>
                <span className="action" onClick={() => setView && setView('list')}>Ver na lista</span>
              </div>
              <div>
                {poUpcomingTasks.map(r => {
                  const st = sm[r.status];
                  return (
                    <div key={r.id} className="po-due">
                      <div className="body">
                        <div className="t">{r.t}</div>
                        <div className="meta">
                          <div className="avatar sm" style={{ background: r.who.c, width: 18, height: 18, fontSize: 9 }}>{r.who.i}</div>
                          <span>{r.late ? 'Em atraso' : 'A vencer'}</span>
                        </div>
                      </div>
                      <span className={'due-when' + (r.late ? ' late' : '')}>{r.when}</span>
                      <span className="stat" style={{ background: st.color, color: st.ink }}>{st.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Conversas em destaque */}
            <div className="home-card">
              <div className="home-card-head">
                <div className="title">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  Conversas em destaque
                </div>
                <span className="action">Caixa de entrada</span>
              </div>
              <div>
                {poConversations.map((c, i) => (
                  <div key={i} className="po-conv">
                    <div className="head">
                      <div className="avatar sm" style={{ background: c.color }}>{c.initials}</div>
                      <span className="who"><b>{c.who}</b> em <b>{c.task}</b></span>
                      <span className="replies">{c.replies} resp.</span>
                    </div>
                    <div className="body">{c.body}</div>
                    <div className="foot">{c.when}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actividade */}
            <div className="home-card">
              <div className="home-card-head">
                <div className="title">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/></svg>
                  Actividade do projecto
                </div>
                <span className="action">Histórico completo</span>
              </div>
              <div>
                {poActivity.map((a, i) => (
                  <div key={i} className="ra">
                    <div className="ico">{a.ico}</div>
                    <div className="body">{a.body}</div>
                    <span className="time">{a.time}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* SIDE */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Equipa */}
            <div className="home-card">
              <div className="home-card-head">
                <div className="title">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg>
                  Equipa do projecto
                </div>
                <span className="count">{poTeam.length}</span>
              </div>
              <div className="po-team">
                {poTeam.map((m, i) => (
                  <div key={i} className="po-team-row">
                    <div className="avatar sm" style={{ background: m.color }}>{m.initials}</div>
                    <div className="body">
                      <div className="nm">
                        {m.name}
                        <span className={'role-pill ' + m.role}>
                          {m.role === 'own' ? 'Owner' : m.role === 'ext' ? 'Externo' : 'Member'}
                        </span>
                      </div>
                      <div className="sub">{m.fn} · {m.sub}</div>
                    </div>
                    <span className={'act ' + m.activity}></span>
                  </div>
                ))}
              </div>
              <div className="po-invite-pending">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span><b>2 convites pendentes</b> · à espera de aceitação</span>
              </div>
            </div>

            {/* Ficheiros recentes */}
            <div className="home-card">
              <div className="home-card-head">
                <div className="title">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  Ficheiros recentes
                </div>
                <span className="action">Ver todos</span>
              </div>
              <div>
                {poFiles.map((f, i) => (
                  <div key={i} className="po-file" style={{ '--ft-color': f.col, '--ft-soft': f.soft }}>
                    <div className="icn">{f.kind}</div>
                    <span className="nm">{f.name}</span>
                    <span className="meta">{f.who}<br/>{f.when} · {f.size}</span>
                    <span className={'safe ' + f.safe} title={f.safe === 'ok' ? 'Verificado' : 'A verificar'}></span>
                  </div>
                ))}
              </div>
            </div>

            {/* Calendários e feriados */}
            <div className="home-card">
              <div className="home-card-head">
                <div className="title">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  Calendários
                </div>
                <span className="action">Definições</span>
              </div>
              <div className="po-cal">
                <div className="row">
                  <span className="l">Calendário</span>
                  <span><b>Portugal · Lisboa</b></span>
                </div>
                <div className="row">
                  <span className="l">Horário</span>
                  <span className="pill">09:00 — 18:00</span>
                </div>
                <div className="row">
                  <span className="l">Fuso</span>
                  <span className="pill">UTC+1</span>
                </div>
                <div style={{ height: 1, background: PT.line, margin: '4px 0' }}></div>
                <div className="row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
                  <span className="l">Próximos feriados</span>
                  <div className="holiday"><span className="d">10 jun</span><span>· Dia de Portugal</span></div>
                  <div className="holiday"><span className="d">13 jun</span><span>· Santo António (Lisboa)</span></div>
                </div>
              </div>
            </div>

            {/* Notas do projecto */}
            <div className="po-notes">
              <div className="head">
                <span className="t">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
                  Notas do projecto
                </span>
                <span className="ed">Editar</span>
              </div>
              <div className="body">
                <h4>Objectivo</h4>
                <ul>
                  <li>Lançar uma alternativa portuguesa, mais leve, ao Asana/Monday.</li>
                  <li>Foco em equipas até 30 pessoas com necessidade de timesheet.</li>
                </ul>
                <h4>Decisões recentes</h4>
                <ul>
                  <li><b>12 mai</b> · Adoptar Tiptap para o editor rich text (decisão da Lara + Thiago).</li>
                  <li><b>6 mai</b> · Adiar feature de Goals para depois do beta público.</li>
                  <li><b>28 abr</b> · Mover armazenamento para S3 região eu-west.</li>
                </ul>
                <h4>Contactos do cliente</h4>
                <ul>
                  <li>Ana Vieira · Product Manager · <a>ana.vieira@cliente.pt</a></li>
                  <li>Bruno Lima · Stakeholder · <a>bruno@cliente.pt</a></li>
                </ul>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

Object.assign(window, { ProjectOverview, projectCss });
