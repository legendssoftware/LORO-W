import { beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadBlob } from '@/lib/utils/report-export';
import { SIMULATION_EXPORT_DISCLAIMER } from '@/lib/site-opportunity/simulation-export-types';
import type { SimulationExportDocument } from '@/lib/site-opportunity/simulation-export-types';
import { downloadSimulationExportPdf, shortenCompetitorAddress } from '@/lib/site-opportunity/simulation-export-pdf';

vi.mock('@/lib/utils/report-export', () => ({
  downloadBlob: vi.fn(),
}));

function sampleDocument(): SimulationExportDocument {
  return {
    meta: {
      title: 'Store turnover simulation',
      organisationName: 'BitDrywall',
      generatedAtIso: '2026-09-11T08:00:00.000Z',
      ranAtIso: '2026-09-11T06:29:00.000Z',
      countryLabel: 'South Africa',
      provinceLabel: 'KwaZulu-Natal',
      modeLabel: 'Opportunities',
      erpMonthLabel: 'Sept 2026',
      erpMatchedStores: 0,
      erpError: 'ERP sales loaded but no branches matched',
    },
    settings: {
      radiusKm: 5,
      minBranchSeparationKm: 10,
      captureLowPct: 0.05,
      captureHighPct: 0.2,
      topN: 5,
      repTargetMonthlyZAR: 1_000_000,
      revenuePerSqmMonthlyZAR: 1_500,
      suggestStoreSizeFromTurnover: true,
      brandTurnovers: [{ brand: 'CASHBUILD', monthlyZAR: 3_000_000 }],
    },
    dataQuality: {
      totalCompetitors: 232,
      competitorsWithCoords: 231,
      totalClients: 100,
      clientsWithCoords: 98,
      totalBranches: 0,
      branchesWithCoords: 0,
      competitorCoveragePct: 100,
      clientCoveragePct: 98,
    },
    warnings: ['ERP sales loaded but no branches matched store codes/names.'],
    catchments: [],
    opportunities: [
      {
        kind: 'greenfield',
        rank: 1,
        title: 'Opportunity 1',
        address: null,
        lat: -29.88574,
        lng: 30.87543,
        radiusKm: 5,
        clientCount: 0,
        competitorCount: 14,
        competitionLabel: 'Highly competitive',
        addressablePoolZAR: 48_500_000,
        potentialLowZAR: 2_425_000,
        potentialHighZAR: 9_700_000,
        simulatedMonthlyZAR: 5_638_125,
        actualMonthlyZAR: null,
        varianceZAR: null,
        variancePct: null,
        monthsToMature: 21,
        nearestBranchKm: null,
        floorSizeSqm: null,
        capacityCeilingZAR: null,
        storeFormat: {
          label: 'Hub / DC Store',
          sizeSqm: 1420,
          sizeRange: '800–1,500 m²',
          turnoverRange: 'R 3.0m–R 6.0m+',
        },
        brands: [
          { brand: 'OTHER', count: 13, turnoverZAR: 45_500_000 },
          { brand: 'CASHBUILD', count: 1, turnoverZAR: 3_000_000 },
        ],
        competitors: [
          {
            brand: 'OTHER',
            name: 'Altech Plumbers – Kzn',
            address: '306 Underwood Road Sarnia, KZN',
          },
          {
            brand: 'OTHER',
            name: 'Bravos Hardware – Kzn',
            address: 'Lot 5064 Welbedacht Road, Chatsworth',
          },
          {
            brand: 'OTHER',
            name: 'Bulk Tile & Home - Chatsworth – Kzn',
            address: '696 Sunset Avenue Chatsworth',
          },
          {
            brand: 'OTHER',
            name: 'Is Wholesalers – Kzn',
            address: '649 Sunset Avenue, Chatsworth',
          },
          {
            brand: 'CASHBUILD',
            name: 'Cashbuild – Shallcross',
            address: '90 Shallcross Road, Shallcross',
          },
        ],
        milestones: [
          {
            label: '0–5 months',
            month: 5,
            lowZAR: 751_750,
            midZAR: 2_546_250,
            highZAR: 5_205_667,
          },
          {
            label: '6–12 months',
            month: 12,
            lowZAR: 970_000,
            midZAR: 3_213_125,
            highZAR: 6_499_000,
          },
        ],
        captureTimeline: [
          { month: 0, lowZAR: 750_000, midZAR: 1_200_000, highZAR: 2_500_000 },
          { month: 12, lowZAR: 970_000, midZAR: 3_200_000, highZAR: 6_500_000 },
          { month: 24, lowZAR: 2_100_000, midZAR: 5_600_000, highZAR: 9_700_000 },
          { month: 36, lowZAR: 2_400_000, midZAR: 7_000_000, highZAR: 12_900_000 },
        ],
        productMix: [],
        repsRequired: null,
      },
    ],
    disclaimer: [...SIMULATION_EXPORT_DISCLAIMER],
  };
}

describe('shortenCompetitorAddress', () => {
  it('strips trailing General / KZN / 0000 / South Africa noise', () => {
    expect(
      shortenCompetitorAddress(
        '224 Lenham Drive Phoenix, General, KZN, KZN, 0000, South Africa',
      ),
    ).toBe('224 Lenham Drive Phoenix');
  });

  it('collapses a duplicated address half', () => {
    expect(
      shortenCompetitorAddress(
        'Shop No 1, Everton Plaza, Cnr Easton & Golden Highway EVERTON, Shop No 1, Everton Plaza, Cnr Easton & Golden Highway EVERTON, 0000, South Africa',
      ),
    ).toBe('Shop No 1, Everton Plaza, Cnr Easton & Golden Highway EVERTON');
  });

  it('returns a fallback when address is missing', () => {
    expect(shortenCompetitorAddress(null)).toBe('No address on record');
  });
});

describe('downloadSimulationExportPdf', () => {
  beforeEach(() => {
    vi.mocked(downloadBlob).mockReset();
  });

  it('renders a briefing blob without throwing', () => {
    downloadSimulationExportPdf(sampleDocument());

    expect(downloadBlob).toHaveBeenCalledTimes(1);
    const [blob, filename] = vi.mocked(downloadBlob).mock.calls[0]!;
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(1000);
    expect(filename).toBe(
      'loro-simulation-south-africa-kwazulu-natal-2026-09-11.pdf',
    );
  });
});
