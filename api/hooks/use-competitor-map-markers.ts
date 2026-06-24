'use client';

import { useQuery } from '@tanstack/react-query';
import type { CompetitorListItem } from '@/api/types/competitors';
import type { MapMarkerBase } from '@/api/types/map';
import { buildCompetitorMarkersFromList } from '@/lib/utils/competitor-map-markers';

function competitorListKey(competitors: CompetitorListItem[] | undefined): string {
  if (!competitors?.length) return '';
  return competitors
    .map((c) => {
      const line = [
        c.uid,
        c.name,
        c.competitorRef,
        c.latitude,
        c.longitude,
        c.address?.street,
        c.address?.city,
      ].join('|');
      return line;
    })
    .join('::');
}

/**
 * Geocodes GET /competitors rows into map markers (fallback when server map geocoding is capped).
 */
export function useCompetitorMapMarkers(
  competitors: CompetitorListItem[] | undefined,
  options?: { enabled?: boolean; maxNewGeocodes?: number }
) {
  const list = competitors ?? [];
  const enabled = options?.enabled !== false && list.length > 0;

  return useQuery({
    queryKey: [
      'reports',
      'competitor-map-markers',
      competitorListKey(competitors),
      options?.maxNewGeocodes ?? 100,
    ],
    queryFn: (): Promise<MapMarkerBase[]> =>
      buildCompetitorMarkersFromList(list, {
        maxNewGeocodes: options?.maxNewGeocodes,
      }),
    enabled,
    staleTime: 12 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
}
