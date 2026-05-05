// Hook utilitário para offcanvas Bootstrap controlados por estado React.
// Resolve o problema de animação cortada quando se usa apenas a className `show`
// + `style.visibility` — a `transition: transform .3s` do Bootstrap fica
// mascarada pelo toggle imediato de visibility.
//
// Uso:
//   const ref = useRef<HTMLDivElement>(null);
//   useBootstrapOffcanvas(ref, open, onClose);
//   ...
//   <div ref={ref} className="offcanvas offcanvas-end">
//     ...
//   </div>
//
// O hook chama `bootstrap.Offcanvas.getOrCreateInstance(el).show()/.hide()`
// quando `open` muda, e propaga o evento nativo `hidden.bs.offcanvas` (ESC,
// backdrop, swipe) para o `onClose` do React de forma que o estado fique
// consistente.
import { useEffect, useRef } from 'react';

interface BootstrapOffcanvasInstance {
  show(): void;
  hide(): void;
  dispose(): void;
}

interface BootstrapStatic {
  Offcanvas: {
    getOrCreateInstance(el: HTMLElement): BootstrapOffcanvasInstance;
  };
}

declare global {
  interface Window {
    bootstrap?: BootstrapStatic;
  }
}

export function useBootstrapOffcanvas(
  ref: React.RefObject<HTMLDivElement>,
  open: boolean,
  onClose: () => void,
): void {
  const bsRef = useRef<BootstrapOffcanvasInstance | null>(null);
  const listenerAttachedRef = useRef(false);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  // Lazy init + sync open state. Tudo num só effect para lidar com o caso de
  // o script Bootstrap ser carregado de forma assíncrona (AppLayout faz
  // `loadScript` após mount): se `window.bootstrap` ainda não existe quando o
  // componente monta, este effect re-tenta na próxima mudança de `open`.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (!bsRef.current) {
      const Offcanvas = window.bootstrap?.Offcanvas;
      if (!Offcanvas) return; // Bootstrap ainda não carregado — re-tenta no próximo render
      bsRef.current = Offcanvas.getOrCreateInstance(el);
    }

    if (!listenerAttachedRef.current) {
      const handleHidden = () => onCloseRef.current();
      el.addEventListener('hidden.bs.offcanvas', handleHidden);
      listenerAttachedRef.current = true;
    }

    if (open) bsRef.current.show();
    else bsRef.current.hide();
  }, [open, ref]);
}
