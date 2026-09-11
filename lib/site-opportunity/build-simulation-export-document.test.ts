import { describe, expect, it } from 'vitest';
import type { MapMarkerBase } from '@/api/types/map';
import type {
  BranchCatchmentOpportunity,
  GreenfieldOpportunityZone,
  SiteOpportunityResult,
} from '@/api/types/site-opportunity';
import { DEFAULT_SITE_OPPORTUNITY_SETTINGS } from '@/api/types/site-opportunity';
import { buildCaptureTimeline } from '@/lib/site-opportunity/compute/capture-phases';
import {
  buildSimulationExportDocument,
  buildSimulationExportFilename,
} from '@/lib/site-opportunity/build-simulation-export-document';
import { SIMULATION_EXPORT_DISCLAIMER } from '@/lib/site-opportunity/simulation-export-types';

const CENTER = { lat: -26.1076, lng: 28.0567 };

function competitorMarker(
  id: string,
  name: string,
  lat: number,
  lng: number,
): MapMarkerBase {
  return {
    id,
    name,
    position: [lng, lat],
    latitude: lat,
    longitude: lng,
    markerType: 'competitor',
    hardwareBrand: 'BUCO',
    accountName: 'BUCO',
  };
}

function catchmentFixture(): BranchCatchmentOpportunity {
  const potentialLowZAR = 500_000;
  const potentialHighZAR = 2_000_000;
  return {
    kind: 'catchment',
    id: 'c-1',
    rank: 1,
    branchId: 42,
    branchName: 'BitSandton',
    address: 'Sandton City, Johannesburg',
    lat: CENTER.lat,
    lng: CENTER.lng,
    radiusMeters: 5000,
    clientCount: 12,
    competitorCount: 2,
    competitorsMissingGeo: 0,
    byBrand: [
      { brand: 'BUCO', count: 2, turnoverZAR: 4_000_000 },
    ],
    addressablePoolZAR: 4_000_000,
    potentialLowZAR,
    potentialHighZAR,
    opportunityScore: 88,
    actualRevenueZAR: 900_000,
    revenueGapZAR: 100_000,
    captureTimeline: buildCaptureTimeline(potentialLowZAR, potentialHighZAR),
    monthsToTargetMid: 18,
    floorSizeSqm: 320,
    capacityCeilingZAR: 480_000,
  };
}

function greenfieldFixture(): GreenfieldOpportunityZone {
  const potentialLowZAR = 400_000;
  const potentialHighZAR = 1_600_000;
  return {
    kind: 'greenfield',
    id: 'g-1',
    rank: 1,
    label: 'Midrand cluster',
    address: 'Midrand, Gauteng',
    lat: CENTER.lat + 0.01,
    lng: CENTER.lng + 0.01,
    radiusMeters: 5000,
    clientCount: 4,
    competitorCount: 1,
    competitorsMissingGeo: 0,
    byBrand: [{ brand: 'BUCO', count: 1, turnoverZAR: 2_000_000 }],
    addressablePoolZAR: 2_000_000,
    potentialLowZAR,
    potentialHighZAR,
    nearestBranchKm: 12.4,
    opportunityScore: 71,
    clientDemandScore: 0.6,
    whiteSpaceScore: 0.8,
    captureTimeline: buildCaptureTimeline(potentialLowZAR, potentialHighZAR),
    monthsToTargetMid: 21,
  };
}

function resultFixture(): SiteOpportunityResult {
  return {
    catchments: [catchmentFixture()],
    greenfield: [greenfieldFixture()],
    dataQuality: {
      totalCompetitors: 10,
      competitorsWithCoords: 9,
      totalClients: 20,
      clientsWithCoords: 18,
      totalBranches: 3,
      branchesWithCoords: 3,
      competitorCoveragePct: 90,
      clientCoveragePct: 90,
    },
    settings: { ...DEFAULT_SITE_OPPORTUNITY_SETTINGS },
    warnings: ['Only 90% of hardware competitors have map coordinates.'],
  };
}

describe('buildSimulationExportDocument', () => {
  it('builds ranked zones with ZAR fields, competitor grouping, and disclaimer', () => {
    const result = resultFixture();
    const document = buildSimulationExportDocument({
      result,
      runMarkers: [
        competitorMarker('comp-1', 'BUCO Sandton', CENTER.lat + 0.002, CENTER.lng + 0.002),
        competitorMarker('comp-2', 'BUCO Rivonia', CENTER.lat - 0.002, CENTER.lng - 0.002),
      ],
      runFilters: {
        country: 'South Africa',
        province: 'Gauteng',
        mode: 'both',
      },
      runTurnoverOverrides: {
        brandTurnoverOverrides: { BUCO: 9_000_000 },
      },
      organisationName: 'BitDrywall',
      ranAtIso: '2026-09-11T06:29:00.000Z',
      erpMatchedStores: 1,
      erpError: null,
      generatedAt: new Date('2026-09-11T08:00:00.000Z'),
    });

    expect(document.meta.title).toBe('Store turnover simulation');
    expect(document.meta.organisationName).toBe('BitDrywall');
    expect(document.meta.countryLabel).toBe('South Africa');
    expect(document.meta.provinceLabel).toBe('Gauteng');
    expect(document.meta.modeLabel).toBe('Catchments and opportunities');
    expect(document.meta.erpMatchedStores).toBe(1);
    expect(document.warnings).toEqual(result.warnings);
    expect(document.disclaimer).toEqual(SIMULATION_EXPORT_DISCLAIMER);
    expect(document.disclaimer).toHaveLength(1);
    expect(document.disclaimer[0]).toContain('not an AI forecast');

    expect(document.settings.radiusKm).toBe(5);
    expect(document.settings.brandTurnovers.find((row) => row.brand === 'BUCO')?.monthlyZAR).toBe(
      9_000_000,
    );

    expect(document.catchments).toHaveLength(1);
    const catchment = document.catchments[0]!;
    expect(catchment.kind).toBe('catchment');
    expect(catchment.rank).toBe(1);
    expect(catchment.title).toBe('BitSandton');
    expect(catchment.addressablePoolZAR).toBe(4_000_000);
    expect(catchment.potentialLowZAR).toBe(500_000);
    expect(catchment.potentialHighZAR).toBe(2_000_000);
    expect(catchment.simulatedMonthlyZAR).toBeGreaterThan(0);
    expect(catchment.actualMonthlyZAR).toBe(900_000);
    expect(catchment.varianceZAR).not.toBeNull();
    expect(catchment.floorSizeSqm).toBe(320);
    expect(catchment.nearestBranchKm).toBeNull();
    expect(catchment.storeFormat).not.toBeNull();
    expect(catchment.brands).toEqual([
      { brand: 'BUCO', count: 2, turnoverZAR: 4_000_000 },
    ]);
    expect(catchment.competitors).toHaveLength(2);
    expect(catchment.competitors.every((c) => c.brand === 'BUCO')).toBe(true);
    expect(catchment.competitors.map((c) => c.name).sort()).toEqual([
      'BUCO Rivonia',
      'BUCO Sandton',
    ]);
    expect(catchment.milestones.length).toBeGreaterThan(0);
    expect(catchment.captureTimeline.length).toBeGreaterThan(0);
    expect(catchment.captureTimeline[0]).toEqual(
      expect.objectContaining({
        month: expect.any(Number),
        lowZAR: expect.any(Number),
        midZAR: expect.any(Number),
        highZAR: expect.any(Number),
      }),
    );
    expect(catchment.productMix.length).toBeGreaterThan(0);

    expect(document.opportunities).toHaveLength(1);
    const opportunity = document.opportunities[0]!;
    expect(opportunity.kind).toBe('greenfield');
    expect(opportunity.title).toBe('Midrand cluster');
    expect(opportunity.nearestBranchKm).toBe(12.4);
    expect(opportunity.floorSizeSqm).toBeNull();
    expect(opportunity.actualMonthlyZAR).toBeNull();
    expect(opportunity.addressablePoolZAR).toBe(2_000_000);
    expect(opportunity.simulatedMonthlyZAR).toBeGreaterThan(0);
    expect(opportunity.captureTimeline.length).toBeGreaterThan(0);
    expect(opportunity.captureTimeline[0]).toEqual(
      expect.objectContaining({
        month: expect.any(Number),
        lowZAR: expect.any(Number),
        midZAR: expect.any(Number),
        highZAR: expect.any(Number),
      }),
    );
  });

  it('falls back to all-countries labels and Organisation when scope/name are blank', () => {
    const document = buildSimulationExportDocument({
      result: resultFixture(),
      runMarkers: [],
      runFilters: { country: 'all', province: 'all', mode: 'catchment' },
      runTurnoverOverrides: null,
      organisationName: '  ',
      ranAtIso: null,
      erpMatchedStores: 0,
      erpError: 'ERP store sales unavailable',
      generatedAt: new Date('2026-09-11T08:00:00.000Z'),
    });

    expect(document.meta.organisationName).toBe('Organisation');
    expect(document.meta.countryLabel).toBe('All countries');
    expect(document.meta.provinceLabel).toBeNull();
    expect(document.meta.modeLabel).toBe('Catchments');
    expect(document.meta.erpError).toBe('ERP store sales unavailable');
    expect(document.catchments[0]?.competitors).toEqual([]);
  });
});

describe('buildSimulationExportFilename', () => {
  it('slugs scope and date into a pdf filename', () => {
    const document = buildSimulationExportDocument({
      result: resultFixture(),
      runMarkers: [],
      runFilters: {
        country: 'South Africa',
        province: 'Gauteng',
        mode: 'both',
      },
      runTurnoverOverrides: null,
      organisationName: 'BitDrywall',
      ranAtIso: null,
      erpMatchedStores: 0,
      erpError: null,
      generatedAt: new Date('2026-09-11T08:00:00.000Z'),
    });

    expect(buildSimulationExportFilename(document)).toBe(
      'loro-simulation-south-africa-gauteng-2026-09-11.pdf',
    );
  });
});
