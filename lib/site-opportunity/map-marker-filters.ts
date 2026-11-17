import type { MapMarkerBase } from '@/api/types/map';
import type { GeoPoint } from '@/api/types/site-opportunity';
import { haversineMeters, markerToPoint } from '@/lib/site-opportunity/compute/geo';
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

/** How far from a geocoded place to include stores when the name is not on the data. */
export const AREA_GEOCODE_RADIUS_KM = 30;

/**
 * Case-insensitive match on city, suburb, province, or country.
 * Empty query matches every marker.
 */
export function markerMatchesArea(
  marker: MapMarkerBase,
  areaQuery: string,
): boolean {
  const query = areaQuery.trim().toLowerCase();
  if (!query) return true;
  const parts = resolveMarkerAddressParts(marker);
  const unmapped = UNMAPPED.toLowerCase();
  const province = getMarkerProvinceKey(marker).trim().toLowerCase();
  const country = getMarkerCountryKey(marker).trim().toLowerCase();
  if (province && province !== unmapped && province === query) return true;
  if (country && country !== unmapped && country === query) return true;
  return [parts.city, parts.suburb].some((place) => {
    const label = place.trim().toLowerCase();
    if (!label) return false;
    return label === query || (query.length >= 3 && label.includes(query));
  });
}

/** Keep markers whose city, suburb, province, or country matches the typed area. */
export function filterMarkersByArea(
  markers: MapMarkerBase[],
  areaQuery: string,
): MapMarkerBase[] {
  const query = areaQuery.trim();
  if (!query) return markers;
  return markers.filter((marker) => markerMatchesArea(marker, query));
}

/** Keep geolocated markers within `radiusKm` of a point. */
export function filterMarkersNearPoint(
  markers: MapMarkerBase[],
  center: GeoPoint,
  radiusKm: number,
): MapMarkerBase[] {
  const radiusMeters = radiusKm * 1000;
  return markers.filter((marker) => {
    const point = markerToPoint(marker);
    if (!point) return false;
    return haversineMeters(point, center) <= radiusMeters;
  });
}

/** Cities, suburbs, provinces, and countries a user can pick while typing an area. */
export function getAreaSuggestions(markers: MapMarkerBase[]): string[] {
  const labels = new Set<string>(getSortedUniqueCitiesFromMarkers(markers, {}));
  for (const marker of markers) {
    for (const place of [
      getMarkerProvinceKey(marker),
      getMarkerCountryKey(marker),
    ]) {
      const label = place.trim();
      if (!label || label === UNMAPPED) continue;
      labels.add(label);
    }
  }
  return Array.from(labels).sort((a, b) => a.localeCompare(b));
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
