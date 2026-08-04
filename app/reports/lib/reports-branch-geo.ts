import type { BranchListItem } from '@/api/types/branch';
import {
  getMarkerCountryKey,
  getMarkerProvinceKey,
  type GeoMarkerLike,
  UNMAPPED,
} from '@/lib/utils/marker-geo-resolve';

export { UNMAPPED };

export interface ReportsBranchGeoFilters {
  country?: string;
  province?: string;
}

function isAllGeoValue(value: string | undefined): boolean {
  const trimmed = value?.trim();
  return !trimmed || trimmed.toLowerCase() === 'all';
}

/** Map a branch list item to the geo resolver input shape. */
export function branchToGeoInput(branch: BranchListItem): GeoMarkerLike {
  return {
    address: branch.address,
    latitude: branch.latitude,
    longitude: branch.longitude,
    name: branch.alias ?? branch.name ?? undefined,
    country: branch.country ?? undefined,
  };
}

export function getBranchCountryKey(branch: BranchListItem): string {
  return getMarkerCountryKey(branchToGeoInput(branch));
}

export function getBranchProvinceKey(branch: BranchListItem): string {
  return getMarkerProvinceKey(branchToGeoInput(branch));
}

export function getSortedUniqueCountriesFromBranches(
  branches: BranchListItem[]
): string[] {
  const set = new Set<string>();
  for (const branch of branches) {
    set.add(getBranchCountryKey(branch));
  }
  return Array.from(set).sort((a, b) => {
    if (a === UNMAPPED) return 1;
    if (b === UNMAPPED) return -1;
    return a.localeCompare(b);
  });
}

export function getSortedUniqueProvincesFromBranches(
  branches: BranchListItem[],
  country: string
): string[] {
  if (isAllGeoValue(country)) return [];
  const set = new Set<string>();
  for (const branch of branches) {
    if (getBranchCountryKey(branch) !== country) continue;
    set.add(getBranchProvinceKey(branch));
  }
  return Array.from(set).sort((a, b) => {
    if (a === UNMAPPED) return 1;
    if (b === UNMAPPED) return -1;
    return a.localeCompare(b);
  });
}

export function filterBranchesByGeo(
  branches: BranchListItem[],
  filters: ReportsBranchGeoFilters
): BranchListItem[] {
  const country = filters.country?.trim();
  const province = filters.province?.trim();
  const filterCountry = !isAllGeoValue(country);
  const filterProvince = !isAllGeoValue(province);

  if (!filterCountry && !filterProvince) return branches;

  return branches.filter((branch) => {
    if (filterCountry && getBranchCountryKey(branch) !== country) {
      return false;
    }
    if (filterProvince && getBranchProvinceKey(branch) !== province) {
      return false;
    }
    return true;
  });
}

export interface BranchProvinceGroup {
  province: string;
  branches: BranchListItem[];
}

/** Group branches by resolved province label for grouped pickers. */
export function groupBranchesByProvince(
  branches: BranchListItem[]
): BranchProvinceGroup[] {
  const byProvince = new Map<string, BranchListItem[]>();
  for (const branch of branches) {
    const province = getBranchProvinceKey(branch);
    const list = byProvince.get(province) ?? [];
    list.push(branch);
    byProvince.set(province, list);
  }

  return Array.from(byProvince.entries())
    .sort(([a], [b]) => {
      if (a === UNMAPPED) return 1;
      if (b === UNMAPPED) return -1;
      return a.localeCompare(b);
    })
    .map(([province, groupBranches]) => ({
      province,
      branches: [...groupBranches].sort((a, b) => {
        const labelA = (a.alias ?? a.name ?? '').trim();
        const labelB = (b.alias ?? b.name ?? '').trim();
        return labelA.localeCompare(labelB);
      }),
    }));
}

export function branchUidsMatchingGeo(
  branches: BranchListItem[],
  filters: ReportsBranchGeoFilters
): Set<number> {
  return new Set(
    filterBranchesByGeo(branches, filters)
      .map((branch) => branch.uid)
      .filter((uid) => Number.isFinite(uid) && uid > 0)
  );
}

export function hasActiveGeoFilters(filters: ReportsBranchGeoFilters): boolean {
  return (
    !isAllGeoValue(filters.country) || !isAllGeoValue(filters.province)
  );
}
