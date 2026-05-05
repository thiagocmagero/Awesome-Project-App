import type { CSSProperties } from 'react';

export interface KanbanDropZoneProps {
  /** Column color (used for the dashed border tint). */
  columnColor?: string;
  /** Localized "DROP HERE" message. */
  label?: string;
  /** Mark zone as invalid (rejection feedback). */
  invalid?: boolean;
  /** Mark zone as the active hover target — fills the inside of the dashed
   *  rectangle with the primary-soft tint (no overflow outside the border). */
  active?: boolean;
  /** Additional class names. */
  className?: string;
}

export function KanbanDropZone({
  columnColor,
  label = 'DROP HERE',
  invalid = false,
  active = false,
  className,
}: KanbanDropZoneProps) {
  const style: CSSProperties = columnColor
    ? ({ ['--ak-column-color' as string]: columnColor } as CSSProperties)
    : {};

  const classNames = [
    'ak-cell--empty',
    invalid && 'ak-cell--invalid',
    active && !invalid && 'ak-cell--empty-active',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classNames} style={style} role="presentation">
      <i className="ti ti-arrow-down-to-arc" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
