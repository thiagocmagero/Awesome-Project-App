// Header do projeto — wrapper `.proj-header` que envolve `.proj-titlebar`
// (icon + name + members + spacer) E os tabs passados como children.
// Estrutura canónica conforme NewTemplate/app-dark.jsx:1435-1470.

import type { ReactNode } from 'react';
import { avatarColorFor, avatarUrlOf, initialsOf } from '../../../lib/avatars';
import type { IProjectDetail, IProjectMember } from '../types';

interface Props {
  project: IProjectDetail;
  members: IProjectMember[];
  /** Geralmente o `<TabsNav>`. */
  children?: ReactNode;
}

export function ProjectHeader({ project, members, children }: Props) {
  return (
    <div className="proj-header">
      <div className="proj-titlebar">
        <div className="proj-icon" aria-hidden>▦</div>
        <div className="proj-name">
          {project.name}
          <span className="chev" aria-hidden>▾</span>
        </div>
        <div className="proj-members avatar-list-stacked">
          {members.map((m) => {
            const src = avatarUrlOf(m);
            return (
              <div
                key={m.publicId}
                className="avatar sm"
                title={m.name}
                style={{ background: avatarColorFor(m.publicId) }}
              >
                {src ? <img src={src} alt={m.name} /> : initialsOf(m.name)}
              </div>
            );
          })}
        </div>
        <div style={{ marginLeft: 'auto' }} />
      </div>
      {children}
    </div>
  );
}
