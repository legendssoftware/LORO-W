'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import { getClaims } from '@/api/endpoints/claims';
import type { GetClaimsParams } from '@/api/endpoints/claims';

/** Query key prefix for claims. Use for invalidateQueries/refetchQueries after claim mutations. */
export const CLAIMS_QUERY_KEY_PREFIX = ['claims'] as const;

/**
 * Fetches claims list with optional filters (date range, status, pagination).
 * Use createdFrom/createdTo for payroll period to group by day in the modal.
 */
export function useClaims(
  params: GetClaimsParams = {},
  options?: { enabled?: boolean }
) {
  const client = useApiClient();
  return useQuery({
    queryKey: [...CLAIMS_QUERY_KEY_PREFIX, 'list', params],
    queryFn: async () => getClaims(client, params),
    enabled: options?.enabled !== false,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
