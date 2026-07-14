import type { MapMarkerBase } from '@/api/types/map';
import {
  UNMAPPED,
  getMarkerCountryKey,
  getMarkerProvinceKey,
  getMarkerRegionGroupKey,
  normalizeMarkerCountryLabel,
  resolveMarkerAddressParts,
} from '@/lib/utils/marker-geo-resolve';

export {
  UNMAPPED,
  getMarkerCountryKey,
  getMarkerProvinceKey,
  getMarkerRegionGroupKey,
  normalizeMarkerCountryLabel,
  resolveMarkerAddressParts,
} from '@/lib/utils/marker-geo-resolve';

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
 */
export function filterMapMarkers(
  markers: MapMarkerBase[],
  filters: MapMarkerFilterInput
): MapMarkerBase[] {
  let list = markers;
  if (filters.selectedCountry) {
    const country = filters.selectedCountry;
    list = list.filter((m) => getMarkerCountryKey(m) === country);
    if (filters.selectedProvince) {
      const province = filters.selectedProvince;
      list = list.filter((m) => getMarkerProvinceKey(m) === province);
    }
  } else if (filters.selectedRegion) {
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

export function getSortedUniqueCountriesFromMarkers(markers: MapMarkerBase[]): string[] {
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
  country: string
): string[] {
  if (!country) return [];
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

export function getSortedUniqueBusinessTypesFromMarkers(markers: MapMarkerBase[]): string[] {
  const set = new Set<string>();
  for (const m of markers) {
    set.add(getMarkerBusinessTypeKey(m));
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
