import { useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import { useAuth } from '../contexts/AuthContext';
import { getApiBase, apiFetch } from '../lib/api';

interface PendingInvitation {
  publicId: string;  // UUID — usado nas chamadas à API (ParseUUIDPipe no backend)
  email: string;
  role: string;
  status: string;
  project: { publicId: string; name: string };
  invitedBy: { publicId: string; name: string; email: string };
}

/**
 * @param onActionDone — chamado após cada accept/decline via SweetAlert,
 *   com o publicId do convite respondido. Permite marcar a notificação como lida.
 */
export function usePendingInvitations(onActionDone?: (invitationPublicId: string) => void) {
  const { token } = useAuth();
  const checked = useRef(false);
  const api = getApiBase();
  // Keep a stable ref to onActionDone to avoid stale closure in the async function
  const onActionDoneRef = useRef(onActionDone);
  useEffect(() => { onActionDoneRef.current = onActionDone; }, [onActionDone]);

  useEffect(() => {
    if (!token || checked.current) return;
    checked.current = true;

    async function processPendingInvitations() {
      try {
        const res = await apiFetch(`${api}/invitations/pending`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;

        const invitations: PendingInvitation[] = await res.json();
        if (!Array.isArray(invitations) || invitations.length === 0) return;

        for (const inv of invitations) {
          const result = await Swal.fire({
            icon: 'question',
            title: 'Convite de projeto',
            html: `Foste convidado por <strong>${inv.invitedBy.name}</strong> para integrar o projeto <strong>${inv.project.name}</strong>.<br><br>Queres aceitar o convite?`,
            confirmButtonText: 'Aceitar',
            denyButtonText: 'Recusar',
            showDenyButton: true,
            allowOutsideClick: false,
            allowEscapeKey: false,
            confirmButtonColor: '#3085d6',
            denyButtonColor: '#d33',
          });

          if (result.isConfirmed) {
            await apiFetch(`${api}/invitations/${inv.publicId}/accept`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
            });
            onActionDoneRef.current?.(inv.publicId);
            await Swal.fire({
              icon: 'success',
              title: 'Convite aceite!',
              text: `Passaste a integrar o projeto "${inv.project.name}".`,
              timer: 2000,
              showConfirmButton: false,
            });
          } else if (result.isDenied) {
            await apiFetch(`${api}/invitations/${inv.publicId}/decline`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
            });
            onActionDoneRef.current?.(inv.publicId);
          }
        }
      } catch {
        // Silent failure — não impedir o utilizador de usar a app
      }
    }

    processPendingInvitations();
  }, [token, api]);
}
