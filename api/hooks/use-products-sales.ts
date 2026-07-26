'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
  getProductsSales,
  type GetProductsSalesParams,
  type ProductsSalesApiResponse,
} from '@/api/endpoints/erp-products-sales';
import { monthlyDateRange } from '@/lib/utils/sales-per-store-match';

export const PRODUCTS_SALES_QUERY_KEY = ['erp', 'products', 'sales'] as const;

/**
 * Top product ERP sales for Reports Overview (group-wide).
 */
export function useProductsSales(
  params?: GetProductsSalesParams,
  options?: { enabled?: boolean },
) {
  const client = useApiClient();
  const month = monthlyDateRange();
  const startDate = params?.startDate ?? month.startDate;
  const endDate = params?.endDate ?? month.endDate;
  const countries = params?.countries ?? 'ALL';
  const limit = params?.limit ?? 10;

  return useQuery<ProductsSalesApiResponse>({
    queryKey: [...PRODUCTS_SALES_QUERY_KEY, startDate, endDate, countries, limit],
    queryFn: () =>
      getProductsSales(client, { startDate, endDate, countries, limit }),
    enabled: options?.enabled !== false,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}
