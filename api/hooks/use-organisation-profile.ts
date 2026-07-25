'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import { getOrganisation } from '@/api/endpoints/organisation';
import type { OrganisationProfile } from '@/api/types/organisation';
import { settingsOrgProfileKey } from '@/api/query-keys/settings';

/**
 * Organisation profile (GET /org/:ref) — used for HQ coordinates / branding.
 */
export function useOrganisationProfile(
  orgRef: string | null | undefined,
  options?: { enabled?: boolean }
) {
  const client = useApiClient();
  const ref = (orgRef ?? '').trim();
  const enabled = options?.enabled !== false && ref.length > 0;

  return useQuery({
    queryKey: settingsOrgProfileKey(ref),
    queryFn: async (): Promise<OrganisationProfile | null> => {
      const res = await getOrganisation(client, ref);
      return res.organisation ?? null;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
