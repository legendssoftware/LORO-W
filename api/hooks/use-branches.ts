'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import { getBranches } from '@/api/endpoints/branch';
export { getBranchDisplayLabel } from '@/api/types/branch';

const QUERY_KEY = ['branches'] as const;

/**
 * Fetches org-scoped branch list (GET /branch) for dropdowns and selection UIs.
 */
export function useBranches(options?: { enabled?: boolean }) {
  const client = useApiClient();
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await getBranches(client);
      return res.branches ?? [];
    },
    enabled: options?.enabled !== false,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
