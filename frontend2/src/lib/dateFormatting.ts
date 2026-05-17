/**
 * Helpers de formatação de datas para frontend2.
 *
 * Versão simplificada — o frontend antigo tem um sistema completo com
 * `Project.dateFormat` por projecto + Context. Aqui apenas precisamos de
 * formatar datas no formato `DD/MM/YYYY` (default da app) para listings que
 * ainda não estão dentro do contexto dum projecto. Será extendido quando
 * uma página de projecto for portada.
 */

const DEFAULT_FORMAT = 'DD/MM/YYYY';

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function applyTokens(d: Date, fmt: string): string {
  const dd = pad2(d.getDate());
  const mm = pad2(d.getMonth() + 1);
  const yyyy = String(d.getFullYear());
  return fmt
    .replace(/YYYY/g, yyyy)
    .replace(/MM/g, mm)
    .replace(/DD/g, dd);
}

/** Formata uma data (ISO string, Date ou null) usando o formato `DD/MM/YYYY`. */
export function formatDate(input: string | Date | null | undefined, fmt: string = DEFAULT_FORMAT): string {
  if (input == null) return '—';
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return '—';
  return applyTokens(d, fmt);
}
