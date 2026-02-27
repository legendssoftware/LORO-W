'use client';

import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import { getAttMetricsByUser } from '@/api/endpoints/attendance';

const QUERY_KEY_PREFIX = ['att', 'metrics', 'batch'] as const;

/**
 * Fetches attendance metrics for multiple users via GET /att/metrics/:uid per user.
 * Same endpoint family as dashboard's useAttMetrics. Returns payrollHours from
 * metrics.totalHours.payrollHours (same extraction as dashboard).
 */
export function useAttMetricsBatch(
    userIds: number[],
    options?: { enabled?: boolean }
) {
    const client = useApiClient();
    const queries = useQueries({
        queries: userIds.map((userId) => ({
            queryKey: [...QUERY_KEY_PREFIX, userId] as const,
            queryFn: async () => {
                const response = await getAttMetricsByUser(client, userId);
                return response.metrics?.totalHours?.payrollHours ?? 0;
            },
            enabled: options?.enabled !== false && userIds.length > 0,
            staleTime: 60 * 1000,
            gcTime: 10 * 60 * 1000,
        })),
    });

    const payrollHoursByUserId = useMemo(() => {
        const map = new Map<number, number>();
        queries.forEach((q, i) => {
            const userId = userIds[i];
            if (userId != null && q.data != null) {
                map.set(userId, q.data);
            }
        });
        return map;
    }, [queries, userIds]);

    const isLoading = queries.some((q) => q.isLoading);
    const isError = queries.some((q) => q.isError);

    return {
        payrollHoursByUserId,
        isLoading,
        isError,
        queries,
    };
}
