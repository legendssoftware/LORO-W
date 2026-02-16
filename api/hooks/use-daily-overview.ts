'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
    getDailyOverview,
    type DailyOverviewParams,
} from '@/api/endpoints/attendance';
import type { DailyOverviewResponse } from '@/api/types';

const QUERY_KEY_PREFIX = ['att', 'daily-overview'] as const;

/**
 * Fetches daily present/absent users for a specific date.
 */
export function useDailyOverview(
    params: DailyOverviewParams,
    options?: { enabled?: boolean }
) {
    const client = useApiClient();
    return useQuery({
        queryKey: [...QUERY_KEY_PREFIX, params],
        queryFn: async (): Promise<DailyOverviewResponse> => {
            return getDailyOverview(client, params);
        },
        enabled: options?.enabled !== false,
        staleTime: 1 * 60 * 1000,
        gcTime: 5 * 60 * 1000,
    });
}
