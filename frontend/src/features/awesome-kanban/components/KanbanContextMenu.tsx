import {
  type MouseEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
  useDismiss,
  useFloatingNodeId,
  useFloatingTree,
  FloatingFocusManager,
  FloatingNode,
  FloatingPortal,
  FloatingTree,
  useInteractions,
} from '@floating-ui/react';

export interface ContextMenuItemRender {
  id: string;
  text?: string;
  icon?: string | ReactNode;
  iconColor?: string;
  disabled?: boolean;
  separator?: boolean;
  destructive?: boolean;
  shortcut?: string;
  section?: string;
  /** Children — turns this item into a submenu trigger. */
  children?: ContextMenuItemRender[];
}

export interface KanbanContextMenuProps {
  open: boolean;
  /** Either a virtual anchor (mouse position) or an HTMLElement reference. */
  anchor?: { x: number; y: number } | HTMLElement | null;
  items: ContextMenuItemRender[];
  onSelect: (id: string) => void;
  onClose: () => void;
}

const SUBMENU_HOVER_DELAY = 150;

/**
 * Floating-UI–backed context menu used by cards, columns and rows.
 * Supports nested submenus (hover-delay open, click-anywhere-else close)
 * and stays within the viewport via flip + shift middlewares.
 */
export function KanbanContextMenu(props: KanbanContextMenuProps) {
  return (
    <FloatingTree>
      <KanbanContextMenuInner {...props} />
    </FloatingTree>
  );
}

function KanbanContextMenuInner({
  open,
  anchor,
  items,
  onSelect,
  onClose,
}: KanbanContextMenuProps) {
  const nodeId = useFloatingNodeId();

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: (next) => {
      if (!next) onClose();
    },
    // `bottom-end` aligns the menu's RIGHT edge to the trigger's right edge,
    // so it extends to the LEFT (away from the column's right margin where
    // the `...` button lives). Flip falls back to bottom-start if there's no
    // room on the left.
    placement: 'bottom-end',
    middleware: [
      offset(4),
      flip({ fallbackPlacements: ['bottom-start', 'top-end', 'top-start'], padding: 8 }),
      shift({ padding: 8 }),
    ],
    whileElementsMounted: autoUpdate,
    nodeId,
  });

  // Set the position reference synchronously before paint. We track our own
  // `referenceSet` flag because Floating UI's `isPositioned` can flip to true
  // on its first internal computation even without a reference, which would
  // otherwise let the menu render at (0,0).
  const [referenceSet, setReferenceSet] = useState(false);

  useEffect(() => {
    if (!open || !anchor) {
      setReferenceSet(false);
      return;
    }
    if (anchor instanceof HTMLElement) {
      refs.setPositionReference(anchor);
    } else {
      const x = anchor.x;
      const y = anchor.y;
      refs.setPositionReference({
        getBoundingClientRect: () =>
          ({
            x,
            y,
            left: x,
            top: y,
            right: x,
            bottom: y,
            width: 0,
            height: 0,
            toJSON() {
              return this;
            },
          }) as DOMRect,
      });
    }
    setReferenceSet(true);
  }, [open, anchor, refs]);

  const dismiss = useDismiss(context, { outsidePress: true, escapeKey: true });
  const { getFloatingProps } = useInteractions([dismiss]);

  if (!open || !referenceSet) return null;

  return (
    <FloatingNode id={nodeId}>
      <FloatingPortal>
        <FloatingFocusManager context={context} initialFocus={-1}>
          {/* Outer node: positioning ONLY. Floating UI applies its translate
              transform here. Hidden until Floating UI confirms a real
              position. */}
          <div
            ref={refs.setFloating}
            style={{
              ...floatingStyles,
              visibility: context.isPositioned ? 'visible' : 'hidden',
              zIndex: 10001,
            }}
            {...getFloatingProps()}
          >
            {/* Inner node: visuals + animation. Keeping the scale animation
                separate from the position transform prevents the menu from
                flashing at the origin while the entrance animation runs. */}
            <div
              role="menu"
              className="ak-menu"
              onContextMenu={(e: MouseEvent) => e.preventDefault()}
            >
              {items.map((item) => (
                <MenuRow
                  key={item.id}
                  item={item}
                  onSelect={(id) => {
                    onSelect(id);
                    onClose();
                  }}
                />
              ))}
            </div>
          </div>
        </FloatingFocusManager>
      </FloatingPortal>
    </FloatingNode>
  );
}

interface MenuRowProps {
  item: ContextMenuItemRender;
  onSelect: (id: string) => void;
}

function MenuRow({ item, onSelect }: MenuRowProps) {
  if (item.separator) {
    return <div className="ak-menu__separator" role="separator" />;
  }
  if (item.section) {
    return (
      <div className="ak-menu__section" role="presentation">
        {item.section}
      </div>
    );
  }
  if (item.children?.length) {
    return <SubmenuRow item={item} onSelect={onSelect} />;
  }
  const iconStyle = item.iconColor
    ? ({ ['--ak-menu-item-icon-color' as string]: item.iconColor } as React.CSSProperties)
    : undefined;

  return (
    <button
      type="button"
      role="menuitem"
      aria-disabled={item.disabled || undefined}
      className={
        'ak-menu__item' +
        (item.destructive ? ' ak-menu__item--destructive' : '')
      }
      onClick={() => {
        if (item.disabled) return;
        onSelect(item.id);
      }}
    >
      {item.icon && (
        <span className="ak-menu__item-icon" style={iconStyle}>
          {typeof item.icon === 'string' ? (
            <i className={`ti ${item.icon}`} aria-hidden="true" />
          ) : (
            item.icon
          )}
        </span>
      )}
      <span className="ak-menu__item-text">{item.text}</span>
      {item.shortcut && (
        <span className="ak-menu__item-shortcut">{item.shortcut}</span>
      )}
    </button>
  );
}

function SubmenuRow({ item, onSelect }: MenuRowProps) {
  const iconStyle = item.iconColor
    ? ({ ['--ak-menu-item-icon-color' as string]: item.iconColor } as React.CSSProperties)
    : undefined;
  const [open, setOpen] = useState(false);
  const tree = useFloatingTree();
  const nodeId = useFloatingNodeId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeTimeout = useRef<number | null>(null);

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: 'right-start',
    middleware: [offset(2), flip({ fallbackPlacements: ['left-start'] }), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
    nodeId,
  });

  const dismiss = useDismiss(context, { outsidePress: true, escapeKey: true });
  const { getFloatingProps } = useInteractions([dismiss]);

  const cancelClose = () => {
    if (closeTimeout.current) {
      window.clearTimeout(closeTimeout.current);
      closeTimeout.current = null;
    }
  };

  const scheduleClose = () => {
    cancelClose();
    closeTimeout.current = window.setTimeout(() => setOpen(false), SUBMENU_HOVER_DELAY);
  };

  const scheduleOpen = () => {
    cancelClose();
    closeTimeout.current = window.setTimeout(() => setOpen(true), SUBMENU_HOVER_DELAY);
  };

  useEffect(() => () => cancelClose(), []);

  // Close all menus in the tree once a leaf is picked.
  const handleSelect = (id: string) => {
    onSelect(id);
    tree?.events.emit('close');
  };

  useEffect(() => {
    if (!tree) return;
    const onClose = () => setOpen(false);
    tree.events.on('close', onClose);
    return () => tree.events.off('close', onClose);
  }, [tree]);

  return (
    <>
      <button
        ref={(node) => {
          triggerRef.current = node;
          refs.setReference(node);
        }}
        type="button"
        role="menuitem"
        aria-disabled={item.disabled || undefined}
        aria-haspopup="menu"
        aria-expanded={open}
        className={
          'ak-menu__item' +
          (item.destructive ? ' ak-menu__item--destructive' : '')
        }
        onMouseEnter={scheduleOpen}
        onMouseLeave={scheduleClose}
        onClick={() => setOpen((v) => !v)}
      >
        {item.icon && (
          <span className="ak-menu__item-icon" style={iconStyle}>
            {typeof item.icon === 'string' ? (
              <i className={`ti ${item.icon}`} aria-hidden="true" />
            ) : (
              item.icon
            )}
          </span>
        )}
        <span className="ak-menu__item-text">{item.text}</span>
        <span className="ak-menu__item-chevron">
          <i className="ti ti-chevron-right" aria-hidden="true" />
        </span>
      </button>

      {open && (
        <FloatingNode id={nodeId}>
          <FloatingPortal>
            <FloatingFocusManager context={context} initialFocus={-1}>
              <div
                ref={refs.setFloating}
                style={{
                  ...floatingStyles,
                  visibility: context.isPositioned ? 'visible' : 'hidden',
                  zIndex: 10002,
                }}
                {...getFloatingProps()}
              >
                <div
                  role="menu"
                  className="ak-menu"
                  onMouseEnter={cancelClose}
                  onMouseLeave={scheduleClose}
                >
                  {item.children?.map((child) => (
                    <MenuRow
                      key={child.id}
                      item={child}
                      onSelect={handleSelect}
                    />
                  ))}
                </div>
              </div>
            </FloatingFocusManager>
          </FloatingPortal>
        </FloatingNode>
      )}
    </>
  );
}
