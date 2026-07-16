import type { MapMarkerBase } from '@/api/types/map';

function branchMarkerKey(marker: MapMarkerBase): string | null {
  if (marker.branchUid != null) return `uid:${marker.branchUid}`;
  const id = String(marker.id ?? '');
  if (id.startsWith('branch-')) return id;
  if (id.startsWith('branch-list-')) return id;
  return null;
}

function readMarkerString(marker: MapMarkerBase, key: string): string {
  const value = marker[key];
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function enrichBranchMarker(
  base: MapMarkerBase,
  source: MapMarkerBase
): MapMarkerBase {
  const enriched = { ...base };
  for (const key of ['email', 'phone', 'contactPerson'] as const) {
    if (!readMarkerString(enriched, key) && readMarkerString(source, key)) {
      enriched[key] = source[key];
    }
  }
  return enriched;
}

/**
 * Merges GET /branch geocoded markers into map report markers.
 * Server markers win when the same branch is already present; contact fields
 * are backfilled from list markers when missing on the server payload.
 */
export function mergeBranchMapMarkers(
  baseMarkers: MapMarkerBase[],
  branchListMarkers: MapMarkerBase[] | undefined
): MapMarkerBase[] {
  const extra = branchListMarkers ?? [];
  if (extra.length === 0) return baseMarkers;

  const listByUid = new Map<string, MapMarkerBase>();
  for (const marker of extra) {
    const key = branchMarkerKey(marker);
    if (key?.startsWith('uid:')) listByUid.set(key, marker);
  }

  const enrichedBase = baseMarkers.map((marker) => {
    if (String(marker.markerType ?? '') !== 'branch') return marker;
    const key = branchMarkerKey(marker);
    if (!key?.startsWith('uid:')) return marker;
    const listMarker = listByUid.get(key);
    if (!listMarker) return marker;
    return enrichBranchMarker(marker, listMarker);
  });

  const existingKeys = new Set<string>();
  for (const m of enrichedBase) {
    if (String(m.markerType ?? '') !== 'branch') continue;
    const key = branchMarkerKey(m);
    if (key) existingKeys.add(key);
  }

  const additions = extra.filter((m) => {
    const key = branchMarkerKey(m);
    if (!key) return true;
    return !existingKeys.has(key);
  });

  if (additions.length === 0) return enrichedBase;
  return [...enrichedBase, ...additions];
}
