/* eslint-disable */
// AWP — App shell · Helio identity, Asana-inspired structure.
// Sidebar fully hides on collapse (no rail). Top bar persists.

const T = {
  bg: 'var(--bg)',
  panel: 'var(--panel)',
  panel2: 'var(--panel2)',
  panel3: 'var(--panel3)',
  line: 'var(--line)',
  lineSoft: 'var(--lineSoft)',
  ink: 'var(--ink)',
  ink2: 'var(--ink2)',
  dim: 'var(--dim)',
  mute: 'var(--mute)',
  brand: 'var(--brand)',
  brandHover: 'var(--brandHover)',
  brandSoft: 'var(--brandSoft)',
  brandSoft2: 'var(--brandSoft2)',
  todo: 'var(--st-todo)',          todoInk: 'var(--st-todoInk)',
  doing: 'var(--st-doing)',        doingInk: 'var(--st-doingInk)',
  done: 'var(--st-done)',          doneInk: 'var(--st-doneInk)',
  blocked: 'var(--st-blocked)',    blockedInk: 'var(--st-blockedInk)',
  review: 'var(--st-review)',      reviewInk: 'var(--st-reviewInk)',
  high: 'var(--pri-high)',
  med:  'var(--pri-med)',
  low:  'var(--pri-low)',
  font: '"Geist", "Inter", -apple-system, system-ui, sans-serif',
  mono: '"Geist Mono", "JetBrains Mono", ui-monospace, monospace',
};

const css = `
/* ============================================================
   THEME TOKENS — light (default) and dark.
   Every color used by the app is plumbed through these CSS
   custom properties so the toggle swaps the whole palette.
   ============================================================ */
:root {
  --bg:        oklch(0.985 0.003 250);
  --panel:     #ffffff;
  --panel2:    oklch(0.965 0.006 250);
  --panel3:    oklch(0.945 0.008 250);
  --line:      oklch(0.92 0.008 250);
  --lineSoft:  oklch(0.95 0.005 250);
  --ink:       oklch(0.22 0.02 250);
  --ink2:      oklch(0.35 0.018 250);
  --dim:       oklch(0.48 0.014 250);
  --mute:      oklch(0.62 0.012 250);
  --brand:       oklch(0.55 0.20 264);
  --brandHover:  oklch(0.50 0.22 264);
  --brandSoft:   oklch(0.95 0.04 264);
  --brandSoft2:  oklch(0.92 0.06 264);
  --st-todo:    oklch(0.94 0.008 250); --st-todoInk:    oklch(0.42 0.020 250);
  --st-doing:   oklch(0.95 0.045 70);   --st-doingInk:   oklch(0.44 0.110 60);
  --st-done:    oklch(0.95 0.050 155);  --st-doneInk:    oklch(0.40 0.110 155);
  --st-blocked: oklch(0.94 0.060 25);   --st-blockedInk: oklch(0.46 0.140 25);
  --st-review:  oklch(0.95 0.045 295);  --st-reviewInk:  oklch(0.42 0.120 295);
  --pri-high: oklch(0.65 0.20 25);
  --pri-med:  oklch(0.72 0.16 70);
  --pri-low:  oklch(0.70 0.10 220);

  /* Chrome (sidebar + topbar) — dark indigo in BOTH themes,
     this is the design intent of the "app-dark" variant. Slightly
     adjusted in dark mode for cohesion. */
  --chrome-bg:        oklch(0.21 0.026 264);
  --chrome-bg2:       oklch(0.26 0.030 264);
  --chrome-bg3:       oklch(0.30 0.032 264);
  --chrome-line:      oklch(0.33 0.026 264);
  --chrome-ink:       oklch(0.96 0.008 250);
  --chrome-dim:       oklch(0.74 0.015 250);
  --chrome-mute:      oklch(0.56 0.014 250);
  --chrome-active-bg: oklch(0.34 0.10 264);
  --chrome-brand-soft: oklch(0.40 0.12 264 / 0.35);

  /* Accent tints used across home/project views — themed here so
     hardcoded oklch() calls in component CSS can switch too. */
  --notes-bg:    oklch(0.97 0.04 90);
  --notes-line:  oklch(0.90 0.06 90);
  --notes-ink:   oklch(0.32 0.05 80);
  --notes-ink2:  oklch(0.32 0.08 80);
  --notes-mute:  oklch(0.50 0.06 80);
  --notes-place: oklch(0.55 0.05 80);

  --shadow-card: 0 6px 16px -8px rgba(20,20,40,.18);
  --shadow-pop:  0 20px 50px -10px rgba(20,20,40,.18), 0 4px 12px rgba(20,20,40,.06);
  --backdrop-rgb: 15, 15, 28;

  --font: "Geist", "Inter", -apple-system, system-ui, sans-serif;
  --mono: "Geist Mono", "JetBrains Mono", ui-monospace, monospace;
}

[data-theme="dark"] {
  --bg:        oklch(0.155 0.012 260);
  --panel:     oklch(0.205 0.018 260);
  --panel2:    oklch(0.245 0.020 260);
  --panel3:    oklch(0.290 0.022 260);
  --line:      oklch(0.32 0.020 260);
  --lineSoft:  oklch(0.265 0.020 260);
  --ink:       oklch(0.97 0.006 250);
  --ink2:      oklch(0.85 0.010 250);
  --dim:       oklch(0.66 0.014 250);
  --mute:      oklch(0.52 0.014 250);
  --brand:       oklch(0.72 0.18 264);
  --brandHover:  oklch(0.78 0.20 264);
  --brandSoft:   oklch(0.34 0.12 264 / 0.32);
  --brandSoft2:  oklch(0.42 0.14 264 / 0.45);
  --st-todo:    oklch(0.34 0.020 250); --st-todoInk:    oklch(0.85 0.014 250);
  --st-doing:   oklch(0.38 0.080 70);   --st-doingInk:   oklch(0.94 0.050 70);
  --st-done:    oklch(0.36 0.090 155);  --st-doneInk:    oklch(0.94 0.060 155);
  --st-blocked: oklch(0.40 0.110 25);   --st-blockedInk: oklch(0.95 0.050 25);
  --st-review:  oklch(0.40 0.090 295);  --st-reviewInk:  oklch(0.95 0.060 295);
  --pri-high: oklch(0.74 0.20 25);
  --pri-med:  oklch(0.80 0.16 70);
  --pri-low:  oklch(0.74 0.12 220);

  --chrome-bg:        oklch(0.165 0.020 264);
  --chrome-bg2:       oklch(0.215 0.024 264);
  --chrome-bg3:       oklch(0.265 0.026 264);
  --chrome-line:      oklch(0.295 0.022 264);
  --chrome-ink:       oklch(0.96 0.008 250);
  --chrome-dim:       oklch(0.76 0.015 250);
  --chrome-mute:      oklch(0.56 0.014 250);
  --chrome-active-bg: oklch(0.36 0.12 264);
  --chrome-brand-soft: oklch(0.46 0.14 264 / 0.40);

  --notes-bg:    oklch(0.26 0.04 90);
  --notes-line:  oklch(0.34 0.06 90);
  --notes-ink:   oklch(0.92 0.04 90);
  --notes-ink2:  oklch(0.94 0.06 90);
  --notes-mute:  oklch(0.74 0.04 90);
  --notes-place: oklch(0.62 0.04 90);

  --shadow-card: 0 6px 18px -8px rgba(0,0,0,.6);
  --shadow-pop:  0 24px 56px -12px rgba(0,0,0,.7), 0 4px 12px rgba(0,0,0,.4);
  --backdrop-rgb: 0, 0, 0;
}

*, *::before, *::after { box-sizing: border-box; }
html, body, #root { height: 100%; margin: 0; }
body { font-family: ${T.font}; background: ${T.bg}; color: ${T.ink}; font-size: 13px; letter-spacing: -0.005em; }
button { font-family: inherit; font-size: inherit; color: inherit; }
input { font-family: inherit; }
::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-thumb { background: ${T.line}; border-radius: 999px; border: 2px solid ${T.bg}; }
::-webkit-scrollbar-thumb:hover { background: ${T.mute}; }
::-webkit-scrollbar-track { background: transparent; }

.app { display: grid; grid-template-rows: 48px 1fr; height: 100%; }
.app > .body { display: grid; grid-template-columns: 244px 1fr; min-height: 0; transition: grid-template-columns .22s cubic-bezier(.2,.7,.2,1); }
.app > .body.collapsed { grid-template-columns: 0 1fr; }
.sidebar { background: ${T.panel}; border-right: 1px solid ${T.line}; display: flex; flex-direction: column; min-width: 0; overflow: hidden; }
.sidebar-inner { width: 244px; flex: 1; display: flex; flex-direction: column; padding: 4px 8px 8px; gap: 1px; overflow-y: auto; }
.main { min-width: 0; display: flex; flex-direction: column; overflow: hidden; }

.topbar { height: 48px; display: flex; align-items: center; padding: 0 8px 0 6px; background: ${T.panel}; border-bottom: 1px solid ${T.line}; gap: 6px; }
.icon-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 7px; background: transparent; border: none; cursor: pointer; color: ${T.ink2}; transition: background .12s; }
.icon-btn:hover { background: ${T.panel3}; color: ${T.ink}; }
.icon-btn.has-badge { position: relative; }
.icon-btn .badge { position: absolute; top: 5px; right: 5px; width: 8px; height: 8px; background: ${T.brand}; border-radius: 999px; border: 2px solid ${T.panel}; }

.create-btn { height: 32px; padding: 0 12px 0 10px; border-radius: 8px; background: ${T.brand}; color: #fff; border: none; cursor: pointer; font-weight: 600; font-size: 13px; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 1px 0 oklch(0.40 0.18 264 / .35); }
.create-btn:hover { background: ${T.brandHover}; }
.create-btn .plus { font-size: 16px; line-height: 0; }

.topbar .search { flex: 1; max-width: 720px; margin: 0 auto; height: 32px; display: flex; align-items: center; gap: 8px; padding: 0 12px; background: ${T.panel2}; border: 1px solid transparent; border-radius: 8px; color: ${T.dim}; cursor: text; }
.topbar .search:hover { background: ${T.panel3}; }
.topbar .search:focus-within { background: ${T.panel}; border-color: ${T.brand}; box-shadow: 0 0 0 3px ${T.brandSoft}; color: ${T.ink}; }
.topbar .search input { flex: 1; background: transparent; border: none; outline: none; color: ${T.ink}; font-size: 13px; }
.topbar .search .kbd { font-family: ${T.mono}; font-size: 11px; color: ${T.mute}; padding: 1px 6px; border: 1px solid ${T.line}; border-radius: 4px; background: ${T.panel}; }

.avatar { width: 28px; height: 28px; border-radius: 999px; background: #e8704c; color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; flex: 0 0 auto; border: 2px solid transparent; }
.avatar.sm { width: 1.75rem; height: 1.75rem; font-size: 0.65rem; }
.avatar.lg { width: 36px; height: 36px; font-size: 13px; }

.side-section { padding: 12px 8px 4px; display: flex; align-items: center; gap: 6px; font-size: 11px; color: ${T.mute}; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; }
.side-section .add { margin-left: auto; cursor: pointer; opacity: 0; transition: opacity .12s; padding: 2px 4px; border-radius: 4px; }
.side-section:hover .add { opacity: 1; }
.side-section .add:hover { background: ${T.panel3}; }

/* ============================================================
   Nested menu — spec-compliant.
   .menu-item / .menu-item.has-sub / .menu-section / .menu-divider
   State on <li>: .open, .has-active-child
   Active state on <a.menu-link>: .active
   Submenu animates max-height (overflow hidden).
   ============================================================ */
.menu-root,
.submenu { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 1px; }

.menu-section {
  list-style: none;
  padding: 12px 8px 4px;
  display: flex; align-items: center; gap: 6px;
  font-size: 11px; color: ${T.mute};
  font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase;
}
.menu-section .add { margin-left: auto; cursor: pointer; opacity: 0; transition: opacity .12s; padding: 2px 4px; border-radius: 4px; }
.menu-section:hover .add { opacity: 1; }
.menu-section .add:hover { background: ${T.panel3}; }

.menu-divider {
  list-style: none;
  height: 1px;
  background: ${T.line};
  margin: 6px 4px;
}

.menu-item { list-style: none; position: relative; }
.menu-link {
  display: flex; align-items: center; gap: 10px;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px; line-height: 1.2;
  color: ${T.ink2};
  text-decoration: none;
  min-width: 0;
  transition: background .12s, color .12s;
}
.menu-link:hover { background: ${T.panel3}; }
.menu-link.active { background: ${T.brandSoft}; color: ${T.brand}; font-weight: 600; }
.menu-link.disabled { cursor: not-allowed; opacity: 0.5; pointer-events: none; }
.menu-icon { width: 16px; height: 16px; flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; color: ${T.mute}; }
.menu-link:hover .menu-icon { color: ${T.ink2}; }
.menu-link.active .menu-icon { color: ${T.brand}; }
.menu-dot { width: 10px; height: 10px; border-radius: 3px; flex: 0 0 auto; }
.menu-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.menu-count { font-family: ${T.mono}; font-size: 11px; color: ${T.mute}; }
.menu-link.active .menu-count { color: ${T.brand}; }
.menu-chevron {
  width: 14px; height: 14px;
  flex: 0 0 auto;
  display: inline-flex; align-items: center; justify-content: center;
  color: ${T.mute};
  transition: transform .2s cubic-bezier(.2,.7,.2,1), color .12s;
}
.menu-link:hover .menu-chevron { color: ${T.ink2}; }
.menu-item.has-sub.open > .menu-link > .menu-chevron { transform: rotate(90deg); }
.menu-item.has-sub.has-active-child > .menu-link { color: ${T.ink}; }
.menu-item.has-sub.has-active-child > .menu-link .menu-icon { color: ${T.ink}; }

/* Submenu open/close animation
   Uses grid-template-rows 0fr → 1fr so the animation runs across the
   ACTUAL content height (not an arbitrary max-height ceiling). The wrap
   is the grid container; the inner ul fills the row and clips. */
.menu-item.has-sub > .submenu-wrap {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows .26s cubic-bezier(.2,.7,.2,1);
}
.menu-item.has-sub.open > .submenu-wrap { grid-template-rows: 1fr; }
.menu-item.has-sub > .submenu-wrap > .submenu {
  position: relative;
  margin: 2px 0 4px 16px;
  padding-left: 14px;
  min-height: 0;
  overflow: hidden;
}
.menu-item.has-sub > .submenu-wrap > .submenu::before {
  content: '';
  position: absolute;
  left: 0; top: 4px; bottom: 4px;
  width: 1px;
  background: currentColor;
  opacity: 0.18;
}
.menu-item.has-sub > .submenu-wrap > .submenu .menu-link {
  font-size: 12.5px;
  font-weight: 500;
  padding: 5px 8px 5px 10px;
}

/* Legacy .side-item kept for callers outside the menu tree */
.side-item { display: flex; align-items: center; gap: 10px; padding: 6px 8px; border-radius: 6px; cursor: pointer; font-size: 13px; color: ${T.ink2}; min-width: 0; }
.side-item:hover { background: ${T.panel3}; }
.side-item.active { background: ${T.brandSoft}; color: ${T.brand}; font-weight: 600; }
.side-item .ico { width: 16px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; opacity: 0.85; }
.side-item .dot { width: 10px; height: 10px; border-radius: 3px; flex: 0 0 auto; }
.side-item .label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.side-item .count { font-family: ${T.mono}; font-size: 11px; color: ${T.mute}; }
.side-item.active .count { color: ${T.brand}; }
.side-item.invite { background: ${T.panel2}; border: 1px solid ${T.line}; margin-top: 4px; }
.side-item.invite:hover { background: ${T.panel3}; }
.side-item.invite .ico { color: ${T.brand}; }

/* Stacked avatars */
.avatar-list-stacked { display: inline-flex; align-items: center; padding-right: 0.65rem; }
.avatar-list-stacked .avatar { margin-right: -0.65rem; border: 2px solid ${T.panel}; transition: transform .2s ease, box-shadow .2s ease; cursor: default; }
.avatar-list-stacked .avatar:hover { z-index: 3; transform: scale(1.18); }
.avatar-list-stacked .avatar.more { background: ${T.panel2}; color: ${T.dim}; font-weight: 600; }
.list-row:hover .avatar-list-stacked .avatar { border-color: ${T.panel2}; }

/* Notifications redesign */
.notif-card { margin: 10px 12px 0; padding: 12px; border-radius: 10px; background: ${T.panel2}; border: 1px solid ${T.line}; display: flex; gap: 11px; cursor: pointer; transition: background .12s, border-color .12s; position: relative; }
.notif-card:hover { background: ${T.panel3}; }
.notif-card .ntype { width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex: 0 0 auto; color: #fff; }
.notif-card .ntype.assign  { background: ${T.brand}; }
.notif-card .ntype.comment { background: oklch(0.66 0.16 220); }
.notif-card .ntype.done    { background: ${T.done}; color: ${T.doneInk}; }
.notif-card .ntype.status  { background: ${T.med}; color: ${T.doingInk}; }
.notif-card .ntype.mention { background: oklch(0.62 0.20 295); }
.notif-card .ntype.system  { background: oklch(0.40 0.02 250); }
.notif-card .nbody { flex: 1; min-width: 0; }
.notif-card .ntitle { font-size: 13px; color: ${T.ink}; line-height: 1.35; font-weight: 400; }
.notif-card.unread .ntitle { font-weight: 700; }
.notif-card .nsub { margin-top: 2px; font-size: 12px; color: ${T.dim}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.notif-card .nfoot { margin-top: 6px; font-size: 11px; color: ${T.mute}; display: flex; align-items: center; gap: 8px; }
.notif-card .nfoot .sep { color: ${T.line}; }
.notif-card .nfoot .time { margin-left: auto; font-family: ${T.mono}; }
.notif-prefs { padding: 12px 16px; border-top: 1px solid ${T.line}; display: flex; align-items: center; gap: 8px; font-size: 12px; color: ${T.dim}; cursor: pointer; }
.notif-prefs:hover { color: ${T.ink}; background: ${T.panel2}; }

/* Workspace context card at the top of the sidebar */
.sidebar-ws-card {
  display: flex; align-items: center; gap: 10px;
  padding: 8px;
  margin: 2px 0 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: background .12s;
}
.sidebar-ws-card:hover { background: var(--chrome-bg2, ${T.panel3}); }
.sidebar-ws-card .glyph {
  width: 32px; height: 32px;
  flex: 0 0 auto;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  color: #fff;
  font-weight: 700; font-size: 12px;
  letter-spacing: 0.02em;
}
.sidebar-ws-card .meta { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.2; }
.sidebar-ws-card .meta .name { font-size: 14px; font-weight: 600; color: ${T.ink}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sidebar-ws-card .meta .role { font-size: 11px; color: ${T.mute}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.side-bottom { margin-top: auto; padding: 8px; border-top: 1px solid ${T.line}; }
.user-card { display: flex; align-items: center; gap: 10px; padding: 7px 8px; border-radius: 8px; cursor: pointer; transition: background .12s; position: relative; }
.user-card:hover { background: ${T.panel3}; }
.user-card.open { background: ${T.panel3}; }
.user-card .meta { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.15; }
.user-card .name { font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.user-card .plan { font-size: 10px; color: ${T.brand}; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; padding: 1px 6px; background: ${T.brandSoft}; border-radius: 4px; align-self: flex-start; margin-top: 2px; }
.user-card .kebab { color: ${T.mute}; font-size: 16px; letter-spacing: 2px; flex: 0 0 auto; }

/* Popovers */
.popover-backdrop { position: fixed; inset: 0; z-index: 80; display: none; }
.popover { position: fixed; z-index: 81; background: ${T.panel}; border: 1px solid ${T.line}; border-radius: 12px; box-shadow: 0 20px 50px -10px rgba(20,20,40,.18), 0 4px 12px rgba(20,20,40,.06); overflow: hidden; }

/* Notification panel */
.notif-panel { width: 380px; max-height: 540px; display: flex; flex-direction: column; }
.notif-head { padding: 14px 16px 10px; border-bottom: 1px solid ${T.line}; display: flex; align-items: center; gap: 8px; }
.notif-head .title { font-size: 14px; font-weight: 600; }
.notif-head .mark { margin-left: auto; font-size: 12px; color: ${T.brand}; cursor: pointer; font-weight: 500; }
.notif-head .mark:hover { text-decoration: underline; }
.notif-tabs { display: flex; padding: 0 16px; border-bottom: 1px solid ${T.line}; gap: 16px; }
.notif-tabs .tab { padding: 8px 0; font-size: 12px; color: ${T.dim}; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; display: inline-flex; align-items: center; gap: 6px; }
.notif-tabs .tab.active { color: ${T.brand}; border-bottom-color: ${T.brand}; font-weight: 600; }
.notif-tabs .tab .count { font-family: ${T.mono}; font-size: 10px; color: ${T.mute}; background: ${T.panel2}; padding: 1px 5px; border-radius: 999px; }
.notif-tabs .tab.active .count { background: ${T.brandSoft}; color: ${T.brand}; }
.notif-list { flex: 1; overflow-y: auto; }
.notif-item { display: flex; gap: 11px; padding: 12px 16px; cursor: pointer; position: relative; border-bottom: 1px solid ${T.lineSoft}; }
.notif-item:hover { background: ${T.panel2}; }
.notif-item.unread::before { content: ''; position: absolute; left: 6px; top: 18px; width: 6px; height: 6px; border-radius: 999px; background: ${T.brand}; }
.notif-item .body { flex: 1; min-width: 0; font-size: 13px; line-height: 1.4; }
.notif-item .body b { font-weight: 600; }
.notif-item .meta { margin-top: 4px; font-size: 11px; color: ${T.mute}; display: flex; align-items: center; gap: 6px; }
.notif-item .meta .project-dot { width: 8px; height: 8px; border-radius: 3px; }
.notif-foot { padding: 10px 16px; border-top: 1px solid ${T.line}; text-align: center; font-size: 12px; color: ${T.brand}; cursor: pointer; }
.notif-foot:hover { background: ${T.panel2}; }

/* Account / user menu — two-pane Asana-style panel.
   Left: workspace switcher (Conta + workspaces + Sair).
   Right: profile + account actions. */
.user-menu { width: 560px; max-width: 92vw; display: grid; grid-template-columns: 200px 1fr; min-height: 380px; }
.user-menu .ws-pane {
  background: ${T.panel2};
  border-right: 1px solid ${T.line};
  padding: 10px 8px;
  display: flex; flex-direction: column; gap: 1px;
  min-width: 0;
}
.user-menu .ws-pane-head {
  font-size: 11px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase;
  color: ${T.mute};
  padding: 6px 8px 8px;
}
.user-menu .ws-row {
  display: flex; align-items: center; gap: 10px;
  padding: 7px 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: ${T.ink};
  min-width: 0;
  transition: background .12s;
}
.user-menu .ws-row:hover { background: ${T.panel3}; }
.user-menu .ws-row.active {
  background: ${T.panel};
  box-shadow: inset 0 0 0 1.5px ${T.brand};
}
.user-menu .ws-row .glyph {
  width: 28px; height: 28px;
  flex: 0 0 auto;
  border-radius: 999px;
  display: flex; align-items: center; justify-content: center;
  color: #fff;
  font-weight: 700; font-size: 11px;
  letter-spacing: 0.02em;
}
.user-menu .ws-row .name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.user-menu .ws-row .check { color: ${T.brand}; font-size: 14px; }
.user-menu .ws-pane-spacer { flex: 1; }
.user-menu .ws-add {
  display: flex; align-items: center; gap: 10px;
  padding: 7px 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: ${T.brand};
  border: 1px dashed ${T.line};
  margin-top: 4px;
}
.user-menu .ws-add:hover { background: ${T.panel3}; }
.user-menu .ws-add .ico { width: 28px; height: 28px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; font-size: 16px; }
.user-menu .ws-logout {
  margin-top: 6px;
  padding-top: 10px;
  border-top: 1px solid ${T.line};
}
.user-menu .ws-logout .menu-item { color: ${T.high}; padding: 7px 8px; }
.user-menu .ws-logout .menu-item .ico { color: ${T.high}; }

.user-menu .acc-pane {
  padding: 10px;
  display: flex; flex-direction: column; gap: 1px;
  min-width: 0;
}
.user-menu .acc-trial {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 10px;
  padding: 10px 12px;
  background: oklch(0.96 0.05 80 / 1);
  color: oklch(0.35 0.10 60);
  border-radius: 8px;
  font-size: 12px; line-height: 1.4;
  margin-bottom: 8px;
}
html[data-theme="dark"] .user-menu .acc-trial {
  background: oklch(0.28 0.06 70);
  color: oklch(0.92 0.06 80);
}
.user-menu .acc-trial a { color: ${T.brand}; font-weight: 600; text-decoration: none; }
.user-menu .acc-trial a:hover { text-decoration: underline; }
.user-menu .acc-profile {
  display: flex; align-items: center; gap: 10px;
  padding: 8px;
  margin-bottom: 8px;
}
.user-menu .acc-profile .avatar { width: 40px; height: 40px; font-size: 14px; flex: 0 0 auto; }
.user-menu .acc-profile .info { display: flex; flex-direction: column; min-width: 0; line-height: 1.2; }
.user-menu .acc-profile .info .name { font-size: 14px; font-weight: 600; color: ${T.ink}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.user-menu .acc-profile .info .email { font-size: 12px; color: ${T.mute}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.user-menu .acc-pane .menu-divider { margin: 6px 4px; }

@media (max-width: 640px) {
  .user-menu { grid-template-columns: 1fr; min-height: 0; }
  .user-menu .ws-pane { border-right: none; border-bottom: 1px solid ${T.line}; }
}
/* Popover dropdown items (.popover .menu-item) — scoped so they don't
   collide with the sidebar's nested-menu <li className="menu-item"> which
   needs default block layout to stack its menu-link + submenu vertically. */
.popover .menu-item { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 6px; cursor: pointer; font-size: 13px; color: ${T.ink}; }
.popover .menu-item:hover { background: ${T.panel2}; }
.popover .menu-item .ico { width: 14px; color: ${T.dim}; display: flex; align-items: center; }
.popover .menu-item .check { margin-left: auto; color: ${T.brand}; }
.popover .menu-item.danger { color: ${T.high}; }
.popover .menu-item.danger .ico { color: ${T.high}; }
.popover .menu-divider { height: 1px; background: ${T.line}; margin: 6px 4px; }
.popover .menu-item .switch { margin-left: auto; width: 30px; height: 16px; border-radius: 999px; background: ${T.panel3}; position: relative; }
.popover .menu-item .switch::after { content: ''; position: absolute; top: 2px; left: 2px; width: 12px; height: 12px; border-radius: 999px; background: ${T.panel}; box-shadow: 0 1px 2px rgba(0,0,0,.15); transition: left .18s; }
.popover .menu-item .switch.on { background: ${T.brand}; }
.popover .menu-item .switch.on::after { left: 16px; }

/* Project page */
.proj-header { padding: 14px 24px 0; background: ${T.panel}; border-bottom: 1px solid ${T.line}; display: flex; flex-direction: column; gap: 12px; }
.proj-titlebar { display: flex; align-items: center; gap: 14px; }
.proj-icon { width: 36px; height: 36px; border-radius: 8px; background: ${T.brand}; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 18px; flex: 0 0 auto; }
.proj-name { font-size: 20px; font-weight: 600; letter-spacing: -0.4px; display: flex; align-items: center; gap: 8px; }
.proj-name .chev { color: ${T.mute}; font-size: 11px; }
.proj-status { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; background: ${T.panel2}; border: 1px solid ${T.line}; font-size: 12px; color: ${T.dim}; cursor: pointer; }
.proj-status .pulse { width: 8px; height: 8px; border-radius: 999px; background: ${T.med}; box-shadow: 0 0 0 3px oklch(0.80 0.13 70 / 0.3); }

.proj-members { display: flex; align-items: center; margin-left: 8px; }

.btn-ghost { height: 32px; padding: 0 12px; border-radius: 7px; background: ${T.panel}; border: 1px solid ${T.line}; color: ${T.ink}; cursor: pointer; font-size: 13px; display: inline-flex; align-items: center; gap: 6px; }
.btn-ghost:hover { background: ${T.panel2}; }
.btn-primary { height: 32px; padding: 0 14px; border-radius: 7px; background: ${T.brand}; color: #fff; border: none; cursor: pointer; font-weight: 600; font-size: 13px; display: inline-flex; align-items: center; gap: 6px; }
.btn-primary:hover { background: ${T.brandHover}; }

.tabs { display: flex; align-items: center; gap: 4px; margin-top: 2px; }
.tab { padding: 8px 12px; font-size: 13px; color: ${T.dim}; cursor: pointer; position: relative; border-bottom: 2px solid transparent; margin-bottom: -1px; display: inline-flex; align-items: center; gap: 6px; }
.tab:hover { color: ${T.ink}; }
.tab.active { color: ${T.brand}; border-bottom-color: ${T.brand}; font-weight: 600; }
.tab .ico { opacity: 0.7; }
.tab.active .ico { opacity: 1; }

.toolbar { padding: 10px 24px; background: ${T.panel}; border-bottom: 1px solid ${T.line}; display: flex; align-items: center; gap: 8px; }
.filter-pill { padding: 5px 11px; border-radius: 7px; font-size: 12px; cursor: pointer; border: 1px solid ${T.line}; background: ${T.panel}; color: ${T.ink2}; display: inline-flex; align-items: center; gap: 6px; }
.filter-pill .label { color: ${T.dim}; }
.filter-pill .val { font-weight: 600; color: ${T.ink}; }
.filter-pill .chev { color: ${T.mute}; font-size: 9px; }
.filter-pill.active { background: ${T.brandSoft}; border-color: ${T.brandSoft2}; }
.filter-pill.active .label, .filter-pill.active .val { color: ${T.brand}; }
.filter-pill.dashed { border-style: dashed; color: ${T.mute}; }
.view-seg { display: flex; gap: 0; padding: 3px; background: ${T.panel2}; border-radius: 8px; }
.view-seg .item { padding: 5px 11px; border-radius: 6px; font-size: 12px; cursor: pointer; color: ${T.dim}; }
.view-seg .item:hover { color: ${T.ink}; }
.view-seg .item.active { background: ${T.panel}; color: ${T.ink}; font-weight: 600; box-shadow: 0 1px 2px rgba(0,0,0,.06), 0 0 0 1px ${T.line}; }

/* Task list */
.list-wrap { flex: 1; overflow: auto; background: ${T.panel}; }
.list-cols { display: grid; grid-template-columns: 28px 1fr 130px 100px 100px 70px 110px 110px 36px; align-items: center; padding: 0 24px; }
.list-head { background: ${T.panel}; border-bottom: 1px solid ${T.line}; height: 36px; font-size: 11px; color: ${T.mute}; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; position: sticky; top: 0; z-index: 2; }
.list-group { display: flex; align-items: center; gap: 10px; padding: 10px 24px; border-bottom: 1px solid ${T.line}; cursor: pointer; }
.list-group .chev { font-size: 11px; color: ${T.mute}; transition: transform .15s; }
.list-group.closed .chev { transform: rotate(-90deg); }
.list-group .swatch { width: 12px; height: 12px; border-radius: 4px; }
.list-group .name { font-weight: 600; font-size: 13px; }
.list-group .count { color: ${T.mute}; font-family: ${T.mono}; font-size: 12px; }
.list-group .add { margin-left: auto; color: ${T.mute}; font-size: 11px; padding: 3px 8px; border-radius: 5px; }
.list-group .add:hover { background: ${T.panel3}; color: ${T.ink}; }
.list-row { height: 44px; border-bottom: 1px solid ${T.lineSoft}; cursor: pointer; }
.list-row:hover { background: ${T.panel2}; }
.list-row .check { width: 18px; height: 18px; border-radius: 999px; border: 1.5px solid ${T.line}; display: flex; align-items: center; justify-content: center; font-size: 11px; color: transparent; }
.list-row .check.done { background: ${T.done}; border-color: ${T.done}; color: ${T.doneInk}; }
.list-row:hover .check { border-color: ${T.dim}; }
.list-row .title { font-size: 13.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.list-row.done .title { color: ${T.dim}; text-decoration: line-through; text-decoration-color: ${T.line}; }
.status-cell { padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; text-align: center; margin-right: 12px; max-width: 110px; }
.date-cell { color: ${T.dim}; font-size: 12px; font-family: ${T.mono}; }
.pri-cell { font-size: 12px; display: inline-flex; align-items: center; gap: 6px; }
.pri-cell .sq { width: 12px; height: 12px; border-radius: 3px; }
.assignees { display: inline-flex; }
.row-more { color: transparent; text-align: right; font-size: 16px; padding-right: 4px; }
.list-row:hover .row-more { color: ${T.dim}; }

.add-task-bar { display: flex; align-items: center; gap: 8px; padding: 10px 24px 16px; border-bottom: 1px solid ${T.line}; color: ${T.mute}; font-size: 13px; cursor: pointer; }
.add-task-bar:hover { color: ${T.brand}; }
.add-task-bar .icon { font-size: 16px; line-height: 0.8; }

/* Gantt */
.gantt-wrap { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: ${T.panel}; }
.gantt-body { flex: 1; display: flex; overflow: hidden; }
.gantt-grid { width: 280px; flex: 0 0 auto; border-right: 1px solid ${T.line}; overflow-y: auto; }
.gantt-chart { flex: 1; overflow: auto; position: relative; }
.gantt-row { height: 40px; display: flex; align-items: center; padding: 0 16px; gap: 8px; border-bottom: 1px solid ${T.lineSoft}; font-size: 13px; }
.gantt-row .pri-bar { width: 4px; height: 16px; border-radius: 2px; flex: 0 0 auto; }
.gantt-row .dot { width: 10px; height: 10px; border-radius: 3px; flex: 0 0 auto; }
.gantt-row .name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gantt-scale-top { height: 28px; display: flex; border-bottom: 1px solid ${T.line}; font-size: 11px; color: ${T.mute}; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; align-items: center; }
.gantt-scale-bot { height: 28px; display: flex; border-bottom: 1px solid ${T.line}; }
.gantt-day { font-size: 11px; color: ${T.dim}; font-family: ${T.mono}; text-align: center; line-height: 28px; border-right: 1px solid ${T.line}; }
.gantt-day.weekend { background: ${T.panel2}; }
.gantt-day.today { color: ${T.brand}; font-weight: 700; }
.gantt-bar { position: absolute; height: 24px; top: 8px; border-radius: 6px; padding: 0 10px; display: flex; align-items: center; font-size: 11.5px; font-weight: 600; white-space: nowrap; overflow: hidden; box-shadow: 0 1px 0 rgba(0,0,0,.04); cursor: pointer; }
.gantt-bar .progress { position: absolute; left: 0; top: 0; bottom: 0; background: rgba(0,0,0,.16); border-radius: 6px 0 0 6px; }
.gantt-bar .bar-label { position: relative; overflow: hidden; text-overflow: ellipsis; }
.gantt-today-line { position: absolute; top: 56px; bottom: 0; width: 2px; background: ${T.brand}; z-index: 2; pointer-events: none; }
.gantt-today-line .pill { position: absolute; top: -16px; left: -18px; width: 38px; text-align: center; font-size: 9px; color: #fff; background: ${T.brand}; padding: 2px 4px; font-weight: 700; letter-spacing: 0.06em; border-radius: 4px; text-transform: uppercase; }
.gantt-workload { border-top: 1px solid ${T.line}; background: ${T.panel}; display: flex; height: 84px; }
.gantt-workload-label { width: 280px; padding: 14px 16px; border-right: 1px solid ${T.line}; }
.gantt-workload-bars { flex: 1; display: flex; align-items: flex-end; padding: 8px 0; position: relative; overflow-x: auto; }
.gantt-workload-bars::before { content: ''; position: absolute; left: 0; right: 0; top: 50%; border-top: 1px dashed ${T.line}; }
.wl-bar { display: flex; align-items: flex-end; justify-content: center; flex: 0 0 auto; }
.wl-bar .bar { border-radius: 4px; }

/* Create menu */
.create-menu { width: 240px; padding: 6px; display: flex; flex-direction: column; gap: 1px; }
.create-menu .menu-item .ico { color: ${T.brand}; }
.create-menu .kbd-hint { margin-left: auto; font-family: ${T.mono}; font-size: 10px; color: ${T.mute}; padding: 1px 5px; border: 1px solid ${T.line}; border-radius: 4px; }

/* Language picker */
.lang-flag-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 7px; background: transparent; border: none; cursor: pointer; padding: 0; transition: background .12s; }
.lang-flag-btn:hover { background: ${T.panel3}; }
.lang-flag-btn img { width: 22px; height: 22px; border-radius: 999px; display: block; }
.lang-menu { width: 220px; padding: 6px; display: flex; flex-direction: column; gap: 1px; }
.lang-menu .menu-item img { width: 20px; height: 20px; border-radius: 999px; flex: 0 0 auto; }
.lang-menu .menu-item.active { color: ${T.brand}; background: ${T.brandSoft}; }

/* Tweak: ensure proper truncation on narrow screens */
@media (max-width: 1100px) {
  .list-cols { grid-template-columns: 28px 1fr 110px 80px 80px 90px 90px 36px; }
  .list-cols .est-col { display: none; }
}

/* ============================================================
   RESPONSIVE — tablet & mobile
   Sidebar → drawer (≤1024). List → cards (≤768).
   Popovers → bottom sheets (≤640). Gantt mantém comportamento.
   ============================================================ */

/* Sidebar drawer backdrop — hidden on desktop, enabled below */
.sidebar-backdrop { display: none; }

/* TABLET (≤1024px) — sidebar becomes an off-canvas drawer */
@media (max-width: 1024px) {
  .app > .body,
  .app > .body.collapsed { grid-template-columns: 1fr !important; }
  .sidebar {
    position: fixed;
    top: 48px;
    left: 0;
    bottom: 0;
    width: 280px;
    z-index: 70;
    transform: translateX(-100%);
    transition: transform .24s cubic-bezier(.2,.7,.2,1);
    box-shadow: 0 12px 40px rgba(15,15,30,.28);
  }
  .app > .body:not(.collapsed) > .sidebar { transform: translateX(0); }
  .sidebar-inner { width: 100%; }

  .sidebar-backdrop {
    display: block;
    position: fixed;
    inset: 48px 0 0 0;
    background: rgba(15,15,28,.45);
    z-index: 65;
    -webkit-backdrop-filter: blur(2px);
    backdrop-filter: blur(2px);
    animation: awp-fade .18s ease;
  }
  @keyframes awp-fade { from { opacity: 0; } to { opacity: 1; } }

  /* Tighter chrome */
  .topbar { padding: 0 8px; gap: 4px; }
  .search { max-width: none; }

  .proj-header { padding: 12px 16px 0; gap: 10px; }
  .proj-titlebar { flex-wrap: wrap; gap: 10px; }
  .toolbar { padding: 10px 16px; flex-wrap: wrap; row-gap: 8px; }
  .toolbar > div[style*="margin-left"] { margin-left: 0 !important; }

  /* Tabs become a horizontal scroller */
  .tabs {
    overflow-x: auto;
    flex-wrap: nowrap;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
    margin: 0 -16px;
    padding: 0 16px;
  }
  .tabs::-webkit-scrollbar { display: none; }
  .tab { white-space: nowrap; flex: 0 0 auto; }

  /* List paddings */
  .list-cols { padding: 0 16px; }
  .list-group { padding: 10px 16px; }
  .list-head { padding: 0 16px; }
  .add-task-bar { padding: 10px 16px 16px; }
}

/* MOBILE (≤768px) — list collapses to cards, chrome compresses */
@media (max-width: 768px) {
  /* Topbar — drop "Criar" label and fullscreen button */
  .topbar .create-btn { padding: 0 10px; gap: 0; }
  .topbar .create-btn > span:not(.plus) { display: none; }
  .topbar .icon-btn[title*="ecrã"] { display: none; }
  .search .kbd { display: none; }

  /* Project header — tighter and trim avatar stack */
  .proj-name { font-size: 17px; }
  .proj-status { font-size: 11px; padding: 3px 9px; }
  .proj-members .avatar:not(.more):nth-of-type(n+3) { display: none; }

  /* Hide "Agrupado por" hint on mobile (filters take the space) */
  .toolbar > div[style*="margin-left"] { display: none !important; }

  /* List rows become stacked cards */
  .list-head { display: none; }
  .list-row {
    display: grid !important;
    grid-template-columns: 22px 1fr 24px !important;
    grid-template-areas:
      "check title more"
      "blank smeta smeta"
      "blank pmeta pmeta" !important;
    height: auto;
    padding: 12px 16px;
    row-gap: 6px;
    column-gap: 10px;
    align-items: center;
  }
  .list-row > :nth-child(1) { grid-area: check; }
  .list-row > :nth-child(2) {
    grid-area: title;
    white-space: normal;
    line-height: 1.35;
    font-weight: 500;
  }
  .list-row > :nth-child(3) {
    grid-area: smeta;
    justify-self: start;
    margin-right: 0;
  }
  .list-row > :nth-child(4) { display: none; }            /* start date */
  .list-row > :nth-child(5) {
    grid-area: smeta;
    justify-self: end;
    align-self: center;
  }
  .list-row > :nth-child(6) { display: none; }            /* est */
  .list-row > :nth-child(7) {
    grid-area: pmeta;
    justify-self: start;
  }
  .list-row > :nth-child(8) {
    grid-area: pmeta;
    justify-self: end;
  }
  .list-row > :nth-child(9) {
    grid-area: more;
    color: ${T.dim} !important;
    align-self: start;
  }
}

/* SMALL MOBILE (≤640px) — popovers become bottom sheets */
@media (max-width: 640px) {
  .popover {
    left: 0 !important;
    right: 0 !important;
    top: auto !important;
    bottom: 0 !important;
    width: 100% !important;
    max-width: none !important;
    border-radius: 16px 16px 0 0 !important;
    max-height: 82vh;
    border-bottom: none;
    padding-top: 6px;
    animation: awp-sheet-in .22s cubic-bezier(.2,.7,.2,1);
  }
  .popover::before {
    content: '';
    display: block;
    width: 40px;
    height: 4px;
    background: ${T.line};
    border-radius: 999px;
    margin: 0 auto 4px;
  }
  @keyframes awp-sheet-in {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  .notif-panel { max-height: 82vh; }
  .user-menu, .create-menu, .lang-menu { max-height: 82vh; overflow-y: auto; }

  /* Popover backdrop (rendered by Popover component) */
  .popover-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15,15,28,.4);
    z-index: 79;
    animation: awp-fade .18s ease;
  }

  /* Avatar stack on the project header — keep only first 2 + counter */
  .proj-members .avatar:not(.more):nth-of-type(n+3) { display: none; }
}

/* ============================================================
   CHROME (sidebar + topbar) — deep indigo, themed via vars.
   ============================================================ */

.topbar {
  background: var(--chrome-bg);
  border-bottom: 1px solid var(--chrome-line);
  color: var(--chrome-ink);
}
.topbar .icon-btn { color: var(--chrome-dim); }
.topbar .icon-btn:hover { background: var(--chrome-bg2); color: var(--chrome-ink); }
.topbar .icon-btn.has-badge .badge { border-color: var(--chrome-bg); }
.topbar .lang-flag-btn:hover { background: var(--chrome-bg2); }
.topbar .search {
  background: var(--chrome-bg2);
  border-color: transparent;
  color: var(--chrome-dim);
}
.topbar .search:hover { background: var(--chrome-bg3); }
.topbar .search:focus-within {
  background: var(--chrome-bg3);
  border-color: oklch(0.60 0.20 264);
  box-shadow: 0 0 0 3px var(--chrome-brand-soft);
  color: var(--chrome-ink);
}
.topbar .search input { color: var(--chrome-ink); }
.topbar .search input::placeholder { color: var(--chrome-mute); }
.topbar .search .kbd {
  background: var(--chrome-bg);
  border-color: var(--chrome-line);
  color: var(--chrome-mute);
}
.topbar .create-btn {
  box-shadow: 0 1px 0 oklch(0.30 0.14 264 / 0.5), 0 0 0 1px oklch(0.50 0.18 264 / 0.4);
}

.sidebar {
  background: var(--chrome-bg);
  border-right: 1px solid var(--chrome-line);
  color: var(--chrome-ink);
}

.sidebar .side-section { color: var(--chrome-mute); }
.sidebar .side-section .add:hover { background: var(--chrome-bg2); }

.sidebar .side-item { color: var(--chrome-dim); }
.sidebar .side-item:hover { background: var(--chrome-bg2); color: var(--chrome-ink); }
.sidebar .side-item.active {
  background: var(--chrome-active-bg);
  color: #fff;
  font-weight: 600;
  box-shadow: inset 2px 0 0 oklch(0.78 0.16 264);
}
.sidebar .side-item.active .count { color: oklch(0.85 0.05 264); }
.sidebar .side-item .count { color: var(--chrome-mute); }
.sidebar .side-item .ico { color: var(--chrome-mute); }
.sidebar .side-item:hover .ico { color: var(--chrome-ink); }

/* Menu (.menu-*) — chrome theme */
.sidebar .menu-section { color: var(--chrome-mute); }
.sidebar .menu-section .add:hover { background: var(--chrome-bg2); }
.sidebar .menu-divider { background: var(--chrome-line); }
.sidebar .menu-link { color: var(--chrome-dim); }
.sidebar .menu-link:hover { background: var(--chrome-bg2); color: var(--chrome-ink); }
.sidebar .menu-link .menu-icon { color: var(--chrome-mute); }
.sidebar .menu-link:hover .menu-icon { color: var(--chrome-ink); }
.sidebar .menu-link .menu-count { color: var(--chrome-mute); }
.sidebar .menu-link .menu-chevron { color: var(--chrome-mute); }
.sidebar .menu-link:hover .menu-chevron { color: var(--chrome-ink); }
/* Top-level active item: strong indigo block */
.sidebar > .sidebar-inner > .menu-root > .menu-item > .menu-link.active {
  background: var(--chrome-active-bg);
  color: #fff;
  font-weight: 600;
  box-shadow: inset 2px 0 0 oklch(0.78 0.16 264);
}
.sidebar > .sidebar-inner > .menu-root > .menu-item > .menu-link.active .menu-icon { color: oklch(0.85 0.14 264); }
.sidebar > .sidebar-inner > .menu-root > .menu-item > .menu-link.active .menu-count { color: oklch(0.85 0.05 264); }
/* Has-sub with active descendant: highlight cabeçalho */
.sidebar .menu-item.has-sub.has-active-child > .menu-link { color: var(--chrome-ink); }
.sidebar .menu-item.has-sub.has-active-child > .menu-link .menu-icon { color: var(--chrome-ink); }
/* Submenu connector line */
.sidebar .menu-item.has-sub > .submenu-wrap > .submenu::before { background: var(--chrome-ink); opacity: 0.10; }
/* Submenu link: soft active state, no solid indigo block */
.sidebar .menu-item.has-sub > .submenu-wrap > .submenu .menu-link.active {
  background: var(--chrome-brand-soft);
  color: oklch(0.92 0.08 264);
  font-weight: 600;
  box-shadow: none;
}
.sidebar .menu-item.has-sub > .submenu-wrap > .submenu .menu-link.active .menu-icon { color: oklch(0.85 0.14 264); }

.sidebar .side-item.invite {
  background: var(--chrome-bg2);
  border-color: var(--chrome-line);
  color: var(--chrome-ink);
}
.sidebar .side-item.invite:hover { background: var(--chrome-bg3); }
.sidebar .side-item.invite .ico { color: oklch(0.75 0.16 264); }

/* Workspace context card at the top of the sidebar */
.sidebar .sidebar-ws-card:hover { background: var(--chrome-bg2); }
.sidebar .sidebar-ws-card .meta .name { color: var(--chrome-ink); }
.sidebar .sidebar-ws-card .meta .role { color: var(--chrome-mute); }

.sidebar .side-bottom { border-top: 1px solid var(--chrome-line); }
.sidebar .user-card { color: var(--chrome-ink); }
.sidebar .user-card:hover,
.sidebar .user-card.open { background: var(--chrome-bg2); }
.sidebar .user-card .name { color: var(--chrome-ink); }
.sidebar .user-card .plan {
  background: oklch(0.40 0.14 264 / 0.4);
  color: oklch(0.85 0.14 264);
}
.sidebar .user-card .kebab { color: var(--chrome-mute); }

.sidebar ::-webkit-scrollbar-thumb { background: var(--chrome-line); border-color: var(--chrome-bg); }
.sidebar ::-webkit-scrollbar-thumb:hover { background: var(--chrome-mute); }

/* ============================================================
   Super Claro — flatten the chrome (topbar + sidebar) to match the
   light app-shell variant. Only applies when the base theme is light
   AND the user opted into the super-light chrome from account settings.
   ============================================================ */
:root[data-theme="light"][data-chrome="super-light"] {
  --chrome-bg:         #ffffff;
  --chrome-bg2:        oklch(0.965 0.006 250);
  --chrome-bg3:        oklch(0.945 0.008 250);
  --chrome-line:       oklch(0.92 0.008 250);
  --chrome-ink:        oklch(0.22 0.02 250);
  --chrome-dim:        oklch(0.48 0.014 250);
  --chrome-mute:       oklch(0.62 0.012 250);
  --chrome-active-bg:  oklch(0.55 0.20 264);
  --chrome-brand-soft: oklch(0.95 0.04 264);
}
:root[data-theme="light"][data-chrome="super-light"] .topbar .create-btn {
  box-shadow: 0 1px 0 oklch(0.40 0.18 264 / .35);
}
:root[data-theme="light"][data-chrome="super-light"] .sidebar .user-card .plan {
  background: oklch(0.92 0.06 264);
  color: oklch(0.50 0.22 264);
}
:root[data-theme="light"][data-chrome="super-light"] .topbar .search:focus-within {
  border-color: oklch(0.55 0.20 264);
}
`;

// ============================================================
// Data
// ============================================================

const tasks = [
  { id: 1, t: 'Remover ID da tabela em /teams',                   s: '11 mai', e: '13 mai', d: '2d', p: 'Baixa',  st: 'todo'    },
  { id: 2, t: 'Notificação ao adicionar/remover de projeto',      s: '11 mai', e: '16 mai', d: '5d', p: 'Média',  st: 'doing'   },
  { id: 3, t: 'Implementar sistema de Tags',                      s: '11 mai', e: '16 mai', d: '5d', p: 'Média',  st: 'doing'   },
  { id: 4, t: 'Editor rich text com imagens seguras — Tiptap',    s: '11 mai', e: '16 mai', d: '5d', p: null,     st: 'todo'    },
  { id: 5, t: 'Implementar feature "Seguir" na task',             s: '11 mai', e: '16 mai', d: '5d', p: 'Baixa',  st: 'todo'    },
  { id: 6, t: 'Contador da lista de tarefas',                     s: '11 mai', e: '16 mai', d: '5d', p: null,     st: 'review'  },
  { id: 7, t: 'Onboarding · primeira sessão',                     s: '12 mai', e: '18 mai', d: '4d', p: 'Alta',   st: 'todo'    },
  { id: 8, t: '[urgente] Mudar path S3',                          s: '11 mai', e: '16 mai', d: '5d', p: 'Alta',   st: 'done'    },
  { id: 9, t: 'Bug — Salvar sem data de início',                  s: '11 mai', e: '16 mai', d: '5d', p: 'Alta',   st: 'done'    },
  { id: 10,t: 'Regras nas tasks',                                 s: '—',      e: '—',      d: '5d', p: null,     st: 'done'    },
];

const statusMeta = {
  todo:    { label: 'A fazer',    color: T.todo,    ink: T.todoInk },
  doing:   { label: 'Em curso',   color: T.doing,   ink: T.doingInk },
  review:  { label: 'Em revisão', color: T.review,  ink: T.reviewInk },
  done:    { label: 'Concluído',  color: T.done,    ink: T.doneInk },
  blocked: { label: 'Bloqueada',  color: T.blocked, ink: T.blockedInk },
};

const priColor = { Alta: T.high, Média: T.med, Baixa: T.low };

const projects = [
  { id: 'awp',  name: 'Awesome Project App',  color: T.brand, fav: true },
  { id: 'mkt',  name: 'Marketing Site 2026',  color: 'oklch(0.70 0.16 320)' },
  { id: 'int',  name: 'Internal Tools',       color: 'oklch(0.72 0.14 130)' },
  { id: 'brd',  name: 'Brand Refresh',        color: 'oklch(0.74 0.12 70)' },
];

// Workspaces — owner of the contextual sidebar. Selecting a workspace
// (via the account panel in the sidebar footer) changes the entire app
// context: which projects appear in the sidebar, which workspace name
// shows in the header, etc.
const workspaces = [
  { id: 'magero', name: 'Equipa Mágero',    glyph: 'TM', color: '#e8704c',              role: 'Proprietário', projects: ['awp', 'mkt', 'brd'] },
  { id: 'eng',    name: 'Engenharia',       glyph: 'EN', color: 'oklch(0.62 0.16 220)', role: 'Administrador', projects: ['awp', 'int'] },
  { id: 'prod',   name: 'Produto & Design', glyph: 'PD', color: 'oklch(0.66 0.17 320)', role: 'Membro',        projects: ['mkt', 'brd'] },
];
const wsById = Object.fromEntries(workspaces.map(w => [w.id, w]));
const projectById = Object.fromEntries(projects.map(p => [p.id, p]));

const languages = [
  { code: 'pt-PT', name: 'Português (PT)', flag: 'https://hatscripts.github.io/circle-flags/flags/pt.svg' },
  { code: 'pt-BR', name: 'Português (BR)', flag: 'https://hatscripts.github.io/circle-flags/flags/br.svg' },
  { code: 'en',    name: 'English',        flag: 'https://hatscripts.github.io/circle-flags/flags/us.svg' },
  { code: 'es',    name: 'Español',        flag: 'https://hatscripts.github.io/circle-flags/flags/es.svg' },
];

// ============================================================
// Components
// ============================================================

const { useState, useRef, useEffect, useLayoutEffect } = React;

function TopBar({ collapsed, onToggle, notifOpen, onToggleNotif, notifBtnRef, createOpen, onToggleCreate, createBtnRef, langOpen, onToggleLang, langBtnRef, currentLang, onToggleFullscreen, isFullscreen, theme, onToggleTheme }) {
  const lang = languages.find(l => l.code === currentLang) || languages[0];
  return (
    <header className="topbar">
      <button className="icon-btn" onClick={onToggle} aria-label="Alternar menu lateral">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6"  x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      <div className="search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <line x1="20" y1="20" x2="16.65" y2="16.65" />
        </svg>
        <input placeholder="Procurar tarefas, projetos, pessoas…" />
        <span className="kbd">⌘K</span>
      </div>
      <button ref={createBtnRef} className="create-btn" onClick={onToggleCreate}>
        <span className="plus">+</span>
        <span>Criar</span>
      </button>
      <button className="icon-btn theme-btn" title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'} onClick={onToggleTheme} aria-label="Alternar tema">
        {theme === 'dark' ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4.2" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </button>
      <button className="icon-btn" title={isFullscreen ? 'Sair do ecrã inteiro' : 'Modo ecrã inteiro'} onClick={onToggleFullscreen}>
        {isFullscreen ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3v4a1 1 0 0 1-1 1H3M21 8h-4a1 1 0 0 1-1-1V3M3 16h4a1 1 0 0 1 1 1v4M16 21v-4a1 1 0 0 1 1-1h4" />
          </svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8V3h5M21 8V3h-5M3 16v5h5M21 16v5h-5" />
          </svg>
        )}
      </button>
      <button ref={langBtnRef} className="lang-flag-btn" title={`Idioma: ${lang.name}`} onClick={onToggleLang}>
        <img src={lang.flag} alt={lang.name} />
      </button>
      <button ref={notifBtnRef} className={'icon-btn has-badge' + (notifOpen ? ' is-active' : '')} title="Notificações" onClick={onToggleNotif} style={notifOpen ? { background: T.panel3, color: T.ink } : null}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        <span className="badge"></span>
      </button>
      <div className="avatar" title="Thiago Mágero" style={{ display: 'none' }}>TM</div>
    </header>
  );
}

function SidebarItem({ icon, dot, label, active, count, onClick, chev, expanded, indent }) {
  return (
    <div className={'side-item' + (active ? ' active' : '') + (expanded ? ' expanded' : '')} onClick={onClick}>
      {icon && <span className="ico">{icon}</span>}
      {dot && <span className="dot" style={{ background: dot }}></span>}
      <span className="label">{label}</span>
      {count && <span className="count">{count}</span>}
      {chev && (
        <span className="chev">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </span>
      )}
    </div>
  );
}

// ============================================================
// Nested menu (spec-compliant)
//  - Data-driven, arbitrary depth.
//  - Open state lives in a Set keyed by node.key.
//  - Active branch auto-opens on first render & when active changes.
//  - aria-expanded, aria-controls, role="button" wired on <a.menu-link>.
//  - Submenu animates via max-height (overflow hidden).
// ============================================================

// Recursively walk nodes, set node.hasActiveChild = true on any group whose
// branch contains an active node. Mutates in-place.
function annotateMenuActive(nodes) {
  let containsActive = false;
  for (const node of nodes) {
    if (node.kind === 'group') {
      const inside = annotateMenuActive(node.children || []);
      node.hasActiveChild = inside;
      if (inside) containsActive = true;
    } else if (node.kind === 'item' && node.active) {
      containsActive = true;
    }
  }
  return containsActive;
}
// Collect every ancestor group key whose branch contains an active node.
function collectActiveAncestorKeys(nodes, into) {
  for (const node of nodes) {
    if (node.kind === 'group') {
      const childKeys = new Set();
      collectActiveAncestorKeys(node.children || [], childKeys);
      if (node.hasActiveChild) into.add(node.key);
      for (const k of childKeys) into.add(k);
    }
  }
}

function MenuNode({ node, openKeys, onToggle, depth }) {
  if (node.kind === 'divider') return <li className="menu-divider" role="separator"></li>;
  if (node.kind === 'section') return (
    <li className="menu-section">
      <span>{node.label}</span>
      {node.addable && <span className="add" onClick={node.onAdd}>+</span>}
    </li>
  );
  if (node.kind === 'group') {
    const open = openKeys.has(node.key);
    const subId = 'submenu-' + node.key;
    return (
      <li className={'menu-item has-sub' + (open ? ' open' : '') + (node.hasActiveChild ? ' has-active-child' : '')}>
        <a className="menu-link"
           href="#"
           role="button"
           aria-expanded={open ? 'true' : 'false'}
           aria-controls={subId}
           onClick={e => { e.preventDefault(); onToggle(node.key); }}>
          {node.icon && <span className="menu-icon">{node.icon}</span>}
          {node.dot && <span className="menu-dot" style={{ background: node.dot }}></span>}
          <span className="menu-label">{node.label}</span>
          {node.count && <span className="menu-count">{node.count}</span>}
          <span className="menu-chevron">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </span>
        </a>
        <div className="submenu-wrap">
          <ul id={subId} className="submenu">
            {(node.children || []).map(c => <MenuNode key={c.key} node={c} openKeys={openKeys} onToggle={onToggle} depth={depth + 1} />)}
          </ul>
        </div>
      </li>
    );
  }
  // simple item
  return (
    <li className="menu-item">
      <a className={'menu-link' + (node.active ? ' active' : '') + (node.disabled ? ' disabled' : '')}
         href={node.href || '#'}
         aria-current={node.active ? 'page' : undefined}
         aria-disabled={node.disabled ? 'true' : undefined}
         onClick={e => {
           if (node.disabled) { e.preventDefault(); return; }
           if (!node.href) e.preventDefault();
           if (node.onClick) node.onClick();
         }}>
        {node.icon && <span className="menu-icon">{node.icon}</span>}
        {node.dot && <span className="menu-dot" style={{ background: node.dot }}></span>}
        <span className="menu-label">{node.label}</span>
        {node.count && <span className="menu-count">{node.count}</span>}
      </a>
    </li>
  );
}

function MenuTree({ nodes }) {
  // Annotate active-branch markers (in-place on the supplied nodes — caller
  // builds a fresh array each render so mutation is safe).
  React.useMemo(() => { annotateMenuActive(nodes); }, [nodes]);

  const [openKeys, setOpenKeys] = React.useState(() => {
    const s = new Set();
    collectActiveAncestorKeys(nodes, s);
    return s;
  });

  // Re-open the active branch whenever the route changes. We only ADD keys
  // here — never remove — so user toggles aren't undone.
  React.useEffect(() => {
    const needed = new Set();
    collectActiveAncestorKeys(nodes, needed);
    setOpenKeys(prev => {
      let changed = false;
      const next = new Set(prev);
      for (const k of needed) if (!next.has(k)) { next.add(k); changed = true; }
      return changed ? next : prev;
    });
  }, [nodes]);

  function toggle(key) {
    setOpenKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  return (
    <ul className="menu-root">
      {nodes.map(n => <MenuNode key={n.key} node={n} openKeys={openKeys} onToggle={toggle} depth={0} />)}
    </ul>
  );
}

function Sidebar({ page, activeProject, activeWorkspace, onGoHome, onOpenWorkspace, onOpenProject, onOpenPeople, onOpenTipos, onOpenHolidays, userMenuOpen, onToggleUserMenu, userBtnRef }) {
  const ws = wsById[activeWorkspace] || workspaces[0];
  const wsProjects = (ws.projects || []).map(id => projectById[id]).filter(Boolean);
  const [demoOpen, setDemoOpen] = React.useState(false);

  const menuNodes = [
    { kind: 'item', key: 'home',  icon: <HomeIcon />, label: 'Página inicial', active: page === 'home', onClick: onGoHome },
    { kind: 'item', key: 'tasks', icon: <TaskIcon />, label: 'Minhas tarefas', count: '12' },

    // Contextual workspace items — flat under the active workspace.
    { kind: 'section', key: 's-ws', label: ws.name },
    { kind: 'item', key: 'ws-ov',   icon: <DashIcon />,      label: 'Visão geral',     active: page === 'workspace', onClick: () => onOpenWorkspace(ws.id) },
    { kind: 'item', key: 'ws-ppl',  icon: <PeopleSubIcon />, label: 'Pessoas',         active: page === 'people',    onClick: () => onOpenPeople(ws.id) },
    { kind: 'item', key: 'ws-tipo', icon: <TypeIcon />,      label: 'Tipos de membro', active: page === 'tipos',     onClick: () => onOpenTipos(ws.id) },
    { kind: 'item', key: 'ws-cal',  icon: <CalIcon />,       label: 'Calendários',     active: page === 'holidays',  onClick: () => onOpenHolidays(ws.id) },

    // Workspace projects.
    { kind: 'section', key: 's-proj', label: 'Projetos', addable: true },
    ...wsProjects.map(p => ({
      kind: 'item', key: 'proj-' + p.id, dot: p.color, label: p.name,
      active: page === 'project' && p.id === activeProject,
      onClick: () => onOpenProject(p.id),
    })),
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-inner">
        {/* Workspace context header — shows the currently-active workspace.
            Clicking it goes to the workspace overview. To switch workspaces,
            use the account panel in the sidebar footer. */}
        <div className="sidebar-ws-card" onClick={() => onOpenWorkspace(ws.id)}>
          <div className="glyph" style={{ background: ws.color }}>{ws.glyph}</div>
          <div className="meta">
            <span className="name">{ws.name}</span>
            <span className="role">{ws.role}</span>
          </div>
        </div>

        <div style={{ height: 4 }}></div>

        <MenuTree nodes={menuNodes} />

        {/* Demo: expandable item with subitems — preserves hierarchical
            navigation capability so consumers of the template can reuse it. */}
        <ul className="menu-root" style={{ marginTop: 2 }}>
          <li className={'menu-item has-sub' + (demoOpen ? ' open' : '')}>
            <a className="menu-link"
               href="#"
               role="button"
               aria-expanded={demoOpen ? 'true' : 'false'}
               aria-controls="submenu-recursos"
               onClick={e => { e.preventDefault(); setDemoOpen(o => !o); }}>
              <span className="menu-icon"><FolderIcon /></span>
              <span className="menu-label">Recursos</span>
              <span className="menu-chevron">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </span>
            </a>
            <div className="submenu-wrap">
              <ul id="submenu-recursos" className="submenu">
                <li className="menu-item">
                  <a className="menu-link" href="#" onClick={e => e.preventDefault()}>
                    <span className="menu-icon"><TypeIcon /></span>
                    <span className="menu-label">Modelos</span>
                  </a>
                </li>
                <li className="menu-item">
                  <a className="menu-link" href="#" onClick={e => e.preventDefault()}>
                    <span className="menu-icon"><FolderIcon /></span>
                    <span className="menu-label">Arquivo</span>
                  </a>
                </li>
              </ul>
            </div>
          </li>
        </ul>

        <div style={{ height: 10 }}></div>
        <div className="side-item invite" onClick={() => window.__openInvite && window.__openInvite()} style={{ cursor: 'pointer' }}>
          <span className="ico"><InviteIcon /></span>
          <span className="label">Convidar Pessoa</span>
        </div>
      </div>

      <div className="side-bottom">
        <div ref={userBtnRef} className={'user-card' + (userMenuOpen ? ' open' : '')} onClick={onToggleUserMenu}>
          <div className="avatar lg" title="Thiago Mágero" style={{ background: '#e8704c' }}>TM</div>
          <div className="meta">
            <span className="name">thiagocmagero</span>
            <span className="plan">Pro</span>
          </div>
          <span className="kebab">⋯</span>
        </div>
      </div>
    </aside>
  );
}

// Icons
const HomeIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const TaskIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></svg>;
const InboxIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/></svg>;
const ChartIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="20" x2="21" y2="20"/><line x1="6" y1="20" x2="6" y2="12"/><line x1="12" y1="20" x2="12" y2="6"/><line x1="18" y1="20" x2="18" y2="14"/></svg>;
const FolderIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>;
const TargetIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>;
const UsersIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const InviteIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>;
const DashIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3"  width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>;
const PeopleSubIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const TypeIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="9" y1="4" x2="9" y2="20"/></svg>;
const CalIcon  = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;

// ============================================================
// Project page
// ============================================================

function ProjectHeader({ view, setView }) {
  return (
    <div className="proj-header">
      <div className="proj-titlebar">
        <div className="proj-icon">▦</div>
        <div className="proj-name">
          Awesome Project App
          <span className="chev">▾</span>
        </div>
        <div className="proj-status" title="Status do projeto">
          <span className="pulse"></span>
          <span>Em risco</span>
        </div>
        <div className="proj-members avatar-list-stacked">
          <div className="avatar sm" title="Thiago Mágero" style={{ background: '#e8704c' }}>TM</div>
          <div className="avatar sm" title="Lara Mendes" style={{ background: '#4a89c4' }}>LM</div>
          <div className="avatar sm" title="João Ribeiro" style={{ background: '#d97a86' }}>JR</div>
          <div className="avatar sm" title="Patrícia Costa" style={{ background: '#8c5cc4' }}>PC</div>
          <div className="avatar sm more">+3</div>
        </div>
        <div style={{ marginLeft: 'auto' }}></div>
      </div>
      <div className="tabs">
        {[
          { key: 'overview', label: 'Visão geral' },
          { key: 'list',     label: 'Lista' },
          { key: 'board',    label: 'Quadro' },
          { key: 'timeline', label: 'Gantt' },
          { key: 'calendar', label: 'Calendário' },
          { key: 'files',    label: 'Ficheiros' },
        ].map(t => (
          <div key={t.key} className={'tab' + (view === t.key ? ' active' : '')} onClick={() => setView(t.key)}>
            {t.label}
          </div>
        ))}
        <div className="tab" style={{ color: T.mute }}>+</div>
      </div>
    </div>
  );
}

function Toolbar({ view, setView }) {
  return (
    <div className="toolbar">
      <FilterPill label="Estado" value="Tudo" />
      <FilterPill label="Prioridade" value="Tudo" />
      <FilterPill label="Responsável" value="Eu" active />
      <FilterPill label="+ Adicionar filtro" dashed />
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
        <span style={{ color: T.dim, fontSize: 12 }}>Agrupado por <span style={{ color: T.ink, fontWeight: 600 }}>Estado</span></span>
      </div>
    </div>
  );
}

function FilterPill({ label, value, active, dashed }) {
  return (
    <div className={'filter-pill' + (active ? ' active' : '') + (dashed ? ' dashed' : '')}>
      <span className="label">{label}{value && ':'}</span>
      {value && <span className="val">{value}</span>}
      {!dashed && <span className="chev">▾</span>}
    </div>
  );
}

// ============================================================
// List view
// ============================================================

function ListView() {
  const [closed, setClosed] = useState({});
  const openTask = () => window.__openTaskModal && window.__openTaskModal();
  const groups = [
    { key: 'doing',  rows: tasks.filter(r => r.st === 'doing') },
    { key: 'review', rows: tasks.filter(r => r.st === 'review') },
    { key: 'todo',   rows: tasks.filter(r => r.st === 'todo') },
    { key: 'done',   rows: tasks.filter(r => r.st === 'done') },
  ].filter(g => g.rows.length > 0);

  return (
    <div className="list-wrap">
      <div className="list-cols list-head">
        <span></span>
        <span>Tarefa</span>
        <span>Estado</span>
        <span>Início</span>
        <span>Fim</span>
        <span className="est-col">Est.</span>
        <span>Prioridade</span>
        <span>Responsável</span>
        <span></span>
      </div>

      {groups.map(g => {
        const meta = statusMeta[g.key];
        const isClosed = closed[g.key];
        return (
          <div key={g.key}>
            <div className={'list-group' + (isClosed ? ' closed' : '')} onClick={() => setClosed(c => ({ ...c, [g.key]: !c[g.key] }))}>
              <span className="chev">▼</span>
              <span className="swatch" style={{ background: meta.color }}></span>
              <span className="name">{meta.label}</span>
              <span className="count">{g.rows.length}</span>
              <span className="add">+ Adicionar tarefa</span>
            </div>
            {!isClosed && (
              <>
                {g.rows.map(r => {
                  const sm = statusMeta[r.st];
                  return (
                    <div key={r.id} className={'list-cols list-row' + (r.st === 'done' ? ' done' : '')} onClick={openTask}>
                      <span className={'check' + (r.st === 'done' ? ' done' : '')}>{r.st === 'done' ? '✓' : ''}</span>
                      <span className="title">{r.t}</span>
                      <span className="status-cell" style={{ background: sm.color, color: sm.ink }}>{sm.label}</span>
                      <span className="date-cell">{r.s}</span>
                      <span className="date-cell">{r.e}</span>
                      <span className="date-cell est-col">{r.d}</span>
                      <span className="pri-cell" style={{ color: r.p ? T.ink2 : T.mute }}>
                        {r.p ? <><span className="sq" style={{ background: priColor[r.p] }}></span>{r.p}</> : '—'}
                      </span>
                      <span className="assignees avatar-list-stacked">
                        <div className="avatar sm" title="Thiago Mágero" style={{ background: '#e8704c' }}>TM</div>
                        {(r.id % 3 === 0) && <div className="avatar sm" title="Lara Mendes" style={{ background: '#4a89c4' }}>LM</div>}
                        {(r.id % 4 === 0) && <div className="avatar sm" title="Patrícia Costa" style={{ background: '#8c5cc4' }}>PC</div>}
                      </span>
                      <span className="row-more">⋯</span>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        );
      })}

      <div className="add-task-bar" onClick={openTask}>
        <span className="icon">+</span>
        <span>Adicionar tarefa…</span>
      </div>
    </div>
  );
}

// ============================================================
// Gantt
// ============================================================

function GanttView() {
  const days = Array.from({ length: 28 }, (_, i) => 4 + i);
  const todayCol = 7;
  const cellW = 32;
  const bars = [
    { label: 'Remover ID — /teams',       start: 7, len: 2, tone: 'done',  done: 1 },
    { label: 'Notificação ao adicionar',  start: 7, len: 5, tone: 'doing', done: 0.5 },
    { label: 'Sistema de Tags',           start: 7, len: 5, tone: 'doing', done: 0.6 },
    { label: 'Editor rich text Tiptap',   start: 7, len: 5, tone: 'todo',  done: 0 },
    { label: 'Feature "Seguir" na task',  start: 9, len: 4, tone: 'todo',  done: 0 },
    { label: 'Contador lista tarefas',    start: 12, len: 3, tone: 'review', done: 0.8 },
    { label: 'Onboarding · primeira sessão', start: 8, len: 6, tone: 'todo', done: 0, pri: T.high },
    { label: '[urgente] Mudar path S3',   start: 5, len: 4, tone: 'done',  done: 1, pri: T.high },
    { label: 'Bug — sem data início',     start: 6, len: 3, tone: 'done',  done: 1, pri: T.high },
  ];

  return (
    <div className="gantt-wrap">
      <div className="toolbar">
        <div className="view-seg">
          <div className="item">Dia</div>
          <div className="item active">Semana</div>
          <div className="item">Mês</div>
          <div className="item">Trimestre</div>
        </div>
        <FilterPill label="Caminho" value="Crítico" active />
        <FilterPill label="Responsável" value="Eu" />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 14, fontSize: 12, color: T.dim, alignItems: 'center' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 12, height: 6, background: T.todo, borderRadius: 3 }}></span>A fazer</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 12, height: 6, background: T.doing, borderRadius: 3 }}></span>Em curso</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 12, height: 6, background: T.review, borderRadius: 3 }}></span>Revisão</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 12, height: 6, background: T.done, borderRadius: 3 }}></span>Concluído</span>
        </div>
      </div>

      <div className="gantt-body">
        <div className="gantt-grid">
          <div style={{ padding: '0 16px', height: 56, display: 'flex', alignItems: 'center', borderBottom: `1px solid ${T.line}`, fontSize: 11, color: T.mute, fontWeight: 600, letterSpacing: 0.04, textTransform: 'uppercase' }}>Tarefa</div>
          {bars.map((b, i) => {
            const m = statusMeta[b.tone];
            return (
              <div key={i} className="gantt-row">
                {b.pri && <span className="pri-bar" style={{ background: b.pri }}></span>}
                <span className="dot" style={{ background: m.color }}></span>
                <span className="name">{b.label}</span>
              </div>
            );
          })}
        </div>

        <div className="gantt-chart">
          <div style={{ width: cellW * days.length, position: 'relative' }}>
            <div className="gantt-scale-top" style={{ position: 'sticky', top: 0, zIndex: 3, background: T.panel }}>
              <div style={{ width: cellW * 7, padding: '0 12px', borderRight: `1px solid ${T.line}` }}>04 — 10 mai</div>
              <div style={{ width: cellW * 7, padding: '0 12px', borderRight: `1px solid ${T.line}`, color: T.brand }}>11 — 17 mai</div>
              <div style={{ width: cellW * 7, padding: '0 12px', borderRight: `1px solid ${T.line}` }}>18 — 24 mai</div>
              <div style={{ width: cellW * 7, padding: '0 12px' }}>25 — 31 mai</div>
            </div>
            <div className="gantt-scale-bot" style={{ position: 'sticky', top: 28, zIndex: 3, background: T.panel }}>
              {days.map((d, i) => (
                <div key={i}
                  className={'gantt-day' + ([0,1,7,8,14,15,21,22].includes(i) ? ' weekend' : '') + (i === todayCol ? ' today' : '')}
                  style={{ width: cellW }}>{d}</div>
              ))}
            </div>

            <div className="gantt-today-line" style={{ left: cellW * todayCol + cellW / 2 }}>
              <div className="pill">Hoje</div>
            </div>

            {bars.map((b, i) => {
              const m = statusMeta[b.tone];
              return (
                <div key={i} style={{ height: 40, position: 'relative', borderBottom: `1px solid ${T.lineSoft}` }}>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
                    {days.map((_, j) => (
                      <div key={j} style={{
                        width: cellW, borderRight: `1px solid ${T.lineSoft}`,
                        background: [0,1,7,8,14,15,21,22].includes(j) ? T.panel2 : 'transparent', opacity: 0.7,
                      }} />
                    ))}
                  </div>
                  <div className="gantt-bar" style={{
                    left: cellW * b.start + 2,
                    width: cellW * b.len - 6,
                    background: m.color,
                    color: m.ink,
                  }}>
                    <div className="progress" style={{ width: `${b.done * 100}%` }}></div>
                    <span className="bar-label">{b.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="gantt-workload">
        <div className="gantt-workload-label">
          <div style={{ fontSize: 11, color: T.mute, fontWeight: 600, letterSpacing: 0.04, textTransform: 'uppercase' }}>Carga</div>
          <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 9 }}>
            <div className="avatar sm" title="Thiago Mágero" style={{ background: '#e8704c' }}>TM</div>
            <span style={{ fontSize: 13 }}>Thiago Mágero</span>
            <span style={{ marginLeft: 'auto', color: T.high, fontFamily: T.mono, fontSize: 11, fontWeight: 700 }}>320h</span>
          </div>
        </div>
        <div className="gantt-workload-bars">
          {days.map((_, i) => {
            const v = [4,4,0,0,16,16,16,16,16,12,8,4,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0][i] || 0;
            const over = v > 8;
            return (
              <div key={i} className="wl-bar" style={{ width: cellW, height: '100%' }}>
                {v > 0 && <div className="bar" style={{
                  width: cellW - 10, height: `${Math.min(100, v / 16 * 92)}%`,
                  background: over ? T.high : T.brand, opacity: over ? 1 : 0.85,
                }}></div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Other view placeholders
// ============================================================

function PlaceholderView({ title, subtitle }) {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: T.dim, background: T.bg }}>
      <div style={{ width: 56, height: 56, borderRadius: 14, background: T.panel, border: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: T.brand }}>◐</div>
      <div style={{ fontSize: 18, fontWeight: 600, color: T.ink }}>{title}</div>
      <div style={{ fontSize: 13, color: T.dim }}>{subtitle}</div>
    </div>
  );
}

// ============================================================
// Popovers
// ============================================================

const notifications = [
  { type: 'assign',  unread: true,  title: 'Lara Mendes atribuiu uma tarefa a si',          sub: 'Editor rich text com imagens seguras',     project: 'Awesome Project App', category: 'design',      time: 'há 4 min' },
  { type: 'mention', unread: true,  title: 'João Ribeiro mencionou-o num comentário',       sub: 'Mudar path S3',                            project: 'Awesome Project App', category: 'infra',       time: 'há 1 h' },
  { type: 'comment', unread: true,  title: 'Patrícia comentou em Sistema de Tags',          sub: '“Podemos usar enum em vez de string livre?”', project: 'Awesome Project App', category: 'backend',     time: 'há 2 h' },
  { type: 'done',    unread: false, title: 'Bug — Salvar sem data de início foi concluído',  sub: 'Marcado como concluído por Patrícia',       project: 'Awesome Project App', category: 'qa',          time: 'há 3 h' },
  { type: 'status',  unread: false, title: 'Sistema de Tags mudou para Em curso',           sub: 'Atualizado por Lara Mendes',               project: 'Awesome Project App', category: 'backend',     time: 'ontem' },
  { type: 'system',  unread: false, title: 'Sincronização GitHub concluída',                 sub: '12 tarefas atualizadas do repositório',     project: 'Awesome Project App', category: 'integration', time: '2 mai' },
  { type: 'assign',  unread: false, title: 'Foi adicionado ao projeto Brand Refresh',       sub: 'Por João Ribeiro',                          project: 'Brand Refresh',       category: 'marketing',   time: '1 mai' },
];

const notifIcons = {
  assign:  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>,
  comment: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  done:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  status:  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>,
  mention: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/></svg>,
  system:  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
};

function Popover({ anchorRef, onClose, placement = 'below-end', offset = 8, children, panelClass }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0, visibility: 'hidden' });

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const panel = ref.current;
    if (!anchor || !panel) return;
    const a = anchor.getBoundingClientRect();
    const p = panel.getBoundingClientRect();
    let top, left;
    if (placement === 'below-end') {
      top = a.bottom + offset;
      left = a.right - p.width;
    } else if (placement === 'above-start') {
      top = a.top - p.height - offset;
      left = a.left;
    } else if (placement === 'right-bottom') {
      top = a.bottom - p.height;
      left = a.right + offset;
    } else {
      top = a.bottom + offset; left = a.left;
    }
    const margin = 8;
    top = Math.max(margin, Math.min(top, window.innerHeight - p.height - margin));
    left = Math.max(margin, Math.min(left, window.innerWidth - p.width - margin));
    setPos({ top, left, visibility: 'visible' });
  }, [placement, offset, anchorRef]);

  useEffect(() => {
    function onDocDown(e) {
      if (ref.current && !ref.current.contains(e.target) &&
          anchorRef.current && !anchorRef.current.contains(e.target)) {
        onClose();
      }
    }
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [anchorRef, onClose]);

  return (
    <React.Fragment>
      <div className="popover-backdrop" onClick={onClose}></div>
      <div ref={ref} className={'popover ' + (panelClass || '')} style={pos}>
        {children}
      </div>
    </React.Fragment>
  );
}

function NotificationPanel({ anchorRef, onClose }) {
  return (
    <Popover anchorRef={anchorRef} onClose={onClose} panelClass="notif-panel" placement="below-end">
      <div className="notif-head">
        <div className="title">Notificações</div>
        <div className="mark">Marcar tudo como lido</div>
      </div>
      <div className="notif-list" style={{ padding: '0 0 10px' }}>
        {notifications.map((n, i) => (
          <div key={i} className={'notif-card' + (n.unread ? ' unread' : '')}>
            <div className={'ntype ' + n.type}>{notifIcons[n.type]}</div>
            <div className="nbody">
              <div className="ntitle">{n.title}</div>
              <div className="nsub">{n.sub}</div>
              <div className="nfoot">
                <span>{n.project}</span>
                <span className="sep">|</span>
                <span>{n.category}</span>
                <span className="time">{n.time}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="notif-prefs">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>
        <span>Preferências de notificação</span>
      </div>
    </Popover>
  );
}

function UserMenu({ anchorRef, onClose, theme, onToggleTheme, chrome, setChrome, onOpenAccount, onOpenNewWorkspace, activeWorkspace, onSwitchWorkspace }) {
  const switchTo = (id) => {
    if (id !== activeWorkspace && onSwitchWorkspace) onSwitchWorkspace(id);
    onClose();
  };
  return (
    <Popover anchorRef={anchorRef} onClose={onClose} panelClass="user-menu" placement="right-bottom" offset={10}>
      {/* Left: workspaces */}
      <div className="ws-pane">
        <div className="ws-pane-head">Conta</div>
        {workspaces.map(w => (
          <div key={w.id}
               className={'ws-row' + (w.id === activeWorkspace ? ' active' : '')}
               onClick={() => switchTo(w.id)}>
            <div className="glyph" style={{ background: w.color }}>{w.glyph}</div>
            <span className="name">{w.name}</span>
            {w.id === activeWorkspace && <span className="check">✓</span>}
          </div>
        ))}
        <div className="ws-add" onClick={() => { onClose(); onOpenNewWorkspace && onOpenNewWorkspace(); }}>
          <span className="ico">+</span>
          <span>Novo workspace</span>
        </div>
        <div className="ws-pane-spacer"></div>
        <div className="ws-logout">
          <div className="menu-item" onClick={onClose}>
            <span className="ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></span>
            Terminar sessão
          </div>
        </div>
      </div>

      {/* Right: account actions */}
      <div className="acc-pane">
        <div className="acc-trial">
          <span>5 dias restantes na avaliação gratuita.</span>
          <a href="#" onClick={e => e.preventDefault()}>Saiba mais</a>
        </div>

        <div className="acc-profile">
          <div className="avatar lg" title="Thiago Mágero" style={{ background: '#e8704c' }}>TM</div>
          <div className="info">
            <span className="name">Thiago Mágero</span>
            <span className="email">thiagocmagero@gmail.com</span>
          </div>
        </div>

        <div className="menu-divider"></div>

        <div className="menu-item" onClick={() => onOpenAccount && onOpenAccount('account')}>
          <span className="ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>
          Definições da conta
        </div>
        <div className="menu-item" onClick={() => onOpenAccount && onOpenAccount('notif')}>
          <span className="ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></span>
          Notificações
        </div>
        <div className="menu-item" onClick={() => onOpenAccount && onOpenAccount('security')}>
          <span className="ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
          Segurança
        </div>
        <div className="menu-item">
          <span className="ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="20" x2="21" y2="20"/><line x1="6" y1="20" x2="6" y2="12"/><line x1="12" y1="20" x2="12" y2="6"/><line x1="18" y1="20" x2="18" y2="14"/></svg></span>
          Utilização do plano
        </div>

        <div className="menu-divider"></div>

        <div className="menu-item">
          <span className="ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></span>
          Documentação
        </div>
        <div className="menu-item">
          <span className="ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></span>
          Suporte
        </div>

        <div className="menu-divider"></div>

        <div className="menu-item" onClick={onToggleTheme}>
          <span className="ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg></span>
          Tema {theme === 'light' ? 'claro' : 'escuro'}
          <span className={'switch' + (theme === 'dark' ? ' on' : '')}></span>
        </div>
        {theme === 'light' && setChrome && (
          <div className="menu-item" onClick={(e) => { e.stopPropagation(); setChrome(chrome === 'super-light' ? 'default' : 'super-light'); }}>
            <span className="ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M16.95 16.95l1.42 1.42M5.6 18.4l1.4-1.4M16.95 7.05l1.42-1.42"/></svg></span>
          Super claro
          <span className={'switch' + (chrome === 'super-light' ? ' on' : '')}></span>
        </div>
        )}
      </div>
    </Popover>
  );
}

function NewWorkspaceModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const valid = name.trim().length > 0;
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  const submit = () => {
    if (!valid) return;
    onCreate && onCreate(name.trim());
    onClose();
  };
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300, padding:24 }}
         onClick={onClose}>
      <div style={{ width:480, maxWidth:'100%', background:T.panel, border:`1px solid ${T.line}`, borderRadius:14, boxShadow:`0 20px 60px rgba(0,0,0,.28)`, overflow:'hidden' }}
           onClick={e => e.stopPropagation()} role="dialog" aria-label="Novo Workspace">
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', padding:'18px 22px 14px', borderBottom:`1px solid ${T.line}` }}>
          <span style={{ display:'inline-flex', alignItems:'center', gap:9, fontSize:17, fontWeight:600, color:T.ink }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.brand} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Novo Workspace
          </span>
          <button onClick={onClose} aria-label="Fechar" style={{ marginLeft:'auto', width:28, height:28, display:'inline-flex', alignItems:'center', justifyContent:'center', borderRadius:7, border:'none', background:'transparent', color:T.dim, cursor:'pointer' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        {/* Body */}
        <div style={{ padding:'22px 22px 12px' }}>
          <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:T.ink2, marginBottom:8 }}>
            Nome do Workspace <span style={{ color:T.high }}>*</span>
          </label>
          <input
            type="text"
            placeholder="Ex: Acme Corp, Produto & Design…"
            value={name}
            autoFocus
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit(); }}
            style={{ width:'100%', padding:'10px 13px', border:`1px solid ${T.line}`, borderRadius:9, background:T.panel, color:T.ink, font:'inherit', fontSize:14, outline:'none', boxSizing:'border-box',
                     borderColor: name ? T.brand : T.line, boxShadow: name ? `0 0 0 3px ${T.brandSoft}` : 'none', transition:'border-color .12s, box-shadow .12s' }}
          />
        </div>
        {/* Footer */}
        <div style={{ display:'flex', justifyContent:'flex-end', gap:8, padding:'12px 22px 18px' }}>
          <button onClick={onClose}
            style={{ padding:'8px 16px', borderRadius:8, border:`1px solid ${T.line}`, background:T.panel, color:T.ink, font:'inherit', fontSize:13, cursor:'pointer' }}>
            Cancelar
          </button>
          <button onClick={submit} disabled={!valid}
            style={{ padding:'8px 18px', borderRadius:8, border:`1px solid ${valid ? T.brand : T.line}`, background: valid ? T.brand : T.panel3, color: valid ? '#fff' : T.mute, font:'inherit', fontSize:13, fontWeight:600, cursor: valid ? 'pointer' : 'not-allowed', transition:'all .12s' }}>
            Criar Workspace
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateMenu({ anchorRef, onClose }) {
  return (
    <Popover anchorRef={anchorRef} onClose={onClose} panelClass="create-menu" placement="below-end" offset={8}>
      <div className="menu-item" onClick={() => { onClose(); window.__openTaskModal && window.__openTaskModal(); }}>
        <span className="ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></svg></span>
        Tarefa
        <span className="kbd-hint">T</span>
      </div>
      <div className="menu-item" onClick={() => { onClose(); window.__openNewProject && window.__openNewProject(); }}>
        <span className="ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="4" x2="9" y2="20"/></svg></span>
        Projeto
        <span className="kbd-hint">P</span>
      </div>
      <div className="menu-item" onClick={() => { onClose(); window.__openNewWorkspace && window.__openNewWorkspace(); }}>
        <span className="ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>
        Workspace
        <span className="kbd-hint">W</span>
      </div>
      <div className="menu-item" onClick={() => { onClose(); window.__openInvite && window.__openInvite(); }}>
        <span className="ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg></span>
        Convite
        <span className="kbd-hint">I</span>
      </div>
    </Popover>
  );
}

function LanguageMenu({ anchorRef, onClose, currentLang, onPick }) {
  return (
    <Popover anchorRef={anchorRef} onClose={onClose} panelClass="lang-menu" placement="below-end" offset={8}>
      {languages.map(l => (
        <div key={l.code} className={'menu-item' + (l.code === currentLang ? ' active' : '')}
             onClick={() => { onPick(l.code); onClose(); }}>
          <img src={l.flag} alt={l.name} />
          <span>{l.name}</span>
          {l.code === currentLang && <span className="check">✓</span>}
        </div>
      ))}
    </Popover>
  );
}

// ============================================================
// App
// ============================================================

const isNarrow = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 1024px)').matches;

function App() {
  const [collapsed, setCollapsed] = useState(() => isNarrow());
  const [page, setPage] = useState('home');
  const [activeProject, setActiveProject] = useState('awp');
  const [activeWorkspace, setActiveWorkspace] = useState('magero');
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('awp-theme') || 'light'; } catch (e) { return 'light'; }
  });
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [accountTab, setAccountTab] = useState('account');
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const closeIfNarrow = () => { if (isNarrow()) setCollapsed(true); };
  const goHome = () => { setPage('home'); closeIfNarrow(); };
  const openWorkspace = (id) => { setActiveWorkspace(id); setPage('workspace'); closeIfNarrow(); };
  const openProject = (id) => { setActiveProject(id); setPage('project'); closeIfNarrow(); };
  const openPeople = (id) => { setActiveWorkspace(id); setPage('people'); closeIfNarrow(); };
  const openTipos = (id) => { setActiveWorkspace(id); setPage('tipos'); closeIfNarrow(); };
  const openHolidays = (id) => { setActiveWorkspace(id); setPage('holidays'); closeIfNarrow(); };
  const openAccount = (tab) => { setAccountTab(tab || 'account'); setPage('account'); closeIfNarrow(); };
  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  const [chrome, setChrome] = useState(() => {
    try { return localStorage.getItem('awp-chrome') === 'super-light' ? 'super-light' : 'default'; }
    catch (e) { return 'default'; }
  });
  useEffect(() => {
    if (chrome === 'super-light') document.documentElement.setAttribute('data-chrome', 'super-light');
    else document.documentElement.removeAttribute('data-chrome');
    try { localStorage.setItem('awp-chrome', chrome); } catch (e) {}
  }, [chrome]);
  // If user switches to dark theme, super-light makes no sense — drop it.
  useEffect(() => { if (theme === 'dark' && chrome === 'super-light') setChrome('default'); }, [theme, chrome]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('awp-theme', theme); } catch (e) {}
  }, [theme]);

  useEffect(() => {
    window.__openTaskModal = () => setTaskModalOpen(true);
    window.__openNewProject = () => setNewProjectOpen(true);
    return () => { delete window.__openTaskModal; delete window.__openNewProject; };
  }, []);
  const [view, setView] = useState('overview');
  const [taskFilter, setTaskFilter] = useState('');
  const [manageStatesOpen, setManageStatesOpen] = useState(false);
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invitePreProject, setInvitePreProject] = useState(null);
  const [newWorkspaceOpen, setNewWorkspaceOpen] = useState(false);
  useEffect(() => {
    window.__openManageStates = () => setManageStatesOpen(true);
    window.__openPermissions  = () => setPermissionsOpen(true);
    window.__openInvite       = (preProject) => { setInvitePreProject(preProject || null); setInviteOpen(true); };
    window.__openNewWorkspace = () => setNewWorkspaceOpen(true);
    return () => { delete window.__openManageStates; delete window.__openPermissions; delete window.__openInvite; delete window.__openNewWorkspace; };
  }, []);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState('pt-PT');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const notifBtnRef = useRef(null);
  const userBtnRef = useRef(null);
  const createBtnRef = useRef(null);
  const langBtnRef = useRef(null);

  useEffect(() => {
    function onFs() { setIsFullscreen(!!document.fullscreenElement); }
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  // When viewport crosses into tablet/mobile, auto-collapse the sidebar
  // (it becomes a drawer at that width; leaving it "open" by default would
  // block content). When crossing back to desktop, re-expand it.
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1024px)');
    function handle(e) { setCollapsed(e.matches); }
    mq.addEventListener('change', handle);
    return () => mq.removeEventListener('change', handle);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen && document.exitFullscreen();
    } else if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }

  return (
    <div className="app">
      <TopBar
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
        notifOpen={notifOpen}
        onToggleNotif={() => setNotifOpen(o => !o)}
        notifBtnRef={notifBtnRef}
        createOpen={createOpen}
        onToggleCreate={() => setCreateOpen(o => !o)}
        createBtnRef={createBtnRef}
        langOpen={langOpen}
        onToggleLang={() => setLangOpen(o => !o)}
        langBtnRef={langBtnRef}
        currentLang={currentLang}
        onToggleFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <div className={'body' + (collapsed ? ' collapsed' : '')}>
        <Sidebar
          page={page}
          activeProject={activeProject}
          activeWorkspace={activeWorkspace}
          onGoHome={goHome}
          onOpenWorkspace={openWorkspace}
          onOpenProject={openProject}
          onOpenPeople={openPeople}
          onOpenTipos={openTipos}
          onOpenHolidays={openHolidays}
          userMenuOpen={userMenuOpen}
          onToggleUserMenu={() => setUserMenuOpen(o => !o)}
          userBtnRef={userBtnRef}
        />
        {!collapsed && <div className="sidebar-backdrop" onClick={() => setCollapsed(true)}></div>}
        <div className="main">
          {page === 'home' && window.GlobalHome && <window.GlobalHome onOpenWorkspace={openWorkspace} />}
          {page === 'workspace' && window.WorkspaceHome && <window.WorkspaceHome workspaceId={activeWorkspace} onOpenProject={openProject} />}
          {page === 'people' && window.PeopleView && (
            <window.PeopleView
              workspaceName={(['magero','eng','prod'].includes(activeWorkspace)
                ? ({ magero: 'Equipa Mágero', eng: 'Engenharia', prod: 'Produto & Design' })[activeWorkspace]
                : 'Workspace')}
              onGoHome={goHome}
              onOpenWorkspace={() => openWorkspace(activeWorkspace)}
            />
          )}
          {page === 'tipos' && window.MemberTypesView && (
            <window.MemberTypesView
              workspaceName={({ magero: 'Equipa Mágero', eng: 'Engenharia', prod: 'Produto & Design' })[activeWorkspace] || 'Workspace'}
            />
          )}
          {page === 'holidays' && window.HolidaysView && (
            <window.HolidaysView
              workspaceName={({ magero: 'Equipa Mágero', eng: 'Engenharia', prod: 'Produto & Design' })[activeWorkspace] || 'Workspace'}
            />
          )}
          {page === 'account' && window.AccountView && (
            <window.AccountView initialTab={accountTab} theme={theme} onToggleTheme={toggleTheme} chrome={chrome} setChrome={setChrome} />
          )}
          {page === 'project' && <>
            <ProjectHeader view={view} setView={setView} />
            {['list', 'board', 'timeline'].includes(view) && window.ViewActions && (
              <window.ViewActions
                filter={taskFilter}
                setFilter={setTaskFilter}
                onManageStates={() => setManageStatesOpen(true)}
              />
            )}
            {view === 'list'     && <><Toolbar /><ListView /></>}
            {view === 'timeline' && (window.GanttView ? <window.GanttView /> : <GanttView />)}
            {view === 'overview' && window.ProjectOverview && <window.ProjectOverview setView={setView} />}
            {view === 'board'    && (window.BoardView ? <window.BoardView filter={taskFilter} /> : <PlaceholderView title="Quadro Kanban" subtitle="A carregar…" />)}
            {view === 'calendar' && (window.CalendarView ? <window.CalendarView /> : <PlaceholderView title="Calendário" subtitle="A carregar…" />)}
            {view === 'files'    && (window.FilesView ? <window.FilesView /> : <PlaceholderView title="Ficheiros" subtitle="A carregar…" />)}
          </>}
        </div>
      </div>
      {notifOpen    && <NotificationPanel anchorRef={notifBtnRef}  onClose={() => setNotifOpen(false)} />}
      {taskModalOpen && window.TaskModal && <window.TaskModal onClose={() => setTaskModalOpen(false)} />}
      {manageStatesOpen && window.ManageStatesDrawer && <window.ManageStatesDrawer onClose={() => setManageStatesOpen(false)} />}
      {permissionsOpen && window.PermissionsModal && <window.PermissionsModal onClose={() => setPermissionsOpen(false)} />}
      {inviteOpen && window.InvitePersonModal && <window.InvitePersonModal onClose={() => setInviteOpen(false)} onAdd={() => setInviteOpen(false)} preSelectedProject={invitePreProject} />}
      {newProjectOpen && window.NewProjectModal && <window.NewProjectModal onClose={() => setNewProjectOpen(false)} onCreate={() => setNewProjectOpen(false)} />}
      {newWorkspaceOpen && <NewWorkspaceModal onClose={() => setNewWorkspaceOpen(false)} onCreate={(name) => { console.log('New workspace:', name); }} />}
      {userMenuOpen && <UserMenu          anchorRef={userBtnRef}   onClose={() => setUserMenuOpen(false)} theme={theme} onToggleTheme={toggleTheme} chrome={chrome} setChrome={setChrome} onOpenAccount={(tab) => { setUserMenuOpen(false); openAccount(tab); }} onOpenNewWorkspace={() => { setUserMenuOpen(false); setNewWorkspaceOpen(true); }} activeWorkspace={activeWorkspace} onSwitchWorkspace={(id) => { setActiveWorkspace(id); setUserMenuOpen(false); }} />}
      {createOpen   && <CreateMenu        anchorRef={createBtnRef} onClose={() => setCreateOpen(false)} />}
      {langOpen     && <LanguageMenu      anchorRef={langBtnRef}   onClose={() => setLangOpen(false)} currentLang={currentLang} onPick={setCurrentLang} />}
    </div>
  );
}

Object.assign(window, { App, awpCss: css, awpTokens: T, awpStatusMeta: statusMeta });
