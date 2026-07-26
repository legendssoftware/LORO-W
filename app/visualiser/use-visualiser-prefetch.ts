'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useApiClient } from '@/api/hooks/use-api-client';
import { COMPETITORS_MAP_DATA_QUERY_KEY } from '@/api/hooks/use-competitors-map-data';
import { CLIENTS_MAP_DATA_QUERY_KEY } from '@/api/hooks/use-clients-map-data';
import { getCompetitorsMapData } from '@/api/endpoints/competitors';
import { getClientsMapData } from '@/api/endpoints/clients';
import { getBranches } from '@/api/endpoints/branch';
import { getLatestRepLocations } from '@/api/endpoints/tracking';
import { getOrganisation } from '@/api/endpoints/organisation';
import { BRANCHES_QUERY_KEY } from '@/api/hooks/use-branches';
import { latestRepLocationsQueryKey } from '@/api/hooks/use-latest-rep-locations';
import { settingsOrgProfileKey } from '@/api/query-keys/settings';

/**
 * Prefetch visualiser layer endpoints so the map mounts with warm caches.
 */
export function useVisualiserPrefetch(options: {
  enabled: boolean;
  visualiserMode: 'org' | 'self';
  profile: { organisationRef?: string | null; organisation?: { ref?: string } | null } | null;
}) {
  const { enabled, profile } = options;
  const client = useApiClient();
  const queryClient = useQueryClient();
  const orgRef =
    (profile?.organisationRef ?? profile?.organisation?.ref ?? '').trim();

  useEffect(() => {
    if (!enabled) return;

    void queryClient.prefetchQuery({
      queryKey: COMPETITORS_MAP_DATA_QUERY_KEY,
      queryFn: () => getCompetitorsMapData(client),
      staleTime: 2 * 60 * 1000,
    });

    void queryClient.prefetchQuery({
      queryKey: CLIENTS_MAP_DATA_QUERY_KEY,
      queryFn: () => getClientsMapData(client),
      staleTime: 2 * 60 * 1000,
    });

    void queryClient.prefetchQuery({
      queryKey: BRANCHES_QUERY_KEY,
      queryFn: async () => {
        const res = await getBranches(client);
        return res.branches ?? [];
      },
      staleTime: 5 * 60 * 1000,
    });

    void queryClient.prefetchQuery({
      queryKey: latestRepLocationsQueryKey({ maxAgeHours: 8 }),
      queryFn: async () => {
        const response = await getLatestRepLocations(client, { maxAgeHours: 8 });
        return response.data;
      },
      staleTime: 15_000,
    });

    if (orgRef) {
      void queryClient.prefetchQuery({
        queryKey: settingsOrgProfileKey(orgRef),
        queryFn: async () => {
          const res = await getOrganisation(client, orgRef);
          return res.organisation ?? null;
        },
        staleTime: 5 * 60 * 1000,
      });
    }
  }, [enabled, client, queryClient, orgRef]);
}
