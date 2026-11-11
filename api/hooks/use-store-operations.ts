'use client';

import { useQuery } from '@tanstack/react-query';
import { getStoreOperationsDashboard } from '@/api/endpoints/store-operations';
import type { StoreOperationsDashboardQuery } from '@/api/types/store-operations';
import { useApiClient } from '@/api/hooks/use-api-client';

export const STORE_OPERATIONS_QUERY_KEY = ['store-operations'] as const;

/**
 * Live dashboard. The server cache is 30 seconds, so the query stays fresh for the same window.
 * @param query Date, country, and region
 * @param enabled False until the token and the role check are ready
 */
export function useStoreOperationsDashboard(query: StoreOperationsDashboardQuery, enabled = true) {
  const client = useApiClient();
  return useQuery({
    queryKey: [
      ...STORE_OPERATIONS_QUERY_KEY,
      'dashboard',
      query.date ?? null,
      query.country ?? null,
      query.region ?? null,
    ],
    queryFn: () => getStoreOperationsDashboard(client, query),
    enabled,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}
