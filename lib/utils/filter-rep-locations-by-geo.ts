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

export type RepLocationGeoFilterResult = {
  locations: LatestRepLocation[];
  /** True when country filter is on but no rep fell inside marker bounds (reps are still shown). */
  hadGeoFilterActive: boolean;
  /** Count of reps that would have been hidden by legacy geo bounds filtering. */
  geoFilteredOutCount: number;
};

/**
 * Rep pins are shown org-wide. Country/province filters apply to client/competitor markers only;
 * reps are never clipped by marker bounds so managers always see recent mobile GPS.
 */
export function filterRepLocationsByGeoBounds(
  repLocations: LatestRepLocation[],
  referenceMarkers: MapMarkerBase[],
  options?: { selectedCountry?: string; selectedProvince?: string }
): LatestRepLocation[] {
  const result = filterRepLocationsByGeoBoundsDetailed(
    repLocations,
    referenceMarkers,
    options
  );
  return result.locations;
}

export function filterRepLocationsByGeoBoundsDetailed(
  repLocations: LatestRepLocation[],
  referenceMarkers: MapMarkerBase[],
  options?: { selectedCountry?: string; selectedProvince?: string }
): RepLocationGeoFilterResult {
  if (!options?.selectedCountry) {
    return {
      locations: repLocations,
      hadGeoFilterActive: false,
      geoFilteredOutCount: 0,
    };
  }

  const bounds = computeBounds(referenceMarkers);
  if (!bounds) {
    return {
      locations: repLocations,
      hadGeoFilterActive: true,
      geoFilteredOutCount: 0,
    };
  }

  const minLat = bounds.minLat - BOUNDS_PADDING_DEG;
  const maxLat = bounds.maxLat + BOUNDS_PADDING_DEG;
  const minLng = bounds.minLng - BOUNDS_PADDING_DEG;
  const maxLng = bounds.maxLng + BOUNDS_PADDING_DEG;

  let geoFilteredOutCount = 0;
  for (const rep of repLocations) {
    const lat = Number(rep.latitude);
    const lng = Number(rep.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const inside =
      lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
    if (!inside) geoFilteredOutCount += 1;
  }

  return {
    locations: repLocations,
    hadGeoFilterActive: true,
    geoFilteredOutCount,
  };
}
