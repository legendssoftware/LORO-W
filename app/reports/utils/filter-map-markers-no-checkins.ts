import type { MapMarkerBase } from '@/api/types/map';

const EXCLUDED_MAP_MARKER_TYPES = new Set([
  'check-in',
  'check-in-visit',
  'shift-start',
  'shift-end',
  'break-start',
  'break-end',
  'claim',
]);

/** Strips visit check-ins, attendance GPS pins, and attendance-derived claim markers (defense vs stale cache). */
export function excludeCheckInRelatedMapMarkers<T extends MapMarkerBase>(
  markers: T[]
): T[] {
  return markers.filter((m) => !EXCLUDED_MAP_MARKER_TYPES.has(String(m.markerType ?? '')));
}
