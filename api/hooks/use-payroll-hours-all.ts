'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import { getPayrollHoursAll, type PayrollHoursAllParams } from '@/api/endpoints/attendance';

const QUERY_KEY_PREFIX = ['att', 'payroll-hours', 'all'] as const;

export function getPayrollHoursAllQueryKey(params: PayrollHoursAllParams) {
    return [...QUERY_KEY_PREFIX, params.branchId ?? null] as const;
}

/**
 * Fetches payroll hours for all users (current rolling 26th–25th payroll window).
 * Admin/Manager/HR.
 */
export function usePayrollHoursAll(
    params: PayrollHoursAllParams = {},
    options?: { enabled?: boolean }
) {
    const client = useApiClient();
    const query = useQuery({
        queryKey: getPayrollHoursAllQueryKey(params),
        queryFn: async () => getPayrollHoursAll(client, params),
        enabled: options?.enabled !== false,
        staleTime: 2 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });

    const payrollHoursByUserId = useMemo(() => {
        const map = new Map<number, number>();
        if (query.data?.userMetrics) {
            for (const m of query.data.userMetrics) {
                map.set(m.userId, m.payrollHours);
            }
        }
        return map;
    }, [query.data?.userMetrics]);

    return {
        ...query,
        payrollHoursByUserId,
    };
}
