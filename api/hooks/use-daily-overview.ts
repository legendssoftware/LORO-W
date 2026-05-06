'use client';

import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
    getDailyOverview,
    type DailyOverviewParams,
} from '@/api/endpoints/attendance';
import type { DailyOverviewResponse } from '@/api/types';

/** Prefix for TanStack Query keys and invalidateQueries after attendance changes. */
export const DAILY_OVERVIEW_QUERY_KEY_PREFIX = ['att', 'daily-overview'] as const;

/** Stale time for today's data (changes frequently with check-ins/outs). */
const STALE_TIME_TODAY_MS = 30 * 1000; // 30s
/** Stale time for past dates (immutable). */
const STALE_TIME_PAST_MS = 5 * 60 * 1000; // 5min
/** GC time for past dates (keep in cache longer when navigating). */
const GC_TIME_PAST_MS = 10 * 60 * 1000; // 10min
/** GC time for today. */
const GC_TIME_TODAY_MS = 5 * 60 * 1000; // 5min

/**
 * Returns whether the given date string (YYYY-MM-DD) is today.
 */
function isToday(dateStr: string | undefined): boolean {
    if (!dateStr) return true; // default to today's behavior
    return dateStr === format(new Date(), 'yyyy-MM-dd');
}

/**
 * Fetches daily present/absent users for a specific date.
 * Freshness when today: shorter staleTime plus invalidation from attendance mutations
 * (see use-attendance-mutations). Past dates use longer stale (5min).
 */
export function useDailyOverview(
    params: DailyOverviewParams,
    options?: { enabled?: boolean }
) {
    const client = useApiClient();
    const dateIsToday = isToday(params.date);

    return useQuery({
        queryKey: [...DAILY_OVERVIEW_QUERY_KEY_PREFIX, params],
        queryFn: async (): Promise<DailyOverviewResponse> => {
            return getDailyOverview(client, params);
        },
        enabled: options?.enabled !== false,
        staleTime: dateIsToday ? STALE_TIME_TODAY_MS : STALE_TIME_PAST_MS,
        gcTime: dateIsToday ? GC_TIME_TODAY_MS : GC_TIME_PAST_MS,
        refetchOnWindowFocus: false,
        retry: 3,
        placeholderData: (previousData) => previousData,
    });
}
