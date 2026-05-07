import { useTranslation } from 'react-i18next';
import type { ITimesheetTeamRow } from '../types';
import { TimesheetStatusPill } from './TimesheetStatusPill';
import { avatarColorFor } from '../dateUtils';

interface Props {
  rows:                 ITimesheetTeamRow[];
  /** PublicId do próprio user — excluído da lista (ele tem a tab "As minhas horas" para isso). */
  selfPublicId?:        string | null;
  /**
   * `null` significa modo "Vista agregada" (apenas relevante em vista mensal).
   * Em vista semanal, `null` durante carregamento; após o auto-select do
   * primeiro membro fica sempre definido.
   */
  selectedUserPublicId: string | null;
  /** `null` = "Vista agregada" (só monthly); string = membro individual. */
  onSelect:             (userPublicId: string | null) => void;
  /** Mostra a entry "Vista agregada" no topo. Activa apenas em vista mensal. */
  showAggregated?:      boolean;
  /** Total de membros da equipa (para a contagem do badge "Vista agregada"). */
  aggregatedCount?:     number;
}

/**
 * Sidebar com lista de pessoas (vista do gestor).
 *
 * Em **vista mensal** mostra também uma entrada "Vista agregada" no topo (filtra
 * a vista mensal entre agregado X/Y e individual ✓/✗).
 *
 * Em **vista semanal** apenas membros da equipa (próprio excluído — usa a tab
 * "As minhas horas" no toolbar).
 */
export function TimesheetTeamSidebar({
  rows, selfPublicId, selectedUserPublicId, onSelect,
  showAggregated, aggregatedCount,
}: Props) {
  const { t } = useTranslation('timesheet');
  const team = rows.filter((r) => r.user.publicId !== selfPublicId);

  return (
    <aside className="ts-aside">
      {showAggregated && (
        <div>
          <div className="ts-aside__lbl">{t('month.aggregated_label')}</div>
          <button
            type="button"
            className={`ts-person ts-person--aggregate${selectedUserPublicId === null ? ' is-active' : ''}`}
            onClick={() => onSelect(null)}
          >
            <span className="ts-avatar">{aggregatedCount ?? team.length}</span>
            <div className="ts-person__main">
              <div className="ts-person__nm">{t('month.aggregated_title')}</div>
              <div className="ts-person__sub">{t('month.aggregated_subtitle')}</div>
            </div>
          </button>
        </div>
      )}
      <div>
        <div className="ts-aside__lbl">{t('team.section_team')}</div>
        {team.length === 0 && <div className="text-muted small px-2">{t('team.empty')}</div>}
        {team.map((r) => (
          <button
            type="button"
            key={r.user.publicId}
            className={`ts-person${selectedUserPublicId === r.user.publicId ? ' is-active' : ''}`}
            onClick={() => onSelect(r.user.publicId)}
          >
            {r.user.avatarUrl ? (
              <img
                className="ts-avatar"
                src={r.user.avatarUrl}
                alt={r.user.name}
                style={{ objectFit: 'cover' }}
              />
            ) : (
              <span
                className="ts-avatar"
                style={{ background: avatarColorFor(r.user.publicId) }}
              >{r.user.initials}</span>
            )}
            <div className="ts-person__main">
              <div className="ts-person__nm">{r.user.name}</div>
              <div className="ts-person__sub">
                <TimesheetStatusPill status={r.status} size="xs" />
              </div>
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
}
