'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
  getStoresSales,
  type GetStoresSalesParams,
  type StoresSalesApiResponse,
} from '@/api/endpoints/erp-stores-sales';
import { monthlyDateRange } from '@/lib/utils/sales-per-store-match';

export const STORES_SALES_QUERY_KEY = ['erp', 'stores', 'sales'] as const;

/**
 * Monthly (or custom) per-store ERP sales for visualiser simulation enrichment.
 * Defaults to the current calendar month — same basis as Performance Tracker monthly views.
 */
export function useStoresSales(
  params?: GetStoresSalesParams,
  options?: { enabled?: boolean },
) {
  const client = useApiClient();
  const month = monthlyDateRange();
  const startDate = params?.startDate ?? month.startDate;
  const endDate = params?.endDate ?? month.endDate;
  const countries = params?.countries ?? 'ALL';

  return useQuery<StoresSalesApiResponse>({
    queryKey: [...STORES_SALES_QUERY_KEY, startDate, endDate, countries],
    queryFn: () => getStoresSales(client, { startDate, endDate, countries }),
    enabled: options?.enabled !== false,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}
