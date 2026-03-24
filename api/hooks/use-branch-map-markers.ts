'use client';

import { useQuery } from '@tanstack/react-query';
import type { BranchListItem } from '@/api/types/branch';
import type { MapMarkerBase } from '@/api/types/map';
import { buildBranchMarkersFromList } from '@/lib/utils/branch-map-markers';

function branchListKey(branches: BranchListItem[] | undefined): string {
  if (!branches?.length) return '';
  return branches
    .map((b) => {
      const line = [b.uid, b.name, b.alias, b.address?.city, b.address?.street].join('|');
      return line;
    })
    .join('::');
}

/**
 * Geocodes GET /branch rows into map markers (same source as org branch dropdowns).
 */
export function useBranchMapMarkers(
  branches: BranchListItem[] | undefined,
  options?: { enabled?: boolean }
) {
  const list = branches ?? [];
  const enabled = options?.enabled !== false && list.length > 0;

  return useQuery({
    queryKey: ['reports', 'branch-map-markers', branchListKey(branches)],
    queryFn: (): Promise<MapMarkerBase[]> => buildBranchMarkersFromList(list),
    enabled,
    staleTime: 12 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
}
