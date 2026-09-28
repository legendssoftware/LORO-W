import { describe, expect, it } from 'vitest';
import type { MapMarkerBase } from '@/api/types/map';
import { DEFAULT_SITE_OPPORTUNITY_SETTINGS } from '@/api/types/site-opportunity';
import { computeGreenfieldZones } from '@/lib/site-opportunity/compute/engine';

function competitor(
  id: string,
  latitude: number,
  longitude: number,
  address: { city?: string; suburb?: string; street?: string },
): MapMarkerBase {
  return {
    id,
    name: id,
    position: [latitude, longitude],
    latitude,
    longitude,
    markerType: 'competitor',
    address,
  };
}

const settings = {
  ...DEFAULT_SITE_OPPORTUNITY_SETTINGS,
  topN: 5,
  minBranchSeparationKm: 0,
};

describe('greenfield opportunity labels', () => {
  it('names a site after the most common city', () => {
    const zones = computeGreenfieldZones(
      [],
      [
        competitor('a', -25.87, 29.2, { city: 'Malahleni' }),
        competitor('b', -25.871, 29.201, { city: 'MALAHLENI' }),
        competitor('c', -25.872, 29.202, { city: 'Malahleni' }),
      ],
      [],
      settings,
    );

    expect(zones).toHaveLength(1);
    expect(zones[0]?.label).toBe('Malahleni New Branch');
  });

  it('falls back to suburb when the cluster has no city', () => {
    const zones = computeGreenfieldZones(
      [],
      [
        competitor('a', -25.87, 29.2, { suburb: 'Lynville' }),
        competitor('b', -25.871, 29.201, { suburb: 'Lynville' }),
      ],
      [],
      settings,
    );

    expect(zones[0]?.label).toBe('Lynville New Branch');
  });

  it('suffixes a second site that shares the same place', () => {
    const zones = computeGreenfieldZones(
      [],
      [
        competitor('a1', -25.87, 29.2, { city: 'Malahleni' }),
        competitor('a2', -25.871, 29.201, { city: 'Malahleni' }),
        competitor('a3', -25.872, 29.202, { city: 'Malahleni' }),
        competitor('b1', -26.2, 29.2, { city: 'Malahleni' }),
        competitor('b2', -26.201, 29.201, { city: 'Malahleni' }),
      ],
      [],
      settings,
    );

    expect(zones.map((zone) => zone.label).sort()).toEqual([
      'Malahleni New Branch',
      'Malahleni New Branch (2)',
    ]);
  });

  it('keeps Opportunity N when no city or suburb can be resolved', () => {
    const zones = computeGreenfieldZones(
      [],
      [
        competitor('a', -25.87, 29.2, { street: '12 Main Road' }),
        competitor('b', -25.871, 29.201, { city: '1035' }),
      ],
      [],
      settings,
    );

    expect(zones).toHaveLength(1);
    expect(zones[0]?.label).toBe('Opportunity 1');
  });
});
