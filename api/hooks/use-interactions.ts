'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
  getInteractionsByLead,
  createInteraction,
} from '@/api/endpoints/interactions';
import type { CreateInteractionPayload } from '@/api/types/interactions';

export const INTERACTIONS_QUERY_KEY_PREFIX = ['interactions'] as const;

/**
 * Fetches interactions for a lead (team chat). Enabled only when leadRef is valid.
 */
export function useInteractionsByLead(
  leadRef: number | null | undefined,
  options?: { enabled?: boolean }
) {
  const client = useApiClient();
  return useQuery({
    queryKey: [...INTERACTIONS_QUERY_KEY_PREFIX, 'lead', leadRef ?? 'none'],
    queryFn: async () => getInteractionsByLead(client, leadRef!),
    enabled:
      (options?.enabled !== false) && leadRef != null && leadRef > 0,
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
  });
}

/**
 * Create an interaction. Invalidates lead interactions on success.
 */
export function useCreateInteractionMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateInteractionPayload) =>
      createInteraction(client, payload),
    onSuccess: (_, variables) => {
      if (variables.leadUid != null) {
        queryClient.invalidateQueries({
          queryKey: [...INTERACTIONS_QUERY_KEY_PREFIX, 'lead', variables.leadUid],
        });
        queryClient.refetchQueries({
          queryKey: [...INTERACTIONS_QUERY_KEY_PREFIX, 'lead', variables.leadUid],
        });
      }
    },
  });
}
