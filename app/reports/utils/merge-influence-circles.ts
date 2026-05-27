import type { GeofenceMapDefaults, InfluenceCircle, MapMarkerBase } from '@/api/types/map';

const COORD_EPS = 1e-5;

/** Keep only influence zones that belong to markers still visible after toolbar filters. */
export function filterInfluenceCirclesForMarkers(
  circles: InfluenceCircle[],
  markers: MapMarkerBase[]
): InfluenceCircle[] {
  if (markers.length === 0) return [];
  return circles.filter((c) =>
    markers.some((m) => {
      const lat = Number(m.latitude);
      const lng = Number(m.longitude);
      if (Number.isNaN(lat) || Number.isNaN(lng)) return false;
      return (
        Math.abs(c.latitude - lat) < COORD_EPS && Math.abs(c.longitude - lng) < COORD_EPS
      );
    })
  );
}

function markerHasNearbyCircle(
  lat: number,
  lng: number,
  circles: InfluenceCircle[]
): boolean {
  return circles.some(
    (c) =>
      Math.abs(c.latitude - lat) < COORD_EPS && Math.abs(c.longitude - lng) < COORD_EPS
  );
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

  for (const m of markers) {
    const lat = Number(m.latitude);
    const lng = Number(m.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) continue;
    if (markerHasNearbyCircle(lat, lng, merged)) continue;

    const mt = String(m.markerType ?? 'unknown');
    merged.push({
      id: `${mt}-zone-${String(m.id)}`,
      kind: mt,
      markerType: mt,
      latitude: lat,
      longitude: lng,
      radiusMeters: resolveRadiusForMarker(m, defaultMeters, geofenceMapDefaults),
    });
  }

  return merged;
}
