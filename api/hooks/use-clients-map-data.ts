'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import { getClientsMapData } from '@/api/endpoints/clients';
import type { ClientListItem } from '@/api/types/clients';

export const CLIENTS_MAP_DATA_QUERY_KEY = ['clients', 'map-data'] as const;

/**
 * Fast client pins for the visualiser (GET /clients/map-data).
 */
export function useClientsMapData(options?: { enabled?: boolean }) {
  const client = useApiClient();
  return useQuery({
    queryKey: CLIENTS_MAP_DATA_QUERY_KEY,
    queryFn: async (): Promise<ClientListItem[]> => getClientsMapData(client),
    enabled: options?.enabled !== false,
    staleTime: 2 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
