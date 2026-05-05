/** CSS inline injectado no <head> quando os assets DHTMLX Gantt são carregados.
 *  Alinhado com os tokens do template Zynix. */
export const GANTT_INLINE_STYLES = `
  /* ── Typography ── */
  .gantt_container {
    --dhx-gantt-font-family: "Quicksand", sans-serif;
    --dhx-gantt-font-size: 13px;
    --dhx-gantt-heading-font-size: 13px;
    --dhx-gantt-heading-font-weight: 600;
    --dhx-gantt-regular-font-weight: 500;
    --dhx-gantt-important-font-weight: 600;
    font-family: "Quicksand", sans-serif;
    font-size: 13px;
  }
  .gantt_grid_scale .gantt_grid_head_cell,
  .gantt_task_scale .gantt_scale_cell,
  .gantt_cell,
  .gantt_tree_content,
  .gantt_task_content {
    font-family: "Quicksand", sans-serif;
    font-size: 13px;
    font-weight: 500;
  }

  /* ── Zynix color tokens ── */
  .gantt_container {
    --dhx-gantt-base-colors-background: #ffffff;
    --dhx-gantt-base-colors-background-alt: #f5f6fa;
    --dhx-gantt-container-background: #ffffff;
    --dhx-gantt-base-colors-primary: #735DFF;
    --dhx-gantt-base-colors-primary-hover: #5e4bcc;
    --dhx-gantt-base-colors-primary-active: #4d3ab8;
    --dhx-gantt-base-colors-primary-lighter: rgba(115,93,255,0.12);
    --dhx-gantt-base-colors-text-base: #222f36;
    --dhx-gantt-base-colors-text-light: #98a5c3;
    --dhx-gantt-container-color: #222f36;
    --dhx-gantt-base-colors-border: #f3f2f9;
    --dhx-gantt-base-colors-border-light: #f3f2f9;
    --dhx-gantt-scale-border-horizontal: 1px solid #f3f2f9;
    --dhx-gantt-scale-border-vertical: 1px solid #f3f2f9;
    --dhx-gantt-default-border: 1px solid #f3f2f9;
    --dhx-gantt-grid-row-border: 1px solid #f3f2f9;
    --dhx-gantt-task-row-border: 1px solid #f3f2f9;
    --dhx-gantt-base-colors-hover-color: #f5f6f7;
    --dhx-gantt-base-colors-select: rgba(115,93,255,0.08);
    --dhx-gantt-base-colors-success: #0CC763;
    --dhx-gantt-base-colors-error: #FF383C;
    --dhx-gantt-base-colors-error-lighter: rgba(255,56,60,0.12);
    --dhx-gantt-link-background: #735DFF;
    --dhx-gantt-link-background-hover: #5e4bcc;
    --dhx-gantt-task-background: #735DFF;
    --dhx-gantt-task-background-primary: #735DFF;
    --dhx-gantt-task-border-radius: 4px;
    --dhx-gantt-task-color: #ffffff;
    --dhx-gantt-task-border: none;
    --dhx-gantt-task-progress-color: rgba(0,0,0,0.15);
    --dhx-gantt-project-background: rgba(115,93,255,0.55);
    --dhx-gantt-project-color: #ffffff;
    --dhx-gantt-milestone-background: #735DFF;
    --dhx-gantt-offtime-background: #f5f6fa;
    --dhx-gantt-scale-background: #f9fafb;
    --dhx-gantt-grid-scale-background: #f9fafb;
    --dhx-gantt-timeline-scale-background: #f9fafb;
    --dhx-gantt-scale-color: #222f36;
    --dhx-gantt-grid-scale-color: #222f36;
    --dhx-gantt-grid-body-background: transparent;
    --dhx-gantt-task-row-background: #ffffff;
    --dhx-gantt-task-row-background--odd: #ffffff;
    --dhx-gantt-box-shadow-s: 0px 1px 2px rgba(0,0,0,0.05);
  }

  /* ── Grid headers ── */
  .gantt_grid_scale .gantt_grid_head_cell {
    font-weight: 600; font-size: 13px; color: #222f36;
    border-bottom: 2px solid #f3f2f9;
    border-right: 1px solid #f3f2f9;
    background: #f9fafb;
  }
  .gantt_task_scale .gantt_scale_cell {
    font-weight: 600; font-size: 12px; color: #222f36;
    border-bottom: 2px solid #f3f2f9;
    border-right: 1px solid #f3f2f9;
    background: #f9fafb;
  }
  .gantt_scale_line:last-child .gantt_scale_cell  { border-bottom: 1px solid #f3f2f9; }
  .gantt_scale_line:first-child .gantt_scale_cell { border-bottom: 2px solid #f3f2f9; }

  /* ── Task bars ── */
  .gantt_task_progress { background: rgba(0,0,0,0.15); }
  .gantt_task_line.gantt_project { border-radius: 4px; }

  /* ── Scrollbars (force always visible — macOS overlay scrollbars hide them) ── */
  .gantt_hor_scroll::-webkit-scrollbar,
  .gantt_ver_scroll::-webkit-scrollbar,
  .gantt_task_scroll::-webkit-scrollbar { width: 10px; height: 10px; }
  .gantt_hor_scroll::-webkit-scrollbar-track,
  .gantt_ver_scroll::-webkit-scrollbar-track,
  .gantt_task_scroll::-webkit-scrollbar-track {
    background: #f5f6fa; border-radius: 4px;
  }
  .gantt_hor_scroll::-webkit-scrollbar-thumb,
  .gantt_ver_scroll::-webkit-scrollbar-thumb,
  .gantt_task_scroll::-webkit-scrollbar-thumb {
    background: rgba(115,93,255,0.35); border-radius: 4px;
  }
  .gantt_hor_scroll::-webkit-scrollbar-thumb:hover,
  .gantt_ver_scroll::-webkit-scrollbar-thumb:hover,
  .gantt_task_scroll::-webkit-scrollbar-thumb:hover {
    background: rgba(115,93,255,0.65);
  }

  /* ── Today marker ── */
  .gantt_marker.today {
    background: rgba(115,93,255,0.12);
    border-left: 2px solid #735DFF;
  }
  .gantt_marker.today .gantt_marker_content {
    background: #735DFF; color: #fff;
    padding: 2px 6px; font-size: 11px;
    font-family: "Quicksand", sans-serif; font-weight: 600;
    border-radius: 0 3px 3px 0;
  }

  /* ── Weekend cells — diagonal lines pattern ── */
  .weekend {
    background-color: #f5f6fa !important;
    background-image: repeating-linear-gradient(
      45deg,
      transparent,
      transparent 4px,
      rgba(0, 0, 0, 0.06) 4px,
      rgba(0, 0, 0, 0.06) 5px
    ) !important;
  }

  /* ── Holiday cells (dias de calendário) — âmbar, distinto dos fins de semana ── */
  .holiday {
    background-color: rgba(255, 154, 19, 0.08) !important;
    background-image: repeating-linear-gradient(
      45deg,
      transparent, transparent 4px,
      rgba(255, 154, 19, 0.20) 4px,
      rgba(255, 154, 19, 0.20) 5px
    ) !important;
  }

  /* ── Borders & resizer ── */
  .gantt_layout_cell_border_right,
  .gantt_layout_cell_border_left { border-color: #f3f2f9; }
  .gantt_resizer_stick { background: #735DFF; opacity: 0.5; }
  .gantt_cell { border-right: 1px solid #f3f2f9; }

  /* ── Owner label avatars ── */
  .owner-label {
    width: 22px; height: 22px; font-size: 11px;
    display: inline-flex; justify-content: center; align-items: center;
    border: 1px solid rgba(115,93,255,0.3); border-radius: 50%;
    background: rgba(115,93,255,0.1); color: #735DFF;
    margin: 0 2px; font-weight: 600;
    font-family: "Quicksand", sans-serif;
  }

  /* ── Resource markers ── */
  .resource_marker { text-align: center; }
  .resource_marker div {
    width: 22px; height: 22px; border-radius: 15px; color: #fff;
    margin: 3px; display: inline-flex; justify-content: center; align-items: center;
    font-size: 12px; font-family: "Quicksand", sans-serif; font-weight: 600;
  }
  .resource_marker.workday_ok div  { background: #0CC763; }
  .resource_marker.workday_over div { background: #FF383C; }
`;
