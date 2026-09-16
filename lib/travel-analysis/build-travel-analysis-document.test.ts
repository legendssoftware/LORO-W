import { describe, expect, it } from 'vitest';
import {
  buildTravelAnalysisDocument,
  buildTravelAnalysisFilename,
  clusterCommonAreas,
  formatHoursMinutes,
  normalizeStopArea,
  parseFuelNumber,
} from '@/lib/travel-analysis/build-travel-analysis-document';
import {
  TRAVEL_ANALYSIS_DISCLAIMER,
  type TravelAnalysisPayload,
  type TravelAnalysisStopRow,
} from '@/lib/travel-analysis/travel-analysis-types';

function stop(overrides: Partial<TravelAnalysisStopRow>): TravelAnalysisStopRow {
  return {
    user: 'Kheu Mokganedi',
    date: '2026-09-15',
    place: '-',
    arrived: '09:00',
    left: '09:20',
    dwellMin: 20,
    batteryIn: '-',
    batteryOut: '-',
    lat: '-',
    lng: '-',
    ...overrides,
  };
}

function samplePayload(overrides?: Partial<TravelAnalysisPayload>): TravelAnalysisPayload {
  return {
    fromYmd: '2026-09-01',
    toYmd: '2026-09-16',
    timezone: 'Africa/Johannesburg',
    generatedAtIso: '2026-09-16T11:00:00.000Z',
    organisationName: 'BitDrywall',
    summary: {
      user: 'Kheu Mokganedi',
      vehicleLabel: 'Toyota Hilux',
      fuelTypeLabel: 'Diesel',
      ratedKmPerLitreLabel: '12 km/L (fleet default)',
      branch: 'Gaborone',
      recordedDistanceKm: 140,
      commuteDeductedKm: 40,
      visits: 6,
      petrolClaimCount: 2,
      petrolClaimAmount: 1000,
      fuelLitresUsed: 8.3,
      fuelPricePerLitre: 'R 23.00/L',
      country: 'South Africa',
      region: 'Gauteng (inland)',
      stops: 4,
      travelMin: 180,
      stopMin: 90,
      avgStopMin: 23,
      distanceKm: 100,
      fuelRefundAmount: 190.9,
    },
    daily: [
      {
        user: 'Kheu Mokganedi',
        date: '2026-09-15',
        recordedDistanceKm: 80,
        commuteDeductedKm: 20,
        travelMin: 120,
        stopMin: 40,
        startPlace: 'Sandton, Gauteng',
        endPlace: 'Midrand, Gauteng',
        country: 'South Africa',
        region: 'Gauteng (inland)',
        fuelTypeLabel: 'Diesel',
        ratedKmPerLitre: '12 km/L (fleet default)',
        fuelPricePerLitre: 'R 23.00/L',
        fuelLitres: '5.0 L',
        fuelRand: 'R 115.00',
        minBattery: '80',
        avgBattery: '72',
        distanceKm: 60,
      },
      {
        user: 'Kheu Mokganedi',
        date: '2026-09-16',
        recordedDistanceKm: 60,
        commuteDeductedKm: 20,
        travelMin: 60,
        stopMin: 50,
        startPlace: 'Sandton, Gauteng',
        endPlace: 'Pretoria, Gauteng',
        country: 'South Africa',
        region: 'Gauteng (inland)',
        fuelTypeLabel: 'Diesel',
        ratedKmPerLitre: '12 km/L (fleet default)',
        fuelPricePerLitre: '-',
        fuelLitres: '-',
        fuelRand: '-',
        minBattery: '-',
        avgBattery: '-',
        distanceKm: 40,
      },
    ],
    stops: [
      stop({
        place: 'Sandton City, Sandton, Gauteng, South Africa',
        dwellMin: 45,
      }),
      stop({
        place: 'Sandton City, Sandton, Gauteng, South Africa',
        dwellMin: 30,
      }),
      stop({
        place: '-',
        lat: '-26.1076',
        lng: '28.0567',
        dwellMin: 10,
      }),
      stop({
        place: 'Midrand, Gauteng',
        date: '2026-09-16',
        dwellMin: 80,
      }),
    ],
    visitCount: 6,
    movingSampleCount: 12,
    stoppedSampleCount: 8,
    ...overrides,
  };
}

describe('parseFuelNumber', () => {
  it('reads formatted fuel cells', () => {
    expect(parseFuelNumber('R 23.45/L')).toBe(23.45);
    expect(parseFuelNumber('5.0 L')).toBe(5);
    expect(parseFuelNumber('-')).toBe(0);
  });
});

describe('formatHoursMinutes', () => {
  it('formats hours and minutes', () => {
    expect(formatHoursMinutes(0)).toBe('0m');
    expect(formatHoursMinutes(43)).toBe('43m');
    expect(formatHoursMinutes(120)).toBe('2h');
    expect(formatHoursMinutes(183)).toBe('3h 3m');
  });
});

describe('normalizeStopArea', () => {
  it('uses the first meaningful address parts', () => {
    expect(
      normalizeStopArea({
        place: 'Sandton City, Sandton, Gauteng, South Africa',
        lat: '-',
        lng: '-',
      }),
    ).toBe('Sandton City, Sandton');
  });

  it('falls back to rounded coordinates', () => {
    expect(
      normalizeStopArea({
        place: '-',
        lat: '-26.10761',
        lng: '28.05672',
      }),
    ).toBe('-26.108, 28.057');
  });
});

describe('clusterCommonAreas', () => {
  it('ranks by stop count and caps dwell share', () => {
    const areas = clusterCommonAreas(samplePayload().stops);
    expect(areas[0]?.area).toBe('Sandton City, Sandton');
    expect(areas[0]?.stops).toBe(2);
    expect(areas[0]?.dwellMin).toBe(75);
    expect(areas.length).toBeLessThanOrEqual(12);
    const shareSum = areas.reduce((sum, area) => sum + area.dwellSharePct, 0);
    expect(shareSum).toBeGreaterThan(90);
  });
});

describe('buildTravelAnalysisDocument', () => {
  it('builds KPIs, areas, patterns, and fuel totals from the payload', () => {
    const document = buildTravelAnalysisDocument(samplePayload(), 'Fallback');
    expect(document.meta.title).toBe('Travel analysis — Kheu Mokganedi');
    expect(document.kpis.billableKm).toBe(100);
    expect(document.kpis.visits).toBe(6);
    expect(document.kpis.claimsLabel).toBe('R1000 - 2');
    expect(document.vehicleBasis.fuelGrade).toBe('Diesel 50 ppm');
    expect(document.vehicleBasis.isFleetDefault).toBe(true);
    expect(document.days).toHaveLength(2);
    expect(document.days[1]?.fuelLitres).toBe('—');
    expect(document.areas[0]?.area).toBe('Sandton City, Sandton');
    expect(document.patterns.daysWithMovement).toBe(2);
    expect(document.patterns.dwellBrief).toBe(1);
    expect(document.patterns.dwellWorking).toBe(2);
    expect(document.patterns.dwellLong).toBe(1);
    expect(document.patterns.typicalStart).toBe('Sandton, Gauteng');
    expect(document.fuelTotals.daysWithFuel).toBe(1);
    expect(document.disclaimer).toBe(TRAVEL_ANALYSIS_DISCLAIMER);
  });

  it('still builds a cover when the range is empty', () => {
    const document = buildTravelAnalysisDocument(
      {
        fromYmd: '2026-09-16',
        toYmd: '2026-09-16',
        timezone: 'Africa/Johannesburg',
        generatedAtIso: '2026-09-16T11:00:00.000Z',
        organisationName: 'BitDrywall',
        summary: null,
        daily: [],
        stops: [],
        visitCount: 0,
        movingSampleCount: 0,
        stoppedSampleCount: 0,
      },
      'Kheu Mokganedi',
    );
    expect(document.meta.userName).toBe('Kheu Mokganedi');
    expect(document.kpis.billableKm).toBe(0);
    expect(document.days).toEqual([]);
    expect(document.areas).toEqual([]);
    expect(document.kpis.claimsLabel).toBe('—');
  });
});

describe('buildTravelAnalysisFilename', () => {
  it('uses the selected range', () => {
    expect(buildTravelAnalysisFilename('2026-09-01', '2026-09-16')).toBe(
      'travel-analysis-2026-09-01-to-2026-09-16.pdf',
    );
  });
});
