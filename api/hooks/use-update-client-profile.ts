'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
  patchClientProfile,
  type UpdateClientProfilePayload,
} from '@/api/endpoints/client-portal';
import { LINKED_CLIENT_FULL_PROFILE_QUERY_KEY } from '@/api/hooks/use-linked-client-profile';

const SESSION_SYNC_QUERY_KEY = ['session-profile-sync'] as const;

export function useUpdateClientProfile() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateClientProfilePayload) =>
      patchClientProfile(apiClient, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LINKED_CLIENT_FULL_PROFILE_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: SESSION_SYNC_QUERY_KEY });
    },
  });
}
