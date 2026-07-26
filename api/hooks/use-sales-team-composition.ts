'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
  getSalesTeamComposition,
  type SalesTeamCompositionResponse,
} from '@/api/endpoints/user-team-composition';

export const SALES_TEAM_COMPOSITION_QUERY_KEY = [
  'user',
  'team-composition',
] as const;

/**
 * Sales team composition (male/female + internal/external) for Reports Overview.
 */
export function useSalesTeamComposition(options?: {
  enabled?: boolean;
  branchId?: number;
}) {
  const client = useApiClient();
  return useQuery<SalesTeamCompositionResponse>({
    queryKey: [
      ...SALES_TEAM_COMPOSITION_QUERY_KEY,
      options?.branchId ?? null,
    ],
    queryFn: () =>
      getSalesTeamComposition(client, {
        ...(options?.branchId != null ? { branchId: options.branchId } : {}),
      }),
    enabled: options?.enabled !== false,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}
