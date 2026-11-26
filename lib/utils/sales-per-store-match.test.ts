import { describe, expect, it } from 'vitest';
import type { BranchListItem } from '@/api/types/branch';
import type { BranchCatchmentOpportunity } from '@/api/types/site-opportunity';
import {
  findSalesPerStoreForBranch,
  salesPerStoreKey,
} from '@/lib/utils/sales-per-store-match';
import { enrichCatchmentsWithDashboardRevenue } from '@/lib/site-opportunity/enrich-catchment-revenue';

describe('sales-per-store-match (country-scoped)', () => {
  it('matches branches with the same store code to their own country row', () => {
    const saBranch: BranchListItem = {
      uid: 1,
      ref: '001',
      name: 'BitSandton',
      country: 'South Africa',
    };
    const botBranch: BranchListItem = {
      uid: 2,
      ref: '001',
      name: 'BitGaborone',
      country: 'Botswana',
    };

    const salesPerStore = [
      { storeId: '001', storeName: 'BitSandton', totalRevenue: 1_200_000, countryCode: 'SA' },
      { storeId: '001', storeName: 'BitGaborone', totalRevenue: 350_000, countryCode: 'BOT' },
    ];

    const used = new Set<string>();
    const saMatch = findSalesPerStoreForBranch(saBranch, salesPerStore, undefined, used);
    expect(saMatch?.countryCode).toBe('SA');
    expect(saMatch?.totalRevenue).toBe(1_200_000);
    used.add(salesPerStoreKey(saMatch!));

    const botMatch = findSalesPerStoreForBranch(botBranch, salesPerStore, undefined, used);
    expect(botMatch?.countryCode).toBe('BOT');
    expect(botMatch?.totalRevenue).toBe(350_000);
  });

  it('aligns catchment actualRevenueZAR with fresh salesPerStore even when pre-populated', () => {
    const branches: BranchListItem[] = [
      { uid: 1, ref: '015', name: 'BitSandton', country: 'South Africa' },
    ];
    const catchments: BranchCatchmentOpportunity[] = [
      {
        id: 'catchment-1',
        kind: 'catchment',
        branchId: '1',
        branchName: 'BitSandton',
        lat: -26.1,
        lng: 28.05,
        radiusMeters: 5000,
        competitorCount: 2,
        clientCount: 5,
        addressablePoolZAR: 2_000_000,
        potentialLowZAR: 300_000,
        potentialHighZAR: 400_000,
        actualRevenueZAR: 999_999,
        revenueGapZAR: -599_999,
        brandBreakdown: [],
        captureTimeline: [],
        warnings: [],
      },
    ];

    const result = enrichCatchmentsWithDashboardRevenue(
      catchments,
      branches,
      {
        salesPerStore: [
          { storeId: '015', storeName: 'BitSandton', totalRevenue: 500_000, countryCode: 'SA' },
        ],
      },
      { startDate: '2026-11-01', endDate: '2026-11-26' },
    );

    expect(result[0]?.actualRevenueZAR).toBe(500_000);
    expect(result[0]?.revenueGapZAR).toBe(400_000 - 500_000);
  });
});
