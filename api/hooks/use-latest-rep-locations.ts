'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
  getLatestRepLocations,
  type GetLatestRepLocationsParams,
} from '@/api/endpoints/tracking';
import type { LatestRepLocationsData } from '@/api/types/tracking';

const LATEST_REP_LOCATIONS_QUERY_KEY = ['gps', 'locations', 'latest'] as const;

export function latestRepLocationsQueryKey(
  params?: GetLatestRepLocationsParams
) {
  return [...LATEST_REP_LOCATIONS_QUERY_KEY, params?.maxAgeHours ?? 2] as const;
}

export function useLatestRepLocations(
  params?: GetLatestRepLocationsParams,
  options?: { enabled?: boolean }
) {
  const client = useApiClient();
  const enabled = options?.enabled !== false;

  return useQuery({
    queryKey: latestRepLocationsQueryKey(params),
    queryFn: async (): Promise<LatestRepLocationsData | null> => {
      const response = await getLatestRepLocations(client, params);
      return response.data;
    },
    enabled,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: enabled ? 60_000 : false,
    refetchOnWindowFocus: false,
  });
}
