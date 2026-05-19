// Wrapper React reutilizável sobre o FlatPickr.
//
// Uso típico:
//   <DatePicker
//     value={task.start_date}              // string em `format`
//     onChange={(s) => setStart(s)}        // recebe string em `format` ou ''
//     format="d-m-Y H:i"                   // sintaxe FlatPickr
//     enableTime
//     placeholder="DD-MM-YYYY HH:mm"
//   />
//
// Notas:
// - `value` e `onChange` trabalham com STRING formatada — o caller decide o
//   wire format. Evita conversões implícitas Date↔string nos call-sites.
// - `enableTime` muda em runtime → o wrapper destrói + recria a instância
//   (FlatPickr não suporta `set('enableTime', ...)` fiável).
// - Quando `enableTime=false` e o `value` tem hora (ex.: '14-04-2026 10:30'),
//   o wrapper trunca pela `' '` antes de passar a FlatPickr — caso do toggle
//   "Hora exata" no TaskModal.
// - Locale resolvido em runtime via `i18next.language` (Portuguese para
//   pt-PT/pt-BR/pt, Spanish para es, english default).

import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import flatpickr from 'flatpickr';
import type { BaseOptions } from 'flatpickr/dist/types/options';
import type { Instance as FpInstance } from 'flatpickr/dist/types/instance';
import type { CustomLocale } from 'flatpickr/dist/types/locale';
import { Portuguese } from 'flatpickr/dist/l10n/pt';
import { Spanish } from 'flatpickr/dist/l10n/es';
import { english } from 'flatpickr/dist/l10n/default';

export interface DatePickerProps {
  /** Valor formatado conforme `format` (ou '' para vazio). */
  value: string;
  /** Recebe a nova string formatada (ou '' se o utilizador limpar). */
  onChange: (formatted: string) => void;
  /** Sintaxe FlatPickr (ex.: 'd-m-Y H:i', 'd/m/Y', 'Y-m-d'). */
  format: string;
  /** Habilita selecção de hora. Trocar este valor faz re-init da instância. */
  enableTime?: boolean;
  /** Placeholder do input. */
  placeholder?: string;
  /** Disabled state — repassa para o `<input>`. */
  disabled?: boolean;
  /** Classes extra (passa para o `<input>`). */
  className?: string;
  /** id do `<input>`, útil para `<label htmlFor>`. */
  id?: string;
  /** aria-label do `<input>`. */
  'aria-label'?: string;
}

function resolveLocale(lang: string | undefined): CustomLocale | undefined {
  if (!lang) return undefined;
  const lower = lang.toLowerCase();
  if (lower.startsWith('pt')) return Portuguese;
  if (lower.startsWith('es')) return Spanish;
  if (lower.startsWith('en')) return english;
  return undefined;
}

/** Trunca a parte de hora dum valor formatado quando o picker está em modo
 *  data pura. Evita erro de parse do FlatPickr quando o utilizador alterna
 *  o toggle "Hora exata" para OFF com um valor existente como '14-04-2026 10:30'. */
function valueForCurrentMode(value: string, enableTime: boolean | undefined): string {
  if (!value) return '';
  if (enableTime) return value;
  return value.split(' ')[0] ?? '';
}

export function DatePicker({
  value,
  onChange,
  format,
  enableTime,
  placeholder,
  disabled,
  className,
  id,
  'aria-label': ariaLabel,
}: DatePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fpRef = useRef<FpInstance | null>(null);
  const { i18n } = useTranslation();
  const locale = resolveLocale(i18n.language);

  // Refs para o callback (onChange muda referência a cada render).
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  // (Re)cria a instância sempre que muda algo estrutural: format, enableTime,
  // locale. FlatPickr não suporta troca destes em runtime de forma fiável.
  useEffect(() => {
    if (!inputRef.current) return;
    const initialValue = valueForCurrentMode(value, enableTime);
    const opts: Partial<BaseOptions> = {
      dateFormat: format,
      enableTime: !!enableTime,
      time_24hr: true,
      allowInput: true,
      defaultDate: initialValue || undefined,
      locale,
      onChange: (_dates, dateStr) => {
        // `dateStr` vem já formatado conforme `dateFormat`. Vazio = limpou.
        onChangeRef.current(dateStr ?? '');
      },
    };
    const fp = flatpickr(inputRef.current, opts) as FpInstance;
    fpRef.current = fp;
    return () => {
      try { fp.destroy(); } catch { /* noop */ }
      fpRef.current = null;
    };
    // value não está nas deps — sync externo via outro effect abaixo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format, enableTime, locale]);

  // Sync externo: quando o caller muda `value` (ex.: reset do form), reflectir
  // no picker sem disparar `onChange`.
  useEffect(() => {
    const fp = fpRef.current;
    if (!fp) return;
    const target = valueForCurrentMode(value, enableTime);
    // `setDate(undefined, false)` limpa; segundo arg `false` = não dispara onChange.
    fp.setDate(target || (null as unknown as Date), false);
  }, [value, enableTime]);

  return (
    <input
      ref={inputRef}
      type="text"
      id={id}
      aria-label={ariaLabel}
      className={className}
      placeholder={placeholder}
      disabled={disabled}
      // Sem value/onChange controlados — FlatPickr gere o input internamente.
      // Sync externo é feito via `fp.setDate` no effect acima.
      defaultValue={valueForCurrentMode(value, enableTime)}
      autoComplete="off"
    />
  );
}
