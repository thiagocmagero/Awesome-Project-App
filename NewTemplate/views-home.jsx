/* eslint-disable */
// AWP — Páginas iniciais. Lê tokens via window.awpTokens (definido em app-dark.jsx).

const HT = window.awpTokens;

// ============================================================
// CSS — injetado a seguir ao awpCss
// ============================================================
const homeCss = `
.home-scroll { flex: 1; overflow-y: auto; background: ${HT.bg}; min-width: 0; }
.home-wrap { max-width: 1400px; margin: 0 auto; padding: 24px 28px 48px; display: flex; flex-direction: column; gap: 20px; }

/* Greeting */
.home-greeting { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; padding: 6px 2px 0; }
.home-greeting h1 { margin: 0; font-size: 30px; font-weight: 600; letter-spacing: -0.6px; color: ${HT.ink}; line-height: 1.1; }
.home-greeting h1 .name { color: ${HT.brand}; }
.home-greeting .sub { margin-top: 6px; font-size: 13px; color: ${HT.dim}; }
.home-greeting .chip { font-family: ${HT.mono}; font-size: 12px; color: ${HT.dim}; padding: 6px 11px; background: ${HT.panel}; border: 1px solid ${HT.line}; border-radius: 999px; display: inline-flex; align-items: center; gap: 8px; }
.home-greeting .chip .dot { width: 6px; height: 6px; border-radius: 999px; background: ${HT.brand}; box-shadow: 0 0 0 3px ${HT.brandSoft}; }

/* Attention strip */
.home-attention { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.attn-card { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-radius: 12px; background: ${HT.panel}; border: 1px solid ${HT.line}; cursor: pointer; transition: transform .14s, box-shadow .14s, border-color .14s; }
.attn-card:hover { transform: translateY(-1px); box-shadow: 0 6px 16px -8px rgba(20,20,40,.18); border-color: ${HT.brandSoft2}; }
.attn-card .ico { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex: 0 0 auto; }
.attn-card .body { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.attn-card .label { font-size: 12px; color: ${HT.dim}; letter-spacing: 0.02em; }
.attn-card .value { font-size: 17px; font-weight: 600; color: ${HT.ink}; margin-top: 2px; line-height: 1.1; }
.attn-card .arrow { color: ${HT.mute}; font-size: 14px; }
.attn-card:hover .arrow { color: ${HT.brand}; }
.attn-blue .ico { background: ${HT.brandSoft}; color: ${HT.brand}; }
.attn-amber .ico { background: oklch(0.94 0.08 70); color: oklch(0.45 0.12 60); }
.attn-green .ico { background: oklch(0.93 0.09 155); color: oklch(0.40 0.13 155); }
.attn-violet .ico { background: oklch(0.94 0.08 295); color: oklch(0.42 0.14 295); }

/* Two-column home grid */
.home-cols { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 20px; align-items: start; }

/* Generic card */
.home-card { background: ${HT.panel}; border: 1px solid ${HT.line}; border-radius: 12px; padding: 18px 20px; }
.home-card-head { display: flex; align-items: center; gap: 10px; padding-bottom: 12px; }
.home-card-head .title { font-size: 14px; font-weight: 600; color: ${HT.ink}; display: inline-flex; align-items: center; gap: 8px; }
.home-card-head .count { font-family: ${HT.mono}; font-size: 11px; color: ${HT.mute}; background: ${HT.panel2}; padding: 1px 7px; border-radius: 999px; }
.home-card-head .action { margin-left: auto; font-size: 12px; color: ${HT.brand}; cursor: pointer; font-weight: 500; }
.home-card-head .action:hover { text-decoration: underline; }

/* Section tabs inside a card */
.home-tabs { display: flex; gap: 4px; padding: 3px; background: ${HT.panel2}; border-radius: 8px; margin-bottom: 12px; flex-wrap: wrap; }
.home-tabs .t { padding: 6px 11px; font-size: 12px; color: ${HT.dim}; cursor: pointer; border-radius: 6px; display: inline-flex; align-items: center; gap: 6px; }
.home-tabs .t:hover { color: ${HT.ink}; }
.home-tabs .t.active { background: ${HT.panel}; color: ${HT.ink}; font-weight: 600; box-shadow: 0 1px 2px rgba(0,0,0,.06), 0 0 0 1px ${HT.line}; }
.home-tabs .t .n { font-family: ${HT.mono}; font-size: 10px; color: ${HT.mute}; padding: 0 5px; border-radius: 999px; background: ${HT.panel3}; }
.home-tabs .t.active .n { background: ${HT.brandSoft}; color: ${HT.brand}; }

/* Task row */
.task-row { display: grid; grid-template-columns: 18px 1fr auto auto; align-items: center; gap: 12px; padding: 9px 4px; border-bottom: 1px solid ${HT.lineSoft}; cursor: pointer; }
.task-row:last-child { border-bottom: none; }
.task-row:hover { background: ${HT.panel2}; border-radius: 6px; padding-left: 8px; padding-right: 8px; margin: 0 -4px; border-bottom-color: transparent; }
.task-row .check { width: 18px; height: 18px; border-radius: 999px; border: 1.5px solid ${HT.line}; display: flex; align-items: center; justify-content: center; font-size: 11px; color: transparent; }
.task-row .body { min-width: 0; }
.task-row .body .t { font-size: 13.5px; color: ${HT.ink}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.task-row .body .meta { margin-top: 3px; font-size: 11.5px; color: ${HT.dim}; display: inline-flex; align-items: center; gap: 8px; }
.task-row .body .pdot { width: 8px; height: 8px; border-radius: 2px; flex: 0 0 auto; }
.task-row .body .sep { color: ${HT.line}; }
.task-row .due { font-family: ${HT.mono}; font-size: 11.5px; color: ${HT.dim}; flex: 0 0 auto; }
.task-row .due.late { color: ${HT.high}; font-weight: 600; }
.task-row .status-mini { font-size: 10.5px; padding: 2px 8px; border-radius: 5px; font-weight: 600; }

/* Mentions timeline */
.mention { display: flex; gap: 12px; padding: 12px 4px; border-bottom: 1px solid ${HT.lineSoft}; cursor: pointer; }
.mention:last-child { border-bottom: none; }
.mention:hover { background: ${HT.panel2}; margin: 0 -8px; padding-left: 12px; padding-right: 12px; border-radius: 6px; border-bottom-color: transparent; }
.mention .body { flex: 1; min-width: 0; font-size: 13px; line-height: 1.45; color: ${HT.ink2}; }
.mention .body b { font-weight: 600; color: ${HT.ink}; }
.mention .quote { margin-top: 4px; padding: 7px 10px; background: ${HT.panel2}; border-left: 2px solid ${HT.brand}; border-radius: 0 6px 6px 0; font-size: 12.5px; color: ${HT.ink2}; font-style: italic; }
.mention .foot { margin-top: 5px; font-size: 11px; color: ${HT.mute}; font-family: ${HT.mono}; display: flex; gap: 8px; align-items: center; }
.mention .foot .ctx-dot { width: 6px; height: 6px; border-radius: 999px; }
.mention .foot .sep { color: ${HT.line}; }

/* Workspace cards (side) */
.ws-card { display: flex; align-items: center; gap: 12px; padding: 12px 4px; border-bottom: 1px solid ${HT.lineSoft}; cursor: pointer; }
.ws-card:last-child { border-bottom: none; }
.ws-card:hover { background: ${HT.panel2}; margin: 0 -8px; padding-left: 12px; padding-right: 12px; border-radius: 8px; border-bottom-color: transparent; }
.ws-card .glyph { width: 36px; height: 36px; border-radius: 9px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 15px; flex: 0 0 auto; }
.ws-card .meta { flex: 1; min-width: 0; }
.ws-card .meta .n { font-size: 13.5px; font-weight: 600; color: ${HT.ink}; }
.ws-card .meta .s { margin-top: 1px; font-size: 11.5px; color: ${HT.dim}; }
.ws-card .arr { color: ${HT.mute}; }
.ws-card:hover .arr { color: ${HT.brand}; }

/* Upcoming 7 days */
.up-day { padding: 10px 4px; border-bottom: 1px solid ${HT.lineSoft}; }
.up-day:last-child { border-bottom: none; }
.up-day .dlabel { font-size: 10.5px; color: ${HT.mute}; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 6px; display: flex; gap: 8px; align-items: center; }
.up-day .dlabel .date { color: ${HT.dim}; font-family: ${HT.mono}; font-weight: 500; letter-spacing: 0; }
.up-day .dlabel.is-today { color: ${HT.brand}; }
.up-item { display: flex; gap: 10px; align-items: center; padding: 6px 0; font-size: 12.5px; color: ${HT.ink2}; }
.up-item .t { font-family: ${HT.mono}; font-size: 11px; color: ${HT.dim}; min-width: 42px; }
.up-item .ev-dot { width: 8px; height: 8px; border-radius: 2px; flex: 0 0 auto; }
.up-item .name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.up-day.empty .empty-mark { font-size: 11.5px; color: ${HT.mute}; font-style: italic; }

/* Recent activity (compact) */
.ra { display: flex; gap: 10px; padding: 8px 4px; border-bottom: 1px solid ${HT.lineSoft}; font-size: 12.5px; color: ${HT.ink2}; }
.ra:last-child { border-bottom: none; }
.ra .ico { width: 22px; height: 22px; border-radius: 6px; background: ${HT.panel2}; color: ${HT.dim}; display: flex; align-items: center; justify-content: center; flex: 0 0 auto; }
.ra .body { flex: 1; min-width: 0; }
.ra .body b { font-weight: 600; color: ${HT.ink}; }
.ra .time { font-family: ${HT.mono}; font-size: 10.5px; color: ${HT.mute}; flex: 0 0 auto; align-self: flex-start; margin-top: 4px; }

/* Notes pad */
.notes-pad { background: var(--notes-bg); border: 1px solid var(--notes-line); border-radius: 12px; padding: 16px; }
.notes-pad .nhead { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.notes-pad .nhead .title { font-size: 13px; font-weight: 600; color: var(--notes-ink2); display: inline-flex; gap: 7px; align-items: center; }
.notes-pad .nhead .saved { margin-left: auto; font-size: 10.5px; color: var(--notes-mute); font-family: ${HT.mono}; }
.notes-pad .body { font-size: 13px; line-height: 1.55; color: var(--notes-ink); white-space: pre-wrap; min-height: 96px; outline: none; }
.notes-pad .body:empty::before { content: 'As tuas notas pessoais…'; color: var(--notes-place); }

/* =========================================================
   WORKSPACE HOME
   ========================================================= */

/* Header */
.ws-header { display: flex; gap: 18px; align-items: center; padding: 22px; background: ${HT.panel}; border: 1px solid ${HT.line}; border-radius: 14px; position: relative; overflow: hidden; }
.ws-header::after { content: ''; position: absolute; right: -60px; top: -60px; width: 220px; height: 220px; border-radius: 999px; background: var(--ws-tint); opacity: 0.18; pointer-events: none; }
.ws-header .glyph { width: 64px; height: 64px; border-radius: 16px; background: var(--ws-color); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 700; flex: 0 0 auto; box-shadow: 0 4px 12px -4px var(--ws-tint); }
.ws-header .meta { flex: 1; min-width: 0; position: relative; z-index: 1; }
.ws-header .meta .row1 { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.ws-header .meta .name { font-size: 22px; font-weight: 600; color: ${HT.ink}; letter-spacing: -0.4px; }
.ws-header .meta .plan { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; color: ${HT.brand}; padding: 2px 8px; background: ${HT.brandSoft}; border-radius: 4px; text-transform: uppercase; }
.ws-header .meta .stats { margin-top: 6px; font-size: 13px; color: ${HT.dim}; display: flex; gap: 14px; flex-wrap: wrap; align-items: center; }
.ws-header .meta .stats .sep { color: ${HT.line}; }
.ws-header .meta .stats b { color: ${HT.ink}; font-weight: 600; }
.ws-header .acts { display: flex; gap: 8px; position: relative; z-index: 1; }

/* Plan limits row */
.limits { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.limit { background: ${HT.panel}; border: 1px solid ${HT.line}; border-radius: 12px; padding: 14px 16px; }
.limit .lhead { display: flex; align-items: baseline; gap: 8px; }
.limit .llabel { font-size: 11.5px; color: ${HT.dim}; }
.limit .lval { margin-left: auto; font-family: ${HT.mono}; font-size: 12px; color: ${HT.ink}; font-weight: 600; }
.limit .lval .max { color: ${HT.mute}; font-weight: 400; }
.limit .bar { margin-top: 9px; height: 6px; background: ${HT.panel3}; border-radius: 999px; overflow: hidden; position: relative; }
.limit .bar .fill { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 999px; background: ${HT.brand}; transition: width .3s; }
.limit.warn .bar .fill { background: ${HT.med}; }
.limit.crit .bar .fill { background: ${HT.high}; }
.limit.warn .lval, .limit.crit .lval { color: ${HT.high}; }
.limit .upgr { margin-top: 6px; font-size: 11px; color: ${HT.brand}; cursor: pointer; display: none; }
.limit.warn .upgr, .limit.crit .upgr { display: block; }

/* Project grid */
.proj-bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 4px; }
.proj-bar .title { font-size: 16px; font-weight: 600; color: ${HT.ink}; }
.proj-bar .count { font-family: ${HT.mono}; font-size: 12px; color: ${HT.mute}; background: ${HT.panel2}; padding: 2px 8px; border-radius: 999px; }
.proj-bar .grow { flex: 1; }
.proj-bar .search { max-width: 260px; height: 30px; padding: 0 10px; background: ${HT.panel}; border: 1px solid ${HT.line}; border-radius: 7px; font-size: 12px; outline: none; color: ${HT.ink}; }
.proj-bar .search::placeholder { color: ${HT.mute}; }
.proj-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.pcard { background: ${HT.panel}; border: 1px solid ${HT.line}; border-radius: 12px; overflow: hidden; cursor: pointer; transition: transform .14s, box-shadow .14s, border-color .14s; display: flex; flex-direction: column; }
.pcard:hover { transform: translateY(-2px); box-shadow: 0 10px 24px -10px rgba(20,20,40,.20); border-color: ${HT.brandSoft2}; }
.pcard .stripe { height: 6px; background: var(--p-color); }
.pcard .inner { padding: 16px; display: flex; flex-direction: column; gap: 12px; flex: 1; }
.pcard .top { display: flex; align-items: flex-start; gap: 10px; }
.pcard .top .glyph { width: 30px; height: 30px; border-radius: 8px; background: var(--p-soft); color: var(--p-color); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; flex: 0 0 auto; }
.pcard .top .n { font-size: 14.5px; font-weight: 600; color: ${HT.ink}; flex: 1; line-height: 1.2; }
.pcard .top .role { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 2px 7px; border-radius: 999px; background: ${HT.panel2}; color: ${HT.dim}; flex: 0 0 auto; }
.pcard .top .role.own { background: ${HT.brandSoft}; color: ${HT.brand}; }
.pcard .progress-row { display: flex; align-items: center; gap: 8px; font-size: 11px; color: ${HT.dim}; font-family: ${HT.mono}; }
.pcard .progress-bar { flex: 1; height: 4px; background: ${HT.panel3}; border-radius: 999px; overflow: hidden; }
.pcard .progress-bar .pf { height: 100%; border-radius: 999px; background: var(--p-color); }
.pcard .foot { display: flex; align-items: center; gap: 10px; margin-top: auto; padding-top: 10px; border-top: 1px solid ${HT.lineSoft}; }
.pcard .foot .ms { flex: 1; font-size: 11.5px; color: ${HT.dim}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pcard .foot .ms b { color: ${HT.ink}; font-weight: 600; }

/* Pulse */
.pulse-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.pulse-card { padding: 14px 16px; border: 1px solid ${HT.line}; border-radius: 10px; background: ${HT.panel2}; }
.pulse-card .ll { font-size: 11.5px; color: ${HT.dim}; }
.pulse-card .vv { margin-top: 4px; font-size: 22px; font-weight: 600; color: ${HT.ink}; letter-spacing: -0.4px; line-height: 1; }
.pulse-card .vv .unit { font-size: 12px; font-weight: 500; color: ${HT.dim}; margin-left: 4px; }
.pulse-card .delta { margin-top: 4px; font-size: 11px; font-family: ${HT.mono}; }
.pulse-card .delta.up { color: ${HT.high}; }
.pulse-card .delta.down { color: oklch(0.50 0.13 155); }
.pulse-card.timesheets .vv { display: none; }
.pulse-card.timesheets .seg { margin-top: 8px; height: 8px; border-radius: 4px; display: flex; overflow: hidden; }
.pulse-card.timesheets .seg .s { height: 100%; }
.pulse-card.timesheets .leg { margin-top: 8px; display: flex; flex-direction: column; gap: 4px; font-size: 11.5px; }
.pulse-card.timesheets .leg .lr { display: flex; align-items: center; gap: 8px; color: ${HT.dim}; }
.pulse-card.timesheets .leg .lr .sw { width: 8px; height: 8px; border-radius: 2px; flex: 0 0 auto; }
.pulse-card.timesheets .leg .lr .nn { margin-left: auto; font-family: ${HT.mono}; color: ${HT.ink}; font-weight: 600; }

/* Team list */
.team-row { display: flex; align-items: center; gap: 10px; padding: 9px 4px; border-bottom: 1px solid ${HT.lineSoft}; }
.team-row:last-child { border-bottom: none; }
.team-row .nm { flex: 1; font-size: 13px; color: ${HT.ink}; }
.team-row .ss { font-size: 11.5px; padding: 2px 8px; border-radius: 5px; font-weight: 600; font-family: ${HT.mono}; }
.team-row .ss.ok { background: oklch(0.94 0.08 155); color: oklch(0.38 0.10 155); }
.team-row .ss.sub { background: oklch(0.95 0.06 220); color: oklch(0.42 0.12 220); }
.team-row .ss.miss { background: oklch(0.94 0.05 30); color: ${HT.high}; }
.team-row .ss.idle { background: ${HT.panel3}; color: ${HT.mute}; }

/* Announcement */
.announce { background: linear-gradient(180deg, ${HT.brandSoft} 0%, ${HT.panel} 80%); border: 1px solid ${HT.brandSoft2}; border-radius: 12px; padding: 14px 16px; }
.announce .who { display: flex; align-items: center; gap: 8px; font-size: 12px; color: ${HT.dim}; }
.announce .who b { color: ${HT.ink}; font-weight: 600; }
.announce .tt { margin-top: 8px; font-size: 14.5px; font-weight: 600; color: ${HT.ink}; }
.announce .bd { margin-top: 4px; font-size: 13px; color: ${HT.ink2}; line-height: 1.5; }
.announce .ff { margin-top: 8px; font-size: 11px; color: ${HT.mute}; font-family: ${HT.mono}; }

/* Shortcuts */
.shortcuts { display: flex; flex-direction: column; gap: 4px; }
.sc { display: flex; align-items: center; gap: 10px; padding: 8px 4px; cursor: pointer; border-radius: 6px; }
.sc:hover { background: ${HT.panel2}; padding-left: 8px; padding-right: 8px; margin: 0 -4px; }
.sc .ic { width: 24px; height: 24px; border-radius: 6px; background: ${HT.panel2}; color: ${HT.dim}; display: flex; align-items: center; justify-content: center; flex: 0 0 auto; }
.sc .nn { flex: 1; font-size: 13px; color: ${HT.ink}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sc .kk { font-family: ${HT.mono}; font-size: 10px; color: ${HT.mute}; padding: 1px 5px; border: 1px solid ${HT.line}; border-radius: 3px; }

/* =========================================================
   RESPONSIVE
   ========================================================= */
@media (max-width: 1024px) {
  .home-wrap { padding: 20px 18px 40px; gap: 16px; }
  .home-greeting h1 { font-size: 26px; }
  .home-attention { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .home-cols { grid-template-columns: 1fr; }
  .ws-header { padding: 18px; }
  .ws-header .glyph { width: 56px; height: 56px; font-size: 24px; }
  .ws-header .meta .name { font-size: 19px; }
  .limits { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .proj-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .pulse-grid { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .home-wrap { padding: 16px 14px 32px; gap: 14px; }
  .home-greeting { flex-direction: column; align-items: flex-start; gap: 6px; }
  .home-greeting h1 { font-size: 22px; }
  .home-greeting .chip { align-self: flex-start; }
  .home-attention { grid-template-columns: 1fr; }
  .home-card { padding: 14px 14px; }
  .ws-header { flex-direction: column; align-items: flex-start; gap: 14px; }
  .ws-header .acts { width: 100%; }
  .ws-header .acts .btn-primary, .ws-header .acts .btn-ghost { flex: 1; justify-content: center; }
  .limits { grid-template-columns: 1fr; }
  .proj-grid { grid-template-columns: 1fr; }
  .proj-bar .search { max-width: none; width: 100%; }
}

/* =========================================================
   DARK MODE TWEAKS — softer pale tints on dark surfaces.
   ========================================================= */
[data-theme="dark"] .attn-amber .ico  { background: oklch(0.32 0.10 70); color: oklch(0.86 0.12 70); }
[data-theme="dark"] .attn-green .ico  { background: oklch(0.30 0.11 155); color: oklch(0.86 0.13 155); }
[data-theme="dark"] .attn-violet .ico { background: oklch(0.32 0.10 295); color: oklch(0.86 0.12 295); }
[data-theme="dark"] .team-row .ss.ok    { background: oklch(0.30 0.10 155); color: oklch(0.90 0.10 155); }
[data-theme="dark"] .team-row .ss.sub   { background: oklch(0.30 0.10 220); color: oklch(0.90 0.10 220); }
[data-theme="dark"] .team-row .ss.miss  { background: oklch(0.32 0.12 25);  color: oklch(0.90 0.10 25);  }
[data-theme="dark"] .team-row .ss.idle  { background: var(--panel3);        color: var(--mute); }
[data-theme="dark"] .mention .quote { background: var(--panel3); }
[data-theme="dark"] .announce { background: linear-gradient(180deg, var(--brandSoft) 0%, var(--panel) 80%); }
`;

window.homeCss = homeCss;

// ============================================================
// Data
// ============================================================

const homeTasks = {
  today: [
    { id: 1, t: 'Editor rich text Tiptap — finalizar uploads', p: 'AWP', pc: HT.brand,                       pri: 'Alta',  st: 'doing',  due: 'Hoje · 18:00' },
    { id: 2, t: 'Standup — alinhar com Lara', p: 'AWP', pc: HT.brand,                                       pri: 'Média', st: 'todo',   due: 'Hoje · 10:00' },
    { id: 3, t: 'Rever PR #482 — Sistema de Tags', p: 'AWP', pc: HT.brand,                                  pri: 'Alta',  st: 'review', due: 'Hoje' },
    { id: 4, t: 'Submeter timesheet da semana', p: 'Operações', pc: 'oklch(0.70 0.14 320)',                 pri: 'Média', st: 'todo',   due: 'Hoje · 18:00' },
  ],
  week: [
    { id: 5, t: 'Implementar feature "Seguir" na task', p: 'AWP', pc: HT.brand,                             pri: 'Baixa', st: 'todo',   due: 'Sex · 16 mai' },
    { id: 6, t: 'Notificação ao adicionar a projeto', p: 'AWP', pc: HT.brand,                              pri: 'Média', st: 'doing',  due: '16 mai' },
    { id: 7, t: 'Onboarding · primeira sessão', p: 'AWP', pc: HT.brand,                                    pri: 'Alta',  st: 'todo',   due: '18 mai' },
    { id: 8, t: 'Wireframes — Landing 2026', p: 'Marketing Site 2026', pc: 'oklch(0.70 0.16 320)',          pri: 'Média', st: 'doing',  due: '17 mai' },
    { id: 9, t: 'Reunião quinzenal de produto', p: 'Produto & Design', pc: 'oklch(0.72 0.14 130)',         pri: null,    st: null,     due: 'Qua · 14:30' },
  ],
  late: [
    { id: 10, t: 'Bug — Salvar sem data de início', p: 'AWP', pc: HT.brand,                                pri: 'Alta',  st: 'doing',  due: '9 mai' },
    { id: 11, t: 'Documentar API de tags', p: 'AWP', pc: HT.brand,                                         pri: 'Média', st: 'todo',   due: '12 mai' },
  ],
  soon: [
    { id: 12, t: 'Lançamento beta v2', p: 'AWP', pc: HT.brand,                                             pri: 'Alta',  st: 'todo',   due: '24 mai' },
    { id: 13, t: 'Mover bucket S3 — região eu-west', p: 'Internal Tools', pc: 'oklch(0.72 0.14 130)',     pri: 'Média', st: 'todo',   due: '22 mai' },
    { id: 14, t: 'Apresentação — Identidade 2026', p: 'Brand Refresh', pc: 'oklch(0.74 0.12 70)',         pri: 'Baixa', st: 'todo',   due: '28 mai' },
  ],
};

const homeStatusMeta = {
  todo:   { label: 'A fazer',  color: HT.todo,   ink: HT.todoInk },
  doing:  { label: 'Em curso', color: HT.doing,  ink: HT.doingInk },
  review: { label: 'Revisão',  color: HT.review, ink: HT.reviewInk },
  done:   { label: 'Feito',    color: HT.done,   ink: HT.doneInk },
};

const homePriColor = { Alta: HT.high, Média: HT.med, Baixa: HT.low };

const homeMentions = [
  { who: 'Lara Mendes', initials: 'LM', color: '#4a89c4', verb: 'mencionou-o em', target: 'Sistema de Tags', project: 'AWP', pc: HT.brand,
    quote: 'Achas que faz sentido usar enum em vez de string livre? Limitaria a M11 categorias.', when: 'há 12 min' },
  { who: 'João Ribeiro', initials: 'JR', color: '#d97a86', verb: 'atribuiu-lhe', target: 'Editor rich text Tiptap', project: 'AWP', pc: HT.brand,
    quote: null, when: 'há 1 h' },
  { who: 'Patrícia Costa', initials: 'PC', color: '#8c5cc4', verb: 'reagiu 🎉 ao seu comentário em', target: 'Mudar path S3', project: 'AWP', pc: HT.brand,
    quote: null, when: 'há 2 h' },
  { who: 'Lara Mendes', initials: 'LM', color: '#4a89c4', verb: 'respondeu em', target: 'Contador da lista de tarefas', project: 'AWP', pc: HT.brand,
    quote: 'Pode ficar como contador derivado — não precisa de coluna extra na BD.', when: 'há 3 h' },
  { who: 'Rita Faria', initials: 'RF', color: '#5a9c7a', verb: 'mencionou-o em', target: 'Wireframes — Landing', project: 'Marketing Site 2026', pc: 'oklch(0.70 0.16 320)',
    quote: 'Esta secção segue o teu input do Slack — confirmas?', when: 'ontem · 17:30' },
];

const homeWorkspaces = [
  { id: 'magero', name: 'Equipa Mágero', sub: '8 projetos · 12 membros', glyph: 'EM', color: HT.brand },
  { id: 'eng',    name: 'Engenharia',    sub: '4 projetos · 6 membros',  glyph: 'EN', color: 'oklch(0.62 0.16 220)' },
  { id: 'prod',   name: 'Produto & Design', sub: '3 projetos · 5 membros', glyph: 'PD', color: 'oklch(0.62 0.15 320)' },
];

const homeUpcoming = [
  { label: 'Hoje', date: '14 mai', isToday: true, items: [
    { t: '10:00', name: 'Standup diário', kind: 'event', color: HT.brand },
    { t: '14:30', name: 'Reunião com cliente — AWP', kind: 'event', color: HT.brand },
    { t: '18:00', name: 'Prazo · Editor Tiptap', kind: 'task', color: HT.med },
  ]},
  { label: 'Amanhã', date: '15 mai', items: [
    { t: '11:00', name: '1:1 com Lara', kind: 'event', color: HT.brand },
  ]},
  { label: 'Sex', date: '16 mai', items: [
    { t: '—', name: 'Prazo · Sistema de Tags', kind: 'task', color: HT.med },
    { t: '16:00', name: 'Demo interna', kind: 'event', color: HT.brand },
    { t: '—', name: 'Prazo · Submeter timesheet', kind: 'task', color: HT.high },
  ]},
  { label: 'Sáb', date: '17 mai', empty: true, items: [] },
  { label: 'Dom', date: '18 mai', items: [
    { t: '—', name: 'Onboarding — sessão piloto', kind: 'task', color: HT.med },
  ]},
  { label: 'Seg', date: '19 mai', items: [
    { t: '09:30', name: 'Planeamento sprint 21', kind: 'event', color: HT.brand },
  ]},
  { label: 'Ter', date: '20 mai', items: [
    { t: '15:00', name: 'Workshop OKRs Q3', kind: 'event', color: HT.brand },
  ]},
];

const homeActivity = [
  { ico: '✎', body: <span>Comentou em <b>Sistema de Tags</b></span>, time: 'há 14 min' },
  { ico: '✓', body: <span>Concluiu <b>Refactor de queries</b></span>, time: 'há 2 h' },
  { ico: '+', body: <span>Criou tarefa <b>Mover bucket S3</b></span>, time: 'há 4 h' },
  { ico: '⇄', body: <span>Mudou estado de <b>PR #482</b> para Em revisão</span>, time: 'ontem' },
  { ico: '⇪', body: <span>Carregou ficheiro em <b>Brand Refresh</b></span>, time: 'ontem' },
];

// ============================================================
// GlobalHome — componente
// ============================================================

const { useState: useStateH, useEffect: useEffectH, useRef: useRefH } = React;

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Boa noite';
  if (h < 13) return 'Bom dia';
  if (h < 20) return 'Boa tarde';
  return 'Boa noite';
}
function getDateLabel() {
  const days = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  const d = new Date();
  const wk = Math.ceil((((d - new Date(d.getFullYear(),0,1)) / 86400000) + new Date(d.getFullYear(),0,1).getDay()+1)/7);
  return `${days[d.getDay()]} · ${d.getDate()} de ${months[d.getMonth()]} · Semana ${wk}`;
}

function GlobalHome({ onOpenWorkspace }) {
  const [tab, setTab] = useStateH('today');
  const [notes, setNotes] = useStateH(
    'Recordar: validar com a Lara se há trade-off entre enum e string livre nas tags.\n' +
    '— Próximo passo: rascunho de Onboarding antes de sex.'
  );
  const counts = {
    today: homeTasks.today.length,
    week:  homeTasks.week.length,
    late:  homeTasks.late.length,
    soon:  homeTasks.soon.length,
  };
  const current = homeTasks[tab];

  return (
    <div className="home-scroll">
      <div className="home-wrap">

        {/* Greeting */}
        <div className="home-greeting">
          <div>
            <h1>{getGreeting()}, <span className="name">Thiago</span>.</h1>
            <div className="sub">Tens 7 tarefas activas e 3 conversas a aguardar resposta.</div>
          </div>
          <div className="chip"><span className="dot"></span>{getDateLabel()}</div>
        </div>

        {/* Atenção imediata */}
        <div className="home-attention">
          <AttentionCard tone="blue" label="Convites pendentes" value="2 projectos"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>} />
          <AttentionCard tone="amber" label="Timesheet" value="Por submeter (sex)"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>} />
          <AttentionCard tone="green" label="Aprovações" value="5 horas para rever"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>} />
          <AttentionCard tone="violet" label="Notificações" value="8 por ler"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>} />
        </div>

        {/* Two-column layout */}
        <div className="home-cols">

          {/* MAIN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Minhas tarefas */}
            <div className="home-card">
              <div className="home-card-head">
                <div className="title">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></svg>
                  As minhas tarefas
                </div>
                <span className="action">Ver tudo</span>
              </div>
              <div className="home-tabs">
                {[
                  ['today','Hoje', counts.today],
                  ['week','Esta semana', counts.week],
                  ['late','Em atraso', counts.late],
                  ['soon','A começar', counts.soon],
                ].map(([k, l, n]) => (
                  <div key={k} className={'t' + (tab === k ? ' active' : '')} onClick={() => setTab(k)}>
                    {l}<span className="n">{n}</span>
                  </div>
                ))}
              </div>
              <div>
                {current.length === 0 ? (
                  <div style={{ padding: '20px 4px', color: HT.mute, fontSize: 13, textAlign: 'center' }}>Nada para mostrar.</div>
                ) : current.map(r => (
                  <TaskRowH key={r.id} r={r} late={tab === 'late'} />
                ))}
              </div>
            </div>

            {/* Menções e conversas */}
            <div className="home-card">
              <div className="home-card-head">
                <div className="title">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/></svg>
                  Menções &amp; conversas
                </div>
                <span className="count">{homeMentions.length}</span>
                <span className="action">Caixa de entrada</span>
              </div>
              <div>
                {homeMentions.map((m, i) => (
                  <div key={i} className="mention">
                    <div className="avatar sm" title={m.who} style={{ background: m.color }}>{m.initials}</div>
                    <div className="body">
                      <span><b>{m.who}</b> {m.verb} <b>{m.target}</b></span>
                      {m.quote && <div className="quote">"{m.quote}"</div>}
                      <div className="foot">
                        <span className="ctx-dot" style={{ background: m.pc }}></span>
                        <span>{m.project}</span>
                        <span className="sep">·</span>
                        <span>{m.when}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* SIDE */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Workspaces */}
            <div className="home-card">
              <div className="home-card-head">
                <div className="title">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  Os meus workspaces
                </div>
                <span className="action">Gerir</span>
              </div>
              <div>
                {homeWorkspaces.map(w => (
                  <div key={w.id} className="ws-card" onClick={() => onOpenWorkspace && onOpenWorkspace(w.id)}>
                    <div className="glyph" style={{ background: w.color }}>{w.glyph}</div>
                    <div className="meta">
                      <div className="n">{w.name}</div>
                      <div className="s">{w.sub}</div>
                    </div>
                    <span className="arr">→</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Próximos 7 dias */}
            <div className="home-card">
              <div className="home-card-head">
                <div className="title">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  Próximos 7 dias
                </div>
                <span className="action">Calendário</span>
              </div>
              <div>
                {homeUpcoming.map((d, i) => (
                  <div key={i} className={'up-day' + (d.empty ? ' empty' : '')}>
                    <div className={'dlabel' + (d.isToday ? ' is-today' : '')}>
                      <span>{d.label}</span>
                      <span className="date">{d.date}</span>
                    </div>
                    {d.empty ? (
                      <div className="empty-mark">Dia livre.</div>
                    ) : d.items.map((it, j) => (
                      <div key={j} className="up-item">
                        <span className="t">{it.t}</span>
                        <span className="ev-dot" style={{ background: it.color }}></span>
                        <span className="name">{it.name}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Notas pessoais */}
            <div className="notes-pad">
              <div className="nhead">
                <span className="title">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
                  Bloco de notas
                </span>
                <span className="saved">guardado automaticamente</span>
              </div>
              <div className="body" contentEditable suppressContentEditableWarning
                onBlur={(e) => setNotes(e.currentTarget.innerText)}>
                {notes}
              </div>
            </div>

            {/* Atividade recente */}
            <div className="home-card">
              <div className="home-card-head">
                <div className="title">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/></svg>
                  Atividade recente
                </div>
              </div>
              <div>
                {homeActivity.map((a, i) => (
                  <div key={i} className="ra">
                    <div className="ico">{a.ico}</div>
                    <div className="body">{a.body}</div>
                    <span className="time">{a.time}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

function AttentionCard({ tone, label, value, icon }) {
  return (
    <div className={'attn-card attn-' + tone}>
      <div className="ico">{icon}</div>
      <div className="body">
        <span className="label">{label}</span>
        <span className="value">{value}</span>
      </div>
      <span className="arrow">→</span>
    </div>
  );
}

function TaskRowH({ r, late }) {
  const sm = r.st ? homeStatusMeta[r.st] : null;
  return (
    <div className="task-row" onClick={() => window.__openTaskModal && window.__openTaskModal()}>
      <span className="check"></span>
      <div className="body">
        <div className="t">{r.t}</div>
        <div className="meta">
          <span className="pdot" style={{ background: r.pc }}></span>
          <span>{r.p}</span>
          {r.pri && (
            <>
              <span className="sep">·</span>
              <span style={{ color: homePriColor[r.pri] }}>{r.pri}</span>
            </>
          )}
        </div>
      </div>
      <span className={'due' + (late ? ' late' : '')}>{r.due}</span>
      {sm ? (
        <span className="status-mini" style={{ background: sm.color, color: sm.ink }}>{sm.label}</span>
      ) : <span></span>}
    </div>
  );
}

// ============================================================
// WorkspaceHome — componente
// ============================================================

const wsProjects = [
  { id: 'awp',   name: 'Awesome Project App',   glyph: 'A', color: HT.brand,                  soft: HT.brandSoft,                progress: 0.42, members: ['TM','LM','JR','PC'], more: 3, milestone: { label: 'Beta v2', when: 'em 11 dias' }, role: 'own' },
  { id: 'mkt',   name: 'Marketing Site 2026',   glyph: 'M', color: 'oklch(0.66 0.16 320)',    soft: 'oklch(0.95 0.05 320)',      progress: 0.68, members: ['RF','LM','TM'],      more: 0, milestone: { label: 'Wireframes aprovados', when: 'sex' }, role: 'mem' },
  { id: 'int',   name: 'Internal Tools',        glyph: 'I', color: 'oklch(0.62 0.14 130)',    soft: 'oklch(0.94 0.07 130)',      progress: 0.85, members: ['JR','PC'],           more: 1, milestone: { label: 'Deploy v1.4', when: 'amanhã' }, role: 'mem' },
  { id: 'brd',   name: 'Brand Refresh',         glyph: 'B', color: 'oklch(0.68 0.13 70)',     soft: 'oklch(0.95 0.06 70)',       progress: 0.22, members: ['PC','TM','RF','LM'], more: 2, milestone: { label: 'Apresentação interna', when: '28 mai' }, role: 'mem' },
  { id: 'mob',   name: 'Mobile App v2',         glyph: 'M', color: 'oklch(0.60 0.16 264)',    soft: 'oklch(0.93 0.05 264)',      progress: 0.12, members: ['TM','JR'],           more: 4, milestone: { label: 'Spec aprovada', when: 'em 19 dias' }, role: 'own' },
  { id: 'onb',   name: 'Onboarding Flow',       glyph: 'O', color: 'oklch(0.64 0.14 210)',    soft: 'oklch(0.94 0.05 210)',      progress: 0.55, members: ['LM','RF','TM'],      more: 0, milestone: { label: 'Sessão piloto', when: 'dom 18 mai' }, role: 'mem' },
];

const wsLimits = [
  { label: 'Projetos',      used: 8,    total: 15,   unit: '', tone: 'ok' },
  { label: 'Membros',       used: 12,   total: 20,   unit: '', tone: 'ok' },
  { label: 'Armazenamento', used: 8.4,  total: 10,   unit: ' GB', tone: 'warn' },
  { label: 'Tarefas',       used: 320,  total: 1000, unit: '', tone: 'ok' },
];

const wsTeam = [
  { name: 'Lara Mendes',     initials: 'LM', color: '#4a89c4', status: 'ok',   label: '6.5h hoje' },
  { name: 'João Ribeiro',    initials: 'JR', color: '#d97a86', status: 'sub',  label: 'Submetido' },
  { name: 'Patrícia Costa',  initials: 'PC', color: '#8c5cc4', status: 'ok',   label: '8h hoje' },
  { name: 'Rita Faria',      initials: 'RF', color: '#5a9c7a', status: 'miss', label: 'Em falta · 2 dias' },
  { name: 'André Lopes',     initials: 'AL', color: '#c47a4a', status: 'idle', label: 'Sem atividade · 5d' },
  { name: 'Thiago Mágero',   initials: 'TM', color: '#e8704c', status: 'sub',  label: 'Submetido' },
];

const wsEvents = [
  { label: 'Hoje',     date: '14 mai', items: [{ t: '14:30', name: 'Reunião com cliente AWP', color: HT.brand }] },
  { label: 'Amanhã',   date: '15 mai', items: [{ t: '—',     name: 'Marco · Deploy Internal Tools v1.4', color: 'oklch(0.62 0.14 130)' }] },
  { label: 'Sex',      date: '16 mai', items: [{ t: '10:00', name: 'Retrospetiva sprint 20', color: HT.brand },
                                                { t: '—',     name: 'Marco · Wireframes Marketing', color: 'oklch(0.66 0.16 320)' }] },
  { label: 'Seg',      date: '19 mai', items: [{ t: '09:30', name: 'Planeamento sprint 21', color: HT.brand }] },
  { label: 'Qua',      date: '21 mai', items: [{ t: '—',     name: 'Feriado · Dia da Empresa', color: HT.mute }] },
];

const wsShortcuts = [
  { name: 'Sprint 21 — Backlog', kk: 'AWP', ic: '★' },
  { name: 'Wireframes — Landing', kk: 'MKT', ic: '★' },
  { name: 'Especificações — API v2', kk: 'INT', ic: '✎' },
  { name: 'Brandbook — Cores', kk: 'BRD', ic: '⌗' },
  { name: 'Timesheet template', kk: 'OP',  ic: '☷' },
];

function WorkspaceHome({ workspaceId, onOpenProject }) {
  const ws = homeWorkspaces.find(w => w.id === workspaceId) || homeWorkspaces[0];
  const [filter, setFilter] = useStateH('active');
  const [q, setQ] = useStateH('');

  const filtered = wsProjects.filter(p => {
    if (filter === 'mine' && p.role !== 'own') return false;
    if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="home-scroll">
      <div className="home-wrap" style={{ '--ws-color': ws.color, '--ws-tint': ws.color }}>

        {/* Identidade */}
        <div className="ws-header">
          <div className="glyph">{ws.glyph}</div>
          <div className="meta">
            <div className="row1">
              <span className="name">{ws.name}</span>
              <span className="plan">Pro</span>
            </div>
            <div className="stats">
              <span><b>{wsProjects.length}</b> projetos activos</span>
              <span className="sep">·</span>
              <span><b>{wsTeam.length}</b> membros</span>
              <span className="sep">·</span>
              <span><b>320</b> tarefas em aberto</span>
              <span className="sep">·</span>
              <span>Criado em <b>jan 2024</b></span>
            </div>
          </div>
          <div className="acts">
            <button className="btn-ghost" onClick={() => window.__openInvite && window.__openInvite()}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
              Convidar pessoas
            </button>
            <button className="btn-primary" onClick={() => window.__openNewProject && window.__openNewProject()}>
              <span style={{ fontSize: 14, lineHeight: 0 }}>+</span>
              Novo projeto
            </button>
          </div>
        </div>

        {/* Limites do plano */}
        <div className="limits">
          {wsLimits.map((l, i) => {
            const pct = l.used / l.total;
            const tone = pct >= 0.9 ? 'crit' : pct >= 0.75 ? 'warn' : 'ok';
            return (
              <div key={i} className={'limit ' + tone}>
                <div className="lhead">
                  <span className="llabel">{l.label}</span>
                  <span className="lval">{l.used}<span className="max">/{l.total}{l.unit}</span></span>
                </div>
                <div className="bar"><div className="fill" style={{ width: `${Math.min(100, pct*100)}%` }}></div></div>
                <div className="upgr">Fazer upgrade →</div>
              </div>
            );
          })}
        </div>

        {/* Projetos */}
        <div className="home-card">
          <div className="proj-bar">
            <div className="title">Projetos</div>
            <span className="count">{filtered.length}</span>
            <div style={{ display: 'flex', gap: 4, padding: 3, background: HT.panel2, borderRadius: 7 }}>
              {[
                ['active','Activos'],
                ['mine','Onde participo'],
                ['archived','Arquivados'],
              ].map(([k, l]) => (
                <div key={k} onClick={() => setFilter(k)}
                  style={{ padding: '5px 11px', borderRadius: 5, fontSize: 12, cursor: 'pointer',
                           color: filter === k ? HT.ink : HT.dim, fontWeight: filter === k ? 600 : 400,
                           background: filter === k ? HT.panel : 'transparent',
                           boxShadow: filter === k ? `0 1px 2px rgba(0,0,0,.06), 0 0 0 1px ${HT.line}` : 'none' }}>
                  {l}
                </div>
              ))}
            </div>
            <div className="grow"></div>
            <input className="search" placeholder="Pesquisar projeto…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <div className="proj-grid" style={{ marginTop: 14 }}>
            {filtered.map(p => (
              <div key={p.id} className="pcard" style={{ '--p-color': p.color, '--p-soft': p.soft }}
                   onClick={() => onOpenProject && onOpenProject(p.id)}>
                <div className="stripe"></div>
                <div className="inner">
                  <div className="top">
                    <div className="glyph">{p.glyph}</div>
                    <div className="n">{p.name}</div>
                    <span className={'role' + (p.role === 'own' ? ' own' : '')}>{p.role === 'own' ? 'Owner' : 'Member'}</span>
                  </div>
                  <div className="progress-row">
                    <div className="avatar-list-stacked">
                      {p.members.map((m, i) => (
                        <div key={i} className="avatar sm" style={{ background: ['#e8704c','#4a89c4','#d97a86','#8c5cc4','#5a9c7a','#c47a4a'][i % 6] }}>{m}</div>
                      ))}
                      {p.more > 0 && <div className="avatar sm more">+{p.more}</div>}
                    </div>
                    <span style={{ marginLeft: 'auto' }}>{Math.round(p.progress * 100)}%</span>
                  </div>
                  <div className="progress-bar"><div className="pf" style={{ width: `${p.progress*100}%` }}></div></div>
                  <div className="foot">
                    <span className="ms">Próximo: <b>{p.milestone.label}</b> · {p.milestone.when}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cols lower */}
        <div className="home-cols">
          {/* MAIN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Pulso */}
            <div className="home-card">
              <div className="home-card-head">
                <div className="title">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                  Pulso da semana
                </div>
                <span className="action">Relatórios</span>
              </div>
              <div className="pulse-grid">
                <div className="pulse-card timesheets">
                  <div className="ll">Timesheets · 14 lançamentos</div>
                  <div className="seg">
                    <div className="s" style={{ background: oklchSafe('0.50 0.13 155'), width: '36%' }}></div>
                    <div className="s" style={{ background: oklchSafe('0.62 0.15 220'), width: '21%' }}></div>
                    <div className="s" style={{ background: oklchSafe('0.65 0.18 264'), width: '14%' }}></div>
                    <div className="s" style={{ background: HT.panel3, width: '29%' }}></div>
                  </div>
                  <div className="leg">
                    <div className="lr"><span className="sw" style={{ background: oklchSafe('0.50 0.13 155') }}></span><span>Aprovados</span><span className="nn">5</span></div>
                    <div className="lr"><span className="sw" style={{ background: oklchSafe('0.62 0.15 220') }}></span><span>Submetidos</span><span className="nn">3</span></div>
                    <div className="lr"><span className="sw" style={{ background: oklchSafe('0.65 0.18 264') }}></span><span>Lançados</span><span className="nn">2</span></div>
                    <div className="lr"><span className="sw" style={{ background: HT.panel3 }}></span><span>Em falta</span><span className="nn">4</span></div>
                  </div>
                </div>
                <div className="pulse-card">
                  <div className="ll">Tarefas em atraso</div>
                  <div className="vv">8</div>
                  <div className="delta up">▲ 2 desde semana passada</div>
                </div>
                <div className="pulse-card">
                  <div className="ll">Aprovações lentas <span style={{ color: HT.mute }}>(&gt; 48h)</span></div>
                  <div className="vv">2</div>
                  <div className="delta down">▼ 1 desde semana passada</div>
                </div>
              </div>
            </div>

            {/* Equipa */}
            <div className="home-card">
              <div className="home-card-head">
                <div className="title">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg>
                  Equipa
                </div>
                <span className="count">{wsTeam.length}</span>
                <span className="action">Ver todos</span>
              </div>
              <div>
                {wsTeam.map((m, i) => (
                  <div key={i} className="team-row">
                    <div className="avatar sm" style={{ background: m.color }}>{m.initials}</div>
                    <span className="nm">{m.name}</span>
                    <span className={'ss ' + m.status}>{m.label}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* SIDE */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Eventos */}
            <div className="home-card">
              <div className="home-card-head">
                <div className="title">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>
                  Próximas 2 semanas
                </div>
              </div>
              <div>
                {wsEvents.map((d, i) => (
                  <div key={i} className="up-day">
                    <div className={'dlabel' + (d.label === 'Hoje' ? ' is-today' : '')}>
                      <span>{d.label}</span>
                      <span className="date">{d.date}</span>
                    </div>
                    {d.items.map((it, j) => (
                      <div key={j} className="up-item">
                        <span className="t">{it.t}</span>
                        <span className="ev-dot" style={{ background: it.color }}></span>
                        <span className="name">{it.name}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Anúncio */}
            <div className="announce">
              <div className="who">
                <div className="avatar sm" style={{ background: '#e8704c' }}>TM</div>
                <span><b>Thiago Mágero</b> · gestor</span>
              </div>
              <div className="tt">Nova política de timesheets a partir de 19 mai</div>
              <div className="bd">Submissão até sexta às 18h. Validação até segunda 12h. Detalhes no documento partilhado.</div>
              <div className="ff">há 2 dias</div>
            </div>

            {/* Atalhos */}
            <div className="home-card">
              <div className="home-card-head">
                <div className="title">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  Os meus atalhos
                </div>
                <span className="action">Editar</span>
              </div>
              <div className="shortcuts">
                {wsShortcuts.map((s, i) => (
                  <div key={i} className="sc">
                    <div className="ic">{s.ic}</div>
                    <span className="nn">{s.name}</span>
                    <span className="kk">{s.kk}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

function oklchSafe(s) { return `oklch(${s})`; }

Object.assign(window, { GlobalHome, WorkspaceHome, homeCss });
