'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import { getMonthlyAttendance } from '@/api/endpoints/attendance';

const QUERY_KEY = ['att', 'monthly'] as const;

/**
 * Fetches monthly attendance calendar for a user. Ref is typically profile.uid.
 */
export function useMonthlyAttendance(
  ref: string | number | null | undefined,
  year?: number,
  month?: number,
  options?: { enabled?: boolean }
) {
  const client = useApiClient();
  const y = year ?? new Date().getFullYear();
  const m = month ?? new Date().getMonth() + 1;
  return useQuery({
    queryKey: [...QUERY_KEY, ref, y, m],
    queryFn: () => getMonthlyAttendance(client, ref!, { year: y, month: m }),
    enabled: (options?.enabled !== false) && ref != null && String(ref).length > 0,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 10 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
