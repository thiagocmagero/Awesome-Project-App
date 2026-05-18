/* eslint-disable */
// AWP — App shell · Helio identity, Asana-inspired structure.
// Sidebar fully hides on collapse (no rail). Top bar persists.

const T = {
  bg: 'oklch(0.985 0.003 250)',
  panel: '#ffffff',
  panel2: 'oklch(0.965 0.006 250)',
  panel3: 'oklch(0.945 0.008 250)',
  line: 'oklch(0.92 0.008 250)',
  lineSoft: 'oklch(0.95 0.005 250)',
  ink: 'oklch(0.22 0.02 250)',
  ink2: 'oklch(0.35 0.018 250)',
  dim: 'oklch(0.48 0.014 250)',
  mute: 'oklch(0.62 0.012 250)',
  brand: 'oklch(0.55 0.20 264)',
  brandHover: 'oklch(0.50 0.22 264)',
  brandSoft: 'oklch(0.95 0.04 264)',
  brandSoft2: 'oklch(0.92 0.06 264)',
  todo: 'oklch(0.92 0.012 250)',  todoInk: 'oklch(0.32 0.02 250)',
  doing: 'oklch(0.90 0.10 70)',   doingInk: 'oklch(0.32 0.10 60)',
  done: 'oklch(0.88 0.12 155)',   doneInk: 'oklch(0.28 0.10 155)',
  blocked: 'oklch(0.88 0.16 25)', blockedInk: 'oklch(0.32 0.12 25)',
  review: 'oklch(0.90 0.10 295)', reviewInk: 'oklch(0.32 0.12 295)',
  high: 'oklch(0.65 0.20 25)',
  med:  'oklch(0.72 0.16 70)',
  low:  'oklch(0.70 0.10 220)',
  font: '"Geist", "Inter", -apple-system, system-ui, sans-serif',
  mono: '"Geist Mono", "JetBrains Mono", ui-monospace, monospace',
};

const css = `
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

.side-item { display: flex; align-items: center; gap: 10px; padding: 6px 8px; border-radius: 6px; cursor: pointer; font-size: 13px; color: ${T.ink2}; min-width: 0; }
.side-item:hover { background: ${T.panel3}; }
.side-item.active { background: ${T.brandSoft}; color: ${T.brand}; font-weight: 600; }
.side-item .ico { width: 16px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; opacity: 0.85; }
.side-item .dot { width: 10px; height: 10px; border-radius: 3px; flex: 0 0 auto; }
.side-item .label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.side-item .count { font-family: ${T.mono}; font-size: 11px; color: ${T.mute}; }
.side-item.active .count { color: ${T.brand}; }
.side-item .chev { font-size: 9px; color: ${T.mute}; }
.side-children { padding-left: 22px; }
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

.side-bottom { margin-top: auto; padding: 8px; border-top: 1px solid ${T.line}; }
.user-card { display: flex; align-items: center; gap: 10px; padding: 7px 8px; border-radius: 8px; cursor: pointer; transition: background .12s; position: relative; }
.user-card:hover { background: ${T.panel3}; }
.user-card.open { background: ${T.panel3}; }
.user-card .meta { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.15; }
.user-card .name { font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.user-card .plan { font-size: 10px; color: ${T.brand}; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; padding: 1px 6px; background: ${T.brandSoft}; border-radius: 4px; align-self: flex-start; margin-top: 2px; }
.user-card .kebab { color: ${T.mute}; font-size: 16px; letter-spacing: 2px; flex: 0 0 auto; }

/* Popovers */
.popover-backdrop { position: fixed; inset: 0; z-index: 80; }
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

/* User menu */
.user-menu { width: 280px; padding: 6px; display: flex; flex-direction: column; gap: 1px; }
.user-menu .profile-card { padding: 14px; display: flex; flex-direction: column; align-items: center; gap: 6px; background: ${T.panel2}; border-radius: 8px; margin-bottom: 6px; position: relative; }
.user-menu .profile-card .plan-pill { position: absolute; top: 10px; left: 10px; font-size: 9px; color: ${T.brand}; font-weight: 700; letter-spacing: 0.08em; padding: 2px 7px; background: ${T.panel}; border-radius: 4px; }
.user-menu .profile-card .avatar { width: 56px; height: 56px; font-size: 18px; margin-top: 4px; }
.user-menu .profile-card .email { font-size: 13px; font-weight: 600; margin-top: 6px; }
.user-menu .profile-card .role { font-size: 11px; color: ${T.mute}; }
.menu-item { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 6px; cursor: pointer; font-size: 13px; color: ${T.ink}; }
.menu-item:hover { background: ${T.panel2}; }
.menu-item .ico { width: 14px; color: ${T.dim}; display: flex; align-items: center; }
.menu-item .check { margin-left: auto; color: ${T.brand}; }
.menu-item.danger { color: ${T.high}; }
.menu-item.danger .ico { color: ${T.high}; }
.menu-divider { height: 1px; background: ${T.line}; margin: 6px 4px; }
.menu-item .switch { margin-left: auto; width: 30px; height: 16px; border-radius: 999px; background: ${T.panel3}; position: relative; }
.menu-item .switch::after { content: ''; position: absolute; top: 2px; left: 2px; width: 12px; height: 12px; border-radius: 999px; background: ${T.panel}; box-shadow: 0 1px 2px rgba(0,0,0,.15); transition: left .18s; }
.menu-item .switch.on { background: ${T.brand}; }
.menu-item .switch.on::after { left: 16px; }

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

function TopBar({ collapsed, onToggle, notifOpen, onToggleNotif, notifBtnRef, createOpen, onToggleCreate, createBtnRef, langOpen, onToggleLang, langBtnRef, currentLang, onToggleFullscreen, isFullscreen }) {
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

function SidebarItem({ icon, dot, label, active, count, onClick, chev, indent }) {
  return (
    <div className={'side-item' + (active ? ' active' : '')} onClick={onClick} style={indent ? { paddingLeft: 22 } : null}>
      {icon && <span className="ico">{icon}</span>}
      {dot && <span className="dot" style={{ background: dot }}></span>}
      <span className="label">{label}</span>
      {count && <span className="count">{count}</span>}
      {chev && <span className="chev">▾</span>}
    </div>
  );
}

function Sidebar({ activeProject, setActiveProject, userMenuOpen, onToggleUserMenu, userBtnRef }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-inner">
        <div style={{ padding: '6px 8px 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: T.brand, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>A</div>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Awesome Project</span>
            <span style={{ fontSize: 11, color: T.mute }}>Equipa Mágero</span>
          </div>
          <span style={{ marginLeft: 'auto', color: T.mute, fontSize: 10 }}>⇅</span>
        </div>

        <div style={{ height: 4 }}></div>

        <SidebarItem icon={<HomeIcon />} label="Página inicial" />
        <SidebarItem icon={<TaskIcon />} label="Minhas tarefas" count="12" />

        <div className="side-section"><span>Workspaces</span><span className="add">+</span></div>
        <SidebarItem icon={<UsersIcon />} label="Meu espaço" chev />
        <SidebarItem icon={<UsersIcon />} label="Engenharia" />
        <SidebarItem icon={<UsersIcon />} label="Produto & Design" />

        <div className="side-section"><span>Projetos</span><span className="add">+</span></div>
        {projects.map(p => (
          <SidebarItem key={p.id} dot={p.color} label={p.name} active={p.id === activeProject} onClick={() => setActiveProject(p.id)} />
        ))}

        <div style={{ height: 10 }}></div>
        <div className="side-item invite">
          <span className="ico"><InviteIcon /></span>
          <span className="label">Convidar pessoas</span>
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
          { key: 'timeline', label: 'Cronograma' },
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
                    <div key={r.id} className={'list-cols list-row' + (r.st === 'done' ? ' done' : '')}>
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

      <div className="add-task-bar">
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
    <div ref={ref} className={'popover ' + (panelClass || '')} style={pos}>
      {children}
    </div>
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

function UserMenu({ anchorRef, onClose }) {
  const [theme, setTheme] = useState('light');
  return (
    <Popover anchorRef={anchorRef} onClose={onClose} panelClass="user-menu" placement="right-bottom" offset={10}>
      <div className="profile-card">
        <span className="plan-pill">PRO</span>
        <div className="avatar lg" title="Thiago Mágero" style={{ background: '#e8704c' }}>TM</div>
        <div className="email">thiagocmagero@gmail.com</div>
        <div className="role">Proprietário da equipa</div>
      </div>

      <div className="menu-item">
        <span className="ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>
        Definições da conta
      </div>
      <div className="menu-item">
        <span className="ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></span>
        Definições da equipa
      </div>
      <div className="menu-item">
        <span className="ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="20" x2="21" y2="20"/><line x1="6" y1="20" x2="6" y2="12"/><line x1="12" y1="20" x2="12" y2="6"/><line x1="18" y1="20" x2="18" y2="14"/></svg></span>
        Utilização do plano
      </div>

      <div className="menu-divider"></div>

      <div className="menu-item">
        <div className="avatar sm" title="Thiago Mágero" style={{ background: '#e8704c', width: 18, height: 18, fontSize: 9 }}>TM</div>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Equipa Mágero</span>
        <span className="check">✓</span>
      </div>
      <div className="menu-item" style={{ color: T.brand }}>
        <span className="ico" style={{ color: T.brand }}>+</span>
        Nova equipa
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

      <div className="menu-item" onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>
        <span className="ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg></span>
        Tema {theme === 'light' ? 'claro' : 'escuro'}
        <span className={'switch' + (theme === 'dark' ? ' on' : '')}></span>
      </div>
      <div className="menu-item danger">
        <span className="ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></span>
        Terminar sessão
      </div>
    </Popover>
  );
}

function CreateMenu({ anchorRef, onClose }) {
  return (
    <Popover anchorRef={anchorRef} onClose={onClose} panelClass="create-menu" placement="below-end" offset={8}>
      <div className="menu-item">
        <span className="ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></svg></span>
        Tarefa
        <span className="kbd-hint">T</span>
      </div>
      <div className="menu-item">
        <span className="ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="4" x2="9" y2="20"/></svg></span>
        Projeto
        <span className="kbd-hint">P</span>
      </div>
      <div className="menu-item">
        <span className="ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>
        Workspace
        <span className="kbd-hint">W</span>
      </div>
      <div className="menu-item">
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

function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [activeProject, setActiveProject] = useState('awp');
  const [view, setView] = useState('list');
  const [viewFilter, setViewFilter] = useState('');
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
      />
      <div className={'body' + (collapsed ? ' collapsed' : '')}>
        <Sidebar
          activeProject={activeProject}
          setActiveProject={setActiveProject}
          userMenuOpen={userMenuOpen}
          onToggleUserMenu={() => setUserMenuOpen(o => !o)}
          userBtnRef={userBtnRef}
        />
        <div className="main">
          <ProjectHeader view={view} setView={setView} />
          {view === 'list' && <>
            {window.ViewActions
              ? <window.ViewActions filter={viewFilter} setFilter={setViewFilter} onFullscreen={toggleFullscreen} />
              : <Toolbar />}
            <ListView />
          </>}
          {view === 'timeline' && <>
            {window.ViewActions && <window.ViewActions filter={viewFilter} setFilter={setViewFilter} onFullscreen={toggleFullscreen} />}
            {window.GanttView ? <window.GanttView /> : <GanttView />}
          </>}
          {view === 'overview' && <PlaceholderView title="Visão geral" subtitle="Painel de saúde do projeto — em construção" />}
          {view === 'board' && <>
            {window.ViewActions && <window.ViewActions filter={viewFilter} setFilter={setViewFilter} onFullscreen={toggleFullscreen} />}
            {window.BoardView ? <window.BoardView filter={viewFilter} /> : <PlaceholderView title="Quadro Kanban" subtitle="A carregar…" />}
          </>}
          {view === 'calendar' && <PlaceholderView title="Calendário" subtitle="Em construção" />}
          {view === 'files'    && <PlaceholderView title="Ficheiros" subtitle="Em construção" />}
        </div>
      </div>
      {notifOpen    && <NotificationPanel anchorRef={notifBtnRef}  onClose={() => setNotifOpen(false)} />}
      {userMenuOpen && <UserMenu          anchorRef={userBtnRef}   onClose={() => setUserMenuOpen(false)} />}
      {createOpen   && <CreateMenu        anchorRef={createBtnRef} onClose={() => setCreateOpen(false)} />}
      {langOpen     && <LanguageMenu      anchorRef={langBtnRef}   onClose={() => setLangOpen(false)} currentLang={currentLang} onPick={setCurrentLang} />}
    </div>
  );
}

Object.assign(window, { App, awpCss: css, awpTokens: T });
