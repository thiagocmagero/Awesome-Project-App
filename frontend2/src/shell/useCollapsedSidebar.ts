import { useEffect, useState } from 'react';

const NARROW_QUERY = '(max-width: 1024px)';

function isNarrow(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(NARROW_QUERY).matches;
}

/**
 * Sidebar collapse state with media-query auto-collapse.
 * - <=1024px viewport → sidebar collapses to a drawer (initial state + on resize crossing).
 * - >1024px viewport → sidebar expands.
 *
 * Ported from NewTemplate/app-dark.jsx:1902-1986.
 */
export function useCollapsedSidebar() {
  const [collapsed, setCollapsed] = useState<boolean>(isNarrow);

  useEffect(() => {
    const mq = window.matchMedia(NARROW_QUERY);
    function handle(e: MediaQueryListEvent) { setCollapsed(e.matches); }
    mq.addEventListener('change', handle);
    return () => mq.removeEventListener('change', handle);
  }, []);

  const toggle = () => setCollapsed((c) => !c);
  const closeIfNarrow = () => { if (isNarrow()) setCollapsed(true); };
  return { collapsed, setCollapsed, toggle, closeIfNarrow };
}
