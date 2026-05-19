// Port adaptado de `NewTemplate/views-task-modal.jsx:579-653` (componente `TMSelect`).
//
// Adaptações face ao canónico (DIFF cat. E):
//   1. Converte JSX→TSX com generics (`<T>` para o valor seleccionado).
//   2. Substitui `useStateTM`/`useRefTM`/`useEffectTM` (alias React do mockup)
//      pelos imports padrão React.
//   3. `ReactDOM.createPortal` (template usa global `ReactDOM`) → import directo.
//
// Comportamento idêntico: dropdown portal-to-body com posição dinâmica
// (sobe quando não há espaço em baixo), click-outside/scroll/resize fecham.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface TMSelectOption<T> {
  key: T;
  label: string;
  placeholder?: boolean;
}

type OptionInput<T> = T extends string ? (T | TMSelectOption<T>) : TMSelectOption<T>;

interface TMSelectProps<T> {
  value: T;
  onChange: (v: T) => void;
  options: Array<OptionInput<T>>;
  renderOption?: (o: TMSelectOption<T>, isSel: boolean) => ReactNode;
  renderTrigger?: (v: T) => ReactNode;
  placeholder?: string;
  panelMaxWidth?: number;
}

function normalize<T>(opt: OptionInput<T>): TMSelectOption<T> {
  if (typeof opt === 'object' && opt !== null && 'key' in opt) {
    return opt as TMSelectOption<T>;
  }
  // Strings: key === label.
  return { key: opt as unknown as T, label: String(opt) };
}

function CheckIcon({ s = 12 }: { s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

interface PanelPos {
  top: number | null;
  bottom: number | null;
  left: number;
  width: number;
}

export function TMSelect<T>({
  value,
  onChange,
  options,
  renderOption,
  renderTrigger,
  placeholder,
  panelMaxWidth,
}: TMSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<PanelPos | null>(null);

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const estPanelH = Math.min(280, (options.length * 36) + 16);
    const spaceBelow = window.innerHeight - r.bottom - 16;
    const openUp = spaceBelow < estPanelH && r.top > spaceBelow;
    setPos({
      top: openUp ? null : r.bottom + 4,
      bottom: openUp ? window.innerHeight - r.top + 4 : null,
      left: r.left,
      width: r.width,
    });
    function onDocDown(e: MouseEvent) {
      if (triggerRef.current && triggerRef.current.contains(e.target as Node)) return;
      if (panelRef.current && panelRef.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onScroll(e: Event) {
      if (panelRef.current && panelRef.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onResize() { setOpen(false); }
    document.addEventListener('mousedown', onDocDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, options.length]);

  const panel = open && pos && createPortal(
    <div
      ref={panelRef}
      className="tm-sel-panel tm-sel-portal"
      style={{
        position: 'fixed',
        top: pos.top != null ? pos.top : 'auto',
        bottom: pos.bottom != null ? pos.bottom : 'auto',
        left: pos.left,
        minWidth: pos.width,
        maxWidth: panelMaxWidth || Math.max(pos.width, 280),
        zIndex: 300,
      }}
    >
      {options.map((opt, i) => {
        const o = normalize(opt);
        const isSel = value === o.key;
        return (
          <div
            key={String(o.key) || i}
            className={'tm-sel-opt' + (isSel ? ' sel' : '') + (o.placeholder ? ' placeholder' : '')}
            onClick={() => { onChange(o.key); setOpen(false); }}
          >
            {renderOption ? renderOption(o, isSel) : <span>{o.label}</span>}
            {isSel && <span style={{ marginLeft: 'auto', color: 'var(--brand)' }}><CheckIcon /></span>}
          </div>
        );
      })}
    </div>,
    document.body,
  );

  // Lookup do label correspondente ao value para o trigger default.
  const currentLabel = (() => {
    for (const opt of options) {
      const o = normalize(opt);
      if (o.key === value) return o.label;
    }
    return '';
  })();

  return (
    <div className="tm-sel">
      <button
        ref={triggerRef}
        type="button"
        className={'tm-sel-trigger' + (open ? ' open' : '')}
        onClick={() => setOpen((o) => !o)}
      >
        {renderTrigger
          ? renderTrigger(value)
          : currentLabel
            ? <span>{currentLabel}</span>
            : <span className="ph">{placeholder || 'Select…'}</span>}
      </button>
      {panel}
    </div>
  );
}
