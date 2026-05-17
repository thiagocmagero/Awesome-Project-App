/* eslint-disable */
// AWP — Calendar view shell. The actual grid will be rendered by FullCalendar 2;
// this file owns the chrome around it: top action bar, toolbar with sidebar
// toggle + gear, left side panel with calendar/entity/type toggles, "Tipos de
// eventos" offcanvas, and "Novo evento" modal. The mock month grid below mimics
// FullCalendar's dayGrid view styling so the template-token colors propagate
// once the real widget mounts.

const CT = window.awpTokens;

window.calendarCss = `
/* ============================================================
   Calendar — wrap
   ============================================================ */
.cv-wrap { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: ${CT.bg}; min-width: 0; }

/* === Top action bar (calendar-specific: just Novo Evento + fullscreen) === */
.cv-actions {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 24px;
  border-bottom: 1px solid ${CT.line};
  background: ${CT.panel};
  flex: 0 0 auto;
}
.cv-actions .spacer { flex: 1; }
.cv-actions .add-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 13px;
  border-radius: 8px;
  background: ${CT.brand};
  border: 1px solid ${CT.brand};
  color: #fff;
  font-size: 12.5px; font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background .12s ease;
  white-space: nowrap;
}
.cv-actions .add-btn:hover { background: ${CT.brandHover}; border-color: ${CT.brandHover}; }
.cv-actions .fs-btn {
  width: 30px; height: 30px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 7px;
  border: 1px solid transparent;
  background: transparent;
  color: ${CT.ink2};
  cursor: pointer;
  transition: background .12s ease, color .12s ease;
  padding: 0;
}
.cv-actions .fs-btn:hover { background: ${CT.panel2}; color: ${CT.ink}; }

/* === Secondary toolbar (sidebar toggle on left, gear on right) === */
.cv-toolbar {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 18px;
  border-bottom: 1px solid ${CT.line};
  background: ${CT.bg};
  flex: 0 0 auto;
}
.cv-toolbar .spacer { flex: 1; }
.cv-tool-btn {
  width: 32px; height: 32px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 8px;
  background: ${CT.brandSoft};
  border: none;
  color: ${CT.brand};
  cursor: pointer;
  padding: 0;
  transition: background .12s ease;
}
.cv-tool-btn:hover { background: ${CT.brandSoft2}; }
.cv-tool-btn.ghost {
  background: transparent;
  color: ${CT.ink2};
}
.cv-tool-btn.ghost:hover { background: ${CT.panel2}; color: ${CT.ink}; }

/* === Body — sidebar + main === */
.cv-body { flex: 1; display: flex; gap: 14px; padding: 14px 18px 18px; overflow: hidden; min-height: 0; }

/* === Sidebar === */
.cv-side {
  flex: 0 0 246px;
  background: ${CT.panel};
  border: 1px solid ${CT.line};
  border-radius: 10px;
  display: flex; flex-direction: column;
  padding: 14px 14px 16px;
  overflow-y: auto;
  transition: margin-left .24s cubic-bezier(.2,.7,.2,1), opacity .18s ease;
}
.cv-body.collapsed .cv-side {
  margin-left: -260px; opacity: 0; pointer-events: none;
}
.cv-side-section { margin-bottom: 16px; }
.cv-side-section:last-child { margin-bottom: 0; }
.cv-side-title {
  font-size: 11px;
  font-weight: 600;
  color: ${CT.mute};
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: 8px;
}
.cv-side-row {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 4px;
  font-size: 13px;
  color: ${CT.ink};
  border-radius: 6px;
}
.cv-side-row:hover { background: ${CT.lineSoft}; }
.cv-side-row .ico { color: ${CT.ink2}; display: inline-flex; flex: 0 0 auto; }
.cv-side-row .label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.cv-help {
  font-size: 11.5px;
  color: ${CT.dim};
  font-style: italic;
  padding: 4px 4px 0;
  line-height: 1.45;
}

/* Switch */
.cv-switch {
  width: 32px; height: 18px;
  background: ${CT.panel3};
  border-radius: 999px;
  position: relative;
  cursor: pointer;
  border: none;
  padding: 0;
  transition: background .15s ease;
  flex: 0 0 auto;
}
.cv-switch::after {
  content: '';
  position: absolute; left: 2px; top: 2px;
  width: 14px; height: 14px;
  background: #fff;
  border-radius: 999px;
  transition: left .15s ease;
  box-shadow: 0 1px 2px rgba(0,0,0,.18);
}
.cv-switch.on { background: ${CT.brand}; }
.cv-switch.on::after { left: 16px; }

/* Checkbox */
.cv-check {
  width: 18px; height: 18px;
  border-radius: 4px;
  border: 1px solid ${CT.line};
  background: ${CT.panel};
  cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
  flex: 0 0 auto;
  padding: 0;
  transition: background .12s, border-color .12s;
}
.cv-check svg { color: #fff; opacity: 0; }
.cv-check.on { background: ${CT.brand}; border-color: ${CT.brand}; }
.cv-check.on svg { opacity: 1; }

.cv-side-row .type-dot { width: 10px; height: 10px; border-radius: 999px; flex: 0 0 auto; }

/* === Main — calendar surface === */
.cv-main {
  flex: 1;
  background: ${CT.panel};
  border: 1px solid ${CT.line};
  border-radius: 10px;
  display: flex; flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

/* Calendar header */
.cv-header {
  display: flex; align-items: center;
  padding: 12px 18px;
  border-bottom: 1px solid ${CT.line};
  flex: 0 0 auto;
}
.cv-header .nav {
  display: inline-flex; align-items: center; gap: 6px;
}
.cv-header .nav button.arrow {
  width: 32px; height: 32px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 7px;
  border: 1px solid ${CT.line};
  background: ${CT.panel};
  color: ${CT.ink2};
  cursor: pointer;
  padding: 0;
  transition: background .12s ease;
}
.cv-header .nav button.arrow:hover { background: ${CT.panel2}; color: ${CT.ink}; }
.cv-header .nav button.today {
  padding: 7px 14px;
  border-radius: 7px;
  border: 1px solid ${CT.line};
  background: ${CT.panel};
  color: ${CT.ink};
  font-size: 12.5px; font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  margin-left: 4px;
}
.cv-header .nav button.today:hover { background: ${CT.panel2}; }
.cv-header .title {
  flex: 1;
  text-align: center;
  font-size: 15px;
  font-weight: 600;
  color: ${CT.ink};
}
.cv-header .views {
  display: inline-flex; align-items: center; gap: 4px;
}
.cv-header .views .view-btn {
  padding: 7px 14px;
  border-radius: 7px;
  border: 1px solid transparent;
  background: transparent;
  color: ${CT.ink2};
  font-size: 12.5px; font-weight: 500;
  font-family: inherit;
  cursor: pointer;
}
.cv-header .views .view-btn:hover { color: ${CT.ink}; background: ${CT.panel2}; }
.cv-header .views .view-btn.active {
  background: ${CT.brand};
  color: #fff;
  font-weight: 600;
}
.cv-header .views .view-btn.muted { color: ${CT.dim}; }

/* === Grid === */
.cv-grid { flex: 1; display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
.cv-weekdays {
  display: grid; grid-template-columns: repeat(7, 1fr);
  border-bottom: 1px solid ${CT.line};
  background: ${CT.panel};
}
.cv-weekdays .wd {
  padding: 8px 10px;
  font-size: 11px;
  font-weight: 600;
  color: ${CT.mute};
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-align: left;
}

.cv-weeks { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

.cv-week {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-auto-rows: 22px;
  grid-template-rows: 28px;
  border-top: 1px solid ${CT.lineSoft};
  position: relative;
  min-height: 100px;
}
.cv-week:first-child { border-top: 0; }

.cv-day {
  grid-row: 1 / -1;
  border-right: 1px solid ${CT.lineSoft};
  padding: 4px 8px 6px;
  min-width: 0;
  position: relative;
}
.cv-day:last-child { border-right: 0; }
.cv-day .num {
  font-size: 13px;
  color: ${CT.ink2};
  font-variant-numeric: tabular-nums;
  text-align: right;
}
.cv-day.muted .num { color: ${CT.mute}; }
.cv-day.today { background: ${CT.brandSoft}; }
.cv-day.today .num {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 22px; height: 22px;
  border-radius: 5px;
  background: ${CT.brand};
  color: #fff;
  font-weight: 700;
  padding: 0 5px;
  float: right;
}

/* Event bars (overlay) */
.cv-event {
  grid-row: var(--cv-row, 2);
  height: 20px;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 11.5px;
  font-weight: 500;
  color: #fff;
  background: ${CT.brand};
  display: flex; align-items: center;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  margin: 0 2px;
  cursor: pointer;
  z-index: 1;
  transition: filter .12s ease;
}
.cv-event:hover { filter: brightness(1.05); }
.cv-event.tone-projeto  { background: ${CT.brand}; }
.cv-event.tone-tarefa   { background: color-mix(in oklab, ${CT.brand}, white 18%); }
.cv-event.tone-reuniao  { background: color-mix(in oklab, ${CT.brand}, white 22%); }
.cv-event.tone-lembrete {
  background: transparent;
  color: ${CT.ink};
  padding-left: 6px;
}
.cv-event.tone-lembrete::before {
  content: '';
  width: 8px; height: 8px;
  border-radius: 999px;
  background: oklch(0.78 0.13 70);
  margin-right: 6px;
  flex: 0 0 auto;
}
[data-theme="dark"] .cv-event.tone-tarefa { background: color-mix(in oklab, ${CT.brand}, black 12%); }
[data-theme="dark"] .cv-event.tone-reuniao { background: color-mix(in oklab, ${CT.brand}, black 18%); }

/* ============================================================
   Tipos de eventos — offcanvas
   ============================================================ */
.cv-types-backdrop {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.32);
  z-index: 90;
  animation: cv-fade .15s ease;
}
@keyframes cv-fade { from { opacity: 0; } to { opacity: 1; } }
.cv-types {
  position: fixed; top: 0; right: 0; bottom: 0;
  width: 380px; max-width: 100%;
  background: ${CT.panel};
  border-left: 1px solid ${CT.line};
  display: flex; flex-direction: column;
  z-index: 100;
  box-shadow: -8px 0 24px rgba(0,0,0,.16);
  animation: cv-slide .2s ease;
}
@keyframes cv-slide { from { transform: translateX(20px); opacity: 0; } to { transform: none; opacity: 1; } }

.cv-types .head {
  display: flex; align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid ${CT.line};
}
.cv-types .head .title {
  font-size: 15px; font-weight: 600;
  color: ${CT.ink};
  display: inline-flex; align-items: center; gap: 8px;
}
.cv-types .head .title svg { color: ${CT.brand}; }
.cv-types .head .close {
  margin-left: auto;
  width: 28px; height: 28px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 6px;
  color: ${CT.dim};
  cursor: pointer;
  background: transparent;
  border: none; padding: 0;
}
.cv-types .head .close:hover { background: ${CT.panel2}; color: ${CT.ink}; }

.cv-types .list {
  margin: 12px 16px 18px;
  border: 1px solid ${CT.line};
  border-radius: 10px;
  overflow: hidden;
}
.cv-type-row {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid ${CT.lineSoft};
  background: ${CT.panel};
}
.cv-type-row:last-child { border-bottom: 0; }
.cv-type-row .dot {
  width: 14px; height: 14px;
  border-radius: 999px;
  flex: 0 0 auto;
}
.cv-type-row .nm {
  flex: 1; font-size: 13.5px; color: ${CT.ink}; font-weight: 500;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.cv-type-row .badge {
  font-size: 11px;
  padding: 2px 8px;
  background: ${CT.panel2};
  color: ${CT.ink2};
  border-radius: 999px;
  flex: 0 0 auto;
}
.cv-type-row .edit {
  width: 30px; height: 28px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 7px;
  background: ${CT.brandSoft};
  border: 1px solid ${CT.brandSoft2};
  color: ${CT.brand};
  cursor: pointer; padding: 0;
  flex: 0 0 auto;
}
.cv-type-row .edit:hover { background: ${CT.brandSoft2}; }

.cv-types .new-head {
  margin: 0 16px 8px;
  padding: 8px 12px;
  background: ${CT.panel2};
  border-radius: 7px;
  font-size: 12px;
  color: ${CT.ink2};
  font-weight: 500;
}
.cv-types .new-form {
  display: flex; align-items: stretch; gap: 8px;
  margin: 0 16px;
}
.cv-types .new-form .swatch {
  width: 38px; height: 38px;
  border-radius: 8px;
  border: 1px solid ${CT.line};
  cursor: pointer;
  position: relative;
  overflow: hidden;
  flex: 0 0 auto;
}
.cv-types .new-form .swatch input[type="color"] {
  position: absolute; inset: -4px; opacity: 0; cursor: pointer; border: 0;
  width: calc(100% + 8px); height: calc(100% + 8px);
}
.cv-types .new-form input[type="text"] {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid ${CT.line};
  border-radius: 8px;
  background: ${CT.panel};
  color: ${CT.ink};
  font-size: 13px;
  font-family: inherit;
  outline: none;
  min-width: 0;
}
.cv-types .new-form input[type="text"]:focus {
  border-color: ${CT.brand};
  box-shadow: 0 0 0 3px ${CT.brandSoft};
}
.cv-types .add-type {
  display: inline-flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 6px 10px;
  background: ${CT.brand};
  border: 1px solid ${CT.brand};
  border-radius: 8px;
  color: #fff;
  font-size: 11px; font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  line-height: 1.15;
  white-space: nowrap;
  text-align: center;
  flex: 0 0 auto;
}
.cv-types .add-type:hover { background: ${CT.brandHover}; }
.cv-types .add-type:disabled { opacity: 0.55; cursor: not-allowed; }
.cv-types .add-type span.plus { font-size: 13px; letter-spacing: 1px; margin-bottom: 2px; }

/* ============================================================
   Novo evento — modal
   ============================================================ */
.cv-modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.45);
  display: flex; align-items: center; justify-content: center;
  z-index: 110;
  animation: cv-fade .15s ease;
  padding: 16px;
}
.cv-modal {
  width: 520px; max-width: 100%;
  background: ${CT.panel};
  border: 1px solid ${CT.line};
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0,0,0,.32);
  display: flex; flex-direction: column;
  animation: cv-pop .15s ease;
}
@keyframes cv-pop { from { transform: scale(.96); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.cv-modal .head {
  display: flex; align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid ${CT.line};
}
.cv-modal .head .title { font-size: 15px; font-weight: 600; color: ${CT.ink}; }
.cv-modal .head .close {
  margin-left: auto;
  width: 28px; height: 28px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 6px;
  color: ${CT.dim};
  cursor: pointer; background: transparent; border: none; padding: 0;
}
.cv-modal .head .close:hover { background: ${CT.panel2}; color: ${CT.ink}; }
.cv-modal .body {
  padding: 18px 20px 4px;
  display: flex; flex-direction: column; gap: 14px;
  display: block;
}
.cv-modal .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.cv-modal .field:last-child { margin-bottom: 4px; }
.cv-modal .field label {
  font-size: 12.5px; font-weight: 500; color: ${CT.ink};
}
.cv-modal .field input[type="text"],
.cv-modal .field input[type="datetime-local"],
.cv-modal .field select,
.cv-modal .field textarea {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid ${CT.line};
  border-radius: 8px;
  background: ${CT.panel};
  color: ${CT.ink};
  font-size: 13px;
  font-family: inherit;
  outline: none;
  box-sizing: border-box;
  transition: border-color .12s ease, box-shadow .12s ease;
}
.cv-modal .field input[type="text"]:focus,
.cv-modal .field input[type="datetime-local"]:focus,
.cv-modal .field select:focus,
.cv-modal .field textarea:focus {
  border-color: ${CT.brand};
  box-shadow: 0 0 0 3px ${CT.brandSoft};
}
.cv-modal .field input::placeholder { color: ${CT.mute}; }
.cv-modal .field textarea { min-height: 80px; resize: vertical; line-height: 1.45; }
.cv-modal .field select {
  appearance: none;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2.4' stroke-linecap='round'><polyline points='6 9 12 15 18 9'/></svg>");
  background-repeat: no-repeat;
  background-position: right 9px center;
  background-size: 11px;
  padding-right: 28px;
}
.cv-modal .allday {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 13px; color: ${CT.ink};
  cursor: pointer; user-select: none;
}
.cv-modal .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.cv-modal .color-row {
  display: flex; align-items: center; gap: 10px;
}
.cv-modal .color-row .swatch {
  width: 38px; height: 36px;
  border-radius: 8px;
  border: 1px solid ${CT.line};
  cursor: pointer;
  position: relative; overflow: hidden;
  flex: 0 0 auto;
}
.cv-modal .color-row .swatch input[type="color"] {
  position: absolute; inset: -4px; opacity: 0; cursor: pointer; border: 0;
  width: calc(100% + 8px); height: calc(100% + 8px);
}
.cv-modal .color-row .help {
  font-size: 12px; color: ${CT.dim}; flex: 1;
}
.cv-modal .foot {
  display: flex; justify-content: flex-end; gap: 8px;
  padding: 14px 20px;
  border-top: 1px solid ${CT.line};
  background: ${CT.panel2};
  border-radius: 0 0 12px 12px;
}
.cv-modal .foot button {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px; font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  border: 1px solid ${CT.line};
  background: ${CT.panel};
  color: ${CT.ink};
}
.cv-modal .foot button:hover { background: ${CT.panel3}; }
.cv-modal .foot button.primary {
  background: ${CT.brand}; border-color: ${CT.brand}; color: #fff; font-weight: 600;
}
.cv-modal .foot button.primary:hover { background: ${CT.brandHover}; }
.cv-modal .foot button.primary:disabled { opacity: 0.5; cursor: not-allowed; }

/* === Responsive — collapse sidebar by default on small screens === */
@media (max-width: 1024px) {
  .cv-body { padding: 10px 12px 12px; }
  .cv-side { flex: 0 0 220px; }
}
@media (max-width: 880px) {
  .cv-body { flex-direction: column; }
  .cv-side { flex: 0 0 auto; width: 100%; max-height: none; }
  .cv-header { flex-wrap: wrap; row-gap: 8px; }
  .cv-header .title { order: -1; flex: 1 1 100%; }
}
`;

// ============================================================
// Sample data (Maio 2026)
// ============================================================
// Today is May 16, 2026 — a Saturday. Calendar starts on Monday.
// Week rows (each starts Monday):
//  W0:  Apr 27, 28, 29, 30, May  1,  2,  3
//  W1:  May  4,  5,  6,  7,  8,  9, 10
//  W2:  May 11, 12, 13, 14, 15, 16(today), 17
//  W3:  May 18, 19, 20, 21, 22, 23, 24
//  W4:  May 25, 26, 27, 28, 29, 30, 31
//  W5:  Jun  1,  2,  3,  4,  5,  6,  7

const CV_WEEKS = [
  [{ d:27, mute:true },{ d:28, mute:true },{ d:29, mute:true },{ d:30, mute:true },{ d:1 },{ d:2 },{ d:3 }],
  [{ d:4 },{ d:5 },{ d:6 },{ d:7 },{ d:8 },{ d:9 },{ d:10 }],
  [{ d:11 },{ d:12 },{ d:13 },{ d:14 },{ d:15 },{ d:16, today:true },{ d:17 }],
  [{ d:18 },{ d:19 },{ d:20 },{ d:21 },{ d:22 },{ d:23 },{ d:24 }],
  [{ d:25 },{ d:26 },{ d:27 },{ d:28 },{ d:29 },{ d:30 },{ d:31 }],
  [{ d:1, mute:true },{ d:2, mute:true },{ d:3, mute:true },{ d:4, mute:true },{ d:5, mute:true },{ d:6, mute:true },{ d:7, mute:true }],
];

// Events placed by week index, start col (1-7), end col (1-7), and stack row.
// `row` slot 2 = first stack slot under the date number; 3 second; etc.
const CV_EVENTS = [
  { id: 1, w: 1, startCol: 2, endCol: 7, row: 2, title: 'Novo Projeto Local', tone: 'projeto' },
  { id: 2, w: 2, startCol: 1, endCol: 7, row: 2, title: 'Novo Projeto Local', tone: 'projeto' },
  { id: 3, w: 2, startCol: 3, endCol: 7, row: 3, title: 'Nova tarefa',         tone: 'tarefa'  },
  { id: 4, w: 2, startCol: 3, endCol: 7, row: 4, title: 'teste',               tone: 'tarefa'  },
  { id: 5, w: 2, startCol: 4, endCol: 4, row: 5, title: 'Feriado qualquer',    tone: 'reuniao' },
  { id: 6, w: 3, startCol: 1, endCol: 5, row: 2, title: 'Novo Projeto Local', tone: 'projeto' },
  { id: 7, w: 3, startCol: 1, endCol: 4, row: 3, title: 'Subatividade',        tone: 'tarefa'  },
  { id: 8, w: 4, startCol: 1, endCol: 5, row: 2, title: 'Novo Projeto Local', tone: 'projeto' },
  { id: 9, w: 4, startCol: 1, endCol: 3, row: 3, title: 'teste',               tone: 'tarefa'  },
  { id: 10, w: 4, startCol: 6, endCol: 6, row: 4, title: 'Teste',               tone: 'lembrete' },
];

const CV_WEEKDAYS = ['Seg.', 'Ter.', 'Qua.', 'Qui.', 'Sex.', 'Sáb.', 'Dom.'];

const CV_DEFAULT_TYPES = [
  { id: 'manual',  name: 'Evento Manual', color: '#7c5cff', system: true },
  { id: 'reuniao', name: 'Reunião',       color: '#3fb3c8', system: true },
  { id: 'lembrete',name: 'Lembrete',      color: '#f0a830', system: true },
];

// ============================================================
// Icons
// ============================================================
const Ico = {
  flag: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>,
  folder: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  check: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  gear: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  sideToggle: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="14" y1="9" x2="11" y2="12"/><line x1="14" y1="15" x2="11" y2="12"/></svg>,
  fullscreen: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/></svg>,
  prev: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  next: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  plus: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  close: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  edit: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  tag: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
};

// ============================================================
// Types Panel
// ============================================================
function CVTypesPanel({ onClose, types, setTypes }) {
  const { useState } = React;
  const [newColor, setNewColor] = useState('#7c5cff');
  const [newName, setNewName] = useState('');

  const addType = () => {
    if (!newName.trim()) return;
    setTypes(prev => [...prev, { id: 't-' + Date.now(), name: newName.trim(), color: newColor, system: false }]);
    setNewName('');
  };

  return (
    <>
      <div className="cv-types-backdrop" onClick={onClose}></div>
      <div className="cv-types" role="dialog" aria-label="Tipos de eventos">
        <div className="head">
          <div className="title">
            <Ico.tag />
            Tipos de eventos
          </div>
          <button className="close" onClick={onClose} aria-label="Fechar"><Ico.close /></button>
        </div>
        <div className="list">
          {types.map(t => (
            <div key={t.id} className="cv-type-row">
              <span className="dot" style={{ background: t.color }}></span>
              <span className="nm">{t.name}</span>
              {t.system && <span className="badge">Sistema</span>}
              <button className="edit" title="Editar" aria-label="Editar"><Ico.edit /></button>
            </div>
          ))}
        </div>
        <div className="new-head">Novo tipo de evento:</div>
        <div className="new-form">
          <label className="swatch" style={{ background: newColor }}>
            <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} aria-label="Selecionar cor" />
          </label>
          <input
            type="text"
            placeholder="Ex: Prazo Cliente"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addType(); }}
          />
          <button className="add-type" onClick={addType} disabled={!newName.trim()}>
            <span className="plus">+ +</span>
            <span>Adicionar tipo</span>
          </button>
        </div>
      </div>
    </>
  );
}

// ============================================================
// New Event Modal
// ============================================================
function CVNewEventModal({ onClose, onSave, types }) {
  const { useState, useEffect } = React;
  const [title, setTitle] = useState('');
  const [typeId, setTypeId] = useState(types[0]?.id || 'manual');
  const [allDay, setAllDay] = useState(false);
  const [start, setStart] = useState('2026-05-16T14:58');
  const [end, setEnd]   = useState('2026-05-16T15:58');
  const [desc, setDesc] = useState('');
  const [color, setColor] = useState('#7c5cff');

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const valid = title.trim().length > 0;

  const submit = (e) => {
    e.preventDefault();
    if (!valid) return;
    onSave && onSave({ title: title.trim(), typeId, allDay, start, end, desc, color });
  };

  return (
    <div className="cv-modal-backdrop" onClick={onClose}>
      <form className="cv-modal" role="dialog" aria-label="Novo evento" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="head">
          <div className="title">Novo evento</div>
          <button type="button" className="close" onClick={onClose} aria-label="Fechar"><Ico.close /></button>
        </div>
        <div className="body">
          <div className="field">
            <label>Título</label>
            <input type="text" placeholder="Ex: Sprint review" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </div>
          <div className="field">
            <label>Tipo</label>
            <select value={typeId} onChange={(e) => setTypeId(e.target.value)}>
              {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="allday">
              <button
                type="button"
                className={'cv-check' + (allDay ? ' on' : '')}
                onClick={() => setAllDay(!allDay)}
                aria-pressed={allDay ? 'true' : 'false'}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </button>
              Dia inteiro
            </label>
          </div>
          <div className="row2">
            <div className="field">
              <label>Início</label>
              <input type={allDay ? 'date' : 'datetime-local'} value={allDay ? start.slice(0,10) : start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="field">
              <label>Fim</label>
              <input type={allDay ? 'date' : 'datetime-local'} value={allDay ? end.slice(0,10) : end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>Descrição</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
          <div className="field">
            <label>Cor personalizada</label>
            <div className="color-row">
              <label className="swatch" style={{ background: color }}>
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label="Selecionar cor" />
              </label>
              <span className="help">Deixe vazio para usar a cor do tipo.</span>
            </div>
          </div>
        </div>
        <div className="foot">
          <button type="button" onClick={onClose}>Cancelar</button>
          <button type="submit" className="primary" disabled={!valid}>Salvar</button>
        </div>
      </form>
    </div>
  );
}

// ============================================================
// CalendarView
// ============================================================
window.CalendarView = function CalendarView() {
  const { useState } = React;

  const [sideOpen, setSideOpen] = useState(true);
  const [typesOpen, setTypesOpen] = useState(false);
  const [newEventOpen, setNewEventOpen] = useState(false);
  const [view, setViewMode] = useState('mes');

  const [calNational, setCalNational] = useState(true);
  const [entProjeto,  setEntProjeto]  = useState(true);
  const [entTarefas,  setEntTarefas]  = useState(true);
  const [entMilest,   setEntMilest]   = useState(true);

  const [types, setTypes] = useState(CV_DEFAULT_TYPES);
  const [typeOn, setTypeOn] = useState({ manual: true, reuniao: true, lembrete: true });

  // Filter events based on entity toggles
  const visibleEvents = CV_EVENTS.filter(e => {
    if (e.tone === 'projeto')  return entProjeto;
    if (e.tone === 'tarefa')   return entTarefas;
    if (e.tone === 'milest')   return entMilest;
    if (e.tone === 'reuniao')  return typeOn.reuniao;
    if (e.tone === 'lembrete') return typeOn.lembrete;
    return typeOn.manual;
  });

  return (
    <div className="cv-wrap">
      {/* Top action bar — sidebar toggle on the left; primary CTA + gear + fullscreen on the right */}
      <div className="cv-actions">
        <button
          className="cv-tool-btn"
          title={sideOpen ? 'Ocultar painel lateral' : 'Mostrar painel lateral'}
          onClick={() => setSideOpen(s => !s)}>
          <Ico.sideToggle />
        </button>
        <div className="spacer"></div>
        <button className="add-btn" onClick={() => setNewEventOpen(true)}>
          <Ico.plus />
          Novo Evento
        </button>
        <button className="cv-tool-btn ghost" title="Configurações — Tipos de eventos" onClick={() => setTypesOpen(true)}>
          <Ico.gear />
        </button>
        <button className="fs-btn" title="Tela cheia"><Ico.fullscreen /></button>
      </div>

      <div className={'cv-body' + (sideOpen ? '' : ' collapsed')}>
        {/* Left sidebar */}
        <aside className="cv-side" aria-hidden={!sideOpen}>
          <div className="cv-side-section">
            <div className="cv-side-title">Calendários</div>
            <div className="cv-side-row">
              <span className="ico"><Ico.flag /></span>
              <span className="label">Nacionais</span>
              <button className={'cv-switch' + (calNational ? ' on' : '')} onClick={() => setCalNational(v => !v)} aria-pressed={calNational ? 'true' : 'false'}></button>
            </div>
          </div>

          <div className="cv-side-section">
            <div className="cv-side-title">Entidades do projeto</div>
            <div className="cv-side-row">
              <span className="ico" style={{ color: CT.brand }}><Ico.folder /></span>
              <span className="label">Projeto</span>
              <button className={'cv-switch' + (entProjeto ? ' on' : '')} onClick={() => setEntProjeto(v => !v)} aria-pressed={entProjeto ? 'true' : 'false'}></button>
            </div>
            <div className="cv-side-row">
              <span className="ico" style={{ color: 'oklch(0.55 0.16 155)' }}><Ico.check /></span>
              <span className="label">Tarefas</span>
              <button className={'cv-switch' + (entTarefas ? ' on' : '')} onClick={() => setEntTarefas(v => !v)} aria-pressed={entTarefas ? 'true' : 'false'}></button>
            </div>
            <div className="cv-side-row">
              <span className="ico" style={{ color: 'oklch(0.65 0.18 25)' }}><Ico.flag /></span>
              <span className="label">Milestones</span>
              <button className={'cv-switch' + (entMilest ? ' on' : '')} onClick={() => setEntMilest(v => !v)} aria-pressed={entMilest ? 'true' : 'false'}></button>
            </div>
            <div className="cv-help">Entidades originadas do planejamento são somente leitura no calendário.</div>
          </div>

          <div className="cv-side-section">
            <div className="cv-side-title">Tipos de evento</div>
            {types.map(t => (
              <div key={t.id} className="cv-side-row">
                <span className="type-dot" style={{ background: t.color }}></span>
                <span className="label">{t.name}</span>
                <button
                  className={'cv-check' + (typeOn[t.id] ? ' on' : '')}
                  onClick={() => setTypeOn(s => ({ ...s, [t.id]: !s[t.id] }))}
                  aria-pressed={typeOn[t.id] ? 'true' : 'false'}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </button>
              </div>
            ))}
          </div>
        </aside>

        {/* Main calendar */}
        <main className="cv-main">
          <div className="cv-header">
            <div className="nav">
              <button className="arrow" aria-label="Mês anterior"><Ico.prev /></button>
              <button className="arrow" aria-label="Próximo mês"><Ico.next /></button>
              <button className="today">Hoje</button>
            </div>
            <div className="title">maio de 2026</div>
            <div className="views">
              <button className="view-btn muted">Visão</button>
              <button className={'view-btn' + (view === 'mes' ? ' active' : '')} onClick={() => setViewMode('mes')}>Mês</button>
              <button className={'view-btn' + (view === 'semana' ? ' active' : '')} onClick={() => setViewMode('semana')}>Semana</button>
              <button className={'view-btn' + (view === 'dia' ? ' active' : '')} onClick={() => setViewMode('dia')}>Dia</button>
              <button className={'view-btn' + (view === 'lista' ? ' active' : '')} onClick={() => setViewMode('lista')}>Lista</button>
            </div>
          </div>

          <div className="cv-grid">
            <div className="cv-weekdays">
              {CV_WEEKDAYS.map(w => <div key={w} className="wd">{w}</div>)}
            </div>
            <div className="cv-weeks">
              {CV_WEEKS.map((week, wi) => (
                <div key={wi} className="cv-week">
                  {week.map((day, di) => (
                    <div key={di} className={'cv-day' + (day.mute ? ' muted' : '') + (day.today ? ' today' : '')}>
                      <div className="num">{day.d}</div>
                    </div>
                  ))}
                  {visibleEvents.filter(e => e.w === wi).map(e => (
                    <div key={e.id}
                         className={'cv-event tone-' + e.tone}
                         style={{
                           gridColumn: `${e.startCol} / ${e.endCol + 1}`,
                           gridRow: e.row,
                         }}>
                      {e.title}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      {typesOpen && <CVTypesPanel types={types} setTypes={setTypes} onClose={() => setTypesOpen(false)} />}
      {newEventOpen && <CVNewEventModal types={types} onClose={() => setNewEventOpen(false)} onSave={() => setNewEventOpen(false)} />}
    </div>
  );
};
