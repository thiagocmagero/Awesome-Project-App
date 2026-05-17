/* eslint-disable */
// AWP — Task creation/edit modal. Tabs: Details, Discussion, Links, Files.
// Light + dark via the shared CSS variables. Tokens via window.awpTokens.

const TM = window.awpTokens;

// ============================================================
// CSS
// ============================================================
const taskModalCss = `

/* ---------- Backdrop + shell ---------- */
.tm-backdrop {
  position: fixed; inset: 0;
  background: rgba(var(--backdrop-rgb), 0.55);
  -webkit-backdrop-filter: blur(3px);
  backdrop-filter: blur(3px);
  z-index: 200;
  animation: tm-fade .18s ease;
}
@keyframes tm-fade { from { opacity: 0; } to { opacity: 1; } }
.tm-modal {
  position: fixed;
  top: 24px; bottom: 24px;
  left: 50%; transform: translateX(-50%);
  width: min(1280px, calc(100vw - 48px));
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 14px;
  z-index: 201;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 60px -20px rgba(0,0,0,.32);
  animation: tm-slide-up .26s cubic-bezier(.2,.7,.2,1);
}
@keyframes tm-slide-up {
  from { transform: translate(-50%, 16px); opacity: 0; }
  to { transform: translateX(-50%); opacity: 1; }
}
.tm-modal.full {
  top: 0; bottom: 0;
  width: 100vw;
  border-radius: 0;
  border: none;
}

/* ---------- Chrome row ---------- */
.tm-chrome { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: var(--panel2); border-bottom: 1px solid var(--lineSoft); flex: 0 0 auto; }
.tm-chrome .kind { display: inline-flex; align-items: center; gap: 6px; padding: 4px 9px; background: var(--brandSoft); color: var(--brand); font-size: 10.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; border-radius: 5px; }
.tm-chrome .updated { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; color: var(--dim); }
.tm-chrome .updated svg { color: var(--mute); }
.tm-chrome .grow { flex: 1; }
.tm-chrome .follow { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; background: transparent; border: 1px solid var(--line); border-radius: 7px; color: var(--ink2); font-size: 12px; cursor: pointer; font-weight: 500; }
.tm-chrome .follow:hover { background: var(--panel3); color: var(--ink); }
.tm-chrome .follow.is-following { background: var(--brandSoft); color: var(--brand); border-color: var(--brandSoft2); }
.tm-chrome .ico-btn { width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 7px; background: transparent; border: none; cursor: pointer; color: var(--dim); }
.tm-chrome .ico-btn:hover { background: var(--panel3); color: var(--ink); }

/* ---------- Title + tags + stats ---------- */
.tm-title-row { padding: 18px 24px 0; }
.tm-title-row h2 { margin: 0; font-size: 24px; font-weight: 600; color: var(--ink); letter-spacing: -0.5px; outline: none; line-height: 1.2; }
.tm-title-row h2:empty::before { content: 'Sem título'; color: var(--mute); }

.tm-meta-row { display: flex; align-items: center; gap: 10px; padding: 12px 24px 0; flex-wrap: wrap; }
.tm-tag { display: inline-flex; align-items: center; gap: 6px; padding: 3px 8px; background: var(--brandSoft); color: var(--brand); font-size: 11.5px; font-weight: 600; border-radius: 5px; }
.tm-tag .x { cursor: pointer; opacity: 0.6; font-size: 10px; line-height: 1; }
.tm-tag .x:hover { opacity: 1; }
.tm-add-tag { font-size: 11.5px; color: var(--mute); cursor: pointer; padding: 3px 10px; border: 1px dashed var(--line); border-radius: 5px; }
.tm-add-tag:hover { color: var(--brand); border-color: var(--brand); }
.tm-stats { margin-left: auto; display: flex; gap: 14px; align-items: center; font-size: 12.5px; color: var(--dim); }
.tm-stats .s { display: inline-flex; align-items: center; gap: 6px; }
.tm-stats .s b { color: var(--ink); font-weight: 600; }
.tm-stats .s svg { color: var(--mute); }

/* ---------- Property strip — inline, edge-to-edge, readonly except State ---------- */
.tm-props {
  display: flex; align-items: center; gap: 32px;
  flex-wrap: wrap;
  padding: 12px 24px;
  margin-top: 14px;
  border-top: 1px solid var(--lineSoft);
  border-bottom: 1px solid var(--lineSoft);
  flex: 0 0 auto;
}
.tm-prop { display: inline-flex; align-items: center; gap: 10px; min-width: 0; flex: 0 0 auto; }
.tm-prop .l { font-size: 10.5px; color: var(--mute); font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; margin: 0; }
.tm-prop .v { display: inline-flex; align-items: center; gap: 8px; min-width: 0; }
.tm-prop .v .cal { color: var(--brand); display: inline-flex; }
.tm-prop .v .date { font-size: 13px; color: var(--ink); font-weight: 500; }
.tm-prop .v .dur { font-size: 12px; color: var(--dim); font-family: var(--mono); }
.tm-prop.progress-prop { flex: 1 1 240px; min-width: 180px; max-width: 380px; }
.tm-prop.progress-prop .v { flex: 1; min-width: 0; }
.tm-prop.progress-prop .bar { flex: 1; min-width: 100px; height: 8px; border-radius: 999px; background: var(--panel3); position: relative; overflow: hidden; }
.tm-prop.progress-prop .bar .fill { position: absolute; left:0; top:0; bottom:0; background: var(--brand); border-radius: 999px; }
.tm-prop.progress-prop .pct { font-family: var(--mono); font-size: 12.5px; color: var(--ink); font-weight: 600; flex: 0 0 auto; }
.tm-prop.state-prop .tm-sel-trigger { padding: 5px 28px 5px 11px; min-height: 28px; }

/* Status pill palette (used for State) */
.st-pill.todo    { background: var(--st-todo);    color: var(--st-todoInk); }
.st-pill.doing   { background: oklch(0.95 0.05 220); color: oklch(0.42 0.13 220); }
.st-pill.review  { background: var(--st-review);  color: var(--st-reviewInk); }
.st-pill.done    { background: var(--st-done);    color: var(--st-doneInk); }
.st-pill.blocked { background: var(--st-blocked); color: var(--st-blockedInk); }
[data-theme="dark"] .st-pill.doing { background: oklch(0.34 0.10 220); color: oklch(0.94 0.08 220); }
.st-pill .dot { background: currentColor; }

/* Priority pill */
.pri-pill { display: inline-flex; align-items: center; gap: 6px; padding: 3px 9px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; }
.pri-pill.high   { background: oklch(0.94 0.07 30);  color: oklch(0.45 0.16 30); }
.pri-pill.med    { background: oklch(0.94 0.07 70);  color: oklch(0.45 0.14 60); }
.pri-pill.low    { background: oklch(0.94 0.05 220); color: oklch(0.45 0.12 220); }
.pri-pill.crit   { background: oklch(0.94 0.09 25);  color: oklch(0.45 0.18 25); }
.pri-pill.none   { background: var(--panel2); color: var(--mute); }
[data-theme="dark"] .pri-pill.high { background: oklch(0.30 0.12 30);  color: oklch(0.92 0.13 30); }
[data-theme="dark"] .pri-pill.med  { background: oklch(0.30 0.10 70);  color: oklch(0.90 0.13 70); }
[data-theme="dark"] .pri-pill.low  { background: oklch(0.30 0.10 220); color: oklch(0.92 0.10 220); }
[data-theme="dark"] .pri-pill.crit { background: oklch(0.30 0.13 25);  color: oklch(0.93 0.15 25); }

/* ---------- Tabs ---------- */
.tm-tabs { display: flex; gap: 0; padding: 0 24px; margin: 16px 0 0; border-bottom: 1px solid var(--line); overflow-x: auto; scrollbar-width: none; flex: 0 0 auto; }
.tm-tabs::-webkit-scrollbar { display: none; }
.tm-tab { padding: 11px 16px 13px; font-size: 13.5px; color: var(--dim); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; display: inline-flex; align-items: center; gap: 7px; white-space: nowrap; flex: 0 0 auto; }
.tm-tab:hover { color: var(--ink); }
.tm-tab.active { color: var(--brand); border-bottom-color: var(--brand); font-weight: 600; }
.tm-tab .ic { opacity: 0.7; }
.tm-tab.active .ic { opacity: 1; }
.tm-tab .n { font-family: var(--mono); font-size: 10.5px; color: var(--mute); padding: 1px 7px; border-radius: 999px; background: var(--panel2); font-weight: 500; }
.tm-tab.active .n { background: var(--brandSoft); color: var(--brand); }

/* ---------- Body (scrollable) ---------- */
.tm-body { flex: 1; overflow-y: auto; padding: 22px 24px 28px; min-height: 0; }

/* Details tab — 4 cols */
.tm-details { display: grid; grid-template-columns: 1.5fr 1fr 1fr 1.1fr; gap: 28px; align-items: start; }
.tm-block .head { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; font-size: 13px; font-weight: 600; color: var(--ink); }
.tm-block .head svg { color: var(--brand); }
.tm-block .head .n { font-family: var(--mono); font-size: 10.5px; color: var(--mute); padding: 1px 7px; border-radius: 999px; background: var(--panel2); font-weight: 500; }
.tm-block + .tm-block { margin-top: 22px; }

.tm-field { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; }
.tm-field > .lbl { font-size: 12px; color: var(--dim); font-weight: 500; }
.tm-input, .tm-textarea {
  width: 100%; padding: 9px 12px;
  background: var(--panel); border: 1px solid var(--line);
  border-radius: 7px; font-size: 13px; color: var(--ink);
  font-family: inherit; outline: none;
  transition: border-color .12s, box-shadow .12s;
}
.tm-input:hover, .tm-textarea:hover { border-color: var(--mute); }
.tm-input:focus, .tm-textarea:focus { border-color: var(--brand); box-shadow: 0 0 0 3px var(--brandSoft); }
.tm-textarea { resize: vertical; min-height: 96px; line-height: 1.5; }
.tm-input[disabled] { opacity: 0.6; cursor: not-allowed; }
.tm-input.icon-l { padding-left: 36px; }
.tm-input-wrap { position: relative; }
.tm-input-wrap .ic-l { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: var(--brand); pointer-events: none; }
.tm-input-wrap .ic-r { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); color: var(--mute); cursor: pointer; padding: 3px; border-radius: 4px; }
.tm-input-wrap .ic-r:hover { background: var(--panel3); color: var(--ink); }

/* Custom select */
.tm-sel { position: relative; }
.tm-sel-trigger {
  width: 100%; padding: 9px 32px 9px 12px;
  background: var(--panel); border: 1px solid var(--line);
  border-radius: 7px; font-size: 13px; color: var(--ink);
  text-align: left; cursor: pointer; display: flex; align-items: center; gap: 8px;
  position: relative; outline: none;
  font-family: inherit;
}
.tm-sel-trigger:hover { border-color: var(--mute); }
.tm-sel-trigger.open { border-color: var(--brand); box-shadow: 0 0 0 3px var(--brandSoft); }
.tm-sel-trigger::after {
  content: ''; position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
  border-left: 4px solid transparent; border-right: 4px solid transparent;
  border-top: 5px solid var(--mute); transition: transform .15s;
}
.tm-sel-trigger.open::after { transform: translateY(-50%) rotate(180deg); }
.tm-sel-trigger .ph { color: var(--mute); }
.tm-sel-panel {
  position: absolute; top: calc(100% + 4px); left: 0; right: 0;
  background: var(--panel); border: 1px solid var(--line);
  border-radius: 8px; box-shadow: 0 12px 32px -12px rgba(0,0,0,.25);
  z-index: 10; padding: 5px;
  max-height: 280px; overflow-y: auto;
}
.tm-sel-panel.tm-sel-portal {
  /* When portaled to body, drop the CSS-side absolute positioning so inline
     fixed positioning controls placement. */
  position: fixed !important;
  top: auto; bottom: auto; left: auto; right: auto;
  box-shadow: var(--shadow-pop);
}
.tm-sel-opt { padding: 8px 10px; border-radius: 5px; font-size: 13px; color: var(--ink); cursor: pointer; display: flex; align-items: center; gap: 8px; }
.tm-sel-opt:hover { background: var(--panel2); }
.tm-sel-opt.sel { background: var(--brandSoft); color: var(--brand); font-weight: 600; }
.tm-sel-opt.placeholder { color: var(--mute); font-style: italic; }
.tm-sel-opt .opt-dot { width: 8px; height: 8px; border-radius: 999px; flex: 0 0 auto; }

/* Toggle */
.tm-toggle-row { display: flex; align-items: center; gap: 10px; }
.tm-toggle { width: 32px; height: 18px; border-radius: 999px; background: var(--panel3); position: relative; cursor: pointer; transition: background .15s; flex: 0 0 auto; }
.tm-toggle::after { content: ''; position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; border-radius: 999px; background: var(--panel); box-shadow: 0 1px 2px rgba(0,0,0,.18); transition: left .18s; }
.tm-toggle.on { background: var(--brand); }
.tm-toggle.on::after { left: 16px; }
.tm-help { font-size: 11px; color: var(--mute); display: inline-flex; align-items: center; gap: 5px; cursor: help; }

/* Subtask row */
.tm-sub-row { display: flex; align-items: center; gap: 10px; padding: 9px 10px; border: 1px solid var(--line); border-radius: 7px; margin-bottom: 8px; background: var(--panel); }
.tm-sub-row .ck { width: 16px; height: 16px; border: 1.5px solid var(--line); border-radius: 999px; flex: 0 0 auto; cursor: pointer; }
.tm-sub-row.done .ck { background: var(--st-done); border-color: var(--st-done); }
.tm-sub-row .nm { flex: 1; font-size: 13px; color: var(--ink); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tm-sub-row.done .nm { color: var(--dim); text-decoration: line-through; }
.tm-add-sub { display: inline-flex; align-items: center; gap: 6px; padding: 6px 11px; background: transparent; border: 1px solid var(--line); border-radius: 6px; color: var(--ink2); font-size: 12px; cursor: pointer; }
.tm-add-sub:hover { background: var(--panel2); border-color: var(--brand); color: var(--brand); }

/* Assignees */
.tm-assignee-list { display: flex; flex-wrap: wrap; gap: 7px; padding: 9px; border: 1px solid var(--line); border-radius: 8px; min-height: 48px; background: var(--panel); }
.tm-asg { display: inline-flex; align-items: center; gap: 6px; padding: 2px 8px 2px 2px; background: var(--panel2); border-radius: 999px; }
.tm-asg .x { cursor: pointer; color: var(--mute); font-size: 11px; padding: 0 4px; }
.tm-asg .x:hover { color: var(--ink); }
.tm-asg .nm { font-size: 12px; color: var(--ink); }

/* Sidecards (Recent files, System) */
.tm-side { display: flex; flex-direction: column; gap: 18px; }
.tm-side-card .head { display: flex; align-items: center; gap: 8px; padding-bottom: 10px; border-bottom: 1px solid var(--lineSoft); margin-bottom: 10px; }
.tm-side-card .head .t { font-size: 13px; font-weight: 600; color: var(--ink); display: inline-flex; gap: 7px; align-items: center; }
.tm-side-card .head svg { color: var(--brand); }
.tm-side-card .head .toggle-collapse { margin-left: auto; color: var(--mute); cursor: pointer; font-size: 12px; }
.tm-empty { font-size: 12px; color: var(--mute); font-style: italic; }
.tm-sys-row { display: flex; align-items: center; padding: 5px 0; font-size: 12.5px; gap: 10px; }
.tm-sys-row .l { color: var(--dim); flex: 1; }
.tm-sys-row .v { color: var(--ink); display: inline-flex; align-items: center; gap: 7px; font-weight: 500; }

/* ---------- Discussion tab ---------- */
.tm-disc-head { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; font-size: 14px; font-weight: 600; color: var(--ink); }
.tm-disc-head svg { color: var(--brand); }
.tm-disc-head .n { font-family: var(--mono); font-size: 10.5px; color: var(--mute); padding: 1px 7px; border-radius: 999px; background: var(--panel2); font-weight: 500; }

.tm-composer { display: flex; gap: 12px; padding: 14px; background: var(--panel); border: 1px solid var(--line); border-radius: 12px; }
.tm-composer .body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 10px; }
.tm-composer textarea { width: 100%; background: transparent; border: none; outline: none; resize: none; font-family: inherit; font-size: 13px; color: var(--ink); line-height: 1.5; min-height: 40px; }
.tm-composer textarea::placeholder { color: var(--mute); }
.tm-composer .toolbar { display: flex; align-items: center; gap: 4px; }
.tm-composer .toolbar .grow { flex: 1; }
.tm-composer .toolbar .tb-btn { width: 26px; height: 26px; border-radius: 5px; background: transparent; border: none; cursor: pointer; color: var(--dim); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; font-family: inherit; }
.tm-composer .toolbar .tb-btn:hover { background: var(--panel2); color: var(--ink); }
.tm-composer .toolbar .kbd { font-family: var(--mono); font-size: 11px; color: var(--mute); padding: 2px 6px; border: 1px solid var(--line); border-radius: 4px; }
.tm-composer .toolbar .submit { display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px; background: var(--brand); color: #fff; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; opacity: 0.55; }
.tm-composer .toolbar .submit.live { opacity: 1; }
.tm-composer .toolbar .submit:hover.live { background: var(--brandHover); }

.tm-date-sep { display: flex; align-items: center; gap: 12px; margin: 20px 0 14px; }
.tm-date-sep::before, .tm-date-sep::after { content: ''; flex: 1; height: 1px; background: var(--line); }
.tm-date-sep .d { font-family: var(--mono); font-size: 11px; color: var(--mute); }

.tm-comment { display: flex; gap: 12px; padding: 14px; background: var(--panel2); border-radius: 12px; margin-bottom: 10px; }
.tm-comment .body { flex: 1; min-width: 0; }
.tm-comment .head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.tm-comment .head .nm { font-size: 13px; font-weight: 600; color: var(--ink); }
.tm-comment .head .when { font-size: 11.5px; color: var(--mute); font-family: var(--mono); }
.tm-comment .head .more { margin-left: auto; color: var(--mute); cursor: pointer; padding: 3px 5px; border-radius: 4px; }
.tm-comment .head .more:hover { background: var(--panel3); color: var(--ink); }
.tm-comment .content { font-size: 13.5px; color: var(--ink2); line-height: 1.55; }
.tm-comment .content .mention { color: var(--brand); font-weight: 600; cursor: pointer; }
.tm-comment .content .mention:hover { text-decoration: underline; }
.tm-comment .reactions { margin-top: 9px; display: flex; gap: 6px; flex-wrap: wrap; }
.tm-reaction { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; background: var(--panel); border: 1px solid var(--line); border-radius: 999px; font-size: 11px; cursor: pointer; }
.tm-reaction:hover { border-color: var(--brand); }
.tm-reaction.mine { background: var(--brandSoft); border-color: var(--brandSoft2); }
.tm-reaction .n { color: var(--ink); font-family: var(--mono); font-weight: 600; }
.tm-reaction.add { color: var(--mute); padding: 3px 7px; }
.tm-reaction.add:hover { color: var(--brand); }

/* ---------- Links tab ---------- */
.tm-links-head { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.tm-links-head .t { font-size: 14px; font-weight: 600; color: var(--ink); display: inline-flex; align-items: center; gap: 7px; }
.tm-links-head .t svg { color: var(--brand); }
.tm-links-head .n { font-family: var(--mono); font-size: 10.5px; color: var(--mute); padding: 1px 7px; border-radius: 999px; background: var(--panel2); font-weight: 500; }
.tm-links-head .grow { flex: 1; }
.tm-link { display: flex; gap: 12px; align-items: center; padding: 12px 14px; border: 1px solid var(--line); border-radius: 10px; background: var(--panel); margin-bottom: 8px; cursor: pointer; transition: border-color .12s, transform .12s; }
.tm-link:hover { border-color: var(--brand); transform: translateY(-1px); }
.tm-link .icn { width: 36px; height: 36px; border-radius: 9px; display: flex; align-items: center; justify-content: center; background: var(--lnk-soft); color: var(--lnk-color); flex: 0 0 auto; }
.tm-link .body { flex: 1; min-width: 0; }
.tm-link .tt { font-size: 13.5px; font-weight: 600; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tm-link .url { margin-top: 2px; font-size: 11.5px; color: var(--dim); font-family: var(--mono); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 480px; }
.tm-link .meta { font-size: 11px; color: var(--mute); display: inline-flex; align-items: center; gap: 8px; flex: 0 0 auto; }
.tm-link .meta b { color: var(--ink); font-weight: 500; }
.tm-link .open { color: var(--mute); cursor: pointer; padding: 4px; border-radius: 5px; flex: 0 0 auto; }
.tm-link .open:hover { color: var(--brand); background: var(--panel2); }
.tm-empty-block { text-align: center; padding: 32px 16px; border: 1px dashed var(--line); border-radius: 10px; color: var(--mute); }
.tm-empty-block .e-t { font-size: 14px; color: var(--ink); font-weight: 600; margin-bottom: 4px; }
.tm-empty-block .e-s { font-size: 12.5px; }

/* ---------- Dependencies table (Links tab content) ---------- */
.tm-dep-table { border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
.tm-dep-section { background: var(--panel2); padding: 8px 16px; display: flex; gap: 9px; align-items: center; border-top: 1px solid var(--lineSoft); }
.tm-dep-section:first-child { border-top: none; }
.tm-dep-section .dl { font-size: 13px; color: var(--ink); font-weight: 500; }
.tm-dep-section .n { font-family: var(--mono); font-size: 10.5px; color: var(--mute); padding: 1px 7px; border-radius: 999px; background: var(--panel); font-weight: 500; }
.tm-dep-row { display: grid; grid-template-columns: 1.4fr 1.2fr 1fr 80px; gap: 14px; align-items: center; padding: 12px 16px; border-top: 1px solid var(--lineSoft); }
.tm-dep-row.head { background: transparent; padding: 8px 16px; }
.tm-dep-row.head .col { font-size: 10.5px; color: var(--mute); font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
.tm-dep-task { display: inline-flex; align-items: center; gap: 7px; color: var(--brand); cursor: pointer; font-size: 13px; font-weight: 500; min-width: 0; }
.tm-dep-task:hover { text-decoration: underline; }
.tm-dep-task svg { flex: 0 0 auto; }
.tm-dep-target { font-size: 13px; color: var(--dim); font-style: italic; }
.tm-dep-type-pill { display: inline-flex; padding: 4px 10px; border-radius: 5px; background: var(--brandSoft); color: var(--brand); font-size: 11.5px; font-weight: 600; font-family: var(--mono); white-space: nowrap; }
.tm-dep-actions { display: flex; justify-content: flex-end; }
.tm-dep-trash {
  display: inline-flex; align-items: center; justify-content: center;
  width: 32px; height: 32px;
  border-radius: 7px;
  background: oklch(0.95 0.07 30); color: oklch(0.45 0.16 30);
  cursor: pointer;
}
.tm-dep-trash:hover { background: oklch(0.92 0.09 30); }
[data-theme="dark"] .tm-dep-trash { background: oklch(0.30 0.10 30); color: oklch(0.88 0.13 30); }
[data-theme="dark"] .tm-dep-trash:hover { background: oklch(0.36 0.13 30); }
.tm-dep-empty { padding: 18px 16px; text-align: center; color: var(--mute); font-size: 12.5px; font-style: italic; border-top: 1px solid var(--lineSoft); }

/* ---------- Files tab ---------- */
.tm-files-head { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.tm-files-head .t { font-size: 14px; font-weight: 600; color: var(--ink); display: inline-flex; align-items: center; gap: 7px; }
.tm-files-head .t svg { color: var(--brand); }
.tm-files-head .n { font-family: var(--mono); font-size: 10.5px; color: var(--mute); padding: 1px 7px; border-radius: 999px; background: var(--panel2); font-weight: 500; }
.tm-files-head .grow { flex: 1; }
.tm-files-head .send { display: inline-flex; align-items: center; gap: 7px; padding: 7px 13px; background: var(--brand); color: #fff; border: none; border-radius: 7px; font-size: 12.5px; font-weight: 600; cursor: pointer; }
.tm-files-head .send:hover { background: var(--brandHover); }

.tm-files-bar { display: flex; gap: 10px; align-items: center; margin-bottom: 14px; flex-wrap: wrap; }
.tm-files-bar .search { flex: 1; min-width: 220px; max-width: 480px; position: relative; }
.tm-files-bar .search input { width: 100%; padding: 8px 12px 8px 34px; background: var(--panel); border: 1px solid var(--line); border-radius: 8px; font-size: 13px; color: var(--ink); outline: none; }
.tm-files-bar .search input:focus { border-color: var(--brand); box-shadow: 0 0 0 3px var(--brandSoft); }
.tm-files-bar .search input::placeholder { color: var(--mute); }
.tm-files-bar .search svg { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: var(--mute); }
.tm-files-filters { display: flex; gap: 6px; flex-wrap: wrap; }
.tm-fk { display: inline-flex; align-items: center; gap: 7px; padding: 5px 12px; border: 1px solid var(--line); border-radius: 999px; background: var(--panel); color: var(--ink2); font-size: 12px; cursor: pointer; transition: border-color .12s; }
.tm-fk:hover { border-color: var(--mute); }
.tm-fk.active { background: var(--brandSoft); border-color: var(--brandSoft2); color: var(--brand); font-weight: 600; }
.tm-fk .n { font-family: var(--mono); font-size: 10.5px; color: var(--mute); }
.tm-fk.active .n { color: var(--brand); }

.tm-files-table-bar { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; padding: 0 4px; }
.tm-files-table-bar .pp-lbl { font-size: 11.5px; color: var(--dim); }
.tm-pp-sel { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; background: var(--panel); border: 1px solid var(--line); border-radius: 6px; cursor: pointer; font-size: 12px; color: var(--ink); }
.tm-pp-sel::after { content: ''; border-left: 3.5px solid transparent; border-right: 3.5px solid transparent; border-top: 4px solid var(--mute); margin-left: 3px; }

.tm-files-table { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
.tm-files-row { display: grid; grid-template-columns: 1fr 110px 200px 140px 44px; gap: 14px; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--lineSoft); cursor: pointer; }
.tm-files-row:last-child { border-bottom: none; }
.tm-files-row.head { background: var(--panel2); padding: 9px 16px; cursor: default; }
.tm-files-row.head:hover { background: var(--panel2); }
.tm-files-row:hover { background: var(--panel2); }
.tm-files-row.head .col { font-size: 10.5px; color: var(--mute); font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; display: inline-flex; align-items: center; gap: 4px; cursor: pointer; }
.tm-files-row.head .col:hover { color: var(--ink); }
.tm-files-row.head .col svg { opacity: 0.6; }

.tm-files-row .name-cell { display: flex; align-items: center; gap: 12px; min-width: 0; }
.tm-files-row .name-cell .icn { width: 32px; height: 32px; border-radius: 7px; display: flex; align-items: center; justify-content: center; background: var(--fk-soft); color: var(--fk-color); font-size: 9px; font-weight: 700; font-family: var(--mono); letter-spacing: 0.04em; flex: 0 0 auto; }
.tm-files-row .name-cell .nm { font-size: 13px; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tm-files-row .who { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; color: var(--ink); }
.tm-files-row .size, .tm-files-row .date { font-size: 12px; color: var(--dim); font-family: var(--mono); }
.tm-files-row .more { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 6px; background: var(--brandSoft); color: var(--brand); cursor: pointer; font-size: 14px; line-height: 0; }
.tm-files-row .more:hover { background: var(--brandSoft2); }

.tm-storage { margin-top: 14px; padding: 12px 14px; background: var(--panel2); border: 1px solid var(--line); border-radius: 10px; display: flex; align-items: center; gap: 12px; }
.tm-storage .ico { width: 28px; height: 28px; border-radius: 7px; background: var(--brandSoft); color: var(--brand); display: flex; align-items: center; justify-content: center; flex: 0 0 auto; }
.tm-storage .body { flex: 1; }
.tm-storage .lbl { font-size: 12px; color: var(--ink); font-weight: 500; margin-bottom: 5px; display: flex; align-items: center; gap: 8px; }
.tm-storage .lbl b { font-family: var(--mono); color: var(--brand); }
.tm-storage .bar { height: 5px; background: var(--panel3); border-radius: 999px; overflow: hidden; position: relative; }
.tm-storage .bar .fill { position: absolute; left: 0; top: 0; bottom: 0; background: var(--brand); border-radius: 999px; transition: width .3s; }

/* ---------- Footer ---------- */
.tm-footer { padding: 13px 24px; border-top: 1px solid var(--line); display: flex; justify-content: flex-end; gap: 10px; background: var(--panel); flex: 0 0 auto; }
.tm-btn-cancel { padding: 7px 14px; background: transparent; border: 1px solid var(--line); border-radius: 7px; color: var(--ink); font-size: 13px; cursor: pointer; font-weight: 500; }
.tm-btn-cancel:hover { background: var(--panel2); }
.tm-btn-save { display: inline-flex; align-items: center; gap: 7px; padding: 7px 16px; background: var(--brand); color: #fff; border: none; border-radius: 7px; font-size: 13px; font-weight: 600; cursor: pointer; box-shadow: 0 1px 0 oklch(0.40 0.18 264 / .35); }
.tm-btn-save:hover { background: var(--brandHover); }

/* ---------- Responsive ---------- */
@media (max-width: 1100px) {
  .tm-details { grid-template-columns: 1fr 1fr; }
  .tm-details > .tm-side { grid-column: 1 / -1; flex-direction: row; gap: 18px; }
  .tm-details > .tm-side > * { flex: 1; min-width: 0; }
  .tm-files-row { grid-template-columns: 1fr 90px 36px; gap: 12px; }
  .tm-files-row .who, .tm-files-row .date { display: none; }
  .tm-files-row.head .col.who-h, .tm-files-row.head .col.date-h { display: none; }
}
@media (max-width: 1024px) {
  .tm-modal { top: 16px; bottom: 16px; width: calc(100vw - 32px); }
  .tm-props { padding: 12px 18px; gap: 22px; }
  .tm-title-row { padding: 16px 18px 0; }
  .tm-meta-row { padding: 10px 18px 0; }
  .tm-tabs { padding: 0 18px; }
  .tm-body { padding: 20px 18px 24px; }
  .tm-footer { padding: 12px 18px; }
}
@media (max-width: 768px) {
  .tm-modal { top: 0; bottom: 0; width: 100vw; left: 0; transform: none; border-radius: 0; border: none; max-height: 100vh; }
  .tm-modal { animation: tm-slide-up-mobile .25s cubic-bezier(.2,.7,.2,1); }
  @keyframes tm-slide-up-mobile { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  .tm-chrome { padding: 10px 14px; }
  .tm-chrome .updated { display: none; }
  .tm-title-row h2 { font-size: 20px; }
  .tm-stats { width: 100%; margin-left: 0; order: 3; padding-top: 4px; }
  .tm-props { flex-direction: column; align-items: stretch; gap: 10px; padding: 12px 18px; }
  .tm-prop { justify-content: space-between; }
  .tm-prop.progress-prop { max-width: none; }
  .tm-details { grid-template-columns: 1fr; }
  .tm-details > .tm-side { flex-direction: column; }
  .tm-composer { flex-direction: column; }
  .tm-files-bar { flex-direction: column; align-items: stretch; }
  .tm-files-bar .search { max-width: none; }
  .tm-files-row { grid-template-columns: 1fr 36px; row-gap: 4px; }
  .tm-files-row .size { display: block; grid-column: 1; font-size: 11px; }
  .tm-files-row.head .col.size-h { display: none; }
  .tm-dep-row { grid-template-columns: 1fr 70px; gap: 8px; row-gap: 6px; }
  .tm-dep-row > :nth-child(2) { display: none; } /* target */
  .tm-dep-row.head > :nth-child(2) { display: none; }
  .tm-dep-row > :nth-child(3) { grid-column: 1; } /* type */
  .tm-dep-row.head > :nth-child(3) { grid-column: 1; }
  .tm-dep-row > :nth-child(4), .tm-dep-row.head > :nth-child(4) { grid-row: 1; grid-column: 2; }
}
@media (max-width: 480px) {
  .tm-tab { padding: 10px 12px 12px; font-size: 13px; }
  .tm-tab .n { display: none; }
  .tm-link .url { max-width: 200px; }
}
`;

window.taskModalCss = taskModalCss;

// ============================================================
// Data
// ============================================================
const tmSampleTags = ['526526', '6265584', 'qwertd'];
const tmAssigneeOptions = [
  { id: 'tm', name: 'Thiago Mágero', initials: 'TM', color: '#e8704c' },
  { id: 'lm', name: 'Lara Mendes',   initials: 'LM', color: '#4a89c4' },
  { id: 'jr', name: 'João Ribeiro',  initials: 'JR', color: '#d97a86' },
  { id: 'pc', name: 'Patrícia Costa',initials: 'PC', color: '#8c5cc4' },
  { id: 'rf', name: 'Rita Faria',    initials: 'RF', color: '#5a9c7a' },
  { id: 'fu', name: 'Fulano',        initials: 'FU', color: '#6dafc3' },
];

const tmStateOptions = [
  { key: 'todo',    label: 'To Do',       cls: 'todo' },
  { key: 'doing',   label: 'In Progress', cls: 'doing' },
  { key: 'review',  label: 'In Review',   cls: 'review' },
  { key: 'done',    label: 'Done',        cls: 'done' },
  { key: 'blocked', label: 'Blocked',     cls: 'blocked' },
];

const tmPriorityOptions = [
  { key: 'none', label: '—',        cls: 'none' },
  { key: 'crit', label: 'Critical', cls: 'crit' },
  { key: 'high', label: 'High',     cls: 'high' },
  { key: 'med',  label: 'Medium',   cls: 'med' },
  { key: 'low',  label: 'Low',      cls: 'low' },
];

const tmTypeOptions = ['Task', 'Project', 'Milestone'];

const tmConstraintOptions = [
  'None',
  'As soon as possible',
  'As late as possible',
  'Start no earlier than',
  'Start no later than',
  'Finish no earlier than',
];

const tmComments = [
  {
    id: 1, who: 'Thiago Teste 2', initials: 'T2', color: '#8c5cc4', when: '7d ago',
    content: <><span className="mention">@Thiago Teste 1</span> olá, validando.</>,
    reactions: [{ e: '👍', n: 2, mine: false }],
  },
  {
    id: 2, who: 'Ana Monteiro', initials: 'AM', color: '#c47a4a', when: '6d ago',
    content: <><span className="mention">@Thiago Teste 3</span> olá tudo bem?</>,
    reactions: [{ e: '👍', n: 1, mine: true }],
  },
  {
    id: 3, who: 'Ana Monteiro', initials: 'AM', color: '#c47a4a', when: '6d ago',
    content: <><span className="mention">@Thiago Teste 3</span> Olá tudo bem?</>,
    reactions: [],
  },
];

const tmDependencies = {
  predecessors: [
    { id: 1, source: 'Subatividade', type: 'FF' },
    { id: 2, source: 'Subatividade', type: 'SS' },
  ],
  successors: [
    { id: 3, target: 'Beta interno · launch checklist', type: 'FS' },
  ],
};
const tmDepTypeLabel = {
  FF: 'Finish → Finish',
  SS: 'Start → Start',
  FS: 'Finish → Start',
  SF: 'Start → Finish',
};

const tmLinks = [
  { id: 1, title: 'Especificação técnica — Sistema de Tags', url: 'https://docs.google.com/document/d/1abc.../edit',
    kind: 'doc', color: 'oklch(0.55 0.16 220)', soft: 'oklch(0.94 0.06 220)',
    who: 'Lara Mendes', when: 'há 4 h' },
  { id: 2, title: 'Repository — Awesome Project App', url: 'https://github.com/magero/awp',
    kind: 'gh', color: 'oklch(0.30 0.02 250)', soft: 'oklch(0.94 0.005 250)',
    who: 'Thiago Mágero', when: 'há 2 dias' },
  { id: 3, title: 'Wireframes — Onboarding piloto', url: 'https://figma.com/file/xyz/onboarding',
    kind: 'fig', color: 'oklch(0.60 0.16 295)', soft: 'oklch(0.95 0.05 295)',
    who: 'Rita Faria', when: 'há 5 dias' },
  { id: 4, title: 'Thread no Slack — alinhamento de release', url: 'https://magero.slack.com/archives/C123/p1715...',
    kind: 'slack', color: 'oklch(0.55 0.16 25)', soft: 'oklch(0.95 0.06 25)',
    who: 'João Ribeiro', when: '1 semana' },
];

const tmFiles = [
  { name: 'files.zip', size: '14.0 kB', who: { name: 'Ana Monteiro', initials: 'AM', color: '#c47a4a' }, date: '13/05/2026', kind: 'ZIP',  fcol: 'oklch(0.55 0.02 250)',  fsoft: 'oklch(0.95 0.005 250)', kindFilter: 'other' },
  { name: '20260504 _ Runbook instalação - Interactive Applications_EnterpriseManager_TICKET-339625.docx', size: '640.9 kB', who: { name: 'Ana Monteiro', initials: 'AM', color: '#c47a4a' }, date: '13/05/2026', kind: 'DOCX', fcol: 'oklch(0.50 0.16 264)', fsoft: 'oklch(0.94 0.06 264)', kindFilter: 'docs' },
  { name: '2025_Condicoes_Gerais_Bomb32_vPT_signed.pdf', size: '506.4 kB', who: { name: 'Ana Monteiro', initials: 'AM', color: '#c47a4a' }, date: '13/05/2026', kind: 'PDF',  fcol: 'oklch(0.55 0.18 25)',  fsoft: 'oklch(0.95 0.06 25)',  kindFilter: 'pdf' },
  { name: 'Contrato_ST34_Thiago_Dias_Magero_signed.pdf',  size: '374.9 kB', who: { name: 'Ana Monteiro', initials: 'AM', color: '#c47a4a' }, date: '13/05/2026', kind: 'PDF',  fcol: 'oklch(0.55 0.18 25)',  fsoft: 'oklch(0.95 0.06 25)',  kindFilter: 'pdf' },
];

const tmFileFilters = [
  { key: 'all',   label: 'All',          count: 4 },
  { key: 'pdf',   label: 'PDF',          count: 2 },
  { key: 'docs',  label: 'Documents',    count: 1 },
  { key: 'sheet', label: 'Spreadsheets', count: 0 },
  { key: 'img',   label: 'Images',       count: 0 },
  { key: 'other', label: 'Other',        count: 1 },
];

// ============================================================
// Icons
// ============================================================
const SvgPlus = ({s=12}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const SvgX = ({s=11}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const SvgCal = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const SvgFlag = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>;
const SvgChat = ({s=14}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
const SvgPaperclip = ({s=14}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>;
const SvgEye = ({s=14}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const SvgBell = ({s=14}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
const SvgClock = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>;
const SvgFullscreen = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8V3h5M21 8V3h-5M3 16v5h5M21 16v5h-5"/></svg>;
const SvgExitFs = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v4a1 1 0 0 1-1 1H3M21 8h-4a1 1 0 0 1-1-1V3M3 16h4a1 1 0 0 1 1 1v4M16 21v-4a1 1 0 0 1 1-1h4"/></svg>;
const SvgFile = ({s=13}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
const SvgGear = ({s=13}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
const SvgUsers = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg>;
const SvgLink = ({s=14}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>;
const SvgDB = ({s=13}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/></svg>;
const SvgInfo = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;
const SvgSort = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M7 12h10"/><path d="M11 18h2"/></svg>;
const SvgExternal = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>;
const SvgGithub = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2.18c-3.2.69-3.87-1.36-3.87-1.36-.52-1.33-1.27-1.69-1.27-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.68 1.25 3.34.96.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.84 1.18 3.1 0 4.42-2.7 5.4-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z"/></svg>;
const SvgFigma = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="16" cy="12" r="4" fill="currentColor"/><path d="M8 4h4v8H8a4 4 0 1 1 0-8z"/><path d="M12 4h4a4 4 0 0 1 0 8h-4z"/><path d="M8 12h4v8a4 4 0 1 1-4-4z" fillOpacity=".7"/><path d="M8 12h4a0 0 0 0 1 0 0 4 4 0 0 1-4 4z" fillOpacity=".5"/></svg>;
const SvgSlack = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M5 14a2 2 0 1 1 0 4H3v-2a2 2 0 0 1 2-2zm1 0a2 2 0 1 1 4 0v5a2 2 0 1 1-4 0zM10 5a2 2 0 1 1-4 0V3h2a2 2 0 0 1 2 2zm0 1a2 2 0 1 1 0 4H5a2 2 0 1 1 0-4zm9 4a2 2 0 1 1 0-4h2v2a2 2 0 0 1-2 2zm-1 0a2 2 0 1 1-4 0V5a2 2 0 1 1 4 0zm-4 9a2 2 0 1 1 4 0v2h-2a2 2 0 0 1-2-2zm0-1a2 2 0 1 1 0-4h5a2 2 0 1 1 0 4z"/></svg>;
const SvgDocIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
const SvgUpload = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
const SvgSearch = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><line x1="20" y1="20" x2="16.65" y2="16.65"/></svg>;
const SvgCheck = ({s=14}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const SvgSend = ({s=13}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
const SvgEmoji = ({s=13}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>;
const SvgAt = ({s=13}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/></svg>;
const SvgListUl = ({s=13}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
const SvgTrash = ({s=13}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>;

// ============================================================
// Components
// ============================================================
const { useState: useStateTM, useRef: useRefTM, useEffect: useEffectTM } = React;

function TMSelect({ value, onChange, options, renderOption, renderTrigger, placeholder, panelMaxWidth }) {
  const [open, setOpen] = useStateTM(false);
  const triggerRef = useRefTM(null);
  const panelRef = useRefTM(null);
  const [pos, setPos] = useStateTM(null);

  useEffectTM(() => {
    if (!open || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const estPanelH = Math.min(280, (options.length * 36) + 16);
    const spaceBelow = window.innerHeight - r.bottom - 16;
    const openUp = spaceBelow < estPanelH && r.top > spaceBelow;
    setPos({
      top: openUp ? null : r.bottom + 4,
      bottom: openUp ? window.innerHeight - r.top + 4 : null,
      left: r.left,
      width: r.width,
    });
    function onDocDown(e) {
      if (triggerRef.current && triggerRef.current.contains(e.target)) return;
      if (panelRef.current && panelRef.current.contains(e.target)) return;
      setOpen(false);
    }
    function onScroll(e) {
      if (panelRef.current && panelRef.current.contains(e.target)) return;
      setOpen(false);
    }
    function onResize() { setOpen(false); }
    document.addEventListener('mousedown', onDocDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, options.length]);

  const panel = open && pos && ReactDOM.createPortal(
    <div ref={panelRef} className="tm-sel-panel tm-sel-portal"
      style={{
        position: 'fixed',
        top: pos.top != null ? pos.top : 'auto',
        bottom: pos.bottom != null ? pos.bottom : 'auto',
        left: pos.left,
        minWidth: pos.width,
        maxWidth: panelMaxWidth || Math.max(pos.width, 280),
        zIndex: 300,
      }}>
      {options.map((opt, i) => {
        const o = typeof opt === 'string' ? { key: opt, label: opt } : opt;
        const isSel = (value && (value === o.key || value === o.label));
        return (
          <div key={o.key || i} className={'tm-sel-opt' + (isSel ? ' sel' : '') + (o.placeholder ? ' placeholder' : '')}
            onClick={() => { onChange(o.key || o.label); setOpen(false); }}>
            {renderOption ? renderOption(o, isSel) : <span>{o.label}</span>}
            {isSel && <span style={{ marginLeft: 'auto', color: TM.brand }}><SvgCheck s={12} /></span>}
          </div>
        );
      })}
    </div>,
    document.body
  );

  return (
    <div className="tm-sel">
      <button ref={triggerRef} type="button" className={'tm-sel-trigger' + (open ? ' open' : '')} onClick={() => setOpen(o => !o)}>
        {renderTrigger ? renderTrigger(value) : (
          <span className={value ? '' : 'ph'}>{value || placeholder || 'Select…'}</span>
        )}
      </button>
      {panel}
    </div>
  );
}

function StatePill({ stateKey, onChange }) {
  const opt = tmStateOptions.find(o => o.key === stateKey) || tmStateOptions[0];
  return (
    <TMSelect
      value={opt.key}
      onChange={onChange}
      options={tmStateOptions}
      renderTrigger={(v) => {
        const o = tmStateOptions.find(x => x.key === v) || tmStateOptions[0];
        return (
          <>
            <span className={'st-pill ' + o.cls}>
              <span className="dot"></span>
              {o.label}
            </span>
          </>
        );
      }}
      renderOption={(o) => (
        <span className={'st-pill ' + o.cls} style={{ pointerEvents: 'none' }}>
          <span className="dot"></span>
          {o.label}
        </span>
      )}
    />
  );
}

function PriorityPill({ priKey, onChange }) {
  const opt = tmPriorityOptions.find(o => o.key === priKey) || tmPriorityOptions[3];
  return (
    <TMSelect
      value={opt.key}
      onChange={onChange}
      options={tmPriorityOptions}
      renderTrigger={(v) => {
        const o = tmPriorityOptions.find(x => x.key === v) || tmPriorityOptions[3];
        return (
          <span className={'pri-pill ' + o.cls}>
            <SvgFlag />
            {o.label}
          </span>
        );
      }}
      renderOption={(o) => (
        <span className={'pri-pill ' + o.cls} style={{ pointerEvents: 'none' }}>
          <SvgFlag />
          {o.label}
        </span>
      )}
    />
  );
}

const lnkIcon = (k) => ({
  doc:   <SvgDocIcon />,
  gh:    <SvgGithub />,
  fig:   <SvgFigma />,
  slack: <SvgSlack />,
}[k] || <SvgLink s={16} />);

function TaskModal({ onClose }) {
  const [tab, setTab] = useStateTM('details');
  const [fullscreen, setFullscreen] = useStateTM(false);
  const [follow, setFollow] = useStateTM(true);

  const [title, setTitle] = useStateTM('Nova tarefa');
  const [tags, setTags] = useStateTM(tmSampleTags);
  const [state, setState] = useStateTM('doing');
  const [start, setStart] = useStateTM('13/05/2026 00:00');
  const [duration, setDuration] = useStateTM('3');
  const [exactTime, setExactTime] = useStateTM(false);
  const [constraint, setConstraint] = useStateTM('As late as possible');
  const [progress, setProgress] = useStateTM(52);
  const [priority, setPriority] = useStateTM('med');
  const [type, setType] = useStateTM('Task');
  const [parent, setParent] = useStateTM('');
  const [desc, setDesc] = useStateTM('asdfasdf');
  const [assignees, setAssignees] = useStateTM(['fu', 'tm']);
  const [subtasks, setSubtasks] = useStateTM([
    { id: 1, name: 'Subatividade', done: false, state: 'todo' },
  ]);
  const [composer, setComposer] = useStateTM('');
  const [fileFilter, setFileFilter] = useStateTM('all');
  const [fileSearch, setFileSearch] = useStateTM('');

  // Esc closes
  useEffectTM(() => {
    function onKey(e) { if (e.key === 'Escape') onClose && onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Counts
  const fileCount = tmFiles.length;
  const linkCount = tmDependencies.predecessors.length + tmDependencies.successors.length;
  const discussionCount = tmComments.length;

  // Filtered files
  const filteredFiles = tmFiles.filter(f => {
    if (fileFilter !== 'all' && f.kindFilter !== fileFilter) return false;
    if (fileSearch && !f.name.toLowerCase().includes(fileSearch.toLowerCase())) return false;
    return true;
  });

  return (
    <React.Fragment>
      <div className="tm-backdrop" onClick={onClose}></div>
      <div className={'tm-modal' + (fullscreen ? ' full' : '')}>

        {/* Chrome */}
        <div className="tm-chrome">
          <span className="kind"><SvgCheck s={11}/> Task</span>
          <span className="updated"><SvgClock /> Updated 16h ago by Ana Monteiro</span>
          <div className="grow"></div>
          <button className={'follow' + (follow ? ' is-following' : '')} onClick={() => setFollow(f => !f)}>
            <SvgBell s={13} />{follow ? 'Following' : 'Follow'}
          </button>
          <button className="ico-btn" title={fullscreen ? 'Sair' : 'Maximizar'} onClick={() => setFullscreen(f => !f)}>
            {fullscreen ? <SvgExitFs /> : <SvgFullscreen />}
          </button>
          <button className="ico-btn" title="Fechar" onClick={onClose}><SvgX s={14} /></button>
        </div>

        {/* Title */}
        <div className="tm-title-row">
          <h2 contentEditable suppressContentEditableWarning
              onBlur={(e) => setTitle(e.currentTarget.innerText)}>
            {title}
          </h2>
        </div>

        {/* Tags + stats */}
        <div className="tm-meta-row">
          {tags.map((t, i) => (
            <span key={i} className="tm-tag">
              {t}
              <span className="x" onClick={() => setTags(tags.filter((_, j) => j !== i))}><SvgX s={10} /></span>
            </span>
          ))}
          <span className="tm-add-tag">+ Tag</span>
          <div className="tm-stats">
            <span className="s"><SvgChat s={13}/><b>{discussionCount}</b></span>
            <span className="s"><SvgPaperclip s={13}/><b>{fileCount}</b></span>
            <span className="s"><SvgEye s={13}/><b>4</b> followers</span>
          </div>
        </div>

        {/* Property strip — inline, edge-to-edge. State editable; rest readonly. */}
        <div className="tm-props">
          <div className="tm-prop state-prop">
            <span className="l">State</span>
            <span className="v"><StatePill stateKey={state} onChange={setState} /></span>
          </div>
          <div className="tm-prop">
            <span className="l">Start</span>
            <span className="v">
              <span className="cal"><SvgCal /></span>
              <span className="date">{start.split(' ')[0]}</span>
              <span className="dur">· {duration} days</span>
            </span>
          </div>
          <div className="tm-prop progress-prop">
            <span className="l">Progress</span>
            <span className="v">
              <div className="bar"><div className="fill" style={{ width: progress + '%' }}></div></div>
              <span className="pct">{progress}%</span>
            </span>
          </div>
          <div className="tm-prop">
            <span className="l">Priority</span>
            <span className="v">
              {(() => {
                const o = tmPriorityOptions.find(x => x.key === priority) || tmPriorityOptions[3];
                return <span className={'pri-pill ' + o.cls} style={{ cursor: 'default' }}>
                  <SvgFlag /> {o.label}
                </span>;
              })()}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="tm-tabs">
          <div className={'tm-tab' + (tab === 'details' ? ' active' : '')} onClick={() => setTab('details')}>
            <span className="ic"><SvgFile s={13} /></span>Details
          </div>
          <div className={'tm-tab' + (tab === 'discussion' ? ' active' : '')} onClick={() => setTab('discussion')}>
            <span className="ic"><SvgChat s={13} /></span>Discussion
            <span className="n">{discussionCount}</span>
          </div>
          <div className={'tm-tab' + (tab === 'links' ? ' active' : '')} onClick={() => setTab('links')}>
            <span className="ic"><SvgLink s={13} /></span>Links
            <span className="n">{linkCount}</span>
          </div>
          <div className={'tm-tab' + (tab === 'files' ? ' active' : '')} onClick={() => setTab('files')}>
            <span className="ic"><SvgPaperclip s={13} /></span>Files
            <span className="n">{fileCount}</span>
          </div>
        </div>

        {/* Body */}
        <div className="tm-body">

          {tab === 'details' && (
            <div className="tm-details">

              {/* Col 1 — Description + Subtasks */}
              <div>
                <div className="tm-block">
                  <div className="head"><SvgFile s={13} /> Description</div>
                  <textarea className="tm-textarea" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descreva a tarefa…" />
                </div>
                <div className="tm-block">
                  <div className="head" style={{ display: 'flex' }}>
                    Subtasks
                    <span style={{ marginLeft: 8, fontSize: 11.5, color: 'var(--mute)', fontWeight: 400 }}>· {subtasks.filter(s=>s.done).length} of {subtasks.length} done</span>
                    <button className="tm-add-sub" style={{ marginLeft: 'auto' }}>
                      <SvgPlus s={11}/> Add subtask
                    </button>
                  </div>
                  {subtasks.map(s => (
                    <div key={s.id} className={'tm-sub-row' + (s.done ? ' done' : '')}>
                      <div className="ck" onClick={() => setSubtasks(subtasks.map(x => x.id === s.id ? {...x, done: !x.done} : x))}></div>
                      <span className="nm">{s.name}</span>
                      <span className={'st-pill ' + (tmStateOptions.find(o => o.key === s.state) || tmStateOptions[0]).cls}>
                        <span className="dot"></span>
                        {(tmStateOptions.find(o => o.key === s.state) || tmStateOptions[0]).label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Col 2 — Schedule */}
              <div>
                <div className="tm-block">
                  <div className="head"><SvgCal /> Schedule</div>
                  <div className="tm-field">
                    <label className="lbl">Start Date</label>
                    <div className="tm-input-wrap">
                      <span className="ic-l"><SvgCal /></span>
                      <input className="tm-input icon-l" value={start} onChange={e => setStart(e.target.value)} />
                      <span className="ic-r" title="Limpar" onClick={() => setStart('')}><SvgX s={11} /></span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end' }}>
                    <div className="tm-field" style={{ flex: 1, marginBottom: 0 }}>
                      <label className="lbl">Duration (days)</label>
                      <input className="tm-input" value={duration} onChange={e => setDuration(e.target.value)} />
                    </div>
                    <div className="tm-field" style={{ marginBottom: 0 }}>
                      <label className="lbl">Exact time <span className="tm-help"><SvgInfo /></span></label>
                      <div className="tm-toggle-row" style={{ paddingTop: 5 }}>
                        <div className={'tm-toggle' + (exactTime ? ' on' : '')} onClick={() => setExactTime(!exactTime)}></div>
                      </div>
                    </div>
                  </div>
                  <div className="tm-field" style={{ marginTop: 14 }}>
                    <label className="lbl">Constraint</label>
                    <TMSelect value={constraint} onChange={setConstraint} options={tmConstraintOptions}
                      renderTrigger={(v) => <span>{v}</span>} />
                  </div>
                </div>
              </div>

              {/* Col 3 — Configuration */}
              <div>
                <div className="tm-block">
                  <div className="head"><SvgGear s={13} /> Configuration</div>
                  <div className="tm-field">
                    <label className="lbl">Type</label>
                    <TMSelect value={type} onChange={setType} options={tmTypeOptions} />
                  </div>
                  <div className="tm-field">
                    <label className="lbl">Parent Task</label>
                    <TMSelect value={parent} onChange={setParent}
                      options={[{ key: '', label: '(none)', placeholder: true }, 'Sistema de Tags', 'Editor rich text Tiptap', 'Beta interno']}
                      renderTrigger={(v) => v ? <span>{v}</span> : <span className="ph">(none)</span>} />
                  </div>
                  <div className="tm-field">
                    <label className="lbl">Priority</label>
                    <TMSelect value={priority} onChange={setPriority} options={tmPriorityOptions}
                      renderTrigger={(v) => {
                        const o = tmPriorityOptions.find(x => x.key === v) || tmPriorityOptions[3];
                        return <span className={'pri-pill ' + o.cls}><SvgFlag /> {o.label}</span>;
                      }}
                      renderOption={(o) => (
                        <span className={'pri-pill ' + o.cls} style={{ pointerEvents: 'none' }}>
                          <SvgFlag /> {o.label}
                        </span>
                      )} />
                  </div>
                  <div className="tm-field">
                    <label className="lbl">Progress (%)</label>
                    <input className="tm-input" value={progress} onChange={e => setProgress(+e.target.value || 0)} type="number" min="0" max="100" />
                  </div>
                </div>
              </div>

              {/* Col 4 — Assignees + Recent files + System */}
              <div className="tm-side">
                <div className="tm-side-card">
                  <div className="head">
                    <span className="t"><SvgUsers /> Assignees <span className="tm-block-n">{assignees.length}</span></span>
                  </div>
                  <div className="tm-assignee-list">
                    {assignees.map(id => {
                      const a = tmAssigneeOptions.find(o => o.id === id);
                      if (!a) return null;
                      return (
                        <span key={id} className="tm-asg">
                          <div className="avatar sm" style={{ background: a.color, width: 18, height: 18, fontSize: 9 }}>{a.initials}</div>
                          <span className="nm">{a.name}</span>
                          <span className="x" onClick={() => setAssignees(assignees.filter(x => x !== id))}><SvgX s={10} /></span>
                        </span>
                      );
                    })}
                    <span className="tm-add-tag" style={{ alignSelf: 'center' }}>+ Add</span>
                  </div>
                </div>

                <div className="tm-side-card">
                  <div className="head">
                    <span className="t"><SvgPaperclip s={13}/> Recent files</span>
                  </div>
                  <div className="tm-empty">—</div>
                </div>

                <div className="tm-side-card">
                  <div className="head">
                    <span className="t"><SvgInfo /> System</span>
                    <span className="toggle-collapse">⌄</span>
                  </div>
                  <div className="tm-sys-row"><span className="l">Created by</span><span className="v">—</span></div>
                  <div className="tm-sys-row"><span className="l">Created at</span><span className="v">06/05/2026</span></div>
                  <div className="tm-sys-row"><span className="l">Updated by</span>
                    <span className="v">
                      <div className="avatar sm" style={{ background: '#c47a4a', width: 18, height: 18, fontSize: 9 }}>AM</div>
                      Ana Monteiro
                    </span>
                  </div>
                  <div className="tm-sys-row"><span className="l">Updated at</span><span className="v">13/05/2026</span></div>
                </div>
              </div>

            </div>
          )}

          {tab === 'discussion' && (
            <div>
              <div className="tm-disc-head">
                <SvgChat /> Discussion <span className="n">{discussionCount}</span>
              </div>

              <div className="tm-composer">
                <div className="avatar lg" style={{ background: '#e8704c', width: 38, height: 38, fontSize: 13, flex: '0 0 auto' }}>TM</div>
                <div className="body">
                  <textarea
                    placeholder="Write a comment… use @ to mention someone"
                    value={composer}
                    onChange={e => setComposer(e.target.value)}
                    rows={2}
                  />
                  <div className="toolbar">
                    <button className="tb-btn"><b>B</b></button>
                    <button className="tb-btn"><i>I</i></button>
                    <button className="tb-btn"><SvgListUl /></button>
                    <button className="tb-btn"><SvgPaperclip s={13} /></button>
                    <button className="tb-btn"><SvgAt /></button>
                    <button className="tb-btn"><SvgEmoji /></button>
                    <div className="grow"></div>
                    <span className="kbd">⌘ + Enter</span>
                    <button className={'submit' + (composer.trim() ? ' live' : '')}>
                      <SvgSend />Submit
                    </button>
                  </div>
                </div>
              </div>

              <div className="tm-date-sep"><span className="d">06/05/2026</span></div>

              {tmComments.map(c => (
                <div key={c.id} className="tm-comment">
                  <div className="avatar lg" style={{ background: c.color, width: 38, height: 38, fontSize: 13, flex: '0 0 auto' }}>{c.initials}</div>
                  <div className="body">
                    <div className="head">
                      <span className="nm">{c.who}</span>
                      <span className="when">{c.when}</span>
                      <span className="more">⋯</span>
                    </div>
                    <div className="content">{c.content}</div>
                    {(c.reactions.length > 0) && (
                      <div className="reactions">
                        {c.reactions.map((r, i) => (
                          <span key={i} className={'tm-reaction' + (r.mine ? ' mine' : '')}>
                            <span>{r.e}</span>
                            <span className="n">{r.n}</span>
                          </span>
                        ))}
                        <span className="tm-reaction add"><SvgEmoji s={12} /></span>
                      </div>
                    )}
                    {c.reactions.length === 0 && (
                      <div className="reactions">
                        <span className="tm-reaction add"><SvgEmoji s={12} /></span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'links' && (
            <div>
              <div className="tm-links-head">
                <span className="t"><SvgLink /> Dependencies</span>
                <span className="n">{tmDependencies.predecessors.length + tmDependencies.successors.length}</span>
                <div className="grow"></div>
                <button className="tm-btn-save" style={{ padding: '7px 13px' }}>
                  <SvgPlus s={12} /> Add dependency
                </button>
              </div>

              <div className="tm-dep-table">
                <div className="tm-dep-section">
                  <span className="dl">Predecessors</span>
                  <span className="n">{tmDependencies.predecessors.length}</span>
                </div>
                <div className="tm-dep-row head">
                  <span className="col">Source</span>
                  <span className="col">Target</span>
                  <span className="col">Type</span>
                  <span className="col actions-h">Actions</span>
                </div>
                {tmDependencies.predecessors.length === 0 && (
                  <div className="tm-dep-empty">Sem predecessores.</div>
                )}
                {tmDependencies.predecessors.map(d => (
                  <div key={d.id} className="tm-dep-row">
                    <span className="tm-dep-task">
                      <SvgCheck s={12} /> {d.source}
                    </span>
                    <span className="tm-dep-target">(this task)</span>
                    <span><span className={'tm-dep-type-pill type-' + d.type}>{tmDepTypeLabel[d.type]}</span></span>
                    <span className="tm-dep-actions"><span className="tm-dep-trash" title="Remover"><SvgTrash s={13}/></span></span>
                  </div>
                ))}

                <div className="tm-dep-section">
                  <span className="dl">Successors</span>
                  <span className="n">{tmDependencies.successors.length}</span>
                </div>
                <div className="tm-dep-row head">
                  <span className="col">Source</span>
                  <span className="col">Target</span>
                  <span className="col">Type</span>
                  <span className="col actions-h">Actions</span>
                </div>
                {tmDependencies.successors.length === 0 && (
                  <div className="tm-dep-empty">Sem sucessores.</div>
                )}
                {tmDependencies.successors.map(d => (
                  <div key={d.id} className="tm-dep-row">
                    <span className="tm-dep-target">(this task)</span>
                    <span className="tm-dep-task">
                      <SvgCheck s={12} /> {d.target}
                    </span>
                    <span><span className={'tm-dep-type-pill type-' + d.type}>{tmDepTypeLabel[d.type]}</span></span>
                    <span className="tm-dep-actions"><span className="tm-dep-trash" title="Remover"><SvgTrash s={13}/></span></span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'files' && (
            <div>
              <div className="tm-files-head">
                <span className="t"><SvgPaperclip /> Files</span>
                <span className="n">{fileCount}</span>
                <div className="grow"></div>
                <button className="send"><SvgUpload /> Send File</button>
              </div>

              <div className="tm-files-bar">
                <div className="search">
                  <SvgSearch />
                  <input placeholder="Search file by name…" value={fileSearch} onChange={e => setFileSearch(e.target.value)} />
                </div>
                <div className="tm-files-filters">
                  {tmFileFilters.map(f => (
                    <span key={f.key} className={'tm-fk' + (fileFilter === f.key ? ' active' : '')} onClick={() => setFileFilter(f.key)}>
                      {f.label}<span className="n">{f.count}</span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="tm-files-table-bar">
                <span className="pp-lbl">Per page</span>
                <div className="tm-pp-sel">5</div>
              </div>

              <div className="tm-files-table">
                <div className="tm-files-row head">
                  <span className="col">Name <SvgSort /></span>
                  <span className="col size-h">Size <SvgSort /></span>
                  <span className="col who-h">Uploaded by <SvgSort /></span>
                  <span className="col date-h">Date <SvgSort /></span>
                  <span></span>
                </div>
                {filteredFiles.map((f, i) => (
                  <div key={i} className="tm-files-row" style={{ '--fk-color': f.fcol, '--fk-soft': f.fsoft }}>
                    <div className="name-cell">
                      <div className="icn">{f.kind}</div>
                      <span className="nm">{f.name}</span>
                    </div>
                    <span className="size">{f.size}</span>
                    <span className="who">
                      <div className="avatar sm" style={{ background: f.who.color, width: 22, height: 22, fontSize: 9 }}>{f.who.initials}</div>
                      <span>{f.who.name}</span>
                    </span>
                    <span className="date">{f.date}</span>
                    <span className="more">⋮</span>
                  </div>
                ))}
                {filteredFiles.length === 0 && (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--mute)', fontSize: 13 }}>
                    Nenhum ficheiro corresponde aos filtros.
                  </div>
                )}
              </div>

              <div className="tm-storage">
                <div className="ico"><SvgDB s={14} /></div>
                <div className="body">
                  <div className="lbl"><b>0%</b> of 500 MB used</div>
                  <div className="bar"><div className="fill" style={{ width: '2%' }}></div></div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="tm-footer">
          <button className="tm-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="tm-btn-save"><SvgCheck s={13} /> Save</button>
        </div>

      </div>
    </React.Fragment>
  );
}

Object.assign(window, { TaskModal, taskModalCss });
