'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
  getStoresSales,
  type GetStoresSalesParams,
  type StoresSalesApiResponse,
} from '@/api/endpoints/erp-stores-sales';
import { ytdDateRange } from '@/lib/utils/sales-per-store-match';

export const STORES_SALES_QUERY_KEY = ['erp', 'stores', 'sales'] as const;

/**
 * YTD (or custom) per-store ERP sales for visualiser simulation enrichment.
 */
export function useStoresSales(
  params?: GetStoresSalesParams,
  options?: { enabled?: boolean },
) {
  const client = useApiClient();
  const ytd = ytdDateRange();
  const startDate = params?.startDate ?? ytd.startDate;
  const endDate = params?.endDate ?? ytd.endDate;
  const countries = params?.countries ?? 'ALL';

  return useQuery<StoresSalesApiResponse>({
    queryKey: [...STORES_SALES_QUERY_KEY, startDate, endDate, countries],
    queryFn: () => getStoresSales(client, { startDate, endDate, countries }),
    enabled: options?.enabled !== false,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}
