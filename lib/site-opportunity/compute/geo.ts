import type { GeoPoint } from '@/api/types/site-opportunity';

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
	options?: { allowFallbackCentroid?: boolean },
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
	marker: { latitude?: unknown; longitude?: unknown },
): GeoPoint | null {
	if (!isValidMapCoord(marker.latitude, marker.longitude)) return null;
	return { lat: Number(marker.latitude), lng: Number(marker.longitude) };
}

export function pointsInRadius<T extends GeoPoint>(
	center: GeoPoint,
	points: T[],
	radiusMeters: number,
): T[] {
	return points.filter((p) => haversineMeters(center, p) <= radiusMeters);
}

export type SpatialPointIndex<T extends GeoPoint> = {
	cellSizeDeg: number;
	buckets: Map<string, T[]>;
};

/** Buckets geolocated points into a lat/lng grid for fast radius queries. */
export function buildSpatialIndex<T extends GeoPoint>(
	points: T[],
	cellSizeDeg: number,
): SpatialPointIndex<T> {
	const buckets = new Map<string, T[]>();
	for (const p of points) {
		const key = `${Math.floor(p.lat / cellSizeDeg)}:${Math.floor(p.lng / cellSizeDeg)}`;
		const bucket = buckets.get(key);
		if (bucket) bucket.push(p);
		else buckets.set(key, [p]);
	}
	return { cellSizeDeg, buckets };
}

export function pointsInRadiusIndexed<T extends GeoPoint>(
	center: GeoPoint,
	index: SpatialPointIndex<T>,
	radiusMeters: number,
): T[] {
	const { cellSizeDeg, buckets } = index;
	if (buckets.size === 0) return [];

	const radiusDeg = radiusMeters / 111_000;
	const latRad = (center.lat * Math.PI) / 180;
	const lngCellSize = Math.max(cellSizeDeg * Math.cos(latRad), cellSizeDeg * 0.5);
	const latCells = Math.ceil(radiusDeg / cellSizeDeg) + 1;
	const lngCells = Math.ceil(radiusDeg / lngCellSize) + 1;
	const lat0 = Math.floor(center.lat / cellSizeDeg);
	const lng0 = Math.floor(center.lng / cellSizeDeg);

	const candidates: T[] = [];
	for (let dLat = -latCells; dLat <= latCells; dLat++) {
		for (let dLng = -lngCells; dLng <= lngCells; dLng++) {
			const bucket = buckets.get(`${lat0 + dLat}:${lng0 + dLng}`);
			if (bucket) candidates.push(...bucket);
		}
	}
	return pointsInRadius(center, candidates, radiusMeters);
}

export function nearestDistanceMeters(
	center: GeoPoint,
	points: GeoPoint[],
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
