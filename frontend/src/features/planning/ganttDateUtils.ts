// ─── Helpers de data para o Gantt ─────────────────────────────────────────────

/** "DD-MM-YYYY HH:mm" → Date (para FlatPickr defaultDate) */
export function ganttToDate(d: string): Date | null {
  if (!d) return null;
  const [datePart, timePart = '00:00'] = d.split(' ');
  const [dd, mm, yyyy] = datePart.split('-');
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd), ...timePart.split(':').map(Number) as [number, number]);
}

/** Date → "DD-MM-YYYY HH:mm" (formato FlatPickr / DHTMLX) */
export function formatGanttDate(d: Date): string {
  const dd   = String(d.getDate()).padStart(2, '0');
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh   = String(d.getHours()).padStart(2, '0');
  const min  = String(d.getMinutes()).padStart(2, '0');
  return `${dd}-${mm}-${yyyy} ${hh}:${min}`;
}

/** Date local → "DD-MM-YYYY HH:mm" (formato interno DHTMLX) */
export function dateToGanttStr(d: Date): string {
  const dd   = String(d.getDate()).padStart(2, '0');
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh   = String(d.getHours()).padStart(2, '0');
  const min  = String(d.getMinutes()).padStart(2, '0');
  return `${dd}-${mm}-${yyyy} ${hh}:${min}`;
}

/** Formata data para exibição na UI ("DD/MM/YYYY") */
export function displayDate(d: string | Date | undefined | null): string {
  if (!d) return '—';
  let date: Date;
  if (typeof d === 'string') {
    const parsed = ganttToDate(d);
    if (!parsed) return '—';
    date = parsed;
  } else {
    date = d;
  }
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
