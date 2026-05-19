// Two-phase close para drawers/modais com mount condicional. Resolve o problema
// de "saída abrupta": com `{open && <Drawer />}` o componente desmonta imediatamente
// e o keyframe de entrada nunca consegue tocar ao contrário.
//
// Mecânica: chama `requestClose()` em vez de `onClose()` directo. O hook marca
// `closing=true` (CSS aplica `.is-closing` com keyframes reversos), espera a
// `durationMs` configurada, depois chama o `onClose` real que desmonta o componente.
//
// CSS deve declarar `.is-closing` com `animation: ... forwards` para preservar
// o estado final. Duração CSS deve bater com `durationMs`.

import { useCallback, useState } from 'react';

export interface ClosingState {
  /** `true` durante a fase de saída — adicionar `is-closing` aos elementos animados. */
  closing: boolean;
  /** Substitui `onClose` em todos os triggers (X, backdrop, ESC, etc.). */
  requestClose: () => void;
}

/**
 * @param onClose Callback que desmonta o componente (tipicamente `setOpen(false)`).
 * @param durationMs Duração em ms da animação CSS — deve bater com `animation-duration`.
 */
export function useClosingState(onClose: () => void, durationMs = 200): ClosingState {
  const [closing, setClosing] = useState(false);
  const requestClose = useCallback(() => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(() => {
      setClosing(false);
      onClose();
    }, durationMs);
  }, [closing, onClose, durationMs]);
  return { closing, requestClose };
}
