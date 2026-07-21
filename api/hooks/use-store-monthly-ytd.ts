'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import { useOrgId } from '@/lib/org-id-context';
import {
  getStoreMonthlyYtd,
  normalizeStoreMonthlyYtd,
  type BranchMonthlySalesPoint,
} from '@/api/endpoints/performance-dashboard';

const QUERY_KEY = ['reports', 'performance', 'store-monthly-ytd'] as const;

export function storeMonthlyYtdQueryKey(
  chartStoreId?: string,
  organisationId?: string
) {
  return [...QUERY_KEY, chartStoreId ?? '', organisationId ?? ''] as const;
}

export function useStoreMonthlyYtd(
  chartStoreId: string | undefined,
  options?: { enabled?: boolean }
) {
  const client = useApiClient();
  const orgId = useOrgId();
  const enabled =
    Boolean(chartStoreId) && Boolean(orgId) && (options?.enabled ?? true);

  return useQuery({
    queryKey: storeMonthlyYtdQueryKey(chartStoreId, orgId ?? undefined),
    queryFn: async (): Promise<BranchMonthlySalesPoint[]> => {
      if (!chartStoreId || !orgId) return [];
      const data = await getStoreMonthlyYtd(client, {
        chartStoreId,
        organisationId: orgId,
      });
      return normalizeStoreMonthlyYtd(data);
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
