import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';

type Placement = 'below-end' | 'above-start' | 'right-bottom';

interface Props {
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  placement?: Placement;
  offset?: number;
  panelClass?: string;
  children: ReactNode;
}

/** Port 1:1 de NewTemplate/app-dark.jsx:1613-1666. */
export function Popover({ anchorRef, onClose, placement = 'below-end', offset = 8, panelClass, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; visibility: 'hidden' | 'visible' }>({
    top: 0, left: 0, visibility: 'hidden',
  });

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const panel = ref.current;
    if (!anchor || !panel) return;
    const a = anchor.getBoundingClientRect();
    const p = panel.getBoundingClientRect();
    let top: number, left: number;
    if (placement === 'below-end') {
      top = a.bottom + offset;
      left = a.right - p.width;
    } else if (placement === 'above-start') {
      top = a.top - p.height - offset;
      left = a.left;
    } else if (placement === 'right-bottom') {
      top = a.bottom - p.height;
      left = a.right + offset;
    } else {
      top = a.bottom + offset; left = a.left;
    }
    const margin = 8;
    top = Math.max(margin, Math.min(top, window.innerHeight - p.height - margin));
    left = Math.max(margin, Math.min(left, window.innerWidth - p.width - margin));
    setPos({ top, left, visibility: 'visible' });
  }, [placement, offset, anchorRef]);

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node) &&
          anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [anchorRef, onClose]);

  return (
    <>
      <div className="popover-backdrop" onClick={onClose} />
      <div ref={ref} className={'popover ' + (panelClass || '')} style={pos}>
        {children}
      </div>
    </>
  );
}
