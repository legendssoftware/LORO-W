import type { MapMarkerBase } from '@/api/types/map';
import {
  UNMAPPED,
  getMarkerCountryKey,
  getMarkerProvinceKey,
  getMarkerRegionGroupKey,
} from '@/lib/utils/marker-geo-resolve';

export { UNMAPPED, getMarkerCountryKey, getMarkerProvinceKey };

const NOT_SET = 'Not set';

/** Industry or explicit business type on map entities. */
export function getMarkerBusinessTypeKey(marker: MapMarkerBase): string {
  const bt = marker.businessType ?? marker.industry;
  if (bt == null || String(bt).trim() === '') return NOT_SET;
  return String(bt).trim();
}

export interface MapMarkerFilterInput {
  selectedRegion?: string;
  selectedCountry?: string;
  selectedProvince?: string;
  selectedBusinessType?: string;
}

/**
 * Filter markers by geo + business type.
 * Precedence: if `selectedCountry` is set, filter by country (+ province if set).
 * Else if `selectedRegion` is set, exact region-key match (legacy).
 * Empty / `"all"` country means no country filter.
 */
export function filterMapMarkers(
  markers: MapMarkerBase[],
  filters: MapMarkerFilterInput,
): MapMarkerBase[] {
  let list = markers;
  const country = filters.selectedCountry?.trim();
  const isAllCountry = !country || country.toLowerCase() === 'all';

  if (!isAllCountry) {
    list = list.filter((m) => getMarkerCountryKey(m) === country);
    const province = filters.selectedProvince?.trim();
    if (province) {
      list = list.filter((m) => getMarkerProvinceKey(m) === province);
    }
  } else if (filters.selectedRegion) {
    list = list.filter(
      (m) => getMarkerRegionGroupKey(m) === filters.selectedRegion,
    );
  }

  if (filters.selectedBusinessType) {
    list = list.filter(
      (m) => getMarkerBusinessTypeKey(m) === filters.selectedBusinessType,
    );
  }
  return list;
}

export function getSortedUniqueCountriesFromMarkers(
  markers: MapMarkerBase[],
): string[] {
  const set = new Set<string>();
  for (const m of markers) {
    set.add(getMarkerCountryKey(m));
  }
  return Array.from(set).sort((a, b) => {
    if (a === UNMAPPED) return 1;
    if (b === UNMAPPED) return -1;
    return a.localeCompare(b);
  });
}

export function getSortedUniqueProvincesFromMarkers(
  markers: MapMarkerBase[],
  country: string,
): string[] {
  if (!country || country.toLowerCase() === 'all') return [];
  const set = new Set<string>();
  for (const m of markers) {
    if (getMarkerCountryKey(m) !== country) continue;
    set.add(getMarkerProvinceKey(m));
  }
  return Array.from(set).sort((a, b) => {
    if (a === UNMAPPED) return 1;
    if (b === UNMAPPED) return -1;
    return a.localeCompare(b);
  });
}
