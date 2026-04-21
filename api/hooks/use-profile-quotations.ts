'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import { getProfileQuotations, type ProfileQuotationsData } from '@/api/endpoints/erp-profile-quotations';

export type ProfileQuotationsQueryData = ProfileQuotationsData & {
  periodStartDate?: string;
  periodEndDate?: string;
  infoMessage?: string;
};

export function useProfileQuotations(options?: { enabled?: boolean; month?: string }) {
  const client = useApiClient();
  const month = options?.month;

  return useQuery({
    queryKey: ['erp', 'profile-quotations', month ?? 'target-period'] as const,
    queryFn: async (): Promise<ProfileQuotationsQueryData> => {
      const res = await getProfileQuotations(client, month ? { month } : undefined);
      if (res.success && res.data != null) {
        return {
          ...res.data,
          periodStartDate: res.periodStartDate,
          periodEndDate: res.periodEndDate,
        };
      }
      return {
        salesCode: '',
        salesName: '',
        quotations: [],
        periodStartDate: res.periodStartDate,
        periodEndDate: res.periodEndDate,
        infoMessage: res.message || res.error || 'Could not load ERP quotations',
      };
    },
    enabled: options?.enabled ?? true,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: (failureCount, error: unknown) => {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (typeof status === 'number' && status >= 400 && status < 500) {
        return false;
      }
      return failureCount < 1;
    },
    retryDelay: () => 1500,
  });
}
