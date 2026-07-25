'use client';

import { useQuery } from '@tanstack/react-query';
import { getDailyOverview } from '@/api/endpoints/attendance';
import type { DailyOverviewResponse } from '@/api/types/attendance';
import { useApiClient } from './use-api-client';

export const DAILY_OVERVIEW_QUERY_KEY_PREFIX = ['att', 'daily-overview'] as const;

export function useDailyOverview(
  params: { date: string },
  options?: { enabled?: boolean }
) {
  const client = useApiClient();
  return useQuery({
    queryKey: [...DAILY_OVERVIEW_QUERY_KEY_PREFIX, params],
    queryFn: (): Promise<DailyOverviewResponse> => getDailyOverview(client, params),
    enabled: options?.enabled !== false && !!params.date,
    staleTime: 30 * 1000,
  });
}
