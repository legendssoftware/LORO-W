'use client';

import { useAuth } from '@clerk/nextjs';
import { useQuery, type QueryClient } from '@tanstack/react-query';
import type {
  UseCheckInsParams,
  UseCheckInsResult,
  VisitListItem,
  CheckInStatusResponse,
} from '@/api/types/visits';

const DEFAULT_API_URL = process.env.NEXT_PUBLIC_API_URL || '';

/** Query key prefix for check-ins list. Use for invalidateQueries/refetchQueries after start, edit, or end visit. */
export const CHECK_INS_LIST_QUERY_KEY = ['check-ins'] as const;

/** Query key for current user check-in status (used for invalidate/refetch after start or end visit). */
export const CHECK_IN_STATUS_QUERY_KEY = ['check-in-status'] as const;

export function checkInsListQueryKey(params?: UseCheckInsParams) {
  return [
    ...CHECK_INS_LIST_QUERY_KEY,
    params?.startDate,
    params?.endDate,
    params?.userUid,
    params?.branchId,
  ] as const;
}

async function fetchCheckIns(
  token: string | null,
  params?: UseCheckInsParams
): Promise<{ message: string; checkIns: VisitListItem[] }> {
  if (!token) throw new Error('Not authenticated');
  const url = new URL(`${DEFAULT_API_URL}/check-ins`.replace(/\/$/, ''));
  if (params?.startDate) url.searchParams.set('startDate', params.startDate);
  if (params?.endDate) url.searchParams.set('endDate', params.endDate);
  if (params?.userUid) url.searchParams.set('userUid', params.userUid);
  if (params?.branchId != null) url.searchParams.set('branchId', String(params.branchId));
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || res.statusText || 'Failed to fetch check-ins');
  }
  return res.json();
}

/** Longer stale time when the range ends before today (immutable historical data). */
function checkInsStaleTimeMs(params?: UseCheckInsParams): number {
  if (!params?.endDate) return 60 * 1000;
  const endMs = new Date(params.endDate).getTime();
  if (!Number.isFinite(endMs)) return 60 * 1000;
  const now = new Date();
  const todayStartMs = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  );
  return endMs < todayStartMs ? 5 * 60 * 1000 : 60 * 1000;
}

/**
 * Warms the same cache entry as useCheckIns (e.g. Reports idle prefetch).
 */
export function prefetchCheckInsList(
  queryClient: QueryClient,
  getToken: () => Promise<string | null | undefined>,
  params?: UseCheckInsParams
): Promise<void> {
  if (!DEFAULT_API_URL) return Promise.resolve();
  return queryClient.prefetchQuery({
    queryKey: checkInsListQueryKey(params),
    queryFn: async () => {
      const token = await getToken();
      return fetchCheckIns(token ?? null, params);
    },
    staleTime: checkInsStaleTimeMs(params),
  });
}

export function useCheckIns(
  params?: UseCheckInsParams,
  options?: { enabled?: boolean }
): UseCheckInsResult {
  const { getToken } = useAuth();
  const query = useQuery({
    queryKey: checkInsListQueryKey(params),
    queryFn: async () => {
      const token = await getToken();
      return fetchCheckIns(token, params);
    },
    enabled: options?.enabled !== false && !!DEFAULT_API_URL,
    staleTime: checkInsStaleTimeMs(params),
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}

/** @deprecated Prefer useCheckIns — kept as alias for list consumers. */
export function useCheckInsListReport(
  params?: UseCheckInsParams,
  options?: { enabled?: boolean }
): UseCheckInsResult {
  return useCheckIns(params, options);
}

export function useCheckInStatus(options?: { enabled?: boolean }) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: CHECK_IN_STATUS_QUERY_KEY,
    queryFn: async (): Promise<CheckInStatusResponse> => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const res = await fetch(`${DEFAULT_API_URL}/check-ins/status/me`.replace(/([^:]\/)\/+/g, '$1'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || res.statusText || 'Failed to get status');
      return data;
    },
    enabled: options?.enabled !== false && !!DEFAULT_API_URL,
  });
}
