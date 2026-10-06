'use client';

import { useQuery } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
  getLatestRepLocations,
  type GetLatestRepLocationsParams,
} from '@/api/endpoints/tracking';
import type { LatestRepLocationsData } from '@/api/types/tracking';

const LATEST_REP_LOCATIONS_QUERY_KEY = ['gps', 'locations', 'latest'] as const;

let streamConnected = false;
const streamListeners = new Set<() => void>();

export function setRepLocationStreamConnected(next: boolean): void {
  if (streamConnected === next) return;
  streamConnected = next;
  streamListeners.forEach((listener) => listener());
}

function subscribeRepLocationStream(listener: () => void): () => void {
  streamListeners.add(listener);
  return () => streamListeners.delete(listener);
}

function useRepLocationStreamConnected(): boolean {
  return useSyncExternalStore(subscribeRepLocationStream, () => streamConnected, () => false);
}

export function latestRepLocationsQueryKey(
  params?: GetLatestRepLocationsParams
) {
  return [...LATEST_REP_LOCATIONS_QUERY_KEY, params?.maxAgeHours ?? 2] as const;
}

export function useLatestRepLocations(
  params?: GetLatestRepLocationsParams,
  options?: { enabled?: boolean }
) {
  const client = useApiClient();
  const enabled = options?.enabled !== false;
  const streamConnected = useRepLocationStreamConnected();

  return useQuery({
    queryKey: latestRepLocationsQueryKey(params),
    queryFn: async (): Promise<LatestRepLocationsData | null> => {
      const response = await getLatestRepLocations(client, params);
      return response.data;
    },
    enabled,
    staleTime: 15_000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: enabled && !streamConnected ? 30_000 : false,
    refetchOnWindowFocus: false,
  });
}
