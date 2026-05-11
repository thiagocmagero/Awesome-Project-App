import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../contexts/ToastContext';
import { useTimezone } from '../../contexts/TimezoneContext';
import { confirmAction } from '../../lib/confirm';
import { relativeTimeInTimezone } from '../../lib/dateFormatting';
import { useMissingTranslations, type MissingTranslationItem } from './useMissingTranslations';

interface MissingKeysPanelProps {
  /** Callback invoked whenever the pending count changes (used by parent to drive the tab badge). */
  onStatsChange?: (pendingCount: number) => void;
}

export default function MissingKeysPanel({ onStatsChange }: MissingKeysPanelProps = {}) {
  const { t } = useTranslation('translations');
  const { t: tc } = useTranslation('common');
  const { showToast } = useToast();
  const tz = useTimezone();

  const [showResolved, setShowResolved] = useState(false);
  const [namespaceFilter, setNamespaceFilter] = useState<string | null>(null);
  const [promotingId, setPromotingId] = useState<string | null>(null);

  const { items, total, stats, loading, error, promote } = useMissingTranslations({
    resolved: showResolved,
    namespace: namespaceFilter,
  });

  // Propagate pending count up to parent (badge in tab header)
  useEffect(() => {
    onStatsChange?.(stats.pending);
  }, [stats.pending, onStatsChange]);

  const namespaceOptions = useMemo(() => {
    const set = new Set<string>(Object.keys(stats.byNamespace ?? {}));
    for (const item of items) set.add(item.namespace);
    return [...set].sort();
  }, [stats.byNamespace, items]);

  async function handlePromote(item: MissingTranslationItem) {
    const ok = await confirmAction({
      title: t('confirm.promote_missing.title'),
      text: t('confirm.promote_missing.text', { key: item.key, namespace: item.namespace }),
      confirmText: t('confirm.promote_missing.confirm'),
      cancelText: tc('actions.cancel'),
      variant: 'primary',
    });
    if (!ok) return;
    setPromotingId(item.publicId);
    try {
      const result = await promote(item.publicId);
      if (result) {
        showToast('success', t('missing.success.promoted', { namespace: result.namespace }));
      } else {
        showToast('danger', t('missing.errors.promote'));
      }
    } finally {
      setPromotingId(null);
    }
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 px-3 py-2 border-bottom">
        <div className="d-flex gap-2 align-items-center flex-wrap">
          <select
            className="form-select form-select-sm"
            style={{ maxWidth: 220 }}
            value={namespaceFilter ?? ''}
            onChange={(e) => setNamespaceFilter(e.target.value || null)}
          >
            <option value="">{t('missing.filter.namespace_all')}</option>
            {namespaceOptions.map((ns) => (
              <option key={ns} value={ns}>{ns}{stats.byNamespace[ns] ? ` (${stats.byNamespace[ns]})` : ''}</option>
            ))}
          </select>
          <div className="form-check form-switch mb-0">
            <input
              type="checkbox"
              className="form-check-input"
              id="missing-show-resolved"
              checked={showResolved}
              onChange={(e) => setShowResolved(e.target.checked)}
            />
            <label className="form-check-label fs-12" htmlFor="missing-show-resolved">
              {t('missing.show_resolved')}
            </label>
          </div>
        </div>
        <div className="text-muted fs-12">
          {showResolved
            ? t('missing.status.resolved') + `: ${stats.resolved}`
            : t('missing.status.pending') + `: ${stats.pending}`}
          {namespaceFilter ? ` · ${total}` : ''}
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        {loading ? (
          <div className="p-4 text-center text-muted">
            <span className="spinner-border spinner-border-sm me-2" />
            {tc('messages.loading')}
          </div>
        ) : error ? (
          <div className="p-4 text-danger fs-13">{error}</div>
        ) : items.length === 0 ? (
          <div className="p-4 text-center text-muted fs-13 fst-italic">
            {showResolved ? t('missing.empty_resolved') : t('missing.empty_pending')}
          </div>
        ) : (
          <table className="table table-sm mb-0 align-middle">
            <thead className="table-light">
              <tr>
                <th style={{ width: 90 }}>{t('missing.col.locale')}</th>
                <th style={{ width: 160 }}>{t('missing.col.namespace')}</th>
                <th>{t('missing.col.key')}</th>
                <th style={{ width: 160 }}>{t('missing.col.seen_at')}</th>
                <th style={{ width: 110 }}>{t('missing.col.status')}</th>
                <th style={{ width: 180 }} className="text-end">{t('missing.col.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.publicId}>
                  <td><span className="badge bg-secondary-transparent">{item.locale}</span></td>
                  <td><code className="fs-12 text-primary">{item.namespace}</code></td>
                  <td><code className="fs-12">{item.key}</code></td>
                  <td className="fs-12 text-muted">{relativeTimeInTimezone(item.seenAt, tz, t)}</td>
                  <td>
                    {item.resolved ? (
                      <span className="badge bg-success-transparent">{t('missing.status.resolved')}</span>
                    ) : (
                      <span className="badge bg-danger-transparent">{t('missing.status.pending')}</span>
                    )}
                  </td>
                  <td className="text-end">
                    {!item.resolved && (
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        disabled={promotingId === item.publicId}
                        onClick={() => handlePromote(item)}
                      >
                        {promotingId === item.publicId ? (
                          <span className="spinner-border spinner-border-sm me-1" />
                        ) : (
                          <i className="ti ti-arrow-up-right me-1" />
                        )}
                        {t('missing.action.promote')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
