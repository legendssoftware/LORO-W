'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import { getAttMetricsByUser } from '@/api/endpoints/attendance';
import type { AttendanceMetrics } from '@/api/types';

const QUERY_KEY_PREFIX = ['att', 'metrics', 'user'] as const;

/**
 * Fetches attendance metrics for a specific user (same shape as useAttMetrics).
 * Admin/Manager/HR. Uses GET /att/metrics/:uid.
 */
export function useAttMetricsByUser(
    uid: string | number | null,
    options?: { enabled?: boolean }
) {
    const client = useApiClient();
    return useQuery({
        queryKey: [...QUERY_KEY_PREFIX, uid],
        queryFn: async () => {
            const response = await getAttMetricsByUser(client, uid!);
            return response.metrics as AttendanceMetrics;
        },
        enabled: options?.enabled !== false && uid != null,
        staleTime: 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });
}
