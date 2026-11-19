'use client';

import type { MutableRefObject } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import { useSessionSync } from '@/api/hooks/use-session-sync';
import { useTokenReady } from '@/api/hooks/use-token-ready';
import { getPerformanceSalesPace } from '@/api/endpoints/reports-performance';
import type { PerformanceFilters, SalesPaceGrain } from '@/api/types/reports-performance';
import { defaultQueryRetry } from '@/lib/api/query-error';
import { stableCountriesKey } from '@/app/performance/lib/performance-countries';

/** Page date range is omitted. The server always uses the current month or year. */
export function salesPaceQueryKey(filters: PerformanceFilters, grain: SalesPaceGrain) {
  return [
    'performance',
    'sales-pace',
    grain,
    stableCountriesKey(filters.countries),
    (filters.branchIds ?? []).slice().sort().join(','),
    (filters.salesPersonIds ?? []).slice().sort().join(','),
    (filters.paymentMethodIds ?? []).slice().sort().join(','),
    filters.product?.category ?? '',
    (filters.product?.productIds ?? []).slice().sort().join(','),
    filters.priceRange?.min ?? '',
    filters.priceRange?.max ?? '',
    filters.location?.county ?? '',
    filters.location?.province ?? '',
    filters.location?.city ?? '',
    filters.location?.suburb ?? '',
    (filters.includeCustomerCategories ?? []).slice().sort().join(','),
    (filters.excludeCustomerCategories ?? []).slice().sort().join(','),
  ] as const;
}

export function usePerformanceSalesPace(options: {
  filters: PerformanceFilters;
  grain: SalesPaceGrain;
  enabled?: boolean;
  skipCacheRef: MutableRefObject<boolean>;
}) {
  const client = useApiClient();
  const { isTokenReady } = useTokenReady();
  const { backendUserData } = useSessionSync();
  const organisationId = backendUserData?.organisationRef;
  const skipCacheRef = options.skipCacheRef;

  return useQuery({
    queryKey: salesPaceQueryKey(options.filters, options.grain),
    queryFn: ({ signal }) =>
      getPerformanceSalesPace(client, options.filters, options.grain, {
        skipCache: skipCacheRef.current,
        organisationId,
        signal,
      }),
    enabled: (options.enabled ?? true) && isTokenReady,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: defaultQueryRetry,
  });
}
