'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import { useSessionSync } from '@/api/hooks/use-session-sync';
import { useTokenReady } from '@/api/hooks/use-token-ready';
import {
  getPerformanceDashboard,
  getPerformanceFilterMasterData,
} from '@/api/endpoints/reports-performance';
import type {
  PerformanceDashboardData,
  PerformanceFilters,
  PerformanceMasterData,
} from '@/api/types/reports-performance';
import { defaultQueryRetry } from '@/lib/api/query-error';
import { stableFiltersKey } from '@/app/performance/lib/performance-filters';

export const performanceQueryKeys = {
  all: ['performance'] as const,
  dashboard: (filters: PerformanceFilters, skipCache?: boolean) =>
    [
      'performance',
      'dashboard',
      stableFiltersKey(filters),
      skipCache ? 'skipCache' : 'cached',
    ] as const,
  filters: (filters: PerformanceFilters) =>
    ['performance', 'filters', stableFiltersKey(filters)] as const,
};

export function usePerformanceDashboard(options: {
  filters: PerformanceFilters;
  enabled?: boolean;
  skipCache?: boolean;
}) {
  const client = useApiClient();
  const { isTokenReady } = useTokenReady();
  const { backendUserData } = useSessionSync();
  const organisationId = backendUserData?.organisationRef;

  return useQuery<PerformanceDashboardData>({
    queryKey: performanceQueryKeys.dashboard(options.filters, options.skipCache),
    queryFn: ({ signal }) =>
      getPerformanceDashboard(client, options.filters, {
        skipCache: options.skipCache,
        organisationId,
        signal,
      }),
    enabled: (options.enabled ?? true) && isTokenReady,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: defaultQueryRetry,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

export function usePerformanceMasterData(options: {
  filters: PerformanceFilters;
  enabled?: boolean;
}) {
  const client = useApiClient();
  const { isTokenReady } = useTokenReady();
  const { backendUserData } = useSessionSync();
  const organisationId = backendUserData?.organisationRef;

  return useQuery<PerformanceMasterData>({
    queryKey: performanceQueryKeys.filters(options.filters),
    queryFn: () =>
      getPerformanceFilterMasterData(client, options.filters, { organisationId }),
    enabled: (options.enabled ?? true) && isTokenReady,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: defaultQueryRetry,
  });
}
