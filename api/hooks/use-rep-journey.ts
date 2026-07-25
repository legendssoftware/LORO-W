'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import { getRepJourney } from '@/api/endpoints/tracking';
import type { RepJourneyData, RepJourneyRange } from '@/api/types/tracking';

const REP_JOURNEY_QUERY_KEY = ['gps', 'user', 'journey'] as const;

export function repJourneyQueryKey(userId: number, range: RepJourneyRange) {
  return [...REP_JOURNEY_QUERY_KEY, userId, range] as const;
}

export function useRepJourney(
  userId: number | null | undefined,
  range: RepJourneyRange | null | undefined,
  options?: { enabled?: boolean }
) {
  const client = useApiClient();
  const enabled =
    options?.enabled !== false &&
    userId != null &&
    userId > 0 &&
    range != null;

  return useQuery({
    queryKey: repJourneyQueryKey(userId ?? 0, range ?? 'hour'),
    queryFn: async (): Promise<RepJourneyData | null> => {
      const response = await getRepJourney(client, userId as number, range as RepJourneyRange);
      return response.data;
    },
    enabled,
    staleTime: 60_000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
