import { T } from './tokens';

/**
 * Shell CSS — port 1:1 de NewTemplate/app-dark.jsx:32-917.
 * As variáveis de tema duplicam o que está em styles/tokens.css (valores
 * idênticos, last-wins, no-op). Mantém-se aqui para preservar a fidelidade
 * do port; será extraído para .css quando os respectivos componentes forem
 * componentizados nas sub-fases da Fase 2.
 */
export const shellCss = `
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

/* Nested menu */
.menu-root, .submenu { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 1px; }
.menu-section { list-style: none; padding: 12px 8px 4px; display: flex; align-items: center; gap: 6px; font-size: 11px; color: ${T.mute}; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; }
.menu-section .add { margin-left: auto; cursor: pointer; opacity: 0; transition: opacity .12s; padding: 2px 4px; border-radius: 4px; }
.menu-section:hover .add { opacity: 1; }
.menu-section .add:hover { background: ${T.panel3}; }
.menu-divider { list-style: none; height: 1px; background: ${T.line}; margin: 6px 4px; }
.menu-item { list-style: none; position: relative; }
.menu-link { display: flex; align-items: center; gap: 10px; padding: 6px 8px; border-radius: 6px; cursor: pointer; font-size: 13px; line-height: 1.2; color: ${T.ink2}; text-decoration: none; min-width: 0; transition: background .12s, color .12s; }
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
.menu-chevron { width: 14px; height: 14px; flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; color: ${T.mute}; transition: transform .2s cubic-bezier(.2,.7,.2,1), color .12s; }
.menu-link:hover .menu-chevron { color: ${T.ink2}; }
.menu-item.has-sub.open > .menu-link > .menu-chevron { transform: rotate(90deg); }
.menu-item.has-sub.has-active-child > .menu-link { color: ${T.ink}; }
.menu-item.has-sub.has-active-child > .menu-link .menu-icon { color: ${T.ink}; }
.menu-item.has-sub > .submenu-wrap { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .26s cubic-bezier(.2,.7,.2,1); }
.menu-item.has-sub.open > .submenu-wrap { grid-template-rows: 1fr; }
.menu-item.has-sub > .submenu-wrap > .submenu { position: relative; margin: 2px 0 4px 16px; padding-left: 14px; min-height: 0; overflow: hidden; }
.menu-item.has-sub > .submenu-wrap > .submenu::before { content: ''; position: absolute; left: 0; top: 4px; bottom: 4px; width: 1px; background: currentColor; opacity: 0.18; }
.menu-item.has-sub > .submenu-wrap > .submenu .menu-link { font-size: 12.5px; font-weight: 500; padding: 5px 8px 5px 10px; }

/* Legacy .side-item */
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

.avatar-list-stacked { display: inline-flex; align-items: center; padding-right: 0.65rem; }
.avatar-list-stacked .avatar { margin-right: -0.65rem; border: 2px solid ${T.panel}; transition: transform .2s ease, box-shadow .2s ease; cursor: default; }
.avatar-list-stacked .avatar:hover { z-index: 3; transform: scale(1.18); }
.avatar-list-stacked .avatar.more { background: ${T.panel2}; color: ${T.dim}; font-weight: 600; }
.list-row:hover .avatar-list-stacked .avatar { border-color: ${T.panel2}; }

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

.sidebar-ws-card { display: flex; align-items: center; gap: 10px; padding: 8px; margin: 2px 0 4px; border-radius: 8px; cursor: pointer; transition: background .12s; }
.sidebar-ws-card:hover { background: var(--chrome-bg2, ${T.panel3}); }
.sidebar-ws-card .glyph { width: 32px; height: 32px; flex: 0 0 auto; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 12px; letter-spacing: 0.02em; }
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

.popover-backdrop { position: fixed; inset: 0; z-index: 80; display: none; }
.popover { position: fixed; z-index: 81; background: ${T.panel}; border: 1px solid ${T.line}; border-radius: 12px; box-shadow: 0 20px 50px -10px rgba(20,20,40,.18), 0 4px 12px rgba(20,20,40,.06); overflow: hidden; }

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

/* User menu — two-pane */
.user-menu { width: 560px; max-width: 92vw; display: grid; grid-template-columns: 200px 1fr; min-height: 380px; }
.user-menu .ws-pane { background: ${T.panel2}; border-right: 1px solid ${T.line}; padding: 10px 8px; display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.user-menu .ws-pane-head { font-size: 11px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: ${T.mute}; padding: 6px 8px 8px; }
.user-menu .ws-row { display: flex; align-items: center; gap: 10px; padding: 7px 8px; border-radius: 6px; cursor: pointer; font-size: 13px; color: ${T.ink}; min-width: 0; transition: background .12s; }
.user-menu .ws-row:hover { background: ${T.panel3}; }
.user-menu .ws-row.active { background: ${T.panel}; box-shadow: inset 0 0 0 1.5px ${T.brand}; }
.user-menu .ws-row .glyph { width: 28px; height: 28px; flex: 0 0 auto; border-radius: 999px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 11px; letter-spacing: 0.02em; }
.user-menu .ws-row .name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.user-menu .ws-row .check { color: ${T.brand}; font-size: 14px; }
.user-menu .ws-pane-spacer { flex: 1; }
.user-menu .ws-add { display: flex; align-items: center; gap: 10px; padding: 7px 8px; border-radius: 6px; cursor: pointer; font-size: 13px; color: ${T.brand}; border: 1px dashed ${T.line}; margin-top: 4px; }
.user-menu .ws-add:hover { background: ${T.panel3}; }
.user-menu .ws-add .ico { width: 28px; height: 28px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; font-size: 16px; }
.user-menu .ws-logout { margin-top: 6px; padding-top: 10px; border-top: 1px solid ${T.line}; }
.user-menu .ws-logout .menu-item { color: ${T.high}; padding: 7px 8px; }
.user-menu .ws-logout .menu-item .ico { color: ${T.high}; }
.user-menu .acc-pane { padding: 10px; display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.user-menu .acc-trial { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; padding: 10px 12px; background: oklch(0.96 0.05 80 / 1); color: oklch(0.35 0.10 60); border-radius: 8px; font-size: 12px; line-height: 1.4; margin-bottom: 8px; }
html[data-theme="dark"] .user-menu .acc-trial { background: oklch(0.28 0.06 70); color: oklch(0.92 0.06 80); }
.user-menu .acc-trial a { color: ${T.brand}; font-weight: 600; text-decoration: none; }
.user-menu .acc-trial a:hover { text-decoration: underline; }
.user-menu .acc-profile { display: flex; align-items: center; gap: 10px; padding: 8px; margin-bottom: 8px; }
.user-menu .acc-profile .avatar { width: 40px; height: 40px; font-size: 14px; flex: 0 0 auto; }
.user-menu .acc-profile .info { display: flex; flex-direction: column; min-width: 0; line-height: 1.2; }
.user-menu .acc-profile .info .name { font-size: 14px; font-weight: 600; color: ${T.ink}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.user-menu .acc-profile .info .email { font-size: 12px; color: ${T.mute}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.user-menu .acc-pane .menu-divider { margin: 6px 4px; }
@media (max-width: 640px) {
  .user-menu { grid-template-columns: 1fr; min-height: 0; }
  .user-menu .ws-pane { border-right: none; border-bottom: 1px solid ${T.line}; }
}

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
/* .row-more (kebab) — visibilidade controlada por styles/project-list.css.
   Estilos canónicos (color, opacity, hover, touch fallback) vivem lá; este
   ficheiro NAO deve declarar .row-more para nao fazer override por cascade. */
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

@media (max-width: 1100px) {
  .list-cols { grid-template-columns: 28px 1fr 110px 80px 80px 90px 90px 36px; }
  .list-cols .est-col { display: none; }
}

/* RESPONSIVE — tablet & mobile */
.sidebar-backdrop { display: none; }

@media (max-width: 1024px) {
  .app > .body, .app > .body.collapsed { grid-template-columns: 1fr !important; }
  .sidebar { position: fixed; top: 48px; left: 0; bottom: 0; width: 280px; z-index: 70; transform: translateX(-100%); transition: transform .24s cubic-bezier(.2,.7,.2,1); box-shadow: 0 12px 40px rgba(15,15,30,.28); }
  .app > .body:not(.collapsed) > .sidebar { transform: translateX(0); }
  .sidebar-inner { width: 100%; }
  .sidebar-backdrop { display: block; position: fixed; inset: 48px 0 0 0; background: rgba(15,15,28,.45); z-index: 65; -webkit-backdrop-filter: blur(2px); backdrop-filter: blur(2px); animation: awp-fade .18s ease; }
  @keyframes awp-fade { from { opacity: 0; } to { opacity: 1; } }
  .topbar { padding: 0 8px; gap: 4px; }
  .search { max-width: none; }
  .proj-header { padding: 12px 16px 0; gap: 10px; }
  .proj-titlebar { flex-wrap: wrap; gap: 10px; }
  .toolbar { padding: 10px 16px; flex-wrap: wrap; row-gap: 8px; }
  .toolbar > div[style*="margin-left"] { margin-left: 0 !important; }
  .tabs { overflow-x: auto; flex-wrap: nowrap; scrollbar-width: none; -webkit-overflow-scrolling: touch; margin: 0 -16px; padding: 0 16px; }
  .tabs::-webkit-scrollbar { display: none; }
  .tab { white-space: nowrap; flex: 0 0 auto; }
  .list-cols { padding: 0 16px; }
  .list-group { padding: 10px 16px; }
  .list-head { padding: 0 16px; }
  .add-task-bar { padding: 10px 16px 16px; }
}

@media (max-width: 768px) {
  .topbar .create-btn { padding: 0 10px; gap: 0; }
  .topbar .create-btn > span:not(.plus) { display: none; }
  .topbar .icon-btn[title*="ecrã"] { display: none; }
  .search .kbd { display: none; }
  .proj-name { font-size: 17px; }
  .proj-status { font-size: 11px; padding: 3px 9px; }
  .proj-members .avatar:not(.more):nth-of-type(n+3) { display: none; }
  .toolbar > div[style*="margin-left"] { display: none !important; }
  .list-head { display: none; }
  .list-row { display: grid !important; grid-template-columns: 22px 1fr 24px !important; grid-template-areas: "check title more" "blank smeta smeta" "blank pmeta pmeta" !important; height: auto; padding: 12px 16px; row-gap: 6px; column-gap: 10px; align-items: center; }
  .list-row > :nth-child(1) { grid-area: check; }
  .list-row > :nth-child(2) { grid-area: title; white-space: normal; line-height: 1.35; font-weight: 500; }
  .list-row > :nth-child(3) { grid-area: smeta; justify-self: start; margin-right: 0; }
  .list-row > :nth-child(4) { display: none; }
  .list-row > :nth-child(5) { grid-area: smeta; justify-self: end; align-self: center; }
  .list-row > :nth-child(6) { display: none; }
  .list-row > :nth-child(7) { grid-area: pmeta; justify-self: start; }
  .list-row > :nth-child(8) { grid-area: pmeta; justify-self: end; }
  .list-row > :nth-child(9) { grid-area: more; color: ${T.dim} !important; align-self: start; }
}

@media (max-width: 640px) {
  .popover { left: 0 !important; right: 0 !important; top: auto !important; bottom: 0 !important; width: 100% !important; max-width: none !important; border-radius: 16px 16px 0 0 !important; max-height: 82vh; border-bottom: none; padding-top: 6px; animation: awp-sheet-in .22s cubic-bezier(.2,.7,.2,1); }
  .popover::before { content: ''; display: block; width: 40px; height: 4px; background: ${T.line}; border-radius: 999px; margin: 0 auto 4px; }
  @keyframes awp-sheet-in { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  .notif-panel { max-height: 82vh; }
  .user-menu, .create-menu, .lang-menu { max-height: 82vh; overflow-y: auto; }
  .popover-backdrop { position: fixed; inset: 0; background: rgba(15,15,28,.4); z-index: 79; animation: awp-fade .18s ease; }
  .proj-members .avatar:not(.more):nth-of-type(n+3) { display: none; }
}

/* CHROME (sidebar + topbar) — deep indigo, themed via vars */
.topbar { background: var(--chrome-bg); border-bottom: 1px solid var(--chrome-line); color: var(--chrome-ink); }
.topbar .icon-btn { color: var(--chrome-dim); }
.topbar .icon-btn:hover { background: var(--chrome-bg2); color: var(--chrome-ink); }
.topbar .icon-btn.has-badge .badge { border-color: var(--chrome-bg); }
.topbar .lang-flag-btn:hover { background: var(--chrome-bg2); }
.topbar .search { background: var(--chrome-bg2); border-color: transparent; color: var(--chrome-dim); }
.topbar .search:hover { background: var(--chrome-bg3); }
.topbar .search:focus-within { background: var(--chrome-bg3); border-color: oklch(0.60 0.20 264); box-shadow: 0 0 0 3px var(--chrome-brand-soft); color: var(--chrome-ink); }
.topbar .search input { color: var(--chrome-ink); }
.topbar .search input::placeholder { color: var(--chrome-mute); }
.topbar .search .kbd { background: var(--chrome-bg); border-color: var(--chrome-line); color: var(--chrome-mute); }
.topbar .create-btn { box-shadow: 0 1px 0 oklch(0.30 0.14 264 / 0.5), 0 0 0 1px oklch(0.50 0.18 264 / 0.4); }

.sidebar { background: var(--chrome-bg); border-right: 1px solid var(--chrome-line); color: var(--chrome-ink); }
.sidebar .side-section { color: var(--chrome-mute); }
.sidebar .side-section .add:hover { background: var(--chrome-bg2); }
.sidebar .side-item { color: var(--chrome-dim); }
.sidebar .side-item:hover { background: var(--chrome-bg2); color: var(--chrome-ink); }
.sidebar .side-item.active { background: var(--chrome-active-bg); color: #fff; font-weight: 600; box-shadow: inset 2px 0 0 oklch(0.78 0.16 264); }
.sidebar .side-item.active .count { color: oklch(0.85 0.05 264); }
.sidebar .side-item .count { color: var(--chrome-mute); }
.sidebar .side-item .ico { color: var(--chrome-mute); }
.sidebar .side-item:hover .ico { color: var(--chrome-ink); }

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
.sidebar > .sidebar-inner > .menu-root > .menu-item > .menu-link.active { background: var(--chrome-active-bg); color: #fff; font-weight: 600; box-shadow: inset 2px 0 0 oklch(0.78 0.16 264); }
.sidebar > .sidebar-inner > .menu-root > .menu-item > .menu-link.active .menu-icon { color: oklch(0.85 0.14 264); }
.sidebar > .sidebar-inner > .menu-root > .menu-item > .menu-link.active .menu-count { color: oklch(0.85 0.05 264); }
.sidebar .menu-item.has-sub.has-active-child > .menu-link { color: var(--chrome-ink); }
.sidebar .menu-item.has-sub.has-active-child > .menu-link .menu-icon { color: var(--chrome-ink); }
.sidebar .menu-item.has-sub > .submenu-wrap > .submenu::before { background: var(--chrome-ink); opacity: 0.10; }
.sidebar .menu-item.has-sub > .submenu-wrap > .submenu .menu-link.active { background: var(--chrome-brand-soft); color: oklch(0.92 0.08 264); font-weight: 600; box-shadow: none; }
.sidebar .menu-item.has-sub > .submenu-wrap > .submenu .menu-link.active .menu-icon { color: oklch(0.85 0.14 264); }

.sidebar .side-item.invite { background: var(--chrome-bg2); border-color: var(--chrome-line); color: var(--chrome-ink); }
.sidebar .side-item.invite:hover { background: var(--chrome-bg3); }
.sidebar .side-item.invite .ico { color: oklch(0.75 0.16 264); }

.sidebar .sidebar-ws-card:hover { background: var(--chrome-bg2); }
.sidebar .sidebar-ws-card .meta .name { color: var(--chrome-ink); }
.sidebar .sidebar-ws-card .meta .role { color: var(--chrome-mute); }

.sidebar .side-bottom { border-top: 1px solid var(--chrome-line); }
.sidebar .user-card { color: var(--chrome-ink); }
.sidebar .user-card:hover, .sidebar .user-card.open { background: var(--chrome-bg2); }
.sidebar .user-card .name { color: var(--chrome-ink); }
.sidebar .user-card .plan { background: oklch(0.40 0.14 264 / 0.4); color: oklch(0.85 0.14 264); }
.sidebar .user-card .kebab { color: var(--chrome-mute); }

.sidebar ::-webkit-scrollbar-thumb { background: var(--chrome-line); border-color: var(--chrome-bg); }
.sidebar ::-webkit-scrollbar-thumb:hover { background: var(--chrome-mute); }
`;
