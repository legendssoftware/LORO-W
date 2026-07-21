'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import { useOrgId } from '@/lib/org-id-context';
import {
  getPerformanceDashboard,
  type PerformanceDashboardResponse,
} from '@/api/endpoints/performance-dashboard';
import { ytdDateRange } from '@/lib/utils/sales-per-store-match';

const QUERY_KEY = ['reports', 'performance', 'dashboard'] as const;

export function performanceDashboardQueryKey(params?: {
  startDate?: string;
  endDate?: string;
  country?: string;
  organisationId?: string;
}) {
  return [
    ...QUERY_KEY,
    params?.startDate ?? '',
    params?.endDate ?? '',
    params?.country ?? '',
    params?.organisationId ?? '',
  ] as const;
}

export function usePerformanceDashboard(options?: {
  enabled?: boolean;
  country?: string;
  /** When true, uses YTD (Jan 1 → today). Default true for visualiser. */
  ytd?: boolean;
}) {
  const client = useApiClient();
  const orgId = useOrgId();
  const ytd = options?.ytd ?? true;
  const { startDate, endDate } = ytdDateRange();

  return useQuery({
    queryKey: performanceDashboardQueryKey({
      startDate,
      endDate,
      country: options?.country ?? 'ALL',
      organisationId: orgId ?? undefined,
    }),
    queryFn: async (): Promise<PerformanceDashboardResponse | null> => {
      try {
        return await getPerformanceDashboard(client, {
          startDate,
          endDate,
          organisationId: orgId ?? undefined,
          country: options?.country ?? 'ALL',
        });
      } catch {
        return null;
      }
    },
    enabled: (options?.enabled ?? true) && Boolean(orgId),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
