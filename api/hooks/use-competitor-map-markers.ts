'use client';

import { useMemo } from 'react';
import type { CompetitorListItem } from '@/api/types/competitors';
import type { MapMarkerBase } from '@/api/types/map';
import { buildCompetitorMarkersFromList } from '@/lib/utils/competitor-map-markers';

/**
 * Map markers from GET /competitors rows with persisted lat/lng only (no client geocoding).
 */
export function useCompetitorMapMarkers(
  competitors: CompetitorListItem[] | undefined,
  options?: { enabled?: boolean; maxNewGeocodes?: number }
) {
  const list = competitors ?? [];
  const enabled = options?.enabled !== false && list.length > 0;

  const data = useMemo(
    () =>
      enabled
        ? buildCompetitorMarkersFromList(list, {
            maxNewGeocodes: options?.maxNewGeocodes,
          })
        : [],
    [enabled, list, options?.maxNewGeocodes]
  );

  return {
    data,
    isPending: false,
    isFetching: false,
    isSuccess: enabled,
    isError: false,
    error: null as Error | null,
  };
}
