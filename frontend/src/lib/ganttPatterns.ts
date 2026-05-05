import type { CSSProperties } from 'react';
import type { CellPattern, GanttConfigColors } from '../hooks/useGanttConfig';

// ─── Pattern options (shared between PlanningPage and GanttSettingsPage) ──────

export const CELL_PATTERN_OPTIONS: { value: CellPattern; label: string }[] = [
  { value: 'none',             label: 'Solid' },
  { value: 'diagonal',         label: 'Diagonal Stripes' },
  { value: 'diagonal-reverse', label: 'Reverse Diagonal' },
  { value: 'crosshatch',       label: 'Crosshatch' },
  { value: 'horizontal',       label: 'Horizontal Stripes' },
  { value: 'vertical',         label: 'Vertical Stripes' },
  { value: 'dots',             label: 'Dots' },
];

// ─── Cell style field definitions ────────────────────────────────────────────

export interface CellStyleField {
  colorKey:     keyof GanttConfigColors;
  patternKey:   keyof GanttConfigColors;
  label:        string;
  hint:         string;
  defaultColor: string;
}

export const CELL_STYLE_FIELDS: CellStyleField[] = [
  {
    colorKey:     'weekendColor',
    patternKey:   'weekendPattern',
    label:        'Fim de semana',
    hint:         'Sábado e domingo',
    defaultColor: '#9aa5b4',
  },
  {
    colorKey:     'holidayColor',
    patternKey:   'holidayPattern',
    label:        'Feriado',
    hint:         'Dias de feriado',
    defaultColor: '#ff9a13',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Converts a 6-digit hex colour string to [r, g, b] tuple. */
export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/**
 * Generates a CSS rule for a cell selector with the given colour and pattern.
 * All properties use !important to override the hardcoded defaults.
 */
export function buildCellCSS(selector: string, hex: string, pattern: CellPattern): string {
  const [r, g, b] = hexToRgb(hex);
  const c = (a: number) => `rgba(${r},${g},${b},${a})`;
  const stripe = (angle: number) =>
    `repeating-linear-gradient(${angle}deg,transparent,transparent 4px,${c(0.22)} 4px,${c(0.22)} 5px)`;

  const bg = `background-color: ${c(0.10)} !important;`;
  let img  = 'background-image: none !important;';
  let size = '';

  if      (pattern === 'diagonal')         img = `background-image: ${stripe(45)} !important;`;
  else if (pattern === 'diagonal-reverse') img = `background-image: ${stripe(-45)} !important;`;
  else if (pattern === 'crosshatch')       img = `background-image: ${stripe(45)}, ${stripe(-45)} !important;`;
  else if (pattern === 'horizontal')       img = `background-image: ${stripe(0)} !important;`;
  else if (pattern === 'vertical')         img = `background-image: ${stripe(90)} !important;`;
  else if (pattern === 'dots') {
    img  = `background-image: radial-gradient(circle, ${c(0.30)} 1.5px, transparent 1.5px) !important;`;
    size = `background-size: 7px 7px !important;`;
  }

  return `${selector} { ${bg} ${img} ${size} }`;
}

/**
 * Returns React inline styles that show a live preview of the cell pattern.
 * Used next to the pattern <select> to give instant visual feedback.
 */
export function getCellPatternPreviewStyle(hex: string, pattern: CellPattern): CSSProperties {
  const [r, g, b] = hexToRgb(hex);
  const c = (a: number) => `rgba(${r},${g},${b},${a})`;
  const stripe = (angle: number) =>
    `repeating-linear-gradient(${angle}deg,transparent,transparent 4px,${c(0.30)} 4px,${c(0.30)} 5px)`;

  const base: CSSProperties = {
    backgroundColor: c(0.12),
    width:           44,
    height:          28,
    borderRadius:    4,
    border:          '1px solid rgba(0,0,0,0.12)',
    flexShrink:      0,
  };

  if (pattern === 'diagonal')         return { ...base, backgroundImage: stripe(45) };
  if (pattern === 'diagonal-reverse') return { ...base, backgroundImage: stripe(-45) };
  if (pattern === 'crosshatch')       return { ...base, backgroundImage: `${stripe(45)}, ${stripe(-45)}` };
  if (pattern === 'horizontal')       return { ...base, backgroundImage: stripe(0) };
  if (pattern === 'vertical')         return { ...base, backgroundImage: stripe(90) };
  if (pattern === 'dots')             return {
    ...base,
    backgroundImage: `radial-gradient(circle, ${c(0.30)} 1.5px, transparent 1.5px)`,
    backgroundSize:  '7px 7px',
  };
  return base; // 'none' — solid colour only
}
