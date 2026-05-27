import type { MapMarkerBase } from '@/api/types/map';

function filterPostalAddressParts(parts: string[]): string[] {
  return parts.filter((p) => {
    const t = p.trim();
    if (!t) return false;
    if (/^\d{4,8}$/.test(t)) return false;
    return true;
  });
}

/** Province/state + country from a formatted address string (aligned with visit region buckets). */
export function getMarkerRegionGroupKey(marker: MapMarkerBase): string {
  const addr = String(marker.address ?? '').trim();
  if (!addr) return 'Not set';

  let parts = addr.split(',').map((p) => p.trim()).filter(Boolean);
  parts = filterPostalAddressParts(parts);
  if (parts.length === 0) return 'Not set';

  const country = parts[parts.length - 1];
  const state = parts.length >= 2 ? parts[parts.length - 2] : '';
  if (state && country) return `${state}, ${country}`;
  if (country) return country;
  return 'Not set';
}

/** Industry or explicit business type on map entities. */
export function getMarkerBusinessTypeKey(marker: MapMarkerBase): string {
  const bt = marker.businessType ?? marker.industry;
  if (bt == null || String(bt).trim() === '') return 'Not set';
  return String(bt).trim();
}

export interface MapMarkerFilterInput {
  selectedRegion: string;
  selectedBusinessType: string;
}

export function filterMapMarkers(
  markers: MapMarkerBase[],
  filters: MapMarkerFilterInput
): MapMarkerBase[] {
  let list = markers;
  if (filters.selectedRegion) {
    list = list.filter((m) => getMarkerRegionGroupKey(m) === filters.selectedRegion);
  }
  if (filters.selectedBusinessType) {
    list = list.filter(
      (m) => getMarkerBusinessTypeKey(m) === filters.selectedBusinessType
    );
  }
  return list;
}

export function getSortedUniqueRegionsFromMarkers(markers: MapMarkerBase[]): string[] {
  const set = new Set<string>();
  for (const m of markers) {
    set.add(getMarkerRegionGroupKey(m));
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export function getSortedUniqueBusinessTypesFromMarkers(markers: MapMarkerBase[]): string[] {
  const set = new Set<string>();
  for (const m of markers) {
    set.add(getMarkerBusinessTypeKey(m));
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
