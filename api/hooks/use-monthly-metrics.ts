'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
    getMonthlyMetrics,
    type MonthlyMetricsBody,
} from '@/api/endpoints/attendance';
import type { MonthlyMetricsResponse } from '@/api/types';

const QUERY_KEY_PREFIX = ['att', 'metrics', 'monthly'] as const;

/**
 * Fetches monthly attendance metrics for all users (Admin/Manager/HR).
 */
export function useMonthlyMetrics(
    body: MonthlyMetricsBody,
    options?: { enabled?: boolean }
) {
    const client = useApiClient();
    return useQuery({
        queryKey: [...QUERY_KEY_PREFIX, body],
        queryFn: async (): Promise<MonthlyMetricsResponse> => {
            return getMonthlyMetrics(client, body);
        },
        enabled: options?.enabled !== false,
        staleTime: 2 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });
}
