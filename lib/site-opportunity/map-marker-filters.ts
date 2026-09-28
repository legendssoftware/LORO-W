import type { MapMarkerBase } from '@/api/types/map';
import {
  SA_PROVINCES,
  UNMAPPED,
  getMarkerCountryKey,
  getMarkerProvinceKey,
  getMarkerRegionGroupKey,
  resolveMarkerAddressParts,
} from '@/lib/utils/marker-geo-resolve';

export { UNMAPPED, getMarkerCountryKey, getMarkerProvinceKey };

const SOUTH_AFRICA = 'South Africa';

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
  selectedCity?: string;
  selectedBusinessType?: string;
}

/**
 * Filter markers by geo + business type.
 * Precedence: if `selectedCountry` is set, filter by country (+ province if set).
 * Else if `selectedRegion` is set, exact region-key match (legacy).
 * A city query then matches resolved city or suburb.
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

  const city = filters.selectedCity?.trim();
  if (city && city.toLowerCase() !== 'all') {
    list = list.filter((marker) => markerMatchesCity(marker, city));
  }

  if (filters.selectedBusinessType) {
    list = list.filter(
      (m) => getMarkerBusinessTypeKey(m) === filters.selectedBusinessType,
    );
  }
  return list;
}

/** Case-insensitive match on resolved city or suburb. */
export function markerMatchesCity(
  marker: MapMarkerBase,
  cityQuery: string,
): boolean {
  const query = cityQuery.trim().toLowerCase();
  if (!query) return true;
  const parts = resolveMarkerAddressParts(marker);
  const places = [parts.city, parts.suburb]
    .map((place) => place.trim().toLowerCase())
    .filter(Boolean);
  return places.some((place) => place === query || place.includes(query));
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

/**
 * Province choices for a simulation run.
 * South Africa always includes the nine canonical provinces.
 */
export function getSimulationProvinceOptions(
  markers: MapMarkerBase[],
  country: string,
): string[] {
  const fromMarkers = getSortedUniqueProvincesFromMarkers(markers, country);
  if (country !== SOUTH_AFRICA) return fromMarkers;

  const canonical = new Set<string>(SA_PROVINCES);
  const extras = fromMarkers.filter(
    (province) => province !== UNMAPPED && !canonical.has(province),
  );
  const unmapped = fromMarkers.includes(UNMAPPED) ? [UNMAPPED] : [];
  return [...SA_PROVINCES, ...extras, ...unmapped];
}

function isPlaceSuggestion(label: string): boolean {
  if (!label) return false;
  if (/^\d{3,8}$/.test(label)) return false;
  if (
    /^\d/.test(label) &&
    /\b(STREET|ST|ROAD|RD|AVENUE|AVE|DRIVE|DR)\b/i.test(label)
  ) {
    return false;
  }
  return true;
}

/** City and suburb labels on markers already inside the country and province scope. */
export function getSortedUniqueCitiesFromMarkers(
  markers: MapMarkerBase[],
  filters: Pick<MapMarkerFilterInput, 'selectedCountry' | 'selectedProvince'>,
): string[] {
  const scoped = filterMapMarkers(markers, filters);
  const set = new Set<string>();
  for (const marker of scoped) {
    const parts = resolveMarkerAddressParts(marker);
    for (const place of [parts.city, parts.suburb]) {
      const label = place.trim();
      if (!isPlaceSuggestion(label)) continue;
      set.add(label);
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
