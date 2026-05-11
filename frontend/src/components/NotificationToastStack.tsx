import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTimezone } from '../contexts/TimezoneContext';
import { relativeTimeInTimezone } from '../lib/dateFormatting';
import type { AppNotification } from '../features/notifications/types';

interface Props {
  toasts: AppNotification[];
  onDismiss: (publicId: string) => void;
  onClick?: (n: AppNotification) => void;
  /** Tempo que o toast permanece totalmente visível (ms). Default 8000. */
  visibleMs?: number;
}

const ENTER_DELAY_MS = 30;   // tick para o browser aplicar a transição de fade-in
const LEAVE_DURATION_MS = 250; // alinhado com transition: opacity .15s + folga

const AVATAR_COLORS = [
  '#845adf', '#26bf94', '#f5b849', '#23b7e5',
  '#e6533c', '#6c5ffc', '#0ea5e9', '#22c55e',
  '#fd79a8', '#fdcb6e', '#55efc4', '#d63031',
];

function avatarColorFor(str: string): string {
  let hash = 0;
  for (const c of str) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function iconFor(type: AppNotification['type']): string {
  switch (type) {
    case 'INVITATION_RECEIVED':          return 'ri-user-add-line';
    case 'INVITATION_ACCEPTED':          return 'ri-check-line';
    case 'INVITATION_DECLINED':          return 'ri-close-circle-line';
    case 'MENTION':                      return 'ri-at-line';
    case 'TASK_ASSIGNED':                return 'ri-task-line';
    case 'COMMENT_REACTION':             return 'ri-emotion-line';
    case 'TIMESHEET_SUBMITTED':          return 'ri-time-line';
    case 'TIMESHEET_APPROVED':           return 'ri-check-double-line';
    case 'TIMESHEET_PARTIALLY_APPROVED': return 'ri-git-branch-line';
    case 'TIMESHEET_REJECTED':           return 'ri-close-circle-line';
    default:                             return 'ri-notification-3-line';
  }
}

/** Tipos que abrem destino navegável quando clicados. */
function isClickable(type: AppNotification['type']): boolean {
  return (
    type === 'MENTION' ||
    type === 'TASK_ASSIGNED' ||
    type === 'COMMENT_REACTION' ||
    type === 'INVITATION_ACCEPTED' ||
    type === 'INVITATION_DECLINED'
  );
}

interface ItemProps {
  notification: AppNotification;
  onDismiss: (publicId: string) => void;
  onClick?: (n: AppNotification) => void;
  visibleMs: number;
}

/**
 * Toast individual com 3 fases: `entering` (fade-in), `visible` (full opacity),
 * `leaving` (fade-out). Gere o seu próprio tempo de vida — só chama
 * `onDismiss` depois da transição de saída para que a animação Bootstrap
 * `.toast.fade.show` ↔ `.toast.fade` corra inteira.
 */
function ToastItem({ notification, onDismiss, onClick, visibleMs }: ItemProps) {
  const { t } = useTranslation('notifications');
  const tz = useTimezone();
  const [phase, setPhase] = useState<'entering' | 'visible' | 'leaving'>('entering');
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    // 1. fade-in: aplica .show após um tick para que o browser tenha pintado
    //    a versão sem .show (opacity 0) e veja a transição.
    const tEnter = window.setTimeout(() => setPhase('visible'), ENTER_DELAY_MS);
    // 2. agendar fade-out automático
    const tLeave = window.setTimeout(() => setPhase('leaving'), ENTER_DELAY_MS + visibleMs);
    // 3. depois do fade-out, remover do array do parent
    const tUnmount = window.setTimeout(
      () => onDismiss(notification.publicId),
      ENTER_DELAY_MS + visibleMs + LEAVE_DURATION_MS,
    );
    timersRef.current = [tEnter, tLeave, tUnmount];
    return () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Cancela timers e força fade-out imediato; remove após LEAVE_DURATION_MS.
    timersRef.current.forEach((id) => window.clearTimeout(id));
    setPhase('leaving');
    window.setTimeout(() => onDismiss(notification.publicId), LEAVE_DURATION_MS);
  };

  const clickable = !!onClick && isClickable(notification.type);
  const handleBodyClick = clickable
    ? () => {
        // Click → cancela timers, navega, e remove sem animação (UX imediata).
        timersRef.current.forEach((id) => window.clearTimeout(id));
        onClick?.(notification);
        onDismiss(notification.publicId);
      }
    : undefined;

  // .fade controla a transição CSS; .show alterna opacity 0↔1.
  const showClass = phase === 'visible' ? 'show' : '';

  return (
    <div
      className={`toast fade ${showClass} mb-2 shadow-sm`}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      style={{
        minWidth: 320,
        maxWidth: 360,
        cursor: clickable ? 'pointer' : 'default',
        // Bootstrap toast usa transition: opacity .15s. Forçamos um valor mais
        // suave (250ms) para dar tempo do user perceber.
        transition: 'opacity 250ms ease-in-out',
      }}
      onClick={handleBodyClick}
    >
      <div className="toast-header text-default">
        <span
          className="avatar avatar-sm avatar-rounded me-2"
          style={{
            background: avatarColorFor(notification.title),
            color: '#fff',
            width: 28,
            height: 28,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            flexShrink: 0,
          }}
        >
          <i className={`${iconFor(notification.type)} fs-14`} style={{ color: '#fff' }} />
        </span>
        <strong className="me-auto fs-13">{notification.title}</strong>
        <small className="text-muted">
          {relativeTimeInTimezone(notification.createdAt, tz, t as never)}
        </small>
        <button
          type="button"
          className="btn-close ms-2"
          aria-label={t('mark_read') as string}
          onClick={handleClose}
        />
      </div>
      <div
        className="toast-body fs-12"
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={notification.body}
      >
        {notification.body}
      </div>
    </div>
  );
}

/**
 * Stack de toasts no estilo Bootstrap/Zynix "Basic example" — `.toast.fade.show`
 * com `.toast-header.text-default` e `.toast-body`. Posicionado em Top Right
 * via container `.toast-container.position-fixed.top-0.end-0.p-3`.
 *
 * Animações: fade-in ao entrar, fade-out ao sair (manual via dismiss ou
 * automático após `visibleMs`). Click no corpo navega para o entity quando
 * o tipo de notificação é navegável.
 */
export default function NotificationToastStack({
  toasts,
  onDismiss,
  onClick,
  visibleMs = 8000,
}: Props) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="toast-container position-fixed top-0 end-0 p-3"
      style={{ zIndex: 1080, top: 70 /* abaixo do header fixo */ }}
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((n) => (
        <ToastItem
          key={n.publicId}
          notification={n}
          onDismiss={onDismiss}
          onClick={onClick}
          visibleMs={visibleMs}
        />
      ))}
    </div>
  );
}
