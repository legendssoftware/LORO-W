import { describe, expect, it } from 'vitest';
import { filterRepLocationsByGeoBoundsDetailed } from './filter-rep-locations-by-geo';
import type { LatestRepLocation } from '@/api/types/tracking';
import type { MapMarkerBase } from '@/api/types/map';

const repOutsideSa: LatestRepLocation = {
  user: { uid: 1, name: 'Test', surname: 'Rep', email: 't@example.com', photoURL: null, avatar: null },
  latitude: 51.5074,
  longitude: -0.1278,
  accuracy: 10,
  address: null,
  timestamp: Date.now(),
  recordedAt: new Date().toISOString(),
};

const saMarkers: MapMarkerBase[] = [
  {
    id: '1',
    name: 'Johannesburg',
    position: [-26.2, 28.04],
    latitude: -26.2,
    longitude: 28.04,
    markerType: 'client',
  },
];

describe('filterRepLocationsByGeoBoundsDetailed', () => {
  it('returns all reps when no country filter is active', () => {
    const result = filterRepLocationsByGeoBoundsDetailed([repOutsideSa], saMarkers, {});
    expect(result.locations).toHaveLength(1);
    expect(result.geoFilteredOutCount).toBe(0);
  });

  it('does not clip rep pins when country filter is active (geo bypass)', () => {
    const result = filterRepLocationsByGeoBoundsDetailed([repOutsideSa], saMarkers, {
      selectedCountry: 'South Africa',
    });
    expect(result.locations).toHaveLength(1);
    expect(result.hadGeoFilterActive).toBe(true);
    expect(result.geoFilteredOutCount).toBe(1);
  });
});
