'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
  calculateInspectionScore,
  createInspection,
  getInspectionTemplates,
  getInspections,
} from '@/api/endpoints/journal';

export const INSPECTIONS_QUERY_KEY = ['journal', 'inspections'] as const;

export function useInspections(options?: { enabled?: boolean }) {
  const client = useApiClient();
  return useQuery({
    queryKey: INSPECTIONS_QUERY_KEY,
    queryFn: () => getInspections(client),
    enabled: options?.enabled !== false,
    staleTime: 60 * 1000,
  });
}

export function useInspectionTemplates(options?: { enabled?: boolean }) {
  const client = useApiClient();
  return useQuery({
    queryKey: ['journal', 'templates'],
    queryFn: () => getInspectionTemplates(client),
    enabled: options?.enabled !== false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateInspectionMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof createInspection>[1]) => createInspection(client, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSPECTIONS_QUERY_KEY });
    },
  });
}

export function useCalculateInspectionScoreMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ref: number) => calculateInspectionScore(client, ref),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSPECTIONS_QUERY_KEY });
    },
  });
}
