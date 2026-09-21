'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
  getPulseCorrelations,
  getPulseDaily,
  getPulseExecutive,
  getPulseInsights,
  getPulseMe,
  submitPulse,
} from '@/api/endpoints/pulse';
import type { PulseSubmitBody } from '@/api/types/pulse';

export const PULSE_ME_QUERY_KEY = ['pulse', 'me'] as const;
export const PULSE_DAILY_QUERY_KEY = ['pulse', 'daily'] as const;

export function usePulseMe(enabled = true) {
  const client = useApiClient();
  return useQuery({
    queryKey: PULSE_ME_QUERY_KEY,
    queryFn: () => getPulseMe(client),
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useSubmitPulseMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: PulseSubmitBody) => submitPulse(client, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulse'] });
    },
  });
}

export function usePulseDaily(params: { date?: string; branchUid?: number }, enabled = true) {
  const client = useApiClient();
  return useQuery({
    queryKey: [...PULSE_DAILY_QUERY_KEY, params],
    queryFn: () => getPulseDaily(client, params),
    enabled,
  });
}

export function usePulseInsights(
  params: { from?: string; to?: string; branchUid?: number },
  enabled = true
) {
  const client = useApiClient();
  return useQuery({
    queryKey: ['pulse', 'insights', params],
    queryFn: () => getPulseInsights(client, params),
    enabled,
  });
}

export function usePulseExecutive(
  params: { from?: string; to?: string; branchUid?: number },
  enabled = true
) {
  const client = useApiClient();
  return useQuery({
    queryKey: ['pulse', 'executive', params],
    queryFn: () => getPulseExecutive(client, params),
    enabled,
  });
}

export function usePulseCorrelations(
  params: { from?: string; to?: string; branchUid?: number },
  enabled = true
) {
  const client = useApiClient();
  return useQuery({
    queryKey: ['pulse', 'correlations', params],
    queryFn: () => getPulseCorrelations(client, params),
    enabled,
  });
}
