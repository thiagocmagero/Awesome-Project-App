import { useTranslation } from 'react-i18next';
import type { ITaskState } from '../states-types';

/**
 * Badge que mostra o estado duma tarefa.
 * Resolve label via hierarquia: custom label → i18n via labelKey → publicId.
 * Quando `column` é null (ex: tarefa sem estado), mostra um placeholder cinzento.
 */
export function StateBadge({ column }: { column: ITaskState | null | undefined }) {
  const { t: tp } = useTranslation('planning');
  const { t: tc } = useTranslation('common');

  if (!column) {
    return (
      <span className="badge bg-secondary-transparent text-secondary">
        <i className="ri-circle-line fs-8 me-1" />{tc('form.none')}
      </span>
    );
  }

  const label = column.label
    ?? (column.labelKey ? tp(column.labelKey as Parameters<typeof tp>[0]) : column.publicId);

  // Se a coluna tiver cor, usamos inline style com um tom transparente; senão aplicamos
  // classes Bootstrap derivadas do systemKey (TODO=primary, INPROGRESS=info, DONE=success).
  const bsPalette = ((): { bg: string; text: string } => {
    switch (column.systemKey) {
      case 'TODO':       return { bg: 'bg-primary-transparent', text: 'text-primary' };
      case 'INPROGRESS': return { bg: 'bg-info-transparent',    text: 'text-info' };
      case 'DONE':       return { bg: 'bg-success-transparent', text: 'text-success' };
      default:           return { bg: 'bg-secondary-transparent', text: 'text-secondary' };
    }
  })();

  const style = column.color
    ? { backgroundColor: `${column.color}26`, color: column.color } // 26 = ~15% alpha
    : undefined;

  return (
    <span
      className={`badge ${column.color ? '' : `${bsPalette.bg} ${bsPalette.text}`}`}
      style={style}
    >
      <i className="ri-circle-fill fs-8 me-1" />{label}
    </span>
  );
}
