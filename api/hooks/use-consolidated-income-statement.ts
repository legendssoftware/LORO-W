'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import { useSessionSync } from '@/api/hooks/use-session-sync';
import { useTokenReady } from '@/api/hooks/use-token-ready';
import { getConsolidatedIncomeStatement } from '@/api/endpoints/reports-performance';
import type {
  ConsolidatedIncomeStatementData,
  PerformanceFilters,
} from '@/api/types/reports-performance';
import { defaultQueryRetry } from '@/lib/api/query-error';
import { stableFiltersKey } from '@/app/performance/lib/performance-filters';

export const consolidatedIncomeStatementQueryKeys = {
  all: ['consolidated-income-statement'] as const,
  byFilters: (filters: PerformanceFilters) =>
    ['consolidated-income-statement', stableFiltersKey(filters)] as const,
};

export function useConsolidatedIncomeStatement(options: {
  filters: PerformanceFilters;
  enabled?: boolean;
}) {
  const client = useApiClient();
  const { isTokenReady } = useTokenReady();
  const { backendUserData } = useSessionSync();
  const organisationId = backendUserData?.organisationRef;
  const hasDateRange = Boolean(
    options.filters.dateRange?.startDate && options.filters.dateRange?.endDate
  );

  return useQuery<ConsolidatedIncomeStatementData>({
    queryKey: consolidatedIncomeStatementQueryKeys.byFilters(options.filters),
    queryFn: () =>
      getConsolidatedIncomeStatement(client, options.filters, { organisationId }),
    enabled: (options.enabled ?? true) && isTokenReady && hasDateRange,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: defaultQueryRetry,
    refetchOnWindowFocus: false,
  });
}
