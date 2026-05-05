import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ITimesheetEntry, TimesheetDayStatus, TimesheetWeekStatus } from '../types';
import { formatHours } from '../dateUtils';

interface Props {
  entry:        ITimesheetEntry | null;
  dayStatus:    TimesheetDayStatus;
  /**
   * Estado da SEMANA — usado para bloquear DRAFT cells quando a semana está
   * em revisão (SUBMITTED/PARTIAL) ou aprovada. Caso contrário o utilizador
   * podia adicionar entries a dias vazios depois de já ter submetido a
   * semana, o que faria a submissão deixar de bater certo com o que ficou
   * arquivado. Para mexer nesses dias o user tem de "Editar semana"
   * (unsubmit) primeiro.
   */
  weekStatus:   TimesheetWeekStatus;
  canEdit:      boolean;
  /** Cria entry nova quando NÃO existe ainda — POST (REQ-G20: agrega no backend só se nova). */
  onUpsert:     (hours: number) => void;
  /** Substitui o valor de uma entry EXISTENTE — PATCH. Sem agregação. */
  onUpdate:     (entryPublicId: string, hours: number) => void;
  onDelete:     () => void;
}

/**
 * Célula da grelha — renderiza:
 *  - Input editável quando dayStatus ∈ {DRAFT, REJECTED}, canEdit, e a SEMANA
 *    não está em revisão. REJECTED é sempre editável (resubmissão pós-rejeição).
 *  - Texto coloured + estado quando day=SUBMITTED/APPROVED.
 *  - Dash placeholder quando vazio.
 *
 * Regra de editabilidade (resumo):
 *  | dayStatus | weekStatus DRAFT/REJECTED | weekStatus SUBMITTED/PARTIAL/APPROVED |
 *  |-----------|:--:|:--:|
 *  | DRAFT     | ✓ editável | ✗ bloqueado |
 *  | REJECTED  | ✓ editável | ✓ editável (resubmissão) |
 *  | SUBMITTED | ✗ bloqueado | ✗ bloqueado |
 *  | APPROVED  | ✗ bloqueado | ✗ bloqueado |
 */
export function TimesheetCell({ entry, dayStatus, weekStatus, canEdit, onUpsert, onUpdate, onDelete }: Props) {
  const { t } = useTranslation('timesheet');

  // Read-only states: SUBMITTED, APPROVED → mostrar valor + label
  if (dayStatus === 'SUBMITTED' || dayStatus === 'APPROVED') {
    if (!entry) return <span className="text-muted">–</span>;
    return (
      <>
        <span className={`ts-cell-h ts-cell-h--${dayStatus.toLowerCase()}`}>{formatHours(entry.hours)}</span>
        <span className={`ts-cell-state ts-cell-state--${dayStatus.toLowerCase()}`}>
          {t(`cell.state.${dayStatus.toLowerCase()}` as 'cell.state.submitted')}
        </span>
      </>
    );
  }

  // dayStatus aqui é DRAFT ou REJECTED. Cálculo da editabilidade efectiva:
  //  - canEdit=false → vista do gestor / vista de outro user → read-only sempre.
  //  - REJECTED → editável (resubmissão pós-rejeição), independente do weekStatus.
  //  - DRAFT → editável só se a semana NÃO está em revisão.
  const weekIsLocked = weekStatus === 'SUBMITTED' || weekStatus === 'PARTIAL' || weekStatus === 'APPROVED';
  const cellEditable = canEdit && (dayStatus === 'REJECTED' || !weekIsLocked);

  if (!cellEditable) {
    if (!entry) return <span className="text-muted">–</span>;
    return (
      <>
        <span className="ts-cell-h">{formatHours(entry.hours)}</span>
        {dayStatus === 'REJECTED' && (
          <span className="ts-cell-state ts-cell-state--rejected">{t('cell.state.rejected')}</span>
        )}
      </>
    );
  }

  return (
    <EditableCell
      initial={entry ? entry.hours : null}
      isRejected={dayStatus === 'REJECTED'}
      onCommit={(value) => {
        if (value === null) onDelete();
        else if (entry) onUpdate(entry.publicId, value); // EXISTENTE → PATCH (substitui)
        else            onUpsert(value);                  // NOVA      → POST  (cria)
      }}
    />
  );
}

interface EditableProps {
  initial:    number | null;
  isRejected: boolean;
  onCommit:   (value: number | null) => void;
}

/**
 * Input de horas com step 0.5 nas setas e digitação manual em 0.1.
 *
 * **Não usa `type="number"`** — esse tipo tem handler nativo de ↑/↓ que com
 * `step="any"` salta de `1` em `1` (ignorando o nosso `preventDefault` em
 * alguns browsers, ex.: Chromium recente). Resultado visível: empty → ↑ vai
 * para `0.1` (clamp ao `min`) e ↑ outra vez → `1.1` (+1 nativo). Mau.
 *
 * Solução: `type="text"` + `inputMode="decimal"` (mantém teclado numérico em
 * mobile) e regex no onChange a sanitizar tudo o que não seja dígito ou `.,`.
 * Dessa forma o **único** caminho para alterar o valor com setas é o nosso
 * `bumpHalf`, que faz snap a múltiplos de 0.5.
 *
 * Comportamento das setas (consistente — sempre múltiplos de 0.5):
 *  - Vazio + ↑ → `0.5`
 *  - Vazio + ↓ → ignora (nada a decrementar)
 *  - `1.3` + ↑ → `1.5` (snap-up)
 *  - `1.3` + ↓ → `1.0` (snap-down)
 *  - `0.5` + ↓ → vazio (apaga — consistente com mín 0.1)
 *  - `0.1` + ↑ → `0.5` · `0.1` + ↓ → vazio
 */
function EditableCell({ initial, isRejected, onCommit }: EditableProps) {
  const [value, setValue] = useState(initial !== null ? String(initial) : '');
  const initialRef = useRef(initial);
  useEffect(() => { setValue(initial !== null ? String(initial) : ''); initialRef.current = initial; }, [initial]);

  function commit() {
    const trimmed = value.trim();
    if (trimmed === '') {
      // Vazio → apaga (se existia entry).
      if (initialRef.current !== null) onCommit(null);
      return;
    }
    const v = parseFloat(trimmed.replace(',', '.'));
    if (!Number.isFinite(v)) {
      setValue(initialRef.current !== null ? String(initialRef.current) : '');
      return;
    }
    if (v < 0.1) {
      // Trata < 0.1 como apagar (REQ-D01/D02).
      if (initialRef.current !== null) onCommit(null);
      else setValue('');
      return;
    }
    if (v === initialRef.current) return;          // sem mudança
    onCommit(Math.round(v * 100) / 100);            // 2 casas decimais máx
  }

  /**
   * Aplica ±0.5 ao valor com snap a múltiplos de 0.5. **Não chama
   * preventDefault** — o caller é responsável (keydown ou mousedown da seta).
   */
  function bumpHalf(direction: 1 | -1) {
    const trimmed = value.trim();
    const current = trimmed === '' ? null : parseFloat(trimmed.replace(',', '.'));
    if (current !== null && !Number.isFinite(current)) return;

    let next: number;
    if (current === null) {
      // ↓ desde vazio: ignora (nada a apagar). ↑ desde vazio: começa em 0.5
      // — primeiro múltiplo válido, mantém consistência com snap-to-0.5.
      if (direction < 0) return;
      next = 0.5;
    } else if (direction > 0) {
      // próximo múltiplo de 0.5 estritamente superior
      const m = Math.floor(current * 2 + 1) / 2;
      next = m > current ? m : current + 0.5;
    } else {
      // múltiplo de 0.5 estritamente inferior
      const m = Math.ceil(current * 2 - 1) / 2;
      next = m < current ? m : current - 0.5;
    }
    if (next < 0.5) {
      // ↓ abaixo de 0.5 → apaga (setas trabalham em passos de 0.5; abaixo
      // disso não faz sentido permanecer com valor — mín da app é 0.1 mas
      // só via digitação manual).
      setValue('');
      return;
    }
    if (next > 999.99) next = 999.99;
    setValue(String(Math.round(next * 100) / 100));
  }

  /** Sanitiza onChange — só dígitos, ponto e vírgula. */
  function onChangeText(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    if (v === '' || /^[0-9]*[.,]?[0-9]*$/.test(v)) setValue(v);
  }

  return (
    <span className="ts-cell-input-wrap">
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder="–"
        className={`ts-cell-input${isRejected ? ' is-rejected' : ''}`}
        value={value}
        onChange={onChangeText}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp')   { e.preventDefault(); bumpHalf(1); return; }
          if (e.key === 'ArrowDown') { e.preventDefault(); bumpHalf(-1); return; }
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') {
            setValue(initialRef.current !== null ? String(initialRef.current) : '');
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
      {/* Spinner custom — substitui o nativo (que estava em type="number" e
         saltava ±1 ignorando preventDefault). Usar onMouseDown+preventDefault
         para evitar perder o foco do input antes do bumpHalf actualizar o
         valor (caso contrário onBlur dispararia commit a meio do clique). */}
      <span className="ts-cell-input-spin" aria-hidden="true">
        <button
          type="button"
          tabIndex={-1}
          className="up"
          onMouseDown={(e) => { e.preventDefault(); bumpHalf(1); }}
        >
          <i className="ri-arrow-up-s-fill" />
        </button>
        <button
          type="button"
          tabIndex={-1}
          className="down"
          onMouseDown={(e) => { e.preventDefault(); bumpHalf(-1); }}
        >
          <i className="ri-arrow-down-s-fill" />
        </button>
      </span>
    </span>
  );
}
