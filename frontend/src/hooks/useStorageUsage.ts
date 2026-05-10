import { useCallback, useEffect, useState } from 'react';
import { apiFetch, getApiBase } from '../lib/api';
import { LimitKey } from '../lib/entitlements';

interface UsageSummaryItem {
  usageKey: string;
  current: number;
  limit: number;
  percentage: number;
  description: string | null;
}

export interface StorageUsage {
  usedMb: number;
  limitMb: number;
  percentage: number;
  unlimited: boolean;
  loading: boolean;
  error: boolean;
  refresh: () => Promise<void>;
}

export function useStorageUsage(): StorageUsage {
  const [usedMb, setUsedMb] = useState(0);
  const [limitMb, setLimitMb] = useState(0);
  const [percentage, setPercentage] = useState(0);
  const [unlimited, setUnlimited] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchUsage = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await apiFetch(`${getApiBase()}/usage/my`);
      if (!res.ok) {
        setError(true);
        return;
      }
      const items: UsageSummaryItem[] = await res.json();
      const storage = items.find((i) => i.usageKey === LimitKey.MAX_STORAGE_MB);
      if (!storage) {
        setError(true);
        return;
      }
      setUsedMb(storage.current);
      setLimitMb(storage.limit);
      setUnlimited(storage.limit === -1);
      setPercentage(storage.limit === -1 ? 0 : Math.min(storage.percentage, 100));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUsage();
  }, [fetchUsage]);

  return { usedMb, limitMb, percentage, unlimited, loading, error, refresh: fetchUsage };
}
