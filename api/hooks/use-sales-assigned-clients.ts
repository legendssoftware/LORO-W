'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import { getSalesAssignedClients } from '@/api/endpoints/user';

export function getSalesAssignedClientsQueryKey(userRef: string | number) {
  return ['user', 'sales-assigned-clients', userRef] as const;
}

export function useSalesAssignedClients(
  userRef: string | number | undefined,
  options?: { enabled?: boolean }
) {
  const client = useApiClient();

  return useQuery({
    queryKey: getSalesAssignedClientsQueryKey(userRef ?? 'none'),
    queryFn: () => getSalesAssignedClients(client, userRef!),
    enabled: options?.enabled !== false && !!userRef,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
