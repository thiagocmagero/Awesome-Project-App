// Célula de data — recebe wire DHTMLX "DD-MM-YYYY HH:mm" ou ISO. Output
// monospace, formatado conforme dateFormat do projeto (default DD/MM/YYYY).
//
// Conversão simples local (sem importar helpers do legacy ainda — manter
// stand-alone). O ProjectDetailPage passa o `dateFormat` do projeto.

interface Props {
  value: string | null | undefined;
  dateFormat?: string | null;
}

function parseWire(s: string): Date | null {
  if (!s) return null;
  // "DD-MM-YYYY HH:mm"
  const m = s.match(/^(\d{2})-(\d{2})-(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (m) {
    const [, dd, mm, yyyy, hh = '0', mi = '0'] = m;
    return new Date(Date.UTC(+yyyy, +mm - 1, +dd, +hh, +mi));
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function format(d: Date, fmt: string): string {
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = String(d.getUTCFullYear());
  return fmt
    .replace('DD', dd)
    .replace('MM', mm)
    .replace('YYYY', yyyy);
}

export function DateCell({ value, dateFormat }: Props) {
  if (!value) return <span style={{ color: 'var(--mute, #9ca3af)' }}>—</span>;
  const d = parseWire(value);
  if (!d) return <span style={{ color: 'var(--mute, #9ca3af)' }}>—</span>;
  const fmt = dateFormat ?? 'DD/MM/YYYY';
  return (
    <span className="date-cell">{format(d, fmt)}</span>
  );
}
