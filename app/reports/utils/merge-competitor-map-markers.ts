import type { MapMarkerBase } from '@/api/types/map';

function competitorMarkerKey(marker: MapMarkerBase): string | null {
  const ref = marker.competitorRef;
  if (ref != null && String(ref).trim() !== '') return `ref:${String(ref).trim()}`;
  if (marker.markerType !== 'competitor') return null;
  const id = String(marker.id ?? '');
  if (id.startsWith('competitor-list-')) return id;
  if (/^\d+$/.test(id)) return `uid:${id}`;
  return null;
}

/**
 * Merges GET /competitors geocoded markers into map report markers.
 * Server markers win when the same competitor is already present.
 */
export function mergeCompetitorMapMarkers(
  baseMarkers: MapMarkerBase[],
  competitorListMarkers: MapMarkerBase[] | undefined
): MapMarkerBase[] {
  const extra = competitorListMarkers ?? [];
  if (extra.length === 0) return baseMarkers;

  const existingKeys = new Set<string>();
  for (const m of baseMarkers) {
    if (String(m.markerType ?? '') !== 'competitor') continue;
    const key = competitorMarkerKey(m);
    if (key) existingKeys.add(key);
  }

  const additions = extra.filter((m) => {
    const key = competitorMarkerKey(m);
    if (!key) return true;
    return !existingKeys.has(key);
  });

  if (additions.length === 0) return baseMarkers;
  return [...baseMarkers, ...additions];
}
