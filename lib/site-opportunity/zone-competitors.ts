import type { MapMarkerBase } from '@/api/types/map';
import type { GeoPoint, HardwareBrandKey } from '@/api/types/site-opportunity';
import { resolveHardwareBrand } from '@/lib/site-opportunity/compute/brands';
import { markerToPoint, pointsInRadius } from '@/lib/site-opportunity/compute/geo';

function competitorDisplayName(marker: MapMarkerBase): string {
  const name = String(marker.name ?? '').trim();
  if (name) return name;
  const accountName = marker.accountName ?? marker.LegalEntity;
  if (typeof accountName === 'string' && accountName.trim()) return accountName.trim();
  return String(marker.id);
}

function sortMarkersByName(a: MapMarkerBase, b: MapMarkerBase): number {
  return competitorDisplayName(a).localeCompare(competitorDisplayName(b), undefined, {
    sensitivity: 'base',
  });
}

/** Competitor markers within a zone radius, grouped by resolved hardware brand. */
export function getCompetitorsInZoneByBrand(
  center: GeoPoint,
  radiusMeters: number,
  markers: MapMarkerBase[],
): Map<HardwareBrandKey, MapMarkerBase[]> {
  const competitors = markers.filter((m) => String(m.markerType ?? '') === 'competitor');
  const withCoords = competitors.flatMap((m) => {
    const point = markerToPoint(m);
    return point ? [{ ...m, lat: point.lat, lng: point.lng }] : [];
  });
  const inRadius = pointsInRadius(center, withCoords, radiusMeters);

  const byBrand = new Map<HardwareBrandKey, MapMarkerBase[]>();
  for (const marker of inRadius) {
    const brand = resolveHardwareBrand(marker);
    const list = byBrand.get(brand) ?? [];
    list.push(marker);
    byBrand.set(brand, list);
  }

  for (const [brand, list] of byBrand) {
    byBrand.set(brand, [...list].sort(sortMarkersByName));
  }

  return byBrand;
}

export function getCompetitorStoreNamesForBrand(
  storesByBrand: Map<HardwareBrandKey, MapMarkerBase[]>,
  brand: HardwareBrandKey,
): string[] {
  return (storesByBrand.get(brand) ?? []).map(competitorDisplayName);
}
