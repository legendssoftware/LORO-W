import { describe, expect, it } from 'vitest';
import type { BranchListItem } from '@/api/types/branch';
import { UNMAPPED } from '@/lib/utils/marker-geo-resolve';
import {
  branchUidsMatchingGeo,
  filterBranchesByGeo,
  getBranchCountryKey,
  getBranchProvinceKey,
  getSortedUniqueCountriesFromBranches,
  getSortedUniqueProvincesFromBranches,
  groupBranchesByProvince,
  hasActiveGeoFilters,
} from './reports-branch-geo';

function branch(
  uid: number,
  address: BranchListItem['address'],
  extra?: Partial<BranchListItem>
): BranchListItem {
  return {
    uid,
    name: `Branch ${uid}`,
    address,
    ...extra,
  };
}

describe('reports-branch-geo', () => {
  const saGauteng = branch(1, {
    street: '1 Main',
    suburb: 'Sandton',
    city: 'Johannesburg',
    state: 'GP',
    country: 'South Africa',
    postalCode: '2196',
  });

  const saWesternCape = branch(2, {
    street: '2 Long',
    suburb: 'CBD',
    city: 'Cape Town',
    state: 'Western Cape',
    country: 'South Africa',
    postalCode: '8001',
  });

  const botswana = branch(3, {
    street: '3 Road',
    suburb: 'Block 8',
    city: 'Gaborone',
    state: 'Gaborone',
    country: 'Botswana',
    postalCode: '0000',
  });

  const unmapped = branch(4, {
    street: '4 Unknown',
    suburb: 'Nowhere',
    city: 'Unknownville',
    state: '',
    country: '',
    postalCode: '',
  });

  const all = [saGauteng, saWesternCape, botswana, unmapped];

  it('resolves country and province from branch addresses', () => {
    expect(getBranchCountryKey(saGauteng)).toBe('South Africa');
    expect(getBranchProvinceKey(saGauteng)).toBe('Gauteng');
    expect(getBranchCountryKey(botswana)).toBe('Botswana');
    expect(getBranchProvinceKey(botswana)).toBe('Gaborone');
    expect(getBranchCountryKey(unmapped)).toBe(UNMAPPED);
  });

  it('returns sorted unique countries', () => {
    expect(getSortedUniqueCountriesFromBranches(all)).toEqual([
      'Botswana',
      'South Africa',
      UNMAPPED,
    ]);
  });

  it('returns provinces for a selected country', () => {
    expect(
      getSortedUniqueProvincesFromBranches(all, 'South Africa')
    ).toEqual(['Gauteng', 'Western Cape']);
    expect(getSortedUniqueProvincesFromBranches(all, 'all')).toEqual([]);
  });

  it('filters branches by country and province', () => {
    expect(
      filterBranchesByGeo(all, { country: 'South Africa' }).map((b) => b.uid)
    ).toEqual([1, 2]);
    expect(
      filterBranchesByGeo(all, {
        country: 'South Africa',
        province: 'Gauteng',
      }).map((b) => b.uid)
    ).toEqual([1]);
    expect(filterBranchesByGeo(all, { country: 'all' })).toEqual(all);
  });

  it('groups branches by province with unmapped last', () => {
    const groups = groupBranchesByProvince(
      filterBranchesByGeo(all, { country: 'South Africa' })
    );
    expect(groups.map((g) => g.province)).toEqual(['Gauteng', 'Western Cape']);
    expect(groups[0]?.branches.map((b) => b.uid)).toEqual([1]);
  });

  it('builds branch uid sets for geo scoping', () => {
    const uids = branchUidsMatchingGeo(all, {
      country: 'South Africa',
      province: 'Western Cape',
    });
    expect([...uids]).toEqual([2]);
  });

  it('detects active geo filters', () => {
    expect(hasActiveGeoFilters({ country: 'all', province: 'all' })).toBe(
      false
    );
    expect(hasActiveGeoFilters({ country: 'South Africa' })).toBe(true);
    expect(hasActiveGeoFilters({ province: 'Gauteng' })).toBe(true);
  });
});
