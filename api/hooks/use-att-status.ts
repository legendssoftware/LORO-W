'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import { getAttStatus, checkIn, checkOut } from '@/api/endpoints/attendance';
import type { CheckInBody, CheckOutBody } from '@/api/types';

const QUERY_KEY = ['att', 'status'] as const;

/**
 * Fetches current attendance status. Optionally enable only after sync has run.
 */
export function useAttStatus(options?: { enabled?: boolean }) {
  const client = useApiClient();
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => getAttStatus(client),
    enabled: options?.enabled !== false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Check-in mutation. Invalidates att status on success.
 */
export function useCheckInMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CheckInBody) => checkIn(client, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['att', 'metrics'] });
      queryClient.invalidateQueries({ queryKey: ['att', 'monthly'] });
    },
  });
}

/**
 * Check-out mutation. Invalidates att status and metrics on success.
 */
export function useCheckOutMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CheckOutBody) => checkOut(client, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['att', 'metrics'] });
      queryClient.invalidateQueries({ queryKey: ['att', 'monthly'] });
    },
  });
}
