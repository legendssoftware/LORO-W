'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
  getAttendanceByDateRange,
  type AttendanceRangeParams,
} from '@/api/endpoints/attendance';

const QUERY_KEY = ['att', 'range'] as const;

/**
 * Fetches attendance (check-ins) for a date range in one request.
 * Use this instead of calling GET /att/date/:date in a loop to avoid N+1.
 */
export function useAttendanceByDateRange(
  params: AttendanceRangeParams | null,
  options?: { enabled?: boolean }
) {
  const client = useApiClient();
  return useQuery({
    queryKey: [...QUERY_KEY, params?.startDate, params?.endDate, params?.orgId],
    queryFn: () => getAttendanceByDateRange(client, params!),
    enabled:
      (options?.enabled !== false) &&
      params != null &&
      !!params.startDate &&
      !!params.endDate,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
