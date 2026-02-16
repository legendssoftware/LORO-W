'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
    getAttendanceReport,
    type AttendanceReportParams,
} from '@/api/endpoints/attendance';
import type { AttendanceReportResponse } from '@/api/types';

const QUERY_KEY_PREFIX = ['att', 'report'] as const;

/**
 * Fetches organization attendance report (date range, per-user metrics).
 * Enable for staff (Admin/Manager/HR) with date range set.
 */
export function useAttendanceReport(
    params: AttendanceReportParams,
    options?: { enabled?: boolean }
) {
    const client = useApiClient();
    return useQuery({
        queryKey: [...QUERY_KEY_PREFIX, params],
        queryFn: async (): Promise<AttendanceReportResponse> => {
            return getAttendanceReport(client, params);
        },
        enabled: options?.enabled !== false && !!params.dateFrom && !!params.dateTo,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });
}
