// Paleta unificada de cores para avatares — alinhada entre Board, Planning, Comments
// e shell. Usa hash determinístico sobre um identificador (preferencialmente publicId do
// User, ou o name quando não disponível) para garantir cor consistente entre renders/tabs.
//
// Port literal de frontend/src/lib/avatars.ts — paleta e algoritmo idênticos para que o
// mesmo user apareça com a mesma cor em ambos os frontends durante a transição.

export const AVATAR_PALETTE_HEX = [
  '#a386d6', // violet — oklch(0.68 0.14 290)
  '#7ea4c6', // blue   — oklch(0.70 0.12 220)
  '#6ab796', // green  — oklch(0.68 0.12 155)
  '#d5a26b', // amber  — oklch(0.68 0.12 75)
  '#7fb3d4', // sky    — oklch(0.72 0.10 240)
  '#d5826d', // red    — oklch(0.68 0.15 25)
];

export function avatarColorFor(key: string): string {
  if (!key) return AVATAR_PALETTE_HEX[0];
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE_HEX[hash % AVATAR_PALETTE_HEX.length];
}

/** Extrai iniciais (máx. 2 caracteres) de um nome completo.
 *  - 1 palavra → primeiras 2 letras ("Lara" → "LA")
 *  - 2+ palavras → primeira + última ("João Pedro Silva" → "JS") */
export function initialsOf(name: string): string {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** URL final do avatar com cache busting via `?v={avatarUpdatedAt}`.
 *  Devolve `null` quando o user não tem avatar carregado → caller renderiza as iniciais.
 *
 *  Adição face ao frontend antigo (onde este padrão está repetido inline em
 *  CommentsPanel, AppLayout, FilesListView, etc.). Centralizado aqui para evitar
 *  divergência se a regra de cache busting mudar (ex.: passar a hash em vez de timestamp). */
export function avatarUrlOf(user: { avatarUrl: string | null; avatarUpdatedAt: string | null }): string | null {
  if (!user.avatarUrl) return null;
  return user.avatarUpdatedAt
    ? `${user.avatarUrl}?v=${encodeURIComponent(user.avatarUpdatedAt)}`
    : user.avatarUrl;
}
