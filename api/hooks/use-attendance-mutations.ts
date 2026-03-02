'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import { checkIn, checkOut, manageBreak } from '@/api/endpoints/attendance';
import type { CheckInBody, CheckOutBody, BreakBody } from '@/api/types';

const ATT_STATUS_QUERY_KEY = ['att-status'] as const;
const ATT_METRICS_QUERY_KEY = ['att', 'metrics'] as const;

/**
 * Mutation for starting a shift (attendance check-in).
 * Calls POST /att/in - does NOT create a visit.
 */
export function useAttCheckInMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CheckInBody) => {
      const data = await checkIn(client, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ATT_STATUS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ATT_METRICS_QUERY_KEY });
    },
  });
}

/**
 * Mutation for ending a shift (attendance check-out).
 * Calls POST /att/out - does NOT affect visits.
 */
export function useAttCheckOutMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CheckOutBody) => {
      const data = await checkOut(client, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ATT_STATUS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ATT_METRICS_QUERY_KEY });
    },
  });
}

/**
 * Mutation for starting or ending a break.
 * Calls POST /att/break.
 */
export function useBreakMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: BreakBody) => {
      const data = await manageBreak(client, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ATT_STATUS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ATT_METRICS_QUERY_KEY });
    },
  });
}
