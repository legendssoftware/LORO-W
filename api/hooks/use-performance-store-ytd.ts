'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import { useSessionSync } from '@/api/hooks/use-session-sync';
import { useTokenReady } from '@/api/hooks/use-token-ready';
import { getPerformanceStoreMonthlyYtd } from '@/api/endpoints/reports-performance';
import type { PerformanceFilters } from '@/api/types/reports-performance';
import { defaultQueryRetry } from '@/lib/api/query-error';
import { stableCountriesKey } from '@/app/performance/lib/performance-countries';

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export interface MonthlyStoreData {
  month: string;
  monthIndex: number;
  year: number;
  total: number;
  dateRange: { startDate: string; endDate: string };
}

export const performanceStoreYtdQueryKey = (
  filters: PerformanceFilters,
  storeId?: string
) =>
  [
    'performance',
    'store-historical-ytd',
    stableCountriesKey(filters.countries),
    (filters.branchIds ?? []).slice().sort().join(','),
    filters.salesPersonIds?.join(',') ?? '',
    filters.product?.category ?? '',
    (filters.product?.productIds ?? []).slice().sort().join(','),
    (filters.includeCustomerCategories ?? []).slice().sort().join(','),
    (filters.excludeCustomerCategories ?? []).slice().sort().join(','),
    storeId ?? '',
  ] as const;

export function usePerformanceStoreYtd(options: {
  filters: PerformanceFilters;
  storeId?: string;
  enabled?: boolean;
}) {
  const client = useApiClient();
  const { isTokenReady } = useTokenReady();
  const { backendUserData } = useSessionSync();
  const organisationId = backendUserData?.organisationRef;

  const query = useQuery({
    queryKey: performanceStoreYtdQueryKey(options.filters, options.storeId),
    queryFn: () =>
      getPerformanceStoreMonthlyYtd(client, options.filters, {
        chartStoreId: options.storeId,
        organisationId,
      }),
    enabled: (options.enabled ?? true) && isTokenReady,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: defaultQueryRetry,
  });

  const monthlyData = useMemo((): MonthlyStoreData[] => {
    const rows = query.data?.months;
    if (!rows?.length) return [];
    return rows
      .map((row) => {
        const total = (row.salesPerStore ?? []).reduce((sum, store) => {
          const revenue = Number((store as { totalRevenue?: unknown }).totalRevenue);
          return sum + (Number.isFinite(revenue) ? revenue : 0);
        }, 0);
        return {
          month: MONTH_NAMES[row.month] ?? String(row.month),
          monthIndex: row.month,
          year: row.year,
          total,
          dateRange: { startDate: row.startDate, endDate: row.endDate },
        };
      })
      .sort((a, b) => (a.year !== b.year ? a.year - b.year : a.monthIndex - b.monthIndex));
  }, [query.data]);

  return {
    monthlyData,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    hasData: monthlyData.length > 0,
  };
}
