'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
  getProfileSales,
  type ProfileSalesResult,
} from '@/api/endpoints/erp-profile-sales';

const QUERY_KEY = ['erp', 'profile-sales'] as const;

export function useProfileSales(options?: { enabled?: boolean }) {
  const client = useApiClient();
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<ProfileSalesResult> => {
      try {
        const res = await getProfileSales(client);
        if (res.success && res.data != null) {
          return {
            ...res.data,
            periodStartDate: res.periodStartDate,
            periodEndDate: res.periodEndDate,
          };
        }
        return null;
      } catch {
        return null;
      }
    },
    enabled: options?.enabled ?? true,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
