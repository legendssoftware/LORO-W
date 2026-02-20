'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import { getAttStatus, checkIn, checkOut } from '@/api/endpoints/attendance';
import type {
  CheckInBody,
  CheckOutBody,
  AttStatusResponse,
} from '@/api/types';

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
    gcTime: 10 * 60 * 1000,
    refetchInterval: (query) =>
      (query.state.data as AttStatusResponse | undefined)?.checkedIn
        ? 60_000
        : false,
  });
}

/**
 * Check-in mutation. Optimistic update for instant UI; invalidates on success.
 */
export function useCheckInMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CheckInBody) => checkIn(client, body),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData<AttStatusResponse>(QUERY_KEY);
      queryClient.setQueryData<AttStatusResponse>(QUERY_KEY, (old) => ({
        ...(old ?? ({} as AttStatusResponse)),
        checkedIn: true,
        nextAction: 'End Shift',
      }));
      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(QUERY_KEY, context.previous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['att', 'metrics'] });
      queryClient.invalidateQueries({ queryKey: ['att', 'monthly'] });
    },
  });
}

/**
 * Check-out mutation. Optimistic update for instant UI; invalidates on success.
 */
export function useCheckOutMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CheckOutBody) => checkOut(client, body),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData<AttStatusResponse>(QUERY_KEY);
      queryClient.setQueryData<AttStatusResponse>(QUERY_KEY, (old) => ({
        ...(old ?? ({} as AttStatusResponse)),
        checkedIn: false,
        nextAction: 'Start Shift',
      }));
      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(QUERY_KEY, context.previous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['att', 'metrics'] });
      queryClient.invalidateQueries({ queryKey: ['att', 'monthly'] });
    },
  });
}
