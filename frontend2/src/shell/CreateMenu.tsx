import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Popover } from './Popover';

interface Props {
  anchorRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onOpenTask: () => void;
  onOpenProject: () => void;
  onOpenWorkspace: () => void;
  onOpenInvite: () => void;
}

/** Port de NewTemplate/app-dark.jsx:1856-1881. */
export function CreateMenu({ anchorRef, onClose, onOpenTask, onOpenProject, onOpenWorkspace, onOpenInvite }: Props) {
  const { t: tc } = useTranslation('common');
  return (
    <Popover anchorRef={anchorRef} onClose={onClose} panelClass="create-menu" placement="below-end" offset={8}>
      <div className="menu-item" onClick={() => { onClose(); onOpenTask(); }}>
        <span className="ico">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3 8-8" />
            <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" />
          </svg>
        </span>
        {tc('entity.task')}
        <span className="kbd-hint">T</span>
      </div>
      <div className="menu-item" onClick={() => { onClose(); onOpenProject(); }}>
        <span className="ico">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="4" x2="9" y2="20" />
          </svg>
        </span>
        {tc('entity.project')}
        <span className="kbd-hint">P</span>
      </div>
      <div className="menu-item" onClick={() => { onClose(); onOpenWorkspace(); }}>
        <span className="ico">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </span>
        {tc('entity.workspace')}
        <span className="kbd-hint">W</span>
      </div>
      <div className="menu-item" onClick={() => { onClose(); onOpenInvite(); }}>
        <span className="ico">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" />
            <line x1="22" y1="11" x2="16" y2="11" />
          </svg>
        </span>
        {tc('entity.invite')}
        <span className="kbd-hint">I</span>
      </div>
    </Popover>
  );
}
