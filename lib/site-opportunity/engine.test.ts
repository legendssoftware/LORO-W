import { describe, expect, it } from 'vitest';
import { resolveHardwareBrand, sumAddressablePool } from './brands';
import { haversineMeters, isValidMapCoord } from './geo';
import {
  computeBranchCatchments,
  computeGreenfieldZones,
  computeSiteOpportunities,
} from './engine';
import type { MapMarkerBase } from '@/api/types/map';

function competitor(
  id: string,
  name: string,
  lat: number,
  lng: number
): MapMarkerBase {
  return {
    id,
    name,
    latitude: lat,
    longitude: lng,
    position: [lat, lng],
    markerType: 'competitor',
  };
}

function branch(id: string, name: string, lat: number, lng: number): MapMarkerBase {
  return {
    id,
    name,
    alias: name,
    latitude: lat,
    longitude: lng,
    position: [lat, lng],
    markerType: 'branch',
  };
}

function client(id: string, lat: number, lng: number): MapMarkerBase {
  return {
    id,
    name: `Client ${id}`,
    latitude: lat,
    longitude: lng,
    position: [lat, lng],
    markerType: 'client',
    category: '004',
  };
}

describe('site-opportunity geo', () => {
  it('haversineMeters is ~0 for same point', () => {
    expect(haversineMeters({ lat: -26.2, lng: 28.0 }, { lat: -26.2, lng: 28.0 })).toBe(0);
  });

  it('rejects SA centroid fallback', () => {
    expect(isValidMapCoord(-30.559482, 22.937506)).toBe(false);
  });
});

describe('resolveHardwareBrand', () => {
  it('parses name prefix before en-dash', () => {
    expect(resolveHardwareBrand(competitor('1', 'CASHBUILD – Edenvale', 0, 0))).toBe(
      'CASHBUILD'
    );
    expect(resolveHardwareBrand(competitor('2', 'BUCO – Vasco', 0, 0))).toBe('BUCO');
  });

  it('uses accountName when present', () => {
    const m = competitor('3', 'Store X', 0, 0);
    m.accountName = 'POWERBUILD';
    expect(resolveHardwareBrand(m)).toBe('POWERBUILD');
  });
});

describe('computeBranchCatchments', () => {
  it('counts competitors within 5km and applies turnover', () => {
    const center = { lat: -26.2041, lng: 28.0473 };
    const nearLat = center.lat + 0.01;
    const farLat = center.lat + 0.5;

    const catchments = computeBranchCatchments(
      [branch('b1', 'BitBoksburg', center.lat, center.lng)],
      [
        competitor('c1', 'CASHBUILD – A', nearLat, center.lng),
        competitor('c2', 'BUCO – B', nearLat, center.lng + 0.01),
        competitor('c3', 'CASHBUILD – Far', farLat, center.lng),
      ],
      [client('cl1', nearLat, center.lng)],
      {
        radiusMeters: 5000,
        topN: 10,
        minBranchSeparationKm: 10,
        captureLowPct: 0.15,
        captureHighPct: 0.3,
      }
    );

    expect(catchments).toHaveLength(1);
    const c = catchments[0]!;
    expect(c.competitorCount).toBe(2);
    expect(c.clientCount).toBe(1);
    expect(c.addressablePoolZAR).toBe(3_000_000 + 2_000_000);
    expect(c.potentialLowZAR).toBe(c.addressablePoolZAR * 0.15);
    expect(c.potentialHighZAR).toBe(c.addressablePoolZAR * 0.3);
  });
});

describe('computeSiteOpportunities', () => {
  it('returns both catchments and greenfield in both mode', () => {
    const center = { lat: -26.2041, lng: 28.0473 };
    const result = computeSiteOpportunities(
      [
        branch('b1', 'BitTest', center.lat, center.lng),
        competitor('c1', 'CASHBUILD – Near', center.lat + 0.02, center.lng),
        client('cl1', center.lat + 0.03, center.lng),
      ],
      { mode: 'both', settings: { topN: 5, radiusMeters: 5000 } }
    );

    expect(result.catchments.length).toBeGreaterThanOrEqual(1);
    expect(result.dataQuality.totalCompetitors).toBe(1);
  });
});

describe('sumAddressablePool', () => {
  it('sums brand turnover', () => {
    const pool = sumAddressablePool([
      competitor('1', 'CASHBUILD – X', 0, 0),
      competitor('2', 'BUCO – Y', 0, 0),
    ]);
    expect(pool).toBe(5_000_000);
  });
});
