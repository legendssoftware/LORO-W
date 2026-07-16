'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
  getStoreMonthlyYtd,
  normalizeStoreMonthlyYtd,
  type BranchMonthlySalesPoint,
} from '@/api/endpoints/performance-dashboard';

const QUERY_KEY = ['reports', 'performance', 'store-monthly-ytd'] as const;

export function storeMonthlyYtdQueryKey(chartStoreId?: string) {
  return [...QUERY_KEY, chartStoreId ?? ''] as const;
}

export function useStoreMonthlyYtd(
  chartStoreId: string | undefined,
  options?: { enabled?: boolean }
) {
  const client = useApiClient();
  const enabled = Boolean(chartStoreId) && (options?.enabled ?? true);

  return useQuery({
    queryKey: storeMonthlyYtdQueryKey(chartStoreId),
    queryFn: async (): Promise<BranchMonthlySalesPoint[]> => {
      if (!chartStoreId) return [];
      const data = await getStoreMonthlyYtd(client, { chartStoreId });
      return normalizeStoreMonthlyYtd(data);
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
