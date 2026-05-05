// Stack `{forward, inverse}` para Undo/Redo do Board com sync ao backend.
//
// Padrão (decisão do utilizador, plano §10.7):
//   • Cada handler `api.on(...)` chama o backend (forward) e regista um
//     entry com `forward` + `inverse` (closures que executam a operação ou
//     a sua inversa contra o widget + backend).
//   • Undo: pop do stack → executa `inverse` → push em redo stack.
//   • Redo: pop do redo stack → executa `forward` → push de volta no undo.
//   • Erro durante undo/redo ⇒ toast + abort (não retentar; estado cliente
//     fica intacto, stack mantém-se).
//
// O widget interno do AwesomeKanban TEM `api.undo()`/`api.redo()` próprios mas
// estes são snapshot-based e não sincronizam com o backend. Não os usamos —
// o Board é montado com `history={false}`.

import { useCallback, useRef, useState } from 'react';

export interface BoardHistoryEntry {
  /** Etiqueta i18n curta para tooltips/toasts (ex: 'card:move'). */
  label: string;
  /** Re-aplica a mutação (forward) — usado em Redo. */
  forward: () => Promise<void>;
  /** Aplica a mutação inversa — usado em Undo. */
  inverse: () => Promise<void>;
}

const HISTORY_LIMIT = 50;

export function useBoardHistory(): {
  canUndo: boolean;
  canRedo: boolean;
  push: (entry: BoardHistoryEntry) => void;
  undo: () => Promise<BoardHistoryEntry | null>;
  redo: () => Promise<BoardHistoryEntry | null>;
  clear: () => void;
} {
  const undoStack = useRef<BoardHistoryEntry[]>([]);
  const redoStack = useRef<BoardHistoryEntry[]>([]);
  // Render trigger (refs sozinhos não disparam re-render dos botões).
  const [, setVersion] = useState(0);
  const bump = () => setVersion((v) => v + 1);

  const push = useCallback((entry: BoardHistoryEntry) => {
    undoStack.current.push(entry);
    if (undoStack.current.length > HISTORY_LIMIT) {
      undoStack.current.shift();
    }
    redoStack.current.length = 0; // qualquer nova acção limpa o redo
    bump();
  }, []);

  const undo = useCallback(async (): Promise<BoardHistoryEntry | null> => {
    const entry = undoStack.current.pop();
    if (!entry) {
      bump();
      return null;
    }
    try {
      await entry.inverse();
      redoStack.current.push(entry);
      return entry;
    } catch (err) {
      // Restaura para o stack se falhou — evitar perder a entry.
      undoStack.current.push(entry);
      throw err;
    } finally {
      bump();
    }
  }, []);

  const redo = useCallback(async (): Promise<BoardHistoryEntry | null> => {
    const entry = redoStack.current.pop();
    if (!entry) {
      bump();
      return null;
    }
    try {
      await entry.forward();
      undoStack.current.push(entry);
      return entry;
    } catch (err) {
      redoStack.current.push(entry);
      throw err;
    } finally {
      bump();
    }
  }, []);

  const clear = useCallback(() => {
    undoStack.current.length = 0;
    redoStack.current.length = 0;
    bump();
  }, []);

  return {
    canUndo: undoStack.current.length > 0,
    canRedo: redoStack.current.length > 0,
    push,
    undo,
    redo,
    clear,
  };
}
