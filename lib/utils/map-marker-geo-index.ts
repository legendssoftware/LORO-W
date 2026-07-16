import type { MapMarkerBase } from '@/api/types/map';
import {
  getMarkerBusinessTypeKey,
  getMarkerCountryKey,
  getMarkerProvinceKey,
  getMarkerRegionGroupKey,
  type MapMarkerFilterInput,
} from '@/lib/utils/map-marker-filters';

export interface MapMarkerGeoIndex {
  all: MapMarkerBase[];
  byCountry: Map<string, MapMarkerBase[]>;
  byCountryProvince: Map<string, MapMarkerBase[]>;
  countries: string[];
  provincesByCountry: Map<string, string[]>;
  regions: string[];
  businessTypes: string[];
}

function provinceKey(country: string, province: string): string {
  return `${country}\0${province}`;
}

export function buildMapMarkerGeoIndex(
  markers: MapMarkerBase[]
): MapMarkerGeoIndex {
  const byCountry = new Map<string, MapMarkerBase[]>();
  const byCountryProvince = new Map<string, MapMarkerBase[]>();
  const provincesByCountry = new Map<string, Set<string>>();
  const regionSet = new Set<string>();
  const businessTypeSet = new Set<string>();

  for (const marker of markers) {
    const country = getMarkerCountryKey(marker);
    const province = getMarkerProvinceKey(marker);
    regionSet.add(getMarkerRegionGroupKey(marker));
    businessTypeSet.add(getMarkerBusinessTypeKey(marker));

    const countryList = byCountry.get(country) ?? [];
    countryList.push(marker);
    byCountry.set(country, countryList);

    const cpKey = provinceKey(country, province);
    const cpList = byCountryProvince.get(cpKey) ?? [];
    cpList.push(marker);
    byCountryProvince.set(cpKey, cpList);

    const provSet = provincesByCountry.get(country) ?? new Set<string>();
    provSet.add(province);
    provincesByCountry.set(country, provSet);
  }

  const countries = Array.from(byCountry.keys()).sort((a, b) =>
    a.localeCompare(b)
  );
  const provincesByCountrySorted = new Map<string, string[]>();
  for (const [country, set] of provincesByCountry) {
    provincesByCountrySorted.set(country, Array.from(set).sort((a, b) =>
      a.localeCompare(b)
    ));
  }

  return {
    all: markers,
    byCountry,
    byCountryProvince,
    countries,
    provincesByCountry: provincesByCountrySorted,
    regions: Array.from(regionSet).sort((a, b) => a.localeCompare(b)),
    businessTypes: Array.from(businessTypeSet).sort((a, b) =>
      a.localeCompare(b)
    ),
  };
}

export function filterMapMarkersFromIndex(
  index: MapMarkerGeoIndex,
  filters: MapMarkerFilterInput
): MapMarkerBase[] {
  let list: MapMarkerBase[];

  if (filters.selectedCountry) {
    if (filters.selectedProvince) {
      list =
        index.byCountryProvince.get(
          provinceKey(filters.selectedCountry, filters.selectedProvince)
        ) ?? [];
    } else {
      list = index.byCountry.get(filters.selectedCountry) ?? [];
    }
  } else if (filters.selectedRegion) {
    list = index.all.filter(
      (m) => getMarkerRegionGroupKey(m) === filters.selectedRegion
    );
  } else {
    list = index.all;
  }

  if (filters.selectedBusinessType) {
    const bt = filters.selectedBusinessType;
    list = list.filter((m) => getMarkerBusinessTypeKey(m) === bt);
  }

  return list;
}
