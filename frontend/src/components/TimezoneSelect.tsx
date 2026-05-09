/**
 * Combobox de timezone (Choices.js + Intl.supportedValuesOf).
 *
 * Lista IANA completa do runtime (~600 zones), agrupada por região (parte
 * antes do '/' do identifier). Cada opção mostra IANA + offset actual UTC±H.
 * Usado pela UserSettingsPage e pelo modal de Project (aba Região e Idioma).
 *
 * Ver docs/claude/timezone.md.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  value: string | null;
  onChange: (tz: string | null) => void;
  /** Permite limpar (botão "Sem timezone") — usado quando null tem semântica. */
  allowNull?: boolean;
  nullLabel?: string;
  placeholder?: string;
  /** id no DOM. Default 'timezone-select'. */
  id?: string;
  disabled?: boolean;
}

interface TimezoneOption {
  value: string;     // IANA
  label: string;     // "Europe/Lisbon — UTC+0"
  region: string;    // "Europe"
  offsetMinutes: number;
}

function getCurrentOffsetMinutes(tz: string): number {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    });
    const parts = formatter.formatToParts(now);
    const tzn = parts.find((p) => p.type === 'timeZoneName')?.value || '';
    // tzn pode ser "GMT", "GMT+5", "GMT-3:30", "UTC+1"
    const m = tzn.match(/(?:GMT|UTC)?([+-]\d+)(?::(\d+))?/);
    if (!m) return 0;
    const sign = m[1].startsWith('-') ? -1 : 1;
    const h = parseInt(m[1], 10);
    const min = m[2] ? parseInt(m[2], 10) : 0;
    return h * 60 + sign * min;
  } catch {
    return 0;
  }
}

function formatOffset(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return m === 0 ? `UTC${sign}${h}` : `UTC${sign}${h}:${String(m).padStart(2, '0')}`;
}

function listSupportedTimezones(): string[] {
  // `supportedValuesOf` está em ES2022 — tipos TypeScript ainda não o cobrem
  // de forma uniforme. Fallback para uma lista mínima se indisponível.
  type IntlExt = typeof Intl & { supportedValuesOf?: (key: string) => string[] };
  const intl = Intl as IntlExt;
  if (typeof intl.supportedValuesOf === 'function') {
    try {
      return intl.supportedValuesOf('timeZone');
    } catch {
      /* fallthrough */
    }
  }
  // Fallback minimalista — agrupa apenas alguns identifiers comuns.
  return [
    'UTC',
    'Europe/Lisbon', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
    'America/New_York', 'America/Sao_Paulo', 'America/Los_Angeles',
    'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Kolkata',
    'Australia/Sydney', 'Pacific/Auckland',
  ];
}

export function TimezoneSelect({
  value,
  onChange,
  allowNull = false,
  nullLabel,
  placeholder,
  id = 'timezone-select',
  disabled = false,
}: Props) {
  const { t } = useTranslation('common');
  const selectRef = useRef<HTMLSelectElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const choicesInstanceRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  /** Lista ordenada por região > offset > IANA. Calculada uma vez. */
  const groups = useMemo<Map<string, TimezoneOption[]>>(() => {
    const all = listSupportedTimezones();
    const grouped = new Map<string, TimezoneOption[]>();
    for (const tz of all) {
      const offsetMin = getCurrentOffsetMinutes(tz);
      const region = tz.includes('/') ? tz.split('/')[0] : 'Other';
      const opt: TimezoneOption = {
        value: tz,
        label: `${tz} — ${formatOffset(offsetMin)}`,
        region,
        offsetMinutes: offsetMin,
      };
      const arr = grouped.get(region) ?? [];
      arr.push(opt);
      grouped.set(region, arr);
    }
    for (const arr of grouped.values()) {
      arr.sort((a, b) => a.offsetMinutes - b.offsetMinutes || a.value.localeCompare(b.value));
    }
    return grouped;
  }, []);

  // Init Choices.js
  useEffect(() => {
    if (!selectRef.current) return;
    if (typeof Choices === 'undefined') return;
    const c = new Choices(selectRef.current, {
      searchEnabled: true,
      shouldSort: false,
      placeholder: true,
      placeholderValue: placeholder ?? t('timezone.placeholder'),
      itemSelectText: '',
      searchPlaceholderValue: t('timezone.search'),
      allowHTML: false,
    });
    choicesInstanceRef.current = c;

    const handler = (e: Event) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detail = (e as CustomEvent<{ value: string }>).detail;
      const v = detail?.value ?? '';
      onChangeRef.current(v === '' ? null : v);
    };
    selectRef.current.addEventListener('change', handler);

    return () => {
      try { c.destroy(); } catch { /* noop */ }
      choicesInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sincronizar value externo com Choices instance
  useEffect(() => {
    const c = choicesInstanceRef.current;
    if (!c) return;
    if (value) {
      try { c.setChoiceByValue(value); } catch { /* noop */ }
    }
  }, [value]);

  const sortedRegions = useMemo(() => Array.from(groups.keys()).sort(), [groups]);

  return (
    <select id={id} ref={selectRef} className="form-select" defaultValue={value ?? ''} disabled={disabled}>
      <option value="">{placeholder ?? t('timezone.placeholder')}</option>
      {allowNull && (
        <option value="">{nullLabel ?? t('timezone.label_user')}</option>
      )}
      {sortedRegions.map((region) => (
        <optgroup key={region} label={region}>
          {groups.get(region)!.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
