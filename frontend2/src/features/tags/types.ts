// Port literal de `frontend/src/features/tags/types.ts` (regra 4).
// Convenção crítica: `name` chega do backend em MAIÚSCULAS (normalizado);
// para display, usar sempre `displayTag()` que converte para minúsculas.

export interface Tag {
  /** UUID v7. ID estável usado em toda a API. */
  publicId: string;
  /** Nome normalizado em MAIÚSCULAS. Usar `displayTag()` para a UI. */
  name: string;
}

/** Converte o nome canónico (UPPERCASE) para o display (minúsculas). */
export function displayTag(tag: Tag): string {
  return tag.name.toLowerCase();
}

/** Normalização do lado do cliente — espelha o backend. */
export function normalizeTagName(raw: string): string {
  return raw.trim().toUpperCase();
}

/** Comparação case-insensitive entre dois nomes. */
export function tagNameEquals(a: string, b: string): boolean {
  return normalizeTagName(a) === normalizeTagName(b);
}
