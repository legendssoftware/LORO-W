'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import { getFeedbackStats, listFeedback, updateFeedback } from '@/api/endpoints/feedback';

export function useFeedbackInbox(status: string | undefined, options?: { enabled?: boolean }) {
  const client = useApiClient();
  return useQuery({
    queryKey: ['feedback', status ?? 'all'],
    queryFn: () => listFeedback(client, { status, limit: 50 }),
    enabled: options?.enabled !== false,
  });
}

export function useFeedbackStats(organisationId: number | string | undefined, options?: { enabled?: boolean }) {
  const client = useApiClient();
  return useQuery({
    queryKey: ['feedback', 'stats', organisationId ?? 'none'],
    queryFn: () => getFeedbackStats(client, organisationId!),
    enabled: options?.enabled !== false && organisationId != null,
  });
}

export function useUpdateFeedbackMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => updateFeedback(client, id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feedback'] }),
  });
}
