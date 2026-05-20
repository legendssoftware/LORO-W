'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import { useSessionSync } from '@/api/hooks/use-session-sync';
import { getLinkedClientMe } from '@/api/endpoints/client-portal';
import { isClientMode } from '@/lib/user-mode';

export const LINKED_CLIENT_FULL_PROFILE_QUERY_KEY = [
  'linkedClientFullProfile',
] as const;

export function useLinkedClientProfile(options?: { enabled?: boolean }) {
  const apiClient = useApiClient();
  const { backendUserData: profile } = useSessionSync();
  const isClient = isClientMode(profile);

  return useQuery({
    queryKey: LINKED_CLIENT_FULL_PROFILE_QUERY_KEY,
    queryFn: () => getLinkedClientMe(apiClient),
    enabled: (options?.enabled ?? true) && isClient,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}
