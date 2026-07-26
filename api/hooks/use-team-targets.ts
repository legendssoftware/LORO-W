'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
  getTeamTargets,
  type TeamTargetsResponse,
} from '@/api/endpoints/erp-team-targets';

export const TEAM_TARGETS_QUERY_KEY = ['erp', 'team', 'targets'] as const;

export function useTeamTargets(options?: { enabled?: boolean }) {
  const client = useApiClient();
  return useQuery({
    queryKey: TEAM_TARGETS_QUERY_KEY,
    queryFn: async (): Promise<TeamTargetsResponse> => getTeamTargets(client),
    enabled: options?.enabled !== false,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
