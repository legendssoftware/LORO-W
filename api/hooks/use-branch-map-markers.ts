'use client';

import { useMemo } from 'react';
import type { BranchListItem } from '@/api/types/branch';
import type { MapMarkerBase } from '@/api/types/map';
import { buildBranchMarkersFromList } from '@/lib/utils/branch-map-markers';

/**
 * Map markers from GET /branch rows with persisted lat/lng only (no client geocoding).
 */
export function useBranchMapMarkers(
  branches: BranchListItem[] | undefined,
  options?: { enabled?: boolean }
) {
  const list = branches ?? [];
  const enabled = options?.enabled !== false && list.length > 0;

  const data = useMemo(
    () => (enabled ? buildBranchMarkersFromList(list) : []),
    [enabled, list]
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
