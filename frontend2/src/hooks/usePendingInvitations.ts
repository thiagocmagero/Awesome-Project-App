import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Swal from 'sweetalert2';
import { apiGet, apiPost } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface PendingInvitation {
  publicId: string;
  email: string;
  role: string;
  status: string;
  project: { publicId: string; name: string };
  invitedBy: { publicId: string; name: string; email: string };
}

/**
 * Port literal de `frontend/src/hooks/usePendingInvitations.ts`.
 *
 * Em boot, busca convites de projecto pendentes (`/invitations/pending`) e
 * mostra um SweetAlert sequencial bloqueante por cada — Aceitar/Recusar. Faz
 * `POST /invitations/:publicId/accept|decline` consoante a escolha.
 *
 * Disparado uma única vez por sessão (guard `checked.current`). Quando o
 * utilizador acaba de criar conta via convite e cai em `/home`, isto roda
 * imediatamente e mostra os popups dos projectos a que foi convidado.
 *
 * @param onActionDone callback opcional chamado após cada accept/decline com
 *   o `publicId` do convite — usado para marcar a notificação in-app como lida.
 */
export function usePendingInvitations(onActionDone?: (invitationPublicId: string) => void) {
  const { user } = useAuth();
  const { t: tc } = useTranslation('common');
  const checked = useRef(false);
  const tcRef = useRef(tc);
  const onActionDoneRef = useRef(onActionDone);

  useEffect(() => { tcRef.current = tc; }, [tc]);
  useEffect(() => { onActionDoneRef.current = onActionDone; }, [onActionDone]);

  useEffect(() => {
    if (!user || checked.current) return;
    checked.current = true;

    (async () => {
      try {
        const invitations = await apiGet<PendingInvitation[]>('/invitations/pending');
        if (!Array.isArray(invitations) || invitations.length === 0) return;

        for (const inv of invitations) {
          const result = await Swal.fire({
            icon: 'question',
            title: tcRef.current('invitations.popup_title'),
            html: tcRef.current('invitations.popup_body', {
              inviter: escapeHtml(inv.invitedBy.name),
              project: escapeHtml(inv.project.name),
              interpolation: { escapeValue: false },
            }),
            confirmButtonText: tcRef.current('invitations.popup_accept'),
            denyButtonText: tcRef.current('invitations.popup_decline'),
            showDenyButton: true,
            allowOutsideClick: false,
            allowEscapeKey: false,
            confirmButtonColor: '#3085d6',
            denyButtonColor: '#d33',
            // Não tocar em `html { height }` nem em `body { padding-right }`.
            // O nosso boot CSS depende de `html { height: 100% }` — `heightAuto: true`
            // (default) trocava para `auto` e colapsava o layout da app por trás
            // do popup. `scrollbarPadding: false` evita o jitter horizontal.
            heightAuto: false,
            scrollbarPadding: false,
          });

          if (result.isConfirmed) {
            try {
              await apiPost(`/invitations/${inv.publicId}/accept`);
              onActionDoneRef.current?.(inv.publicId);
              await Swal.fire({
                icon: 'success',
                title: tcRef.current('invitations.success_title'),
                text: tcRef.current('invitations.success_body', { project: inv.project.name }),
                timer: 2000,
                showConfirmButton: false,
                heightAuto: false,
                scrollbarPadding: false,
              });
            } catch {
              // Silent — não bloquear o resto da fila
            }
          } else if (result.isDenied) {
            try {
              await apiPost(`/invitations/${inv.publicId}/decline`);
              onActionDoneRef.current?.(inv.publicId);
            } catch {
              // Silent
            }
          }
        }
      } catch {
        // Silent — não impedir o utilizador de usar a app se /pending falhar
      }
    })();
  }, [user]);
}

/** Defesa contra XSS no `inviter.name` / `project.name`, já que metemos o
 *  resultado dentro de `html: ...` do Swal. i18next interpolation com
 *  `escapeValue: false` desliga o escape automático — fazemos manualmente. */
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
