import { beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadBlob } from '@/lib/utils/report-export';
import { buildTravelAnalysisDocument } from '@/lib/travel-analysis/build-travel-analysis-document';
import { downloadTravelAnalysisPdf } from '@/lib/travel-analysis/travel-analysis-pdf';
import type { TravelAnalysisPayload } from '@/lib/travel-analysis/travel-analysis-types';

vi.mock('@/lib/utils/report-export', () => ({
  downloadBlob: vi.fn(),
}));

function samplePayload(): TravelAnalysisPayload {
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
      ratedKmPerLitreLabel: '12 km/L',
      branch: 'Gaborone',
      recordedDistanceKm: 80,
      commuteDeductedKm: 20,
      visits: 3,
      petrolClaimCount: 0,
      petrolClaimAmount: 0,
      fuelLitresUsed: 5,
      fuelPricePerLitre: 'R 23.00/L',
      country: 'South Africa',
      region: 'Gauteng (inland)',
      stops: 2,
      travelMin: 90,
      stopMin: 40,
      avgStopMin: 20,
      distanceKm: 60,
      fuelRefundAmount: 115,
    },
    daily: [
      {
        user: 'Kheu Mokganedi',
        date: '2026-09-15',
        recordedDistanceKm: 80,
        commuteDeductedKm: 20,
        travelMin: 90,
        stopMin: 40,
        startPlace: 'Sandton',
        endPlace: 'Midrand',
        country: 'South Africa',
        region: 'Gauteng (inland)',
        fuelTypeLabel: 'Diesel',
        ratedKmPerLitre: '12 km/L',
        fuelPricePerLitre: 'R 23.00/L',
        fuelLitres: '5.0 L',
        fuelRand: 'R 115.00',
        minBattery: '80',
        avgBattery: '72',
        distanceKm: 60,
      },
    ],
    stops: [
      {
        user: 'Kheu Mokganedi',
        date: '2026-09-15',
        place: 'Sandton City, Sandton',
        arrived: '09:00',
        left: '09:40',
        dwellMin: 40,
        batteryIn: '-',
        batteryOut: '-',
        lat: '-26.1',
        lng: '28.05',
      },
    ],
    visitCount: 3,
    movingSampleCount: 4,
    stoppedSampleCount: 2,
  };
}

describe('downloadTravelAnalysisPdf', () => {
  beforeEach(() => {
    vi.mocked(downloadBlob).mockReset();
  });

  it('renders a briefing blob without throwing', () => {
    downloadTravelAnalysisPdf(buildTravelAnalysisDocument(samplePayload(), 'Kheu'));

    expect(downloadBlob).toHaveBeenCalledTimes(1);
    const [blob, filename] = vi.mocked(downloadBlob).mock.calls[0]!;
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(1000);
    expect(filename).toBe('travel-analysis-2026-09-01-to-2026-09-16.pdf');
  }, 20_000);

  it('renders an empty-range cover without throwing', () => {
    downloadTravelAnalysisPdf(
      buildTravelAnalysisDocument(
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
      ),
    );

    expect(downloadBlob).toHaveBeenCalledTimes(1);
    const [blob] = vi.mocked(downloadBlob).mock.calls[0]!;
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(500);
  });
});
