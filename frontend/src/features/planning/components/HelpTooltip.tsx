import { useEffect, useRef } from 'react';

interface BootstrapTooltipInstance {
  dispose(): void;
}

interface BootstrapStaticWithTooltip {
  Tooltip: {
    getOrCreateInstance(el: HTMLElement, opts?: Record<string, unknown>): BootstrapTooltipInstance;
  };
}

interface Props {
  text: string;
  /** Tipo de cor do tooltip (Zynix Colored Tooltips). Default 'primary'. */
  variant?: 'primary' | 'secondary' | 'warning' | 'info' | 'success' | 'danger' | 'light' | 'dark';
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * Pequeno ícone "?" que mostra um tooltip Bootstrap colorido (Zynix Colored
 * Tooltips). O `data-bs-custom-class="tooltip-primary"` aplica a paleta da
 * cor escolhida — ver `frontend/public/assets/css/styles.css` linhas
 * 10306+ para as variantes disponíveis.
 *
 * Bootstrap não auto-inicializa tooltips; criamos a instância via
 * `window.bootstrap.Tooltip.getOrCreateInstance(...)` no mount e descartamos
 * no unmount.
 */
export function HelpTooltip({ text, variant = 'primary', placement = 'top' }: Props) {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const Tooltip = (window.bootstrap as unknown as BootstrapStaticWithTooltip | undefined)?.Tooltip;
    if (!Tooltip) return;
    const instance = Tooltip.getOrCreateInstance(el);
    return () => {
      try { instance.dispose(); } catch { /* noop */ }
    };
  }, [text]);

  return (
    <button
      ref={ref}
      type="button"
      className="task-hour-help"
      tabIndex={0}
      aria-label={text}
      data-bs-toggle="tooltip"
      data-bs-custom-class={`tooltip-${variant}`}
      data-bs-placement={placement}
      title={text}
    >
      <i className="ri-question-line" aria-hidden="true" />
    </button>
  );
}
