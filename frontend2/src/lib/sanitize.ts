// Port literal de `frontend/src/lib/sanitize.ts` (regra 4 da migração).
// Pipeline: escape HTML cru → @[Name](id)/@[Name] → <span class="mention"> → DOMPurify
// whitelist (apenas <span class>). Defesa em profundidade vs XSS em comentários.

import DOMPurify from 'dompurify';

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sanitiza conteúdo de comentários com suporte a @[mentions].
 *
 * Classe usada: `tm-mention` (alinha com tokens `.tm-comment .content .mention`
 * do template `views-task-modal.jsx`). Diferença DIFF (B) face ao legacy que
 * usava `text-primary fw-semibold` (Bootstrap).
 */
export function sanitizeCommentHtml(raw: string): string {
  const escaped = escapeHtml(raw);

  let withMentions = escaped.replace(
    /@\[([^\]]+)\]\([^)]+\)/g,
    (_m, name: string) => `<span class="tm-mention">@${name}</span>`,
  );
  withMentions = withMentions.replace(
    /@\[([^\]]+)\]/g,
    (_m, name: string) => `<span class="tm-mention">@${name}</span>`,
  );

  return DOMPurify.sanitize(withMentions, {
    ALLOWED_TAGS: ['span'],
    ALLOWED_ATTR: ['class'],
    KEEP_CONTENT: true,
  });
}
