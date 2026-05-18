// Stacked avatars dos assignees da tarefa. Estrutura HTML EXACTA conforme spec:
//   <span class="assignees avatar-list-stacked">
//     <div class="avatar sm" title="..." style="background: rgb(...);">XX</div>
//     ...
//   </span>
// Cor determinística via avatarColorFor(publicId); iniciais via initialsOf(name).
// CSS visual em styles/project-list.css (.assignees, .avatar-list-stacked,
// .avatar.sm, .avatar.sm.more) — overlap negativo, border branco, hover scale.

import { avatarColorFor, avatarUrlOf, initialsOf } from '../../../lib/avatars';
import type { IProjectMember } from '../types';

interface Props {
  ownerIds: string[] | null | undefined;
  byPublicId: Map<string, IProjectMember>;
  /** Avatares visíveis antes de colapsar em "+N". Default 2 (mockup row). */
  max?: number;
}

const DEFAULT_MAX_AVATARS = 2;

export function AssigneeAvatars({ ownerIds, byPublicId, max = DEFAULT_MAX_AVATARS }: Props) {
  const ids = Array.isArray(ownerIds) ? ownerIds : [];
  if (ids.length === 0) {
    return <span style={{ color: 'var(--mute)' }}>—</span>;
  }
  const shown = ids.slice(0, max);
  const extra = ids.length - shown.length;
  return (
    <span className="assignees avatar-list-stacked">
      {shown.map((id) => {
        const member = byPublicId.get(id);
        const name = member?.name ?? id.slice(0, 4);
        const color = avatarColorFor(member?.publicId ?? id);
        const src = member ? avatarUrlOf(member) : null;
        return (
          <div
            key={id}
            className="avatar sm"
            title={name}
            style={{ background: color }}
          >
            {src ? <img src={src} alt={name} /> : initialsOf(name)}
          </div>
        );
      })}
      {extra > 0 && (
        <div className="avatar sm more" title={`+${extra}`}>+{extra}</div>
      )}
    </span>
  );
}
