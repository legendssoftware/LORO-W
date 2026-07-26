'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
  getCompetitorsMapData,
  getCompetitorsMissingGeocode,
  type CompetitorMapMarker,
  type CompetitorMissingGeocodeItem,
} from '@/api/endpoints/competitors';

export const COMPETITORS_MAP_DATA_QUERY_KEY = ['competitors', 'map-data'] as const;
export const COMPETITORS_MISSING_GEOCODE_QUERY_KEY = [
  'competitors',
  'missing-geocode',
] as const;

/**
 * Fast competitor pins for the visualiser (GET /competitors/map-data).
 */
export function useCompetitorsMapData(options?: { enabled?: boolean }) {
  const client = useApiClient();
  return useQuery({
    queryKey: COMPETITORS_MAP_DATA_QUERY_KEY,
    queryFn: async (): Promise<CompetitorMapMarker[]> => getCompetitorsMapData(client),
    enabled: options?.enabled !== false,
    staleTime: 2 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Competitors missing coordinates and/or address (GET /competitors/missing-geocode).
 */
export function useCompetitorsMissingGeocode(options?: { enabled?: boolean }) {
  const client = useApiClient();
  return useQuery({
    queryKey: COMPETITORS_MISSING_GEOCODE_QUERY_KEY,
    queryFn: async (): Promise<CompetitorMissingGeocodeItem[]> =>
      getCompetitorsMissingGeocode(client),
    enabled: options?.enabled !== false,
    staleTime: 2 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
