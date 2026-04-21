'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
  getShopQuotations,
  type ShopQuotationRow,
} from '@/api/endpoints/shop-quotations';

const QUERY_KEY = ['shop', 'quotations'] as const;

export function useShopQuotations(options?: { enabled?: boolean }) {
  const client = useApiClient();

  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<ShopQuotationRow[]> => {
      try {
        const res = await getShopQuotations(client);
        return res.quotations ?? [];
      } catch {
        return [];
      }
    },
    enabled: options?.enabled ?? true,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
