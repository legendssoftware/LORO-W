'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
  calculateTakeoffBatch,
  deleteTakeoff,
  getTakeoff,
  getTakeoffSystems,
  issueTakeoff,
  listTakeoffs,
  saveTakeoff,
} from '@/api/endpoints/takeoff';

export const TAKEOFF_QUERY_KEY = ['takeoff'] as const;

export function useTakeoffSystems(enabled = true) {
  const client = useApiClient();
  return useQuery({
    queryKey: [...TAKEOFF_QUERY_KEY, 'systems'],
    queryFn: () => getTakeoffSystems(client),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTakeoffs(enabled = true) {
  const client = useApiClient();
  return useQuery({
    queryKey: [...TAKEOFF_QUERY_KEY, 'list'],
    queryFn: () => listTakeoffs(client),
    enabled,
  });
}

export function useTakeoff(uid: number, enabled = true) {
  const client = useApiClient();
  return useQuery({
    queryKey: [...TAKEOFF_QUERY_KEY, 'detail', uid],
    queryFn: () => getTakeoff(client, uid),
    enabled: enabled && Number.isFinite(uid),
  });
}

export function useTakeoffBatchMutation() {
  const client = useApiClient();
  return useMutation({
    mutationFn: (body: {
      items: Array<{ systemCode: string; inputs: Record<string, number> }>;
      clientUid?: number;
    }) => calculateTakeoffBatch(client, body),
  });
}

export function useSaveTakeoffMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveTakeoff.bind(null, client),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...TAKEOFF_QUERY_KEY, 'list'] });
    },
  });
}

export function useDeleteTakeoffMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uid: number) => deleteTakeoff(client, uid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...TAKEOFF_QUERY_KEY, 'list'] });
    },
  });
}

export function useIssueTakeoffMutation(uid: number) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { priceListType: string; clientUid?: number }) => issueTakeoff(client, uid, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...TAKEOFF_QUERY_KEY, 'list'] });
      queryClient.invalidateQueries({ queryKey: [...TAKEOFF_QUERY_KEY, 'detail', uid] });
    },
  });
}
