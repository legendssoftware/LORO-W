'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import { getMonthlyAttendance } from '@/api/endpoints/attendance';
import type { MonthlyAttendanceResponse } from '@/api/types/attendance';

const QUERY_KEY = ['att', 'monthly'] as const;

/** Accept the calendar body, or a `{ data: calendar }` wrapper, so the UI can render either shape. */
function unwrapMonthlyAttendance(payload: unknown): MonthlyAttendanceResponse | null {
  if (payload == null || typeof payload !== 'object') return null;
  const record = payload as MonthlyAttendanceResponse & { data?: MonthlyAttendanceResponse };
  if (Array.isArray(record.days)) return record;
  if (record.data != null && Array.isArray(record.data.days)) return record.data;
  return null;
}

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
    queryFn: async () => {
      const started = performance.now();
      console.log('[attendance-month] request', { ref, year: y, month: m });
      try {
        const raw = await getMonthlyAttendance(client, ref!, {
          year: y,
          month: m,
          includeDistance: false,
        });
        const body = unwrapMonthlyAttendance(raw);
        console.log('[attendance-month] response', {
          ref,
          year: y,
          month: m,
          ms: Math.round(performance.now() - started),
          rawType: raw == null ? 'null' : typeof raw,
          rawKeys: raw != null && typeof raw === 'object' ? Object.keys(raw) : [],
          responseYear: body?.year ?? null,
          responseMonth: body?.month ?? null,
          days: body?.days?.length ?? null,
        });
        if (body == null) {
          throw new Error('Monthly attendance response did not include days');
        }
        return body;
      } catch (error) {
        console.error('[attendance-month] request failed', {
          ref,
          year: y,
          month: m,
          ms: Math.round(performance.now() - started),
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
    enabled: (options?.enabled !== false) && ref != null && String(ref).length > 0,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
