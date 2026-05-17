/* eslint-disable */
// AWP — Gantt view shell that wraps the dhtmlx Gantt component.
// The structure of the chart (grid/timeline split, splitters, bars, deps,
// resource load) mirrors what dhtmlx renders so the template visual styling
// drops straight onto the live widget. All colours come from the template
// tokens (--brand, --panel, --line, --st-done, --pri-high, etc.) — never from
// dhtmlx defaults.

const PT = window.awpTokens;

window.ganttCss = `
/* ============================================================
   GANTT — shell around the dhtmlx component
   ============================================================ */
.gv-wrap { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: ${PT.panel}; min-width: 0; }

/* === Top action bar (right-side actions of the project tabs row) === */
.gv-actions {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 24px;
  border-bottom: 1px solid ${PT.line};
  background: ${PT.panel};
}
.gv-search {
  position: relative;
  flex: 0 1 320px;
  display: flex; align-items: center;
}
.gv-search input {
  width: 100%;
  padding: 7px 11px 7px 32px;
  border: 1px solid ${PT.line};
  border-radius: 8px;
  background: ${PT.panel};
  color: ${PT.ink};
  font-size: 12.5px;
  font-family: inherit;
  outline: none;
  transition: border-color .12s ease, box-shadow .12s ease;
}
.gv-search input:focus {
  border-color: ${PT.brand};
  box-shadow: 0 0 0 3px ${PT.brandSoft};
}
.gv-search svg { position: absolute; left: 10px; color: ${PT.mute}; pointer-events: none; }
.gv-actions .spacer { flex: 1; }

.gv-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 11px;
  border-radius: 8px;
  border: 1px solid ${PT.line};
  background: ${PT.panel};
  color: ${PT.ink};
  font-size: 12.5px; font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: background .12s ease, border-color .12s ease;
  white-space: nowrap;
}
.gv-btn:hover { background: ${PT.panel2}; }
.gv-btn .chev { color: ${PT.dim}; font-size: 10px; margin-left: 2px; }
.gv-btn.primary {
  background: ${PT.brand}; border-color: ${PT.brand}; color: #fff; font-weight: 600;
}
.gv-btn.primary:hover { background: ${PT.brandHover}; border-color: ${PT.brandHover}; }

.gv-icon-btn {
  width: 30px; height: 30px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 7px;
  border: 1px solid transparent;
  background: transparent;
  color: ${PT.ink2};
  cursor: pointer;
  transition: background .12s ease, color .12s ease;
  padding: 0;
}
.gv-icon-btn:hover { background: ${PT.panel2}; color: ${PT.ink}; }
.gv-icon-btn.active { background: ${PT.brandSoft}; color: ${PT.brand}; }
.gv-icon-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* === Toolbar (zoom / Dia·Hora / fit / collapse / settings) === */
.gv-toolbar {
  display: flex; align-items: center; gap: 4px;
  padding: 8px 18px;
  border-bottom: 1px solid ${PT.line};
  background: ${PT.panel};
}
.gv-zoom {
  display: inline-flex; align-items: center; gap: 0;
  padding: 2px;
  border: 1px solid ${PT.line};
  border-radius: 8px;
  background: ${PT.panel};
}
.gv-zoom .gv-icon-btn { width: 24px; height: 24px; border-radius: 5px; }
.gv-zoom .val {
  font-family: 'Geist Mono', 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
  color: ${PT.ink2};
  padding: 0 6px;
  min-width: 40px;
  text-align: center;
}
.gv-toolbar .sep { width: 1px; height: 18px; background: ${PT.line}; margin: 0 4px; }

.gv-seg {
  display: inline-flex; padding: 2px;
  background: ${PT.panel2};
  border-radius: 7px;
}
.gv-seg .item {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 11px;
  border-radius: 5px;
  font-size: 12px;
  color: ${PT.dim};
  cursor: pointer;
  transition: background .12s ease, color .12s ease;
}
.gv-seg .item:hover { color: ${PT.ink}; }
.gv-seg .item.active { background: ${PT.brandSoft}; color: ${PT.brand}; font-weight: 600; }
.gv-toolbar .right { margin-left: auto; display: flex; align-items: center; gap: 4px; }

/* Tooltip */
.gv-tip { position: relative; }
.gv-tip:hover::after {
  content: attr(data-tip);
  position: absolute; top: calc(100% + 6px); left: 50%; transform: translateX(-50%);
  background: ${PT.ink};
  color: ${PT.panel};
  font-size: 11px; font-weight: 500;
  padding: 4px 8px;
  border-radius: 5px;
  white-space: nowrap;
  pointer-events: none;
  z-index: 50;
  box-shadow: 0 4px 12px rgba(0,0,0,.18);
}
.gv-tip:hover::before {
  content: '';
  position: absolute; top: calc(100% + 1px); left: 50%; transform: translateX(-50%);
  border: 4px solid transparent;
  border-bottom-color: ${PT.ink};
  z-index: 50;
}

/* === Body — two panels stacked === */
.gv-body { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0; }

.gv-panel { display: flex; min-height: 0; overflow: hidden; background: ${PT.panel}; min-width: 0; }
.gv-panel.tasks { flex: 1 1 0; min-height: 220px; }
.gv-panel.resources { flex: 0 0 30%; min-height: 140px; }
.gv-vsplitter {
  height: 6px; background: ${PT.panel2}; border-top: 1px solid ${PT.line}; border-bottom: 1px solid ${PT.line};
  cursor: row-resize; position: relative; flex: 0 0 auto;
}
.gv-vsplitter::after {
  content: ''; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  width: 28px; height: 2px; background: ${PT.line}; border-radius: 999px;
  transition: background .12s ease;
}
.gv-vsplitter:hover { background: ${PT.brandSoft}; }
.gv-vsplitter:hover::after { background: ${PT.brand}; }

/* Grid column inside each panel */
.gv-grid {
  flex: 0 0 540px;
  border-right: 1px solid ${PT.line};
  display: flex; flex-direction: column;
  min-width: 0; overflow: hidden;
  background: ${PT.panel};
}
.gv-grid.resources-grid { flex: 0 0 540px; }
.gv-hsplitter {
  width: 6px; background: transparent; cursor: col-resize;
  flex: 0 0 auto; position: relative; margin-left: -3px; z-index: 2;
}
.gv-hsplitter::after {
  content: ''; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  width: 2px; height: 28px; background: ${PT.line}; border-radius: 999px;
  opacity: 0; transition: opacity .12s ease;
}
.gv-hsplitter:hover::after { opacity: 1; background: ${PT.brand}; }

/* Grid header */
.gv-grid-head {
  display: grid;
  height: 56px;
  background: ${PT.panel2};
  border-bottom: 1px solid ${PT.line};
  font-size: 11.5px;
  color: ${PT.ink2};
  font-weight: 600;
  flex: 0 0 auto;
}
.gv-grid-head .cell {
  display: flex; align-items: center; padding: 0 14px;
  border-right: 1px solid ${PT.line};
}
.gv-grid-head .cell:last-child { border-right: 0; }
.gv-grid-head .cell.center { justify-content: center; }
.gv-grid-head .cell.add { color: ${PT.mute}; cursor: pointer; font-size: 15px; }
.gv-grid-head .cell.add:hover { color: ${PT.brand}; }

.gv-grid-body { flex: 1; overflow-y: auto; overflow-x: hidden; }

/* Grid row */
.gv-row {
  display: grid;
  height: 40px;
  border-bottom: 1px solid ${PT.lineSoft};
  font-size: 13px;
  color: ${PT.ink};
  align-items: center;
}
.gv-row:hover { background: ${PT.lineSoft}; }
.gv-row .cell {
  padding: 0 14px;
  border-right: 1px solid ${PT.lineSoft};
  display: flex; align-items: center;
  height: 100%;
  min-width: 0;
}
.gv-row .cell:last-child { border-right: 0; }
.gv-row .cell.center { justify-content: center; }
.gv-row .name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gv-row .chev {
  display: inline-flex; align-items: center; justify-content: center;
  width: 16px; height: 16px;
  margin-right: 6px;
  color: ${PT.dim};
  cursor: pointer;
  transition: transform .15s ease;
  flex: 0 0 auto;
}
.gv-row .chev.collapsed { transform: rotate(-90deg); }
.gv-row .date {
  color: ${PT.ink2};
  font-family: 'Geist Mono', ui-monospace, monospace;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.gv-row .dash { color: ${PT.mute}; }
.gv-row .duration {
  font-family: 'Geist Mono', ui-monospace, monospace;
  font-variant-numeric: tabular-nums;
  font-size: 12.5px;
  color: ${PT.ink};
}
.gv-row .row-add { color: ${PT.mute}; cursor: pointer; font-size: 14px; }
.gv-row .row-add:hover { color: ${PT.brand}; }
.gv-row.subtask .name-cell { padding-left: 38px; }
.gv-row.subtask { color: ${PT.ink2}; }

/* Resource grouping */
.gv-row.group { font-weight: 600; background: ${PT.panel2}; }
.gv-row.group:hover { background: ${PT.panel2}; }
.gv-row.group .cell { border-right-color: transparent; }
.gv-row.resource .name-cell { padding-left: 38px; }

/* === Timeline (chart area) === */
.gv-chart {
  flex: 1; min-width: 0;
  overflow: auto;
  position: relative;
  background: ${PT.panel};
}
.gv-chart-inner { position: relative; display: flex; flex-direction: column; }
.gv-scale {
  position: sticky; top: 0; z-index: 4;
  flex: 0 0 auto;
  background: ${PT.panel2};
  border-bottom: 1px solid ${PT.line};
}
.gv-scale-top {
  display: flex;
  height: 28px;
  border-bottom: 1px solid ${PT.line};
  font-size: 11.5px;
  color: ${PT.ink2};
  font-weight: 600;
}
.gv-scale-top .week {
  display: flex; align-items: center; justify-content: center;
  border-right: 1px solid ${PT.line};
  flex: 0 0 auto;
  white-space: nowrap;
}
.gv-scale-bot { display: flex; height: 28px; }
.gv-scale-bot .day {
  display: flex; align-items: center; justify-content: center;
  font-size: 11.5px;
  font-family: 'Geist Mono', ui-monospace, monospace;
  font-variant-numeric: tabular-nums;
  color: ${PT.ink2};
  border-right: 1px solid ${PT.line};
  flex: 0 0 auto;
  position: relative;
}
.gv-scale-bot .day.weekend { color: ${PT.mute}; }
.gv-scale-bot .day.today { color: ${PT.brand}; font-weight: 700; }

/* Today line */
.gv-today {
  position: absolute;
  top: 0; bottom: 0;
  width: 2px;
  background: ${PT.brand};
  z-index: 3;
  pointer-events: none;
  margin-left: -1px;
}
.gv-today .pill {
  position: absolute;
  top: 4px;
  left: 50%; transform: translateX(-50%);
  font-size: 9.5px; font-weight: 700;
  color: #fff;
  background: ${PT.brand};
  padding: 2px 6px;
  border-radius: 4px;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

/* Rows + bars */
.gv-rows { position: relative; flex: 1; min-height: 0; }
.gv-tl-row {
  height: 40px;
  display: flex;
  border-bottom: 1px solid ${PT.lineSoft};
  position: relative;
}
.gv-cell {
  flex: 0 0 auto;
  border-right: 1px solid ${PT.lineSoft};
  height: 100%;
  display: flex; align-items: center; justify-content: center;
  position: relative;
}
.gv-cell.weekend {
  background-color: ${PT.panel3};
  background-image: repeating-linear-gradient(
    -45deg,
    transparent 0,
    transparent 5px,
    ${PT.line} 5px,
    ${PT.line} 6px
  );
}

/* Dependency arrows */
.gv-deps {
  position: absolute; left: 0; right: 0; top: 0;
  pointer-events: none;
  z-index: 2;
  overflow: visible;
}
.gv-deps path { fill: none; stroke: ${PT.mute}; stroke-width: 1.4; }
.gv-deps polygon { fill: ${PT.mute}; }

/* Bars layer */
.gv-bars { position: absolute; left: 0; right: 0; top: 0; pointer-events: none; z-index: 4; }
.gv-bar {
  position: absolute;
  height: 24px;
  border-radius: 6px;
  padding: 0 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 11.5px;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  pointer-events: auto;
  background: ${PT.brand};
  box-shadow: 0 1px 0 rgba(0,0,0,.04), inset 0 -1px 0 rgba(0,0,0,.08);
  transition: filter .12s ease;
}
.gv-bar:hover { filter: brightness(1.05); }
.gv-bar.subtask { background: color-mix(in oklab, ${PT.brand}, white 15%); }
[data-theme="dark"] .gv-bar.subtask { background: color-mix(in oklab, ${PT.brand}, black 18%); }
.gv-bar.project { background: ${PT.done}; color: ${PT.doneInk}; }
.gv-bar.milestone {
  width: 22px !important;
  height: 22px !important;
  padding: 0;
  border-radius: 4px;
  transform: rotate(45deg);
  background: ${PT.high};
}

/* Resource load badges */
.gv-load-badge {
  min-width: 22px;
  height: 22px;
  border-radius: 999px;
  background: ${PT.done};
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  display: inline-flex; align-items: center; justify-content: center;
  font-family: 'Geist Mono', ui-monospace, monospace;
  font-variant-numeric: tabular-nums;
  padding: 0 6px;
  box-shadow: 0 1px 2px rgba(0,0,0,.12);
}

/* Horizontal scrollbar at bottom (decorative) */
.gv-hscrollbar {
  height: 10px;
  background: ${PT.panel};
  border-top: 1px solid ${PT.line};
  display: flex; align-items: center;
  padding: 0 8px;
  flex: 0 0 auto;
}
.gv-hscrollbar .thumb {
  height: 6px;
  background: ${PT.brandSoft2};
  border-radius: 999px;
  width: 12%;
  margin-left: 40%;
}

/* ============================================================
   Settings drawer
   ============================================================ */
.gv-drawer-backdrop {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.32);
  z-index: 90;
  animation: gv-fade .15s ease;
}
@keyframes gv-fade { from { opacity: 0; } to { opacity: 1; } }
.gv-drawer {
  position: fixed; top: 0; right: 0; bottom: 0;
  width: 380px;
  background: ${PT.panel};
  border-left: 1px solid ${PT.line};
  display: flex; flex-direction: column;
  z-index: 100;
  box-shadow: -8px 0 24px rgba(0,0,0,.16);
  animation: gv-slide .2s ease;
}
@keyframes gv-slide { from { transform: translateX(20px); opacity: 0; } to { transform: none; opacity: 1; } }

.gv-drawer-head {
  display: flex; align-items: center;
  padding: 14px 18px;
  border-bottom: 1px solid ${PT.line};
}
.gv-drawer-head .title {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 14px; font-weight: 600;
  color: ${PT.ink};
}
.gv-drawer-head .close {
  margin-left: auto;
  width: 28px; height: 28px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 6px;
  color: ${PT.dim};
  cursor: pointer;
  background: transparent;
  border: none;
}
.gv-drawer-head .close:hover { background: ${PT.panel2}; color: ${PT.ink}; }

.gv-drawer-tabs {
  display: flex; gap: 0;
  padding: 0 18px;
  border-bottom: 1px solid ${PT.line};
}
.gv-drawer-tabs .tab {
  padding: 10px 0;
  margin-right: 20px;
  font-size: 13px;
  color: ${PT.dim};
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color .12s ease;
}
.gv-drawer-tabs .tab:hover { color: ${PT.ink}; }
.gv-drawer-tabs .tab.active {
  color: ${PT.brand};
  border-bottom-color: ${PT.brand};
  font-weight: 600;
}

.gv-drawer-body { flex: 1; overflow-y: auto; padding: 4px 0; }

/* Toggle row */
.gv-toggle-row {
  display: flex; align-items: center;
  padding: 11px 18px;
  border-bottom: 1px solid ${PT.lineSoft};
  font-size: 13px;
  color: ${PT.ink};
}
.gv-toggle-row .label { flex: 1; }

.gv-switch {
  width: 32px; height: 18px;
  background: ${PT.panel3};
  border-radius: 999px;
  position: relative;
  cursor: pointer;
  border: none;
  padding: 0;
  transition: background .15s ease;
  flex: 0 0 auto;
}
.gv-switch::after {
  content: '';
  position: absolute; left: 2px; top: 2px;
  width: 14px; height: 14px;
  background: #fff;
  border-radius: 999px;
  transition: left .15s ease;
  box-shadow: 0 1px 2px rgba(0,0,0,.18);
}
.gv-switch.on { background: ${PT.brand}; }
.gv-switch.on::after { left: 16px; }

/* Color row */
.gv-color-row {
  display: flex; align-items: center; gap: 10px;
  padding: 11px 18px;
  border-bottom: 1px solid ${PT.lineSoft};
  font-size: 13px;
}
.gv-color-row .label { flex: 1; color: ${PT.ink}; }
.gv-color-row .label .token {
  display: block;
  font-size: 10.5px;
  color: ${PT.mute};
  font-family: 'Geist Mono', ui-monospace, monospace;
  margin-top: 2px;
}
.gv-swatch {
  width: 24px; height: 24px;
  border-radius: 6px;
  border: 1px solid ${PT.line};
  cursor: pointer;
  flex: 0 0 auto;
  position: relative;
}
.gv-swatch:hover { border-color: ${PT.brand}; }
.gv-reset {
  width: 28px; height: 28px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 6px;
  color: ${PT.dim};
  cursor: pointer;
  background: transparent;
  border: none;
  flex: 0 0 auto;
}
.gv-reset:hover { background: ${PT.panel2}; color: ${PT.ink}; }

/* Section header */
.gv-section-head {
  padding: 11px 18px 9px;
  background: ${PT.panel2};
  font-size: 11.5px; font-weight: 600;
  color: ${PT.ink2};
  letter-spacing: 0.02em;
  border-top: 1px solid ${PT.line};
  border-bottom: 1px solid ${PT.line};
  margin-top: 4px;
}

/* Pattern rows (weekend / holiday) */
.gv-pattern-row { padding: 12px 18px; border-bottom: 1px solid ${PT.lineSoft}; }
.gv-pattern-row .row1 { display: flex; align-items: center; gap: 10px; }
.gv-pattern-row .label { flex: 1; font-size: 13px; color: ${PT.ink}; }
.gv-pattern-row .label .sub {
  display: block; font-size: 11px; color: ${PT.dim}; font-weight: 400; margin-top: 1px;
}
.gv-pattern-row .swatches { display: flex; gap: 6px; }
.gv-pattern-sample {
  width: 24px; height: 24px;
  border-radius: 6px;
  border: 1px solid ${PT.line};
  background-color: ${PT.panel3};
  background-image: repeating-linear-gradient(-45deg, transparent 0, transparent 3px, ${PT.line} 3px, ${PT.line} 4px);
  cursor: pointer;
  flex: 0 0 auto;
}
.gv-pattern-sample.holiday {
  background-color: ${PT.brandSoft2};
  background-image: repeating-linear-gradient(-45deg, transparent 0, transparent 3px, ${PT.brand} 3px, ${PT.brand} 4px);
  opacity: 0.95;
}
.gv-swatch.weekend { background: ${PT.panel3}; }
.gv-swatch.holiday { background: ${PT.brandSoft2}; }
.gv-pattern-row .row2 { margin-top: 8px; display: flex; gap: 8px; align-items: center; }

/* Select */
.gv-select {
  flex: 1;
  padding: 7px 28px 7px 10px;
  border: 1px solid ${PT.line};
  border-radius: 7px;
  background: ${PT.panel};
  color: ${PT.ink};
  font-size: 12.5px;
  font-family: inherit;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2.4' stroke-linecap='round'><polyline points='6 9 12 15 18 9'/></svg>");
  background-repeat: no-repeat;
  background-position: right 9px center;
  background-size: 11px;
  outline: none;
}
.gv-select:focus { border-color: ${PT.brand}; box-shadow: 0 0 0 3px ${PT.brandSoft}; }

/* Padrões tab — definition group */
.gv-def-row { padding: 14px 18px 18px; border-bottom: 1px solid ${PT.lineSoft}; }
.gv-def-row .head {
  font-size: 11.5px; font-weight: 600;
  color: ${PT.ink2};
  letter-spacing: 0.02em;
  padding: 8px 12px;
  background: ${PT.panel2};
  border-radius: 6px;
  margin-bottom: 10px;
}
.gv-def-row .help {
  margin-top: 9px;
  font-size: 11.5px;
  color: ${PT.dim};
  font-style: italic;
  line-height: 1.45;
}
`;

// ============================================================
// Helpers
// ============================================================

function GvTooltip({ tip, children }) { /* presentational helper not used directly */ }

function fmtDate(day) {
  return `${String(day).padStart(2, '0')}/05/2026`;
}

// ============================================================
// Scale (week + day rows). Shared between tasks and resources panels.
// ============================================================
function Scale({ dayStart, dayEnd, cellW, weekendDays, todayDay, todayIdx }) {
  const weeks = [
    { startDay: 4,  endDay: 10, label: '04 May - 10 May' },
    { startDay: 11, endDay: 17, label: '11 May - 17 May' },
    { startDay: 18, endDay: 24, label: '18 May - 24 May' },
    { startDay: 25, endDay: 31, label: '25 May - 31 May' },
  ];
  const visibleWeeks = weeks.map(w => {
    const s = Math.max(w.startDay, dayStart);
    const e = Math.min(w.endDay, dayEnd);
    return { ...w, days: Math.max(0, e - s + 1) };
  }).filter(w => w.days > 0);

  const totalDays = dayEnd - dayStart + 1;
  return (
    <div className="gv-scale">
      <div className="gv-scale-top" style={{ width: totalDays * cellW }}>
        {visibleWeeks.map((w, i) => (
          <div key={i} className="week" style={{ width: w.days * cellW }}>{w.label}</div>
        ))}
      </div>
      <div className="gv-scale-bot" style={{ width: totalDays * cellW }}>
        {Array.from({ length: totalDays }, (_, i) => {
          const d = dayStart + i;
          return (
            <div key={i}
                 className={'day' + (weekendDays.has(d) ? ' weekend' : '') + (d === todayDay ? ' today' : '')}
                 style={{ width: cellW }}>{d}</div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Settings drawer
// ============================================================
function SettingsDrawer({ tab, setTab, columnsOn, setColumnsOn, dateEndMode, setDateEndMode, onClose }) {
  const colorRows = [
    { label: 'Barra de tarefa',   color: 'var(--brand)',   token: '--brand' },
    { label: 'Barra de projeto',  color: 'var(--st-done)', token: '--st-done' },
    { label: 'Marco (milestone)', color: 'var(--pri-high)',token: '--pri-high' },
    { label: 'Vínculos',          color: 'var(--mute)',    token: '--mute' },
    { label: 'Linha de hoje',     color: 'var(--brand)',   token: '--brand' },
  ];

  const dateEndHelp = {
    exclusiva: 'Ex.: tarefa de 1 dia que começa em 1 de Maio termina em 2 de Maio.',
    inclusiva: 'Ex.: tarefa de 1 dia que começa em 1 de Maio termina em 1 de Maio.',
  };

  return (
    <>
      <div className="gv-drawer-backdrop" onClick={onClose}></div>
      <div className="gv-drawer" role="dialog" aria-label="Configurações do Gantt">
        <div className="gv-drawer-head">
          <div className="title">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            Configurações do Gantt
          </div>
          <button className="close" onClick={onClose} aria-label="Fechar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="gv-drawer-tabs">
          <div className={'tab' + (tab === 'colunas' ? ' active' : '')} onClick={() => setTab('colunas')}>Colunas</div>
          <div className={'tab' + (tab === 'cores'   ? ' active' : '')} onClick={() => setTab('cores')}>Cores</div>
          <div className={'tab' + (tab === 'padroes' ? ' active' : '')} onClick={() => setTab('padroes')}>Padrões</div>
        </div>
        <div className="gv-drawer-body">
          {tab === 'colunas' && (
            <>
              {[
                { key: 'inicio',      label: 'Início' },
                { key: 'fim',         label: 'Fim' },
                { key: 'responsavel', label: 'Responsável' },
                { key: 'duracao',     label: 'Duração' },
                { key: 'prioridade',  label: 'Prioridade' },
              ].map(c => (
                <div key={c.key} className="gv-toggle-row">
                  <span className="label">{c.label}</span>
                  <button
                    className={'gv-switch' + (columnsOn[c.key] ? ' on' : '')}
                    onClick={() => setColumnsOn(s => ({ ...s, [c.key]: !s[c.key] }))}
                    aria-pressed={columnsOn[c.key] ? 'true' : 'false'}
                    aria-label={c.label}>
                  </button>
                </div>
              ))}
            </>
          )}

          {tab === 'cores' && (
            <>
              {colorRows.map((r, i) => (
                <div key={i} className="gv-color-row">
                  <span className="label">
                    {r.label}
                    <span className="token">{r.token}</span>
                  </span>
                  <button className="gv-swatch" style={{ background: r.color }} aria-label={`Cor: ${r.label}`}></button>
                  <button className="gv-reset" title="Repor padrão" aria-label="Repor padrão">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                  </button>
                </div>
              ))}

              <div className="gv-section-head">Padrão das células</div>

              <div className="gv-pattern-row">
                <div className="row1">
                  <span className="label">
                    Fim de semana
                    <span className="sub">Sábado e domingo</span>
                  </span>
                  <div className="swatches">
                    <button className="gv-swatch weekend" aria-label="Cor de fundo"></button>
                    <button className="gv-pattern-sample" aria-label="Padrão"></button>
                  </div>
                  <button className="gv-reset" title="Repor padrão" aria-label="Repor padrão">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                  </button>
                </div>
                <div className="row2">
                  <select className="gv-select" defaultValue="diagonal">
                    <option value="diagonal">Diagonal Stripes</option>
                    <option value="dots">Pontos</option>
                    <option value="grid">Malha</option>
                    <option value="solid">Sólido</option>
                  </select>
                </div>
              </div>

              <div className="gv-pattern-row">
                <div className="row1">
                  <span className="label">
                    Feriado
                    <span className="sub">Dias de feriado</span>
                  </span>
                  <div className="swatches">
                    <button className="gv-swatch holiday" aria-label="Cor de fundo"></button>
                    <button className="gv-pattern-sample holiday" aria-label="Padrão"></button>
                  </div>
                  <button className="gv-reset" title="Repor padrão" aria-label="Repor padrão">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                  </button>
                </div>
                <div className="row2">
                  <select className="gv-select" defaultValue="diagonal">
                    <option value="diagonal">Diagonal Stripes</option>
                    <option value="dots">Pontos</option>
                    <option value="solid">Sólido</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {tab === 'padroes' && (
            <>
              <div className="gv-def-row">
                <div className="head">Modo de data de fim</div>
                <select
                  className="gv-select"
                  value={dateEndMode}
                  onChange={(e) => setDateEndMode(e.target.value)}
                  style={{ width: '100%' }}>
                  <option value="exclusiva">Exclusiva</option>
                  <option value="inclusiva">Inclusiva</option>
                </select>
                <div className="help">{dateEndHelp[dateEndMode]}</div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ============================================================
// GanttView
// ============================================================
window.GanttView = function GanttView() {
  const { useState, useEffect } = React;

  const cellW = 50;
  const dayStart = 10;   // May 10
  const dayEnd   = 29;   // May 29
  const days = [];
  for (let d = dayStart; d <= dayEnd; d++) days.push(d);
  const weekendDays = new Set([10, 16, 17, 23, 24]);
  const todayDay = 16;
  const todayIdx = todayDay - dayStart;

  const tasks = [
    { id: 't1',   label: 'Nova tarefa',    startDay: 13, endDay: 16, dur: 3,
      assignees: [{ i: 'F', c: '#e8704c' }, { i: 'T', c: '#4a89c4' }], depth: 0, hasChildren: true },
    { id: 't1.1', label: 'Subatividade',   startDay: 18, endDay: 23, dur: 5,
      assignee: 'Fulano', depth: 1, parent: 't1' },
    { id: 't2',   label: 'teste',          startDay: 13, endDay: 16, dur: 3, depth: 0 },
    { id: 't3',   label: 'teste',          startDay: 25, endDay: 28, dur: 3, depth: 0 },
  ];
  const deps = [
    { from: 't1',   to: 't1.1' },
    { from: 't1.1', to: 't3'  },
  ];

  const resources = [
    { id: 'r-dev',  type: 'group',    label: 'Developer',     total: '64h' },
    { id: 'r1',     type: 'resource', label: 'Fulano',        hoursPerDay: '8h', total: '64h',
      allocations: { 13: 8, 14: 8, 15: 8, 18: 8, 19: 8, 20: 8, 21: 8, 22: 8 } },
    { id: 'r-none', type: 'group',    label: 'Sem tipo',      total: '24h' },
    { id: 'r2',    type: 'resource',  label: 'Thiago Mágero', hoursPerDay: '8h', total: '24h',
      allocations: { 13: 8, 14: 8, 15: 8 } },
  ];

  const [seg, setSeg] = useState('day');
  const [zoom, setZoom] = useState(100);
  const [showResources, setShowResources] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [autoSchedule, setAutoSchedule] = useState(true);
  const [settingsTab, setSettingsTab] = useState('cores');
  const [columnsOn, setColumnsOn] = useState({
    inicio: true, fim: true, responsavel: true, duracao: true, prioridade: false,
  });
  const [dateEndMode, setDateEndMode] = useState('exclusiva');

  // Expose settings opener to the shared ViewActions bar (gear icon).
  useEffect(() => {
    window.__openCurrentViewSettings = () => setSettingsOpen(true);
    return () => { delete window.__openCurrentViewSettings; };
  }, []);

  const chartW = days.length * cellW;

  // Bar position helper
  const barLeft  = (startDay) => (startDay - dayStart) * cellW + 1;
  const barWidth = (startDay, endDay) => (endDay - startDay) * cellW - 2;

  // Dependency paths
  const taskRowIdx = {};
  tasks.forEach((t, i) => { taskRowIdx[t.id] = i; });

  const renderDepArrows = () => deps.map((d, i) => {
    const from = tasks.find(t => t.id === d.from);
    const to   = tasks.find(t => t.id === d.to);
    if (!from || !to) return null;
    const fromRow = taskRowIdx[d.from];
    const toRow   = taskRowIdx[d.to];
    const x1 = barLeft(from.startDay) + barWidth(from.startDay, from.endDay);
    const y1 = fromRow * 40 + 20;
    const x2 = barLeft(to.startDay) - 1;
    const y2 = toRow   * 40 + 20;
    const midX = Math.max(x1 + 6, x2 - 12);
    return (
      <g key={i}>
        <path d={`M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2 - 4} ${y2}`} />
        <polygon points={`${x2},${y2} ${x2-6},${y2-3.5} ${x2-6},${y2+3.5}`} />
      </g>
    );
  });

  // Dynamic grid columns based on toggles
  const colKeys = ['name', columnsOn.inicio && 'inicio', columnsOn.fim && 'fim',
                   columnsOn.responsavel && 'responsavel', columnsOn.duracao && 'duracao',
                   'add'].filter(Boolean);
  const colSize = {
    name: 'minmax(180px, 1fr)', inicio: '110px', fim: '110px',
    responsavel: '100px', duracao: '78px', add: '40px',
  };
  const taskGridTemplate = colKeys.map(k => colSize[k]).join(' ');

  return (
    <div className="gv-wrap">
      {/* Gantt toolbar (zoom / Dia·Hora / fit / collapse / settings) */}
      <div className="gv-toolbar">
        <div className="gv-zoom">
          <button className="gv-icon-btn gv-tip" data-tip="Diminuir zoom" onClick={() => setZoom(z => Math.max(50, z - 25))}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><line x1="8" y1="11" x2="14" y2="11"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </button>
          <span className="val">{zoom}%</span>
          <button className="gv-icon-btn gv-tip" data-tip="Aumentar zoom" onClick={() => setZoom(z => Math.min(200, z + 25))}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </button>
        </div>

        <div className="sep"></div>

        <div className="gv-seg">
          <div className={'item' + (seg === 'day' ? ' active' : '')} onClick={() => setSeg('day')}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Dia
          </div>
          <div className={'item' + (seg === 'hour' ? ' active' : '')} onClick={() => setSeg('hour')}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>
            Hora
          </div>
        </div>

        <button className="gv-icon-btn gv-tip" data-tip="Ajustar à vista">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8V5a2 2 0 0 1 2-2h3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M21 16v3a2 2 0 0 1-2 2h-3"/><line x1="12" y1="9" x2="12" y2="15"/><line x1="9" y1="12" x2="15" y2="12"/></svg>
        </button>
        <button
          className={'gv-icon-btn gv-tip' + (!showResources ? ' active' : '')}
          data-tip={showResources ? 'Ocultar recursos' : 'Mostrar recursos'}
          onClick={() => setShowResources(s => !s)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="8" rx="1.5"/><rect x="3" y="13" width="18" height="8" rx="1.5"/><line x1="7" y1="17" x2="13" y2="17"/></svg>
        </button>

        <div className="right">
          <button className="gv-icon-btn gv-tip" data-tip="Recolher tudo">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 11 12 6 7 11"/><polyline points="17 18 12 13 7 18"/></svg>
          </button>
          <button
            className={'gv-icon-btn gv-tip' + (autoSchedule ? ' active' : '')}
            data-tip="Agendamento automático"
            onClick={() => setAutoSchedule(s => !s)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
          </button>
        </div>
      </div>

      {/* === Body — Tasks panel === */}
      <div className="gv-body">
        <div className="gv-panel tasks">
          <div className="gv-grid">
            <div className="gv-grid-head" style={{ gridTemplateColumns: taskGridTemplate }}>
              <div className="cell">Tarefa</div>
              {columnsOn.inicio      && <div className="cell center">Início</div>}
              {columnsOn.fim         && <div className="cell center">Fim</div>}
              {columnsOn.responsavel && <div className="cell">Responsável</div>}
              {columnsOn.duracao     && <div className="cell center">Duração</div>}
              <div className="cell center add">+</div>
            </div>
            <div className="gv-grid-body">
              {tasks.map(t => (
                <div key={t.id} className={'gv-row' + (t.depth ? ' subtask' : '')} style={{ gridTemplateColumns: taskGridTemplate }}>
                  <div className="cell name-cell">
                    {t.hasChildren ? (
                      <span className="chev" aria-label="Recolher">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                      </span>
                    ) : t.depth === 0 ? (
                      <span style={{ width: 22 }}></span>
                    ) : null}
                    <span className="name">{t.label}</span>
                  </div>
                  {columnsOn.inicio && <div className="cell center date">{fmtDate(t.startDay)}</div>}
                  {columnsOn.fim    && <div className="cell center date">{fmtDate(t.endDay)}</div>}
                  {columnsOn.responsavel && (
                    <div className="cell">
                      {t.assignees ? (
                        <span className="avatar-list-stacked">
                          {t.assignees.map((a, k) => (
                            <div key={k} className="avatar sm" style={{ background: a.c }}>{a.i}</div>
                          ))}
                        </span>
                      ) : t.assignee ? (
                        <span className="name">{t.assignee}</span>
                      ) : (
                        <span className="dash">—</span>
                      )}
                    </div>
                  )}
                  {columnsOn.duracao && <div className="cell center duration">{t.dur}</div>}
                  <div className="cell center row-add">+</div>
                </div>
              ))}
            </div>
          </div>

          <div className="gv-hsplitter" title="Arrastar"></div>

          <div className="gv-chart">
            <div className="gv-chart-inner" style={{ width: chartW }}>
              <Scale dayStart={dayStart} dayEnd={dayEnd} cellW={cellW}
                     weekendDays={weekendDays} todayDay={todayDay} todayIdx={todayIdx} />

              <div className="gv-rows" style={{ height: tasks.length * 40, width: chartW }}>
                {tasks.map(t => (
                  <div key={t.id} className="gv-tl-row" style={{ width: chartW }}>
                    {days.map((d, j) => (
                      <div key={j} className={'gv-cell' + (weekendDays.has(d) ? ' weekend' : '')} style={{ width: cellW }}></div>
                    ))}
                  </div>
                ))}

                <svg className="gv-deps" width={chartW} height={tasks.length * 40} style={{ position: 'absolute', top: 0, left: 0 }}>
                  {renderDepArrows()}
                </svg>

                <div className="gv-bars" style={{ height: tasks.length * 40 }}>
                  {tasks.map((t, i) => (
                    <div key={t.id} className={'gv-bar' + (t.depth ? ' subtask' : '')} style={{
                      top: i * 40 + 8,
                      left: barLeft(t.startDay),
                      width: barWidth(t.startDay, t.endDay),
                    }}>{t.label}</div>
                  ))}
                </div>

                <div className="gv-today" style={{ left: todayIdx * cellW, top: 0, height: tasks.length * 40 }}>
                  <div className="pill">Hoje</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* === Resources panel === */}
        {showResources && (
          <>
            <div className="gv-vsplitter" title="Arrastar"></div>
            <div className="gv-panel resources">
              <div className="gv-grid resources-grid">
                <div className="gv-grid-head" style={{ gridTemplateColumns: 'minmax(180px, 1fr) 130px 130px' }}>
                  <div className="cell">Nome</div>
                  <div className="cell center">Horas/Dia</div>
                  <div className="cell center">Carga</div>
                </div>
                <div className="gv-grid-body">
                  {resources.map(r => (
                    <div key={r.id} className={'gv-row ' + r.type} style={{ gridTemplateColumns: 'minmax(180px, 1fr) 130px 130px' }}>
                      <div className="cell name-cell">
                        {r.type === 'group' ? (
                          <span className="chev" aria-label="Recolher">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                          </span>
                        ) : null}
                        <span className="name">{r.label}</span>
                      </div>
                      <div className="cell center duration">{r.hoursPerDay || ''}</div>
                      <div className="cell center duration">{r.total}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="gv-hsplitter" title="Arrastar"></div>

              <div className="gv-chart">
                <div className="gv-chart-inner" style={{ width: chartW }}>
                  <Scale dayStart={dayStart} dayEnd={dayEnd} cellW={cellW}
                         weekendDays={weekendDays} todayDay={todayDay} todayIdx={todayIdx} />

                  <div className="gv-rows" style={{ height: resources.length * 40, width: chartW }}>
                    {resources.map(r => (
                      <div key={r.id} className="gv-tl-row" style={{ width: chartW }}>
                        {days.map((d, j) => {
                          const v = r.allocations && r.allocations[d];
                          const isWeekend = weekendDays.has(d);
                          return (
                            <div key={j} className={'gv-cell' + (isWeekend ? ' weekend' : '')} style={{ width: cellW }}>
                              {v != null && !isWeekend && r.type === 'resource' && (
                                <div className="gv-load-badge">{v}</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                    <div className="gv-today" style={{ left: todayIdx * cellW, top: 0, height: resources.length * 40 }}></div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Bottom decorative scrollbar */}
        <div className="gv-hscrollbar">
          <div className="thumb"></div>
        </div>
      </div>

      {settingsOpen && (
        <SettingsDrawer
          tab={settingsTab}
          setTab={setSettingsTab}
          columnsOn={columnsOn}
          setColumnsOn={setColumnsOn}
          dateEndMode={dateEndMode}
          setDateEndMode={setDateEndMode}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
};
