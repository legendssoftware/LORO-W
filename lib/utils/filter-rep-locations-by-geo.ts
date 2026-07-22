import type { MapMarkerBase } from '@/api/types/map';
import type { LatestRepLocation } from '@/api/types/tracking';

function markerLatLng(marker: MapMarkerBase): { lat: number; lng: number } | null {
  const lat = Number(marker.latitude);
  const lng = Number(marker.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function computeBounds(markers: MapMarkerBase[]): {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
} | null {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  let count = 0;

  for (const marker of markers) {
    const pos = markerLatLng(marker);
    if (!pos) continue;
    minLat = Math.min(minLat, pos.lat);
    maxLat = Math.max(maxLat, pos.lat);
    minLng = Math.min(minLng, pos.lng);
    maxLng = Math.max(maxLng, pos.lng);
    count += 1;
  }

  if (count === 0) return null;
  return { minLat, maxLat, minLng, maxLng };
}

const BOUNDS_PADDING_DEG = 0.5;

/**
 * Filter rep locations to the geographic bounds of reference map markers.
 * `referenceMarkers` should already be filtered by country/province (see filterMapMarkersFromIndex).
 * When a country filter is active but no reference markers exist, returns an empty list.
 */
export function filterRepLocationsByGeoBounds(
  repLocations: LatestRepLocation[],
  referenceMarkers: MapMarkerBase[],
  options?: { selectedCountry?: string; selectedProvince?: string }
): LatestRepLocation[] {
  if (!options?.selectedCountry) return repLocations;

  const bounds = computeBounds(referenceMarkers);
  if (!bounds) return [];

  const minLat = bounds.minLat - BOUNDS_PADDING_DEG;
  const maxLat = bounds.maxLat + BOUNDS_PADDING_DEG;
  const minLng = bounds.minLng - BOUNDS_PADDING_DEG;
  const maxLng = bounds.maxLng + BOUNDS_PADDING_DEG;

  return repLocations.filter((rep) => {
    const lat = Number(rep.latitude);
    const lng = Number(rep.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
    return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
  });
}
