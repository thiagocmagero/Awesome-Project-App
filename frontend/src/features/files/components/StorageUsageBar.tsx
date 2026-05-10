import { useTranslation } from 'react-i18next';
import { useStorageUsage } from '../../../hooks/useStorageUsage';

function formatMb(mb: number): string {
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(gb < 10 ? 2 : 1)} GB`;
}

function fillColor(pct: number): string {
  if (pct >= 100) return '#e6533c';
  if (pct >= 90) return '#f5b849';
  return '#845adf';
}

export function StorageUsageBar() {
  const { t } = useTranslation('files');
  const { usedMb, limitMb, percentage, unlimited, loading, error } = useStorageUsage();

  if (loading || error) return null;

  const usedLabel = formatMb(usedMb);
  const limitLabel = formatMb(limitMb);

  return (
    <div
      className="tfiles-storage"
      title={
        unlimited
          ? t('storage_usage.tooltip_unlimited', { used: usedLabel })
          : t('storage_usage.tooltip', { used: usedLabel, limit: limitLabel })
      }
    >
      <div className="tfiles-storage__head">
        <i className="ri-database-2-line" aria-hidden="true" />
        <span className="tfiles-storage__label">
          {unlimited
            ? t('storage_usage.unlimited', { used: usedLabel })
            : t('storage_usage.label', { percent: percentage, total: limitLabel })}
        </span>
      </div>
      <div className="tfiles-storage__track">
        <div
          className="tfiles-storage__fill"
          style={{
            width: unlimited ? '100%' : `${Math.max(percentage, 2)}%`,
            background: unlimited ? '#cdd2da' : fillColor(percentage),
          }}
        />
      </div>
    </div>
  );
}
