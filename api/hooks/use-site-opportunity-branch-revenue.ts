'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
  getSiteOpportunityBranchRevenue,
  type GetSiteOpportunitiesParams,
} from '@/api/endpoints/site-opportunities';

const QUERY_KEY = ['reports', 'site-opportunities', 'branch-revenue'] as const;

export function siteOpportunityBranchRevenueQueryKey(
  params: Pick<
    GetSiteOpportunitiesParams,
    'orgId' | 'branchId' | 'userId' | 'startDate' | 'endDate' | 'allTime'
  > | undefined
) {
  return [
    ...QUERY_KEY,
    params?.orgId ?? null,
    params?.branchId ?? null,
    params?.userId ?? null,
    params?.startDate ?? null,
    params?.endDate ?? null,
    params?.allTime ?? null,
  ] as const;
}

/**
 * Fetches ERP branch revenue once per map scope for client-side opportunity scoring.
 */
export function useSiteOpportunityBranchRevenue(
  params: Pick<
    GetSiteOpportunitiesParams,
    'orgId' | 'branchId' | 'userId' | 'startDate' | 'endDate' | 'allTime'
  > | undefined,
  options?: { enabled?: boolean }
) {
  const client = useApiClient();

  return useQuery({
    queryKey: siteOpportunityBranchRevenueQueryKey(params),
    queryFn: ({ signal }) => getSiteOpportunityBranchRevenue(client, params, { signal }),
    enabled: options?.enabled !== false && params != null,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
