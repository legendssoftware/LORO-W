'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import { getExchangeRates } from '@/api/endpoints/reports-exchange-rates';

const QUERY_KEY_PREFIX = ['reports', 'exchange-rates'] as const;

export function useExchangeRates(
  date: string | null | undefined,
  options?: { enabled?: boolean }
) {
  const client = useApiClient();
  return useQuery({
    queryKey: [...QUERY_KEY_PREFIX, date ?? 'today'] as const,
    queryFn: () => getExchangeRates(client, date ?? undefined),
    enabled: (options?.enabled ?? true) && !!date,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
