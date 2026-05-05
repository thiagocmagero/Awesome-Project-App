/**
 * Devolve a data que está `durationBusinessDays` dias úteis depois de `start`,
 * contando o próprio `start` como dia 1 (convenção inclusive; espelha
 * `gantt.config.work_time = true` do DHTMLX).
 *
 * Dia útil = NÃO Sábado/Domingo E NÃO presente em `nonWorkingSet`.
 * `nonWorkingSet` contém datas UTC em formato 'YYYY-MM-DD' — mesmo formato
 * devolvido por `HolidaysService.getNonWorkingDaysForProject`.
 *
 * Edge cases:
 * - `durationBusinessDays <= 0` → devolve clone de `start` (milestone-safe).
 * - `start` cai num dia não-útil → cursor avança para o próximo dia útil
 *   antes de iniciar a contagem (defensivo: alinha com snap do DHTMLX UI).
 */
export function addBusinessDaysInclusive(
  start: Date,
  durationBusinessDays: number,
  nonWorkingSet: Set<string>,
): Date {
  if (durationBusinessDays <= 0) return new Date(start.getTime());

  let cursor = new Date(start.getTime());
  while (isNonWorkingDay(cursor, nonWorkingSet)) {
    cursor = new Date(cursor.getTime() + 86400000);
  }

  let counted = 1;
  while (counted < durationBusinessDays) {
    cursor = new Date(cursor.getTime() + 86400000);
    if (!isNonWorkingDay(cursor, nonWorkingSet)) counted++;
  }
  return cursor;
}

function isNonWorkingDay(d: Date, nonWorkingSet: Set<string>): boolean {
  const dow = d.getUTCDay();
  if (dow === 0 || dow === 6) return true;
  return nonWorkingSet.has(formatYYYYMMDD(d));
}

function formatYYYYMMDD(d: Date): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
