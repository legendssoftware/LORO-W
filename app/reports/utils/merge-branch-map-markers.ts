import type { MapMarkerBase } from '@/api/types/map';

function branchMarkerKey(marker: MapMarkerBase): string | null {
  if (marker.branchUid != null) return `uid:${marker.branchUid}`;
  const id = String(marker.id ?? '');
  if (id.startsWith('branch-')) return id;
  if (id.startsWith('branch-list-')) return id;
  return null;
}

/**
 * Merges GET /branch geocoded markers into map report markers.
 * Server markers win when the same branch is already present.
 */
export function mergeBranchMapMarkers(
  baseMarkers: MapMarkerBase[],
  branchListMarkers: MapMarkerBase[] | undefined
): MapMarkerBase[] {
  const extra = branchListMarkers ?? [];
  if (extra.length === 0) return baseMarkers;

  const existingKeys = new Set<string>();
  for (const m of baseMarkers) {
    if (String(m.markerType ?? '') !== 'branch') continue;
    const key = branchMarkerKey(m);
    if (key) existingKeys.add(key);
  }

  const additions = extra.filter((m) => {
    const key = branchMarkerKey(m);
    if (!key) return true;
    return !existingKeys.has(key);
  });

  if (additions.length === 0) return baseMarkers;
  return [...baseMarkers, ...additions];
}
