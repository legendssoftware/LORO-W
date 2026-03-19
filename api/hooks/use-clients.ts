'use client';

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import { getClients } from '@/api/endpoints/clients';
import type { ClientListItem } from '@/api/endpoints/clients';

const QUERY_KEY_PREFIX = ['clients'] as const;
const PAGE_SIZE = 100;

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

export function useClientsInfinite(options?: {
  search?: string;
  enabled?: boolean;
}) {
  const client = useApiClient();
  const search = (options?.search ?? '').trim() || undefined;

  const result = useInfiniteQuery({
    queryKey: [...QUERY_KEY_PREFIX, 'infinite', search ?? ''],
    queryFn: async ({ pageParam }) => {
      const res = await getClients(client, {
        page: pageParam,
        limit: PAGE_SIZE,
        search,
      });
      return res;
    },
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.meta;
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: options?.enabled !== false,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const data = result.data?.pages.flatMap((p) => p.data) ?? [];
  return {
    ...result,
    data: data as ClientListItem[],
  };
}
