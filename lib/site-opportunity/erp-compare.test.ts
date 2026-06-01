import { describe, expect, it } from 'vitest';
import { buildBranchRevenueMap, extractStoreCodeFromBranchMarker } from './erp-compare';

describe('erp-compare', () => {
  it('extracts store code from branch ref and numbered alias', () => {
    expect(
      extractStoreCodeFromBranchMarker({ alias: '1 BitBoksburg', name: 'Boksburg' })
    ).toBe('001');
    expect(
      extractStoreCodeFromBranchMarker({ ref: 'B015', name: 'Polokwane' })
    ).toBe('015');
    expect(extractStoreCodeFromBranchMarker({ alias: 'BitBoksburg' })).toBeNull();
  });

  it('maps performance rows to branch ids', () => {
    const map = buildBranchRevenueMap(
      [{ id: 'b1', ref: 'B015', name: 'BitPolokwane' }],
      [{ store: '015', totalRevenue: 1_500_000 }]
    );
    expect(map.get('b1')).toBe(1_500_000);
  });
});
