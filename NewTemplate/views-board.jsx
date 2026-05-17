/* eslint-disable */
// AWP — Visão Quadro (Kanban) v2.
// Inclui menus de contexto (coluna + card), search, painel de
// configurações em offcanvas com 3 tabs funcionais, modos de swimlane
// e colunas colapsáveis. Tokens partilhados via window.awpTokens (BT)
// para servir light + dark sem duplicação.

const BT = window.awpTokens;
const { useState, useRef, useEffect, useLayoutEffect, useMemo, Fragment } = React;

// ============================================================
// ICONS
// ============================================================
const I = {
  chevL:  () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  chevR:  () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  chevD:  () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  plus:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  plusBold: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  search: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><line x1="20" y1="20" x2="16.65" y2="16.65"/></svg>,
  undo:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>,
  redo:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
  gear:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  lanes:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="7" rx="1.5"/><rect x="3" y="13" width="18" height="7" rx="1.5"/></svg>,
  x:      () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  board:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>,
  // Column menu
  pencil: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
  arrL:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  arrR:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  doubleChev: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg>,
  rules:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  trash:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>,
  // Card menu
  edit:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  gavel:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="14 13 19 8"/><polyline points="3 17 8 12"/><line x1="9" y1="11" x2="13" y2="15"/><line x1="11" y1="9" x2="20" y2="18"/><path d="M14 4l6 6"/></svg>,
  ban:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><line x1="5.6" y1="5.6" x2="18.4" y2="18.4"/></svg>,
};

// ============================================================
// CSS
// ============================================================
const boardCss = `
.kb { flex: 1; display: flex; flex-direction: column; min-height: 0; background: ${BT.bg};
      /* Density-dependent vars overridden inline. */
      --kb-card-pad-x: 12px; --kb-card-pad-y: 11px; --kb-card-gap: 10px; --kb-col-gap: 14px;
      /* Color vars (overridable from settings). */
      --kb-primary: ${BT.brand};
      --kb-pri-high: ${BT.high}; --kb-pri-med: ${BT.med}; --kb-pri-low: ${BT.low}; --kb-pri-none: ${BT.mute};
}

/* ============== TOOLBAR ============== */
.kb-toolbar { padding: 10px 24px; background: ${BT.panel}; border-bottom: 1px solid ${BT.line}; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.kb-icon-btn { width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center; background: ${BT.panel}; border: 1px solid ${BT.line}; border-radius: 7px; color: ${BT.ink2}; cursor: pointer; }
.kb-icon-btn:hover { background: ${BT.panel2}; color: ${BT.ink}; }
.kb-icon-btn.on { background: ${BT.brandSoft}; border-color: ${BT.brandSoft2}; color: ${BT.brand}; }
.kb-icon-btn.bare { background: transparent; border: 1px solid transparent; color: ${BT.mute}; }
.kb-icon-btn.bare:hover { background: ${BT.panel2}; color: ${BT.ink}; }
.kb-search { flex: 0 1 280px; min-width: 180px; height: 30px; padding: 0 10px; display: inline-flex; align-items: center; gap: 7px; background: ${BT.panel2}; border: 1px solid transparent; border-radius: 7px; color: ${BT.dim}; }
.kb-search:focus-within { background: ${BT.panel}; border-color: ${BT.brand}; box-shadow: 0 0 0 3px ${BT.brandSoft}; color: ${BT.ink}; }
.kb-search input { flex: 1; background: transparent; border: none; outline: none; color: ${BT.ink}; font-size: 12.5px; font-family: inherit; min-width: 0; }
.kb-search input::placeholder { color: ${BT.mute}; }
.kb-search .clear { color: ${BT.mute}; cursor: pointer; font-size: 12px; padding: 2px; line-height: 0; }
.kb-search .clear:hover { color: ${BT.ink}; }
.kb-toolbar .right { margin-left: auto; display: flex; gap: 4px; align-items: center; }
.kb-toolbar .sep { width: 1px; height: 18px; background: ${BT.line}; margin: 0 2px; }

/* ============== BOARD SURFACE ============== */
.kb-scroll { flex: 1; overflow: auto; padding: 16px 24px 32px; }
.kb-cols { display: grid; gap: var(--kb-col-gap); grid-auto-rows: min-content; min-width: max-content; }

/* ============== COLUMN ============== */
.kb-col { background: ${BT.panel}; border: 1px solid ${BT.line}; border-radius: 10px; width: 286px; min-width: 286px; display: flex; flex-direction: column; align-self: start; position: relative; }
.kb-col.flat { min-height: 220px; }
/* Accent variants */
.kb-col[data-accent="cap"]  { border-top: 3px solid var(--tone, ${BT.line}); }
.kb-col[data-accent="bar"]  { border-left: 4px solid var(--tone, ${BT.line}); }
.kb-col[data-accent="dot"]  { /* no border accent, only header dot */ }
.kb-col[data-accent="soft"] { background: color-mix(in oklch, var(--tone, ${BT.line}) 12%, ${BT.panel}); border-color: color-mix(in oklch, var(--tone, ${BT.line}) 30%, ${BT.line}); }

.kb-col-head { padding: 10px 12px 4px; display: flex; align-items: center; gap: 8px; min-width: 0; }
.kb-lane-mode .kb-col-head { padding-bottom: 10px; }
.kb-col-head .chev { background: transparent; border: none; padding: 4px; border-radius: 6px; color: ${BT.mute}; cursor: pointer; display: inline-flex; }
.kb-col-head .chev:hover { background: ${BT.panel2}; color: ${BT.ink}; }
.kb-col-head .dot { width: 8px; height: 8px; border-radius: 999px; background: var(--tone, ${BT.line}); flex: 0 0 auto; }
.kb-col[data-accent="dot"] .kb-col-head .dot { width: 11px; height: 11px; }
.kb-col-head .name { flex: 1; font-size: 13px; font-weight: 600; color: ${BT.ink}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.kb-col-head .count { font-size: 11px; padding: 1px 8px; background: ${BT.panel2}; color: ${BT.dim}; border-radius: 999px; font-family: ${BT.mono}; flex: 0 0 auto; }
.kb-col-head .kebab { background: transparent; border: none; color: ${BT.mute}; font-size: 16px; letter-spacing: 1px; cursor: pointer; padding: 2px 4px; border-radius: 5px; flex: 0 0 auto; line-height: 1; }
.kb-col-head .kebab:hover, .kb-col-head .kebab.open { color: ${BT.ink}; background: ${BT.panel2}; }
.kb-col-body { padding: 8px 12px 12px; display: flex; flex-direction: column; gap: var(--kb-card-gap); flex: 1; }

/* Empty / add-card affordances */
.kb-empty-flat { flex: 1; min-height: 110px; display: flex; align-items: center; justify-content: center; cursor: pointer; border-radius: 8px; color: ${BT.mute}; transition: background .12s; }
.kb-empty-flat:hover { background: ${BT.panel2}; color: ${BT.brand}; }
.kb-empty-flat svg { width: 22px; height: 22px; }
.kb-add-card { padding: 6px; border-radius: 7px; color: ${BT.mute}; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; }
.kb-add-card:hover { background: ${BT.panel2}; color: ${BT.brand}; }

/* Collapsed column */
.kb-col.collapsed { width: 44px; min-width: 44px; }
.kb-col.collapsed .kb-col-head { flex-direction: column; padding: 8px 6px; gap: 8px; align-items: center; }
.kb-col.collapsed .kb-col-head .name { display: none; }
.kb-col.collapsed .kb-col-body { padding: 4px 0 10px; align-items: center; min-height: 60px; }
.kb-col.collapsed .vert-name { writing-mode: vertical-rl; transform: rotate(180deg); font-size: 11px; font-weight: 700; letter-spacing: 0.10em; text-transform: uppercase; color: ${BT.dim}; padding: 6px 2px; }

/* Add-column tile (last grid item) */
.kb-add-col { width: 260px; min-width: 260px; min-height: 120px; align-self: start; border: 1.5px dashed ${BT.line}; border-radius: 10px; display: flex; align-items: center; justify-content: center; gap: 8px; color: ${BT.mute}; font-size: 12.5px; cursor: pointer; background: transparent; }
.kb-add-col:hover { border-color: ${BT.brand}; color: ${BT.brand}; background: ${BT.brandSoft}; }

/* ============== CARD ============== */
.kb-card { background: ${BT.panel}; border: 1px solid ${BT.line}; border-radius: 9px; padding: var(--kb-card-pad-y) var(--kb-card-pad-x) 0; cursor: pointer; position: relative; transition: border-color .12s, box-shadow .12s; display: flex; flex-direction: column; }
.kb-card:hover { border-color: ${BT.brandSoft2}; box-shadow: 0 2px 6px -2px rgba(20,20,40,.10); }
.kb-card.selected { border-color: var(--kb-primary); box-shadow: 0 0 0 1px var(--kb-primary); }
/* Stripe variant — left stripe coloured by priority (or column accent if no priority) */
.kb-card[data-prist="stripe"] { padding-left: calc(var(--kb-card-pad-x) + 3px); }
.kb-card[data-prist="stripe"]::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; border-radius: 9px 0 0 9px; background: var(--card-stripe, ${BT.line}); }

.kb-card .title { font-size: 13px; font-weight: 600; color: ${BT.ink}; line-height: 1.35; padding-right: 18px; word-break: break-word; display: inline-flex; align-items: flex-start; gap: 7px; }
.kb-card .title .pri-dot { width: 8px; height: 8px; border-radius: 999px; margin-top: 5px; flex: 0 0 auto; background: var(--card-pri, ${BT.mute}); }
.kb-card .kebab-pos { position: absolute; top: 8px; right: 6px; color: ${BT.mute}; font-size: 14px; letter-spacing: 1px; cursor: pointer; opacity: 0; padding: 2px 6px; border-radius: 5px; line-height: 1; background: transparent; border: none; }
.kb-card:hover .kebab-pos, .kb-card.selected .kebab-pos, .kb-card .kebab-pos.open { opacity: 1; }
.kb-card .kebab-pos:hover, .kb-card .kebab-pos.open { background: ${BT.panel2}; color: ${BT.ink}; }
.kb-card .pri-pill { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; color: #fff; margin-top: 9px; align-self: flex-start; }
.kb-card .pri-pill.high { background: var(--kb-pri-high); }
.kb-card .pri-pill.med  { background: var(--kb-pri-med); }
.kb-card .pri-pill.low  { background: var(--kb-pri-low); }

.kb-card .row-meta { display: flex; align-items: center; gap: 10px; margin-top: 9px; }
.kb-card .row-meta .avatar { width: 22px; height: 22px; font-size: 9px; }
.kb-card .row-meta .dates { font-size: 11.5px; font-family: ${BT.mono}; color: ${BT.dim}; display: inline-flex; align-items: center; gap: 6px; }
.kb-card .row-meta .dates .arrow { color: ${BT.mute}; }
.kb-card .foot { margin-top: 10px; padding: 9px 0 10px; border-top: 1px dashed ${BT.line}; display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 10px; }
.kb-card .foot.no-bar { grid-template-columns: 1fr auto; }
.kb-card .foot .pct { font-size: 11px; color: ${BT.mute}; font-family: ${BT.mono}; min-width: 26px; }
.kb-card .foot .bar { height: 4px; border-radius: 999px; background: ${BT.panel3}; overflow: hidden; }
.kb-card .foot .bar > span { display: block; height: 100%; background: var(--kb-primary); border-radius: 999px; transition: width .2s; }
.kb-card .foot .sub { font-size: 11.5px; color: ${BT.mute}; cursor: pointer; padding: 2px 4px; border-radius: 4px; white-space: nowrap; }
.kb-card .foot .sub:hover { color: var(--kb-primary); background: ${BT.panel2}; }

/* Compact / wide density on card padding */
.kb[data-density="compact"] { --kb-card-pad-x: 12px; --kb-card-pad-y: 10px; --kb-card-gap: 9px; --kb-col-gap: 12px; }
.kb[data-density="normal"]  { --kb-card-pad-x: 14px; --kb-card-pad-y: 13px; --kb-card-gap: 11px; --kb-col-gap: 14px; }
.kb[data-density="wide"]    { --kb-card-pad-x: 18px; --kb-card-pad-y: 16px; --kb-card-gap: 14px; --kb-col-gap: 18px; }

/* ============== SWIMLANES ============== */
.kb-lane-head { padding: 12px 4px 8px; display: flex; align-items: center; gap: 8px; }
.kb-lane-head .chev { background: transparent; border: none; padding: 4px; color: ${BT.mute}; cursor: pointer; display: inline-flex; border-radius: 6px; }
.kb-lane-head .chev:hover { background: ${BT.panel2}; color: ${BT.ink}; }
.kb-lane-head .dot { width: 8px; height: 8px; border-radius: 999px; background: ${BT.mute}; }
.kb-lane-head .name { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: ${BT.dim}; }
.kb-lane-head .rule { flex: 1; height: 1px; border-top: 1px dashed ${BT.line}; }
.kb-lane-head .kebab { background: transparent; border: none; color: ${BT.mute}; font-size: 16px; letter-spacing: 1px; cursor: pointer; padding: 2px 6px; border-radius: 5px; }
.kb-lane-head .kebab:hover { background: ${BT.panel2}; color: ${BT.ink}; }
.kb-lane-cell { width: 286px; min-width: 286px; display: flex; flex-direction: column; gap: var(--kb-card-gap); padding: 4px 0; }
.kb-lane-cell.collapsed-col { width: 44px; min-width: 44px; }
.kb-drop { border: 1.5px dashed ${BT.line}; border-radius: 9px; min-height: 110px; display: flex; align-items: center; justify-content: center; color: ${BT.mute}; font-size: 10.5px; letter-spacing: 0.14em; text-transform: uppercase; }
.kb-add-cell { display: flex; align-items: center; justify-content: center; color: ${BT.mute}; padding: 4px; border-radius: 6px; cursor: pointer; font-size: 14px; }
.kb-add-cell:hover { color: var(--kb-primary); background: ${BT.panel2}; }
.kb-collapsed-side { display: flex; align-items: center; justify-content: center; min-height: 110px; }
.kb-collapsed-side .vert-name { writing-mode: vertical-rl; transform: rotate(180deg); font-size: 11px; font-weight: 700; letter-spacing: 0.10em; text-transform: uppercase; color: ${BT.dim}; }
.kb-add-lane { margin: 10px 4px 0; padding: 9px 12px; border: 1.5px dashed ${BT.line}; border-radius: 8px; display: inline-flex; align-items: center; gap: 8px; color: ${BT.mute}; font-size: 12px; cursor: pointer; background: transparent; }
.kb-add-lane:hover { border-color: var(--kb-primary); color: var(--kb-primary); }

/* ============== POPOVER (menus) ============== */
.kb-pop { position: fixed; z-index: 90; background: ${BT.panel}; border: 1px solid ${BT.line}; border-radius: 12px; box-shadow: 0 20px 50px -10px rgba(20,20,40,.18), 0 4px 12px rgba(20,20,40,.06); overflow: hidden; padding: 8px; }
.kb-pop .sect { padding: 8px 10px 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: ${BT.mute}; }
.kb-pop .item { display: flex; align-items: center; gap: 10px; padding: 7px 10px; border-radius: 7px; cursor: pointer; font-size: 13px; color: ${BT.ink}; }
.kb-pop .item:hover { background: ${BT.panel2}; }
.kb-pop .item .ico { width: 18px; display: inline-flex; align-items: center; justify-content: center; color: var(--kb-primary); }
.kb-pop .item.danger { color: ${BT.high}; }
.kb-pop .item.danger .ico { color: ${BT.high}; }
.kb-pop .item.disabled { color: ${BT.mute}; cursor: default; }
.kb-pop .item.disabled .ico { color: ${BT.mute}; }
.kb-pop .item.disabled:hover { background: transparent; }
.kb-pop .item .kbd { margin-left: auto; font-family: ${BT.mono}; font-size: 10px; color: ${BT.mute}; padding: 1px 6px; border: 1px solid ${BT.line}; border-radius: 4px; background: ${BT.panel2}; }
.kb-pop .div { height: 1px; background: ${BT.line}; margin: 6px 4px; }

/* ============== ADICIONAR (toolbar dropdown) ============== */
/* (Não há mais botões de adicionar na toolbar — o "+" agora vive
   junto às colunas e às swimlanes, no contexto da ação.) */

/* ============== SETTINGS OFFCANVAS ============== */
.kb-oc-backdrop { position: fixed; inset: 0; background: rgba(15,15,28,.18); z-index: 100; opacity: 0; pointer-events: none; transition: opacity .18s ease; }
.kb-oc-backdrop.open { opacity: 1; pointer-events: auto; }
.kb-oc { position: fixed; top: 0; right: 0; bottom: 0; width: 420px; max-width: 100vw; background: ${BT.panel}; border-left: 1px solid ${BT.line}; box-shadow: -16px 0 32px -16px rgba(20,20,40,.18); z-index: 101; transform: translate3d(100%, 0, 0); transition: transform .22s cubic-bezier(.2,.7,.2,1); display: flex; flex-direction: column; }
.kb-oc.open { transform: translate3d(0, 0, 0) !important; }
.kb-oc-head { padding: 18px 20px 8px; display: flex; align-items: center; gap: 10px; }
.kb-oc-head .ic { color: ${BT.ink2}; display: inline-flex; }
.kb-oc-head .title { font-size: 18px; font-weight: 600; color: ${BT.ink}; letter-spacing: -0.2px; }
.kb-oc-head .close { margin-left: auto; background: transparent; border: none; color: ${BT.dim}; padding: 4px; border-radius: 6px; cursor: pointer; display: inline-flex; }
.kb-oc-head .close:hover { background: ${BT.panel2}; color: ${BT.ink}; }
.kb-oc-sub { padding: 0 20px 16px; color: ${BT.dim}; font-size: 12.5px; line-height: 1.5; }
.kb-oc-tabs { display: flex; padding: 0 20px; border-bottom: 1px solid ${BT.line}; gap: 22px; }
.kb-oc-tabs .tab { padding: 10px 0; font-size: 13px; color: ${BT.dim}; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; }
.kb-oc-tabs .tab:hover { color: ${BT.ink}; }
.kb-oc-tabs .tab.active { color: var(--kb-primary); border-bottom-color: var(--kb-primary); font-weight: 600; }
.kb-oc-body { flex: 1; overflow-y: auto; padding: 20px 20px 28px; }

/* Setting row */
.kb-st { margin-bottom: 14px; padding: 10px 12px; background: ${BT.panel2}; border-radius: 9px; }
.kb-st .label { font-size: 12.5px; color: ${BT.ink2}; font-weight: 600; margin-bottom: 8px; }
.kb-st .help { font-size: 11.5px; color: ${BT.mute}; margin-top: 4px; line-height: 1.4; }
.kb-st.row { display: flex; align-items: flex-start; gap: 14px; }
.kb-st.row .label-col { flex: 1; min-width: 0; }
.kb-st.row .label-col .label { margin-bottom: 2px; }
/* Segmented control */
.kb-seg { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 6px; padding: 4px; background: ${BT.panel3}; border-radius: 8px; }
.kb-seg .opt { padding: 8px 4px; border: 1px solid transparent; border-radius: 6px; font-size: 12.5px; cursor: pointer; text-align: center; color: ${BT.ink2}; background: transparent; font-family: inherit; }
.kb-seg .opt:hover { color: ${BT.ink}; }
.kb-seg .opt.active { background: var(--kb-primary); color: #fff; font-weight: 600; }
/* Toggle */
.kb-tog { width: 38px; height: 22px; border-radius: 999px; background: ${BT.panel3}; border: 1px solid ${BT.line}; position: relative; cursor: pointer; flex: 0 0 auto; transition: background .18s; }
.kb-tog::after { content: ''; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 999px; background: ${BT.panel}; box-shadow: 0 1px 2px rgba(0,0,0,.18); transition: left .18s, background .18s; }
.kb-tog.on { background: var(--kb-primary); border-color: var(--kb-primary); }
.kb-tog.on::after { left: 18px; background: #fff; }
/* Color swatch + hex input */
.kb-color-row { display: flex; align-items: center; gap: 12px; }
.kb-color-row .swatch { width: 28px; height: 28px; border-radius: 7px; border: 1px solid ${BT.line}; cursor: pointer; position: relative; overflow: hidden; flex: 0 0 auto; }
.kb-color-row .swatch input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.kb-color-row input[type="text"] { flex: 1; height: 30px; padding: 0 10px; border-radius: 7px; border: 1px solid ${BT.line}; background: ${BT.panel}; color: ${BT.ink}; font-size: 12.5px; font-family: ${BT.mono}; outline: none; }
.kb-color-row input[type="text"]:focus { border-color: var(--kb-primary); box-shadow: 0 0 0 3px ${BT.brandSoft}; }
.kb-color-list { display: flex; flex-direction: column; gap: 10px; }
.kb-color-list .item { display: flex; align-items: center; padding: 6px 8px; border-radius: 7px; }
.kb-color-list .item:hover { background: ${BT.panel3}; }
.kb-color-list .item .lab { flex: 1; font-size: 13px; color: ${BT.ink2}; }
.kb-color-list .item .sw { width: 30px; height: 24px; border-radius: 6px; border: 1px solid ${BT.line}; cursor: pointer; position: relative; overflow: hidden; }
.kb-color-list .item .sw input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.kb-st .group-title { font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: ${BT.mute}; margin: 4px 4px 8px; }

/* ============== RESPONSIVE ============== */
@media (max-width: 880px) {
  .kb-toolbar { padding: 10px 14px; }
  .kb-scroll { padding: 12px 14px 24px; }
  .kb-col, .kb-lane-cell { width: 250px; min-width: 250px; }
  .kb-add-col { width: 232px; min-width: 232px; }
  .kb-search { flex: 1 1 100%; order: 5; }
  .kb-oc { width: 100vw; }
}
`;

window.boardCss = boardCss;

// ============================================================
// DATA
// ============================================================

const boardColumns = [
  { id: 'todo',   name: 'A fazer',      toneKey: 'todo' },
  { id: 'vibe',   name: 'Vibe Coding',  toneKey: 'inprogress' },
  { id: 'test',   name: 'Testes',       toneKey: 'todo' },
  { id: 'done',   name: 'Concluído',    toneKey: 'done' },
];

const boardLanes = [
  { id: 'general', name: 'Geral' },
  { id: 'new',     name: 'Nova swimlane' },
];

const boardCards = [
  { id: 'c1',  col: 'todo', lane: 'general', title: 'Ordem das discussões' },
  { id: 'c2',  col: 'todo', lane: 'general', title: 'Editor rich text com imagens seguras — Tiptap + S3 privado + cache de URL', who: 'TM', whoBg: '#e8704c', from: '11/05', to: '16/05' },
  { id: 'c3',  col: 'todo', lane: 'general', title: 'Modelagem de planos com suporte a legado e descontinuação', who: 'TM', whoBg: '#e8704c', from: '09/05', to: '12/05' },
  { id: 'c4',  col: 'todo', lane: 'new',     title: 'Atualizar o Prisma · Update available 6.19.2 → 7.8.0', pri: 'high', who: 'TM', whoBg: '#e8704c', from: '09/05', to: '12/05' },
  { id: 'c5',  col: 'todo', lane: 'general', title: 'Implementar feature "Seguir" na task', who: 'LM', whoBg: '#4a89c4', from: '12/05', to: '18/05' },

  { id: 'c6',  col: 'vibe', lane: 'general', title: 'Implementar sistema de Tags', from: '11/05', to: '16/05', pct: 25 },
  { id: 'c7',  col: 'vibe', lane: 'general', title: 'Implementar GuardDutty', pri: 'low', from: '09/05', to: '12/05' },
  { id: 'c8',  col: 'vibe', lane: 'general', title: 'BUG — Gantt modo dia com hora marcando baseado na hora', from: '11/05', to: '16/05', pct: 40 },

  { id: 'c9',  col: 'done', lane: 'general', title: 'Websockets para notificações', pri: 'high', who: 'JR', whoBg: '#d97a86', from: '11/05', to: '12/05', pct: 100 },
  { id: 'c10', col: 'done', lane: 'general', title: 'Board — Título do card abre a tarefa', from: '09/05', to: '12/05', pct: 100 },
  { id: 'c11', col: 'done', lane: 'general', title: 'Regras nas tasks', who: 'PC', whoBg: '#8c5cc4', pct: 100 },
  { id: 'c12', col: 'done', lane: 'general', title: '[urgente] Mudar path S3', pri: 'high', who: 'TM', whoBg: '#e8704c', from: '11/05', to: '16/05', pct: 100 },
];

// ============================================================
// SETTINGS — defaults
// ============================================================

const defaultSettings = {
  density: 'compact',          // compact | normal | wide
  columnAccent: 'cap',         // cap | bar | dot | soft
  priorityStyle: 'pill',       // pill | dot | stripe
  showSubtasks: true,
  showProgress: true,
  showDates: true,
  showAssignees: true,
  showPriority: true,
  primary: '#7c5cff',
  priColors: { high: '#ef4444', med: '#f59e0b', low: '#3b82f6', none: '#9ca3af' },
  colColors: { todo: '#9ca3af', inprogress: '#7c5cff', done: '#10b981' },
};

// ============================================================
// KPopover — minimal anchored popover (fixed positioning)
// ============================================================
function KPopover({ anchor, onClose, width = 240, align = 'right', children }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ visibility: 'hidden', top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!anchor || !ref.current) return;
    const a = anchor.getBoundingClientRect();
    const p = ref.current.getBoundingClientRect();
    let top = a.bottom + 6;
    let left = align === 'right' ? a.right - p.width : a.left;
    top = Math.max(8, Math.min(top, window.innerHeight - p.height - 8));
    left = Math.max(8, Math.min(left, window.innerWidth - p.width - 8));
    setPos({ top, left, visibility: 'visible' });
  }, [anchor, align]);

  useEffect(() => {
    function onDown(e) {
      if (!ref.current) return;
      if (ref.current.contains(e.target)) return;
      if (anchor && anchor.contains(e.target)) return;
      onClose();
    }
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [anchor, onClose]);

  return (
    <div ref={ref} className="kb-pop" style={{ ...pos, width }}>
      {children}
    </div>
  );
}

// ============================================================
// KCard
// ============================================================
function KCard({ card, selected, onSelect, onMenu, menuOpen, settings, accentColor }) {
  const pct = card.pct ?? 0;
  const priLabel = { high: 'High', med: 'Medium', low: 'Low' }[card.pri];
  const priVar = card.pri ? `var(--kb-pri-${card.pri})` : 'var(--kb-pri-none)';

  const showPri = settings.showPriority && !!card.pri;
  const showPill = showPri && settings.priorityStyle === 'pill';
  const showDot  = showPri && settings.priorityStyle === 'dot';
  const stripe   = settings.priorityStyle === 'stripe' ? (card.pri ? priVar : accentColor) : undefined;

  const showAssignee = settings.showAssignees && !!card.who;
  const showDates    = settings.showDates && !!(card.from && card.to);
  const showMeta     = showAssignee || showDates;
  const showFoot     = settings.showProgress || settings.showSubtasks;

  function clickKebab(e) {
    e.stopPropagation();
    onMenu && onMenu(card.id, e.currentTarget);
  }

  return (
    <div
      className={'kb-card' + (selected ? ' selected' : '')}
      data-prist={settings.priorityStyle}
      style={stripe ? { '--card-stripe': stripe, '--card-pri': priVar } : { '--card-pri': priVar }}
      onClick={() => onSelect && onSelect(card.id)}
    >
      <div className="title">
        {showDot && <span className="pri-dot"></span>}
        <span>{card.title}</span>
      </div>
      <button className={'kebab-pos' + (menuOpen ? ' open' : '')} onClick={clickKebab} aria-label="Opções da tarefa">⋮</button>

      {showPill && <span className={'pri-pill ' + card.pri}>{priLabel}</span>}

      {showMeta && (
        <div className="row-meta">
          {showAssignee && (
            <div className="avatar" title={card.who} style={{ background: card.whoBg || '#888' }}>{card.who}</div>
          )}
          {showDates && (
            <span className="dates">
              <span>{card.from}</span>
              <span className="arrow">→</span>
              <span>{card.to}</span>
            </span>
          )}
        </div>
      )}

      {showFoot && (
        <div className={'foot' + (!settings.showProgress ? ' no-bar' : '')}>
          {settings.showProgress && <>
            <span className="pct">{pct}%</span>
            <span className="bar"><span style={{ width: pct + '%' }}></span></span>
          </>}
          {settings.showSubtasks && (
            <span className="sub" onClick={(e) => e.stopPropagation()}>+ Subtarefa</span>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Menus
// ============================================================
function ColumnMenu({ anchor, onClose, onAction, isFirst, isLast }) {
  const item = (key, label, icon, kbd, opts = {}) => (
    <div className={'item' + (opts.danger ? ' danger' : '') + (opts.disabled ? ' disabled' : '')}
         onClick={opts.disabled ? null : () => { onAction(key); onClose(); }}>
      <span className="ico">{icon}</span>
      <span>{label}</span>
      {kbd && <span className="kbd">{kbd}</span>}
    </div>
  );
  return (
    <KPopover anchor={anchor} onClose={onClose} width={244}>
      <div className="sect">Coluna</div>
      {item('new-task',  'Nova tarefa', <I.plusBold />, 'N')}
      {item('rename',    'Renomear',    <I.pencil />, 'F2')}
      <div className="sect">Mover</div>
      {item('move-left',  'Mover esquerda',     <I.arrL />,       null, { disabled: isFirst })}
      {item('move-right', 'Mover direita',      <I.arrR />,       null, { disabled: isLast })}
      {item('toggle',     'Recolher / Expandir', <I.doubleChev />)}
      {item('rules',      'Rules',               <I.rules />)}
      <div className="div"></div>
      {item('delete',    'Eliminar', <I.trash />, null, { danger: true })}
    </KPopover>
  );
}

function CardMenu({ anchor, onClose, onAction }) {
  const item = (key, label, icon, opts = {}) => (
    <div className={'item' + (opts.danger ? ' danger' : '')}
         onClick={() => { onAction(key); onClose(); }}>
      <span className="ico">{icon}</span>
      <span>{label}</span>
    </div>
  );
  return (
    <KPopover anchor={anchor} onClose={onClose} width={208}>
      {item('edit',    'Edit',          <I.edit />)}
      {item('subtask', '+ Add subtask', <I.gavel />)}
      <div className="div"></div>
      {item('delete',  'Delete',        <I.ban />, { danger: true })}
    </KPopover>
  );
}

// ============================================================
// Column header
// ============================================================
function ColHeader({ col, count, collapsed, toneColor, onToggle, onMenu, menuOpen }) {
  function clickKebab(e) {
    e.stopPropagation();
    onMenu && onMenu(col.id, e.currentTarget);
  }
  return (
    <div className="kb-col-head">
      <button className="chev" onClick={onToggle} aria-label={collapsed ? 'Expandir' : 'Recolher'}>
        {collapsed ? <I.chevR /> : <I.chevL />}
      </button>
      <span className="dot"></span>
      <span className="name">{col.name}</span>
      <span className="count">{count}</span>
      <button className={'kebab' + (menuOpen ? ' open' : '')} onClick={clickKebab} aria-label="Opções da coluna">⋯</button>
    </div>
  );
}

// ============================================================
// Settings offcanvas
// ============================================================
function Seg({ value, onChange, options }) {
  return (
    <div className="kb-seg" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map(o => (
        <button key={o.value} className={'opt' + (value === o.value ? ' active' : '')} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({ on, onChange }) {
  return <span className={'kb-tog' + (on ? ' on' : '')} onClick={() => onChange(!on)} role="switch" aria-checked={on}></span>;
}

function ColorSwatch({ value, onChange, small }) {
  const style = { background: value, width: small ? 30 : 28, height: small ? 24 : 28 };
  return (
    <span className={'sw'} style={style}>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
    </span>
  );
}

function SettingsPanel({ open, settings, setSettings, onClose }) {
  const [tab, setTab] = useState('visual');

  function patch(k, v) { setSettings(s => ({ ...s, [k]: v })); }
  function patchObj(group, key, value) {
    setSettings(s => ({ ...s, [group]: { ...s[group], [key]: value } }));
  }

  return (
    <>
      <div className={'kb-oc-backdrop' + (open ? ' open' : '')} onClick={onClose}></div>
      <aside className={'kb-oc' + (open ? ' open' : '')} aria-hidden={!open}>
        <div className="kb-oc-head">
          <span className="ic"><I.board /></span>
          <span className="title">Board settings</span>
          <button className="close" onClick={onClose} aria-label="Fechar">
            <I.x />
          </button>
        </div>
        <div className="kb-oc-sub">As alterações são guardadas automaticamente e aplicadas a todos os membros do projeto.</div>

        <div className="kb-oc-tabs">
          <div className={'tab' + (tab === 'visual' ? ' active' : '')} onClick={() => setTab('visual')}>Visual</div>
          <div className={'tab' + (tab === 'behavior' ? ' active' : '')} onClick={() => setTab('behavior')}>Behavior</div>
          <div className={'tab' + (tab === 'colors' ? ' active' : '')} onClick={() => setTab('colors')}>Colors</div>
        </div>

        <div className="kb-oc-body">
          {tab === 'visual' && <>
            <div className="kb-st">
              <div className="label">Densidade</div>
              <Seg value={settings.density} onChange={(v) => patch('density', v)} options={[
                { value: 'compact', label: 'Compact' },
                { value: 'normal',  label: 'Normal' },
                { value: 'wide',    label: 'Wide' },
              ]} />
            </div>
            <div className="kb-st">
              <div className="label">Acento da coluna</div>
              <Seg value={settings.columnAccent} onChange={(v) => patch('columnAccent', v)} options={[
                { value: 'cap',  label: 'Cap' },
                { value: 'bar',  label: 'Bar' },
                { value: 'dot',  label: 'Dot' },
                { value: 'soft', label: 'Soft' },
              ]} />
            </div>
            <div className="kb-st">
              <div className="label">Estilo de prioridade</div>
              <Seg value={settings.priorityStyle} onChange={(v) => patch('priorityStyle', v)} options={[
                { value: 'pill',   label: 'Pill' },
                { value: 'dot',    label: 'Dot' },
                { value: 'stripe', label: 'Stripe' },
              ]} />
            </div>
          </>}

          {tab === 'behavior' && <>
            <BehaviorRow label="Mostrar subtarefas como cards" help="Quando ativo, subtarefas são renderizadas como cards individuais no quadro." on={settings.showSubtasks} onChange={(v) => patch('showSubtasks', v)} />
            <BehaviorRow label="Mostrar barra de progresso" help="Barra segmentada de progresso para tarefas com subtarefas." on={settings.showProgress} onChange={(v) => patch('showProgress', v)} />
            <BehaviorRow label="Mostrar datas" help="Intervalo de datas (início — fim) em cada card." on={settings.showDates} onChange={(v) => patch('showDates', v)} />
            <BehaviorRow label="Mostrar responsáveis" help="Avatares pequenos dos responsáveis em cada card." on={settings.showAssignees} onChange={(v) => patch('showAssignees', v)} />
            <BehaviorRow label="Mostrar prioridade" help="Etiqueta de prioridade em cada card." on={settings.showPriority} onChange={(v) => patch('showPriority', v)} />
          </>}

          {tab === 'colors' && <>
            <div className="kb-st">
              <div className="label">Cor primária</div>
              <div className="kb-color-row">
                <span className="swatch" style={{ background: settings.primary }}>
                  <input type="color" value={settings.primary} onChange={(e) => patch('primary', e.target.value)} />
                </span>
                <input type="text" value={settings.primary} onChange={(e) => patch('primary', e.target.value)} />
              </div>
            </div>
            <div className="kb-st">
              <div className="label">Cores de prioridade</div>
              <div className="kb-color-list">
                {[
                  ['high', 'High priority'],
                  ['med',  'Medium priority'],
                  ['low',  'Low priority'],
                  ['none', 'No priority'],
                ].map(([k, lab]) => (
                  <div key={k} className="item">
                    <span className="lab">{lab}</span>
                    <ColorSwatch value={settings.priColors[k]} onChange={(v) => patchObj('priColors', k, v)} small />
                  </div>
                ))}
              </div>
            </div>
            <div className="kb-st">
              <div className="label">Cores das colunas-sistema</div>
              <div className="kb-color-list">
                {[
                  ['todo',       'A fazer'],
                  ['inprogress', 'Em curso'],
                  ['done',       'Concluído'],
                ].map(([k, lab]) => (
                  <div key={k} className="item">
                    <span className="lab">{lab}</span>
                    <ColorSwatch value={settings.colColors[k]} onChange={(v) => patchObj('colColors', k, v)} small />
                  </div>
                ))}
              </div>
            </div>
          </>}
        </div>
      </aside>
    </>
  );
}

function BehaviorRow({ label, help, on, onChange }) {
  return (
    <div className="kb-st row">
      <div className="label-col">
        <div className="label">{label}</div>
        <div className="help">{help}</div>
      </div>
      <Toggle on={on} onChange={onChange} />
    </div>
  );
}

// ============================================================
// Boards (flat / lane)
// ============================================================
function FlatBoard({ columns, cards, collapsedCols, toggleCol, selected, setSelected, settings, openColumnMenu, openCardMenu, openMenus, onAddColumn }) {
  const tpl = columns.map(c => collapsedCols[c.id] ? '44px' : '286px').join(' ') + ' auto';
  return (
    <div className="kb-cols" style={{ gridTemplateColumns: tpl }}>
      {columns.map((col, idx) => {
        const rows = cards.filter(c => c.col === col.id);
        const collapsed = collapsedCols[col.id];
        const toneColor = settings.colColors[col.toneKey] || BT.line;
        return (
          <div
            key={col.id}
            className={'kb-col flat' + (collapsed ? ' collapsed' : '')}
            data-accent={settings.columnAccent}
            style={{ '--tone': toneColor }}
          >
            <ColHeader
              col={col} count={rows.length} collapsed={collapsed} toneColor={toneColor}
              onToggle={() => toggleCol(col.id)}
              onMenu={(id, anchor) => openColumnMenu(id, anchor, idx)}
              menuOpen={openMenus.column === col.id}
            />
            <div className="kb-col-body">
              {collapsed ? (
                <span className="vert-name">{col.name}</span>
              ) : rows.length === 0 ? (
                <div className="kb-empty-flat" title="Adicionar tarefa"><I.plus /></div>
              ) : (
                <>
                  {rows.map(c => (
                    <KCard
                      key={c.id} card={c}
                      selected={selected === c.id}
                      onSelect={setSelected}
                      onMenu={openCardMenu}
                      menuOpen={openMenus.card === c.id}
                      settings={settings}
                      accentColor={toneColor}
                    />
                  ))}
                  <div className="kb-add-card"><I.plus /> Adicionar tarefa</div>
                </>
              )}
            </div>
          </div>
        );
      })}
      <button className="kb-add-col" onClick={onAddColumn}>
        <I.plus /> Nova coluna
      </button>
    </div>
  );
}

function LaneBoard({ columns, lanes, cards, collapsedCols, toggleCol, collapsedLanes, toggleLane, selected, setSelected, settings, openColumnMenu, openCardMenu, openMenus, onAddColumn, onAddLane }) {
  const tpl = columns.map(c => collapsedCols[c.id] ? '44px' : '286px').join(' ') + ' auto';
  return (
    <div className="kb-cols kb-lane-mode" style={{ gridTemplateColumns: tpl }}>
      {columns.map((col, idx) => {
        const total = cards.filter(c => c.col === col.id).length;
        const collapsed = collapsedCols[col.id];
        const toneColor = settings.colColors[col.toneKey] || BT.line;
        return (
          <div
            key={'h-' + col.id}
            className={'kb-col' + (collapsed ? ' collapsed' : '')}
            data-accent={settings.columnAccent}
            style={{ '--tone': toneColor, minHeight: 0 }}
          >
            <ColHeader
              col={col} count={total} collapsed={collapsed} toneColor={toneColor}
              onToggle={() => toggleCol(col.id)}
              onMenu={(id, anchor) => openColumnMenu(id, anchor, idx)}
              menuOpen={openMenus.column === col.id}
            />
          </div>
        );
      })}
      <span></span>

      {lanes.map(lane => {
        const laneCollapsed = collapsedLanes[lane.id];
        return (
          <Fragment key={lane.id}>
            <div style={{ gridColumn: '1 / -1' }}>
              <div className="kb-lane-head">
                <button className="chev" onClick={() => toggleLane(lane.id)} aria-label={laneCollapsed ? 'Expandir' : 'Recolher'}>
                  {laneCollapsed ? <I.chevR /> : <I.chevD />}
                </button>
                <span className="dot"></span>
                <span className="name">{lane.name}</span>
                <span className="rule"></span>
                <button className="kebab">⋯</button>
              </div>
            </div>

            {!laneCollapsed && <>
              {columns.map(col => {
                const rows = cards.filter(c => c.col === col.id && c.lane === lane.id);
                const collapsed = collapsedCols[col.id];
                const toneColor = settings.colColors[col.toneKey] || BT.line;
                if (collapsed) {
                  return (
                    <div key={col.id + '-' + lane.id} className="kb-lane-cell collapsed-col">
                      <div className="kb-collapsed-side">
                        <span className="vert-name">{col.name}</span>
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={col.id + '-' + lane.id} className="kb-lane-cell">
                    {rows.length === 0 ? (
                      <div className="kb-drop">Drop here</div>
                    ) : (
                      rows.map(c => (
                        <KCard
                          key={c.id} card={c}
                          selected={selected === c.id}
                          onSelect={setSelected}
                          onMenu={openCardMenu}
                          menuOpen={openMenus.card === c.id}
                          settings={settings}
                          accentColor={toneColor}
                        />
                      ))
                    )}
                    <div className="kb-add-cell"><I.plus /></div>
                  </div>
                );
              })}
              <span></span>
            </>}
          </Fragment>
        );
      })}

      <div style={{ gridColumn: '1 / -1' }}>
        <button className="kb-add-lane" onClick={onAddLane}>
          <I.plus /> Nova swimlane
        </button>
      </div>
    </div>
  );
}

// ============================================================
// BoardView
// ============================================================
function BoardView({ filter = '' }) {
  const [columns, setColumns] = useState(boardColumns);
  const [lanes, setLanes]     = useState(boardLanes);
  const [cards, setCards]     = useState(boardCards);
  const [selected, setSel]    = useState('c6');
  const [showLanes, setShowLanes] = useState(false);
  const [collapsedCols, setCC] = useState({});
  const [collapsedLanes, setCL] = useState({});
  const search = filter || '';
  const [settings, setSettings] = useState(defaultSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Expose settings opener to the shared ViewActions bar (gear icon).
  useEffect(() => {
    window.__openCurrentViewSettings = () => setSettingsOpen(true);
    return () => { delete window.__openCurrentViewSettings; };
  }, []);

  // Menu state — { column: colId|null, anchor: el } & { card: cardId|null, anchor: el }
  const [columnMenu, setColumnMenu] = useState(null);
  const [cardMenu, setCardMenu] = useState(null);
  const openMenus = { column: columnMenu?.colId, card: cardMenu?.cardId };

  const toggleCol  = (id) => setCC(s => ({ ...s, [id]: !s[id] }));
  const toggleLane = (id) => setCL(s => ({ ...s, [id]: !s[id] }));

  // Search filter
  const visibleCards = useMemo(() => {
    if (!search.trim()) return cards;
    const q = search.toLowerCase();
    return cards.filter(c => c.title.toLowerCase().includes(q));
  }, [cards, search]);

  // CSS vars from settings — applied on .kb root
  const cssVars = {
    '--kb-primary': settings.primary,
    '--kb-pri-high': settings.priColors.high,
    '--kb-pri-med':  settings.priColors.med,
    '--kb-pri-low':  settings.priColors.low,
    '--kb-pri-none': settings.priColors.none,
  };

  // ---------- Menu actions ----------
  function openColumnMenu(colId, anchor, idx) {
    setCardMenu(null);
    setColumnMenu({ colId, anchor, idx });
  }
  function openCardMenu(cardId, anchor) {
    setColumnMenu(null);
    setCardMenu({ cardId, anchor });
  }
  function closeMenus() { setColumnMenu(null); setCardMenu(null); }

  function handleColumnAction(key) {
    if (!columnMenu) return;
    const { colId, idx } = columnMenu;
    if (key === 'move-left' && idx > 0) {
      setColumns(cs => { const a = [...cs]; [a[idx - 1], a[idx]] = [a[idx], a[idx - 1]]; return a; });
    } else if (key === 'move-right' && idx < columns.length - 1) {
      setColumns(cs => { const a = [...cs]; [a[idx + 1], a[idx]] = [a[idx], a[idx + 1]]; return a; });
    } else if (key === 'toggle') {
      toggleCol(colId);
    } else if (key === 'delete') {
      setColumns(cs => cs.filter(c => c.id !== colId));
      setCards(cs => cs.filter(c => c.col !== colId));
    }
    // new-task / rename / rules: no-op stub
  }

  function handleCardAction(key) {
    if (!cardMenu) return;
    const id = cardMenu.cardId;
    if (key === 'delete') setCards(cs => cs.filter(c => c.id !== id));
    // edit / subtask: no-op stub
  }

  function addColumn() {
    const n = columns.length + 1;
    const id = 'col' + Date.now();
    setColumns(cs => [...cs, { id, name: 'Nova coluna ' + n, toneKey: 'todo' }]);
  }
  function addLane() {
    const id = 'lane' + Date.now();
    setLanes(ls => [...ls, { id, name: 'Nova swimlane' }]);
  }

  return (
    <div className="kb" style={cssVars} data-density={settings.density}>
      {/* TOOLBAR */}
      <div className="kb-toolbar">
        <button
          className={'kb-icon-btn' + (showLanes ? ' on' : '')}
          title={showLanes ? 'Ocultar swimlanes' : 'Mostrar swimlanes'}
          onClick={() => setShowLanes(v => !v)}
        >
          <I.lanes />
        </button>

        <div className="right">
          <button className="kb-icon-btn bare" title="Desfazer"><I.undo /></button>
          <button className="kb-icon-btn bare" title="Refazer"><I.redo /></button>
        </div>
      </div>

      {/* BOARD */}
      <div className="kb-scroll">
        {showLanes ? (
          <LaneBoard
            columns={columns} lanes={lanes} cards={visibleCards}
            collapsedCols={collapsedCols} toggleCol={toggleCol}
            collapsedLanes={collapsedLanes} toggleLane={toggleLane}
            selected={selected} setSelected={setSel}
            settings={settings}
            openColumnMenu={openColumnMenu} openCardMenu={openCardMenu}
            openMenus={openMenus}
            onAddColumn={addColumn} onAddLane={addLane}
          />
        ) : (
          <FlatBoard
            columns={columns} cards={visibleCards}
            collapsedCols={collapsedCols} toggleCol={toggleCol}
            selected={selected} setSelected={setSel}
            settings={settings}
            openColumnMenu={openColumnMenu} openCardMenu={openCardMenu}
            openMenus={openMenus}
            onAddColumn={addColumn}
          />
        )}
      </div>

      {/* MENUS */}
      {columnMenu && (
        <ColumnMenu
          anchor={columnMenu.anchor}
          onClose={closeMenus}
          onAction={handleColumnAction}
          isFirst={columnMenu.idx === 0}
          isLast={columnMenu.idx === columns.length - 1}
        />
      )}
      {cardMenu && (
        <CardMenu
          anchor={cardMenu.anchor}
          onClose={closeMenus}
          onAction={handleCardAction}
        />
      )}

      {/* SETTINGS OFFCANVAS */}
      <SettingsPanel
        open={settingsOpen}
        settings={settings}
        setSettings={setSettings}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}

Object.assign(window, { BoardView, boardCss });
