import type { GeoPoint } from './types';

const EARTH_RADIUS_M = 6_371_000;

/** South Africa centroid used as geocode fallback in imports — exclude from analysis. */
export const SA_CENTROID_FALLBACK: GeoPoint = {
  lat: -30.559482,
  lng: 22.937506,
};

const FALLBACK_EPS = 0.0001;

export function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function isValidMapCoord(
  lat: unknown,
  lng: unknown,
  options?: { allowFallbackCentroid?: boolean }
): lat is number {
  if (lat == null || lng == null) return false;
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return false;
  if (la < -90 || la > 90 || ln < -180 || ln > 180) return false;
  if (la === 0 && ln === 0) return false;
  if (options?.allowFallbackCentroid) return true;
  if (
    Math.abs(la - SA_CENTROID_FALLBACK.lat) < FALLBACK_EPS &&
    Math.abs(ln - SA_CENTROID_FALLBACK.lng) < FALLBACK_EPS
  ) {
    return false;
  }
  return true;
}

export function markerToPoint(
  marker: { latitude?: unknown; longitude?: unknown }
): GeoPoint | null {
  if (!isValidMapCoord(marker.latitude, marker.longitude)) return null;
  return { lat: Number(marker.latitude), lng: Number(marker.longitude) };
}

export function pointsInRadius<T extends GeoPoint>(
  center: GeoPoint,
  points: T[],
  radiusMeters: number
): T[] {
  return points.filter((p) => haversineMeters(center, p) <= radiusMeters);
}

export function nearestDistanceMeters(
  center: GeoPoint,
  points: GeoPoint[]
): number | null {
  if (points.length === 0) return null;
  let min = Infinity;
  for (const p of points) {
    const d = haversineMeters(center, p);
    if (d < min) min = d;
  }
  return Number.isFinite(min) ? min : null;
}

export function kmFromMeters(m: number | null): number | null {
  if (m == null) return null;
  return m / 1000;
}
