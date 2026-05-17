/**
 * Design tokens — espelho JS dos CSS custom properties em `styles/tokens.css`.
 * Cada chave devolve `var(--xxx)` para ser usado em inline-styles JSX.
 * Porto 1:1 de NewTemplate/app-dark.jsx:5-30.
 *
 * Quando portarmos views componentizadas para CSS-modules, este objecto será
 * cada vez menos necessário — preferir `var(--brand)` directo em CSS files.
 * Mantido aqui durante Fase 0 porque os views fazem `${T.brand}` por todo
 * o JSX inline-style.
 */
export const T = {
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
} as const;

export type StatusKey = 'todo' | 'doing' | 'review' | 'done' | 'blocked';
export interface StatusMetaEntry { label: string; color: string; ink: string; }

export const statusMeta: Record<StatusKey, StatusMetaEntry> = {
  todo:    { label: 'A fazer',    color: T.todo,    ink: T.todoInk },
  doing:   { label: 'Em curso',   color: T.doing,   ink: T.doingInk },
  review:  { label: 'Em revisão', color: T.review,  ink: T.reviewInk },
  done:    { label: 'Concluído',  color: T.done,    ink: T.doneInk },
  blocked: { label: 'Bloqueada',  color: T.blocked, ink: T.blockedInk },
};

export const priColor: Record<string, string> = { Alta: T.high, Média: T.med, Baixa: T.low };
