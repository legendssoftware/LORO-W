'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import { getClients } from '@/api/endpoints/clients';

const QUERY_KEY_PREFIX = ['clients'] as const;

export function useClients(options?: {
  page?: number;
  limit?: number;
  search?: string;
  enabled?: boolean;
}) {
  const client = useApiClient();
  return useQuery({
    queryKey: [...QUERY_KEY_PREFIX, options?.page ?? 1, options?.limit ?? 500, options?.search ?? ''],
    queryFn: async () => {
      const res = await getClients(client, {
        page: options?.page ?? 1,
        limit: options?.limit ?? 500,
        search: options?.search,
      });
      return res.data;
    },
    enabled: options?.enabled !== false,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
