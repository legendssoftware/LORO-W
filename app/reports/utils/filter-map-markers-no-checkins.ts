import type { MapMarkerBase } from '@/api/types/map';

const ALLOWED_MAP_MARKER_TYPES = new Set(['client', 'competitor', 'branch', 'org']);

/** Keeps only org-scoped static map layers (clients, competitors, branches, org). */
export function excludeCheckInRelatedMapMarkers<T extends MapMarkerBase>(
  markers: T[]
): T[] {
  return markers.filter((m) =>
    ALLOWED_MAP_MARKER_TYPES.has(String(m.markerType ?? ''))
  );
}
