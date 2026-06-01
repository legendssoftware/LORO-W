import type { GeofenceMapDefaults, InfluenceCircle, MapMarkerBase } from '@/api/types/map';

const COORD_EPS = 1e-5;

function coordKey(lat: number, lng: number): string {
  return `${lat.toFixed(5)},${lng.toFixed(5)}`;
}

function buildMarkerCoordSet(markers: MapMarkerBase[]): Set<string> {
  const keys = new Set<string>();
  for (const m of markers) {
    const lat = Number(m.latitude);
    const lng = Number(m.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) continue;
    keys.add(coordKey(lat, lng));
  }
  return keys;
}

function circleMatchesCoordSet(
  circle: InfluenceCircle,
  markerCoords: Set<string>
): boolean {
  return markerCoords.has(coordKey(circle.latitude, circle.longitude));
}

/** Keep only influence zones that belong to markers still visible after toolbar filters. */
export function filterInfluenceCirclesForMarkers(
  circles: InfluenceCircle[],
  markers: MapMarkerBase[]
): InfluenceCircle[] {
  if (markers.length === 0) return [];
  const markerCoords = buildMarkerCoordSet(markers);
  return circles.filter((c) => circleMatchesCoordSet(c, markerCoords));
}

function buildCircleCoordSet(circles: InfluenceCircle[]): Set<string> {
  const keys = new Set<string>();
  for (const c of circles) {
    keys.add(coordKey(c.latitude, c.longitude));
  }
  return keys;
}

function clampRadius(
  meters: number,
  defaults?: GeofenceMapDefaults
): number {
  if (!defaults) return Math.round(meters);
  return Math.min(
    defaults.maxRadiusMeters,
    Math.max(defaults.minRadiusMeters, Math.round(meters))
  );
}

function resolveRadiusForMarker(
  marker: MapMarkerBase,
  defaultMeters: number,
  defaults?: GeofenceMapDefaults
): number {
  const geofence = marker.geofencing as
    | { enabled?: boolean; radius?: number }
    | undefined;
  let raw = defaultMeters;
  if (geofence?.enabled && geofence.radius != null && Number(geofence.radius) > 0) {
    raw = Number(geofence.radius);
  }
  return clampRadius(raw, defaults);
}

/**
 * API circles for client/competitor/branch plus synthetic zones for any marker without coverage.
 */
export function mergeInfluenceCircles(
  apiCircles: InfluenceCircle[],
  markers: MapMarkerBase[],
  geofenceMapDefaults?: GeofenceMapDefaults
): InfluenceCircle[] {
  const defaultMeters = geofenceMapDefaults?.defaultRadiusMeters ?? 500;
  const merged = [...apiCircles];
  const circleCoords = buildCircleCoordSet(merged);

  for (const m of markers) {
    const lat = Number(m.latitude);
    const lng = Number(m.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) continue;
    const key = coordKey(lat, lng);
    if (circleCoords.has(key)) continue;

    const mt = String(m.markerType ?? 'unknown');
    merged.push({
      id: `${mt}-zone-${String(m.id)}`,
      kind: mt,
      markerType: mt,
      latitude: lat,
      longitude: lng,
      radiusMeters: resolveRadiusForMarker(m, defaultMeters, geofenceMapDefaults),
    });
    circleCoords.add(key);
  }

  return merged;
}
