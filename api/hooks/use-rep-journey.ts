'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import { getRepJourney } from '@/api/endpoints/tracking';
import type {
  RepJourneyCustomRangeParams,
  RepJourneyData,
  RepJourneyRange,
} from '@/api/types/tracking';

const REP_JOURNEY_QUERY_KEY = ['gps', 'user', 'journey'] as const;

export function repJourneyQueryKey(
  userId: number,
  range: RepJourneyRange,
  customRange?: RepJourneyCustomRangeParams
) {
  if (range === 'custom' && customRange) {
    return [
      ...REP_JOURNEY_QUERY_KEY,
      userId,
      range,
      customRange.startDate,
      customRange.endDate,
    ] as const;
  }
  return [...REP_JOURNEY_QUERY_KEY, userId, range] as const;
}

export function useRepJourney(
  userId: number | null | undefined,
  range: RepJourneyRange | null | undefined,
  options?: {
    enabled?: boolean;
    customRange?: RepJourneyCustomRangeParams;
  }
) {
  const client = useApiClient();
  const customRange = options?.customRange;
  const enabled =
    options?.enabled !== false &&
    userId != null &&
    userId > 0 &&
    range != null &&
    (range !== 'custom' ||
      (customRange?.startDate != null && customRange?.endDate != null));

  return useQuery({
    queryKey: repJourneyQueryKey(
      userId ?? 0,
      range ?? 'hour',
      range === 'custom' ? customRange : undefined
    ),
    queryFn: async (): Promise<RepJourneyData | null> => {
      const response = await getRepJourney(
        client,
        userId as number,
        range as RepJourneyRange,
        range === 'custom' ? customRange : undefined
      );
      return response.data;
    },
    enabled,
    staleTime: range === 'today' ? 0 : 60_000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
