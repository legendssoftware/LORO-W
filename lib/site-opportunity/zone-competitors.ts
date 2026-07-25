import type { MapMarkerBase } from '@/api/types/map';
import type { GeoPoint, HardwareBrandKey } from '@/api/types/site-opportunity';
import { resolveHardwareBrand } from '@/lib/site-opportunity/compute/brands';
import { markerToPoint, pointsInRadius } from '@/lib/site-opportunity/compute/geo';
import { formatAddressLine } from '@/lib/utils/address-map-geocode';

export interface ZoneCompetitorStore {
  id: string | number;
  name: string;
  address: string | null;
  brand: HardwareBrandKey;
  lat: number;
  lng: number;
}

function competitorDisplayName(marker: MapMarkerBase): string {
  const name = String(marker.name ?? '').trim();
  if (name) return name;
  const accountName = marker.accountName ?? marker.LegalEntity;
  if (typeof accountName === 'string' && accountName.trim()) return accountName.trim();
  return String(marker.id);
}

function competitorDisplayAddress(marker: MapMarkerBase): string | null {
  const fromField = marker.address;
  if (typeof fromField === 'string' && fromField.trim()) return fromField.trim();
  if (fromField && typeof fromField === 'object') {
    const line = formatAddressLine(
      fromField as {
        street?: string;
        suburb?: string;
        city?: string;
        state?: string;
        country?: string;
        postalCode?: string;
      },
    );
    if (line) return line;
  }
  return null;
}

function sortStoresByName(a: ZoneCompetitorStore, b: ZoneCompetitorStore): number {
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
}

/** Competitor stores within a zone radius, grouped by resolved hardware brand. */
export function getCompetitorsInZoneByBrand(
  center: GeoPoint,
  radiusMeters: number,
  markers: MapMarkerBase[],
): Map<HardwareBrandKey, ZoneCompetitorStore[]> {
  const competitors = markers.filter((m) => String(m.markerType ?? '') === 'competitor');
  const withCoords = competitors.flatMap((m) => {
    const point = markerToPoint(m);
    return point ? [{ ...m, lat: point.lat, lng: point.lng }] : [];
  });
  const inRadius = pointsInRadius(center, withCoords, radiusMeters);

  const byBrand = new Map<HardwareBrandKey, ZoneCompetitorStore[]>();
  for (const marker of inRadius) {
    const brand = resolveHardwareBrand(marker);
    const store: ZoneCompetitorStore = {
      id: marker.id,
      name: competitorDisplayName(marker),
      address: competitorDisplayAddress(marker),
      brand,
      lat: marker.lat,
      lng: marker.lng,
    };
    const list = byBrand.get(brand) ?? [];
    list.push(store);
    byBrand.set(brand, list);
  }

  for (const [brand, list] of byBrand) {
    byBrand.set(brand, [...list].sort(sortStoresByName));
  }

  return byBrand;
}

export function getCompetitorStoreNamesForBrand(
  storesByBrand: Map<HardwareBrandKey, ZoneCompetitorStore[]>,
  brand: HardwareBrandKey,
): string[] {
  return (storesByBrand.get(brand) ?? []).map((s) => s.name);
}

/** Flat list of competitor stores in radius, sorted by brand then name. */
export function listCompetitorsInZone(
  center: GeoPoint,
  radiusMeters: number,
  markers: MapMarkerBase[],
): ZoneCompetitorStore[] {
  const byBrand = getCompetitorsInZoneByBrand(center, radiusMeters, markers);
  const out: ZoneCompetitorStore[] = [];
  for (const [, stores] of byBrand) {
    out.push(...stores);
  }
  return out;
}
