'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import { getUsers } from '@/api/endpoints/user';

const QUERY_KEY = ['users'] as const;

/**
 * Fetches org-scoped user list (GET /user) for dropdowns and multi-select UIs.
 */
export function useUsers(options?: {
  enabled?: boolean;
  page?: number;
  limit?: number;
  search?: string;
  branchId?: number;
}) {
  const client = useApiClient();
  return useQuery({
    queryKey: [
      ...QUERY_KEY,
      options?.page ?? 1,
      options?.limit ?? 100,
      options?.search ?? '',
      options?.branchId ?? null,
    ],
    queryFn: async () => {
      const res = await getUsers(client, {
        page: options?.page ?? 1,
        limit: options?.limit ?? 100,
        search: options?.search,
        ...(options?.branchId != null ? { branchId: options.branchId } : {}),
      });
      return Array.isArray(res?.data) ? res.data : [];
    },
    enabled: options?.enabled !== false,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
