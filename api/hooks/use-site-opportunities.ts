'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
  getSiteOpportunities,
  type GetSiteOpportunitiesParams,
} from '@/api/endpoints/site-opportunities';
import type { SiteOpportunityResult } from '@/api/types/site-opportunity';

const QUERY_KEY = ['reports', 'site-opportunities'] as const;

export function siteOpportunitiesQueryKey(params: GetSiteOpportunitiesParams | undefined) {
  return [
    ...QUERY_KEY,
    params?.orgId ?? null,
    params?.branchId ?? null,
    params?.userId ?? null,
    params?.startDate ?? null,
    params?.endDate ?? null,
    params?.allTime ?? null,
    params?.region ?? null,
    params?.businessType ?? null,
    params?.mode ?? null,
    params?.settings?.radiusMeters ?? null,
    params?.settings?.topN ?? null,
    params?.settings?.minBranchSeparationKm ?? null,
    params?.settings?.captureLowPct ?? null,
    params?.settings?.captureHighPct ?? null,
  ] as const;
}

/**
 * Fetches server-computed site opportunities when the visualiser "Suggested areas" toggle is on.
 * staleTime 0 ensures re-toggling always refetches from the server.
 */
export function useSiteOpportunities(
  params?: GetSiteOpportunitiesParams,
  options?: { enabled?: boolean }
) {
  const client = useApiClient();

  return useQuery({
    queryKey: siteOpportunitiesQueryKey(params),
    queryFn: ({ signal }): Promise<SiteOpportunityResult> =>
      getSiteOpportunities(client, params, { signal }),
    enabled: options?.enabled !== false,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
