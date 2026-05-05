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
 * Pipeline:
 *   1. Escape HTML do input cru (neutraliza <script>, <img onerror>, etc.)
 *   2. Substitui @[Name](publicId) e @[Name] por <span class="text-primary fw-semibold">@Name</span>
 *   3. DOMPurify com whitelist estrita (apenas <span class="...">) — defence-in-depth
 */
export function sanitizeCommentHtml(raw: string): string {
  const escaped = escapeHtml(raw);

  let withMentions = escaped.replace(
    /@\[([^\]]+)\]\([^)]+\)/g,
    (_m, name: string) => `<span class="text-primary fw-semibold">@${name}</span>`,
  );
  withMentions = withMentions.replace(
    /@\[([^\]]+)\]/g,
    (_m, name: string) => `<span class="text-primary fw-semibold">@${name}</span>`,
  );

  return DOMPurify.sanitize(withMentions, {
    ALLOWED_TAGS: ['span'],
    ALLOWED_ATTR: ['class'],
    KEEP_CONTENT: true,
  });
}
