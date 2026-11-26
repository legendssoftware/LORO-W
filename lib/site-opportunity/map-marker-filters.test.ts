import { describe, expect, it } from 'vitest';
import type { MapMarkerBase } from '@/api/types/map';
import {
  filterMapMarkers,
  filterMarkersByArea,
  filterMarkersNearPoint,
  filterZonesNearPoint,
  getAreaSuggestions,
  getSimulationProvinceOptions,
  getSortedUniqueCitiesFromMarkers,
  markerMatchesCity,
} from '@/lib/site-opportunity/map-marker-filters';
import { SA_PROVINCES } from '@/lib/utils/marker-geo-resolve';

function marker(
  id: string,
  address: { city?: string; suburb?: string; state?: string; country?: string },
  coords: { latitude: number; longitude: number } = {
    latitude: -26.2,
    longitude: 28.04,
  },
): MapMarkerBase {
  return {
    id,
    name: id,
    position: [coords.longitude, coords.latitude],
    latitude: coords.latitude,
    longitude: coords.longitude,
    markerType: 'competitor',
    address,
  };
}

describe('simulation geo scope', () => {
  const markers = [
    marker('sandton', {
      city: 'Johannesburg',
      suburb: 'Sandton',
      state: 'Gauteng',
      country: 'South Africa',
    }),
    marker('durban', {
      city: 'Durban',
      suburb: 'Umhlanga',
      state: 'KwaZulu-Natal',
      country: 'South Africa',
    }),
  ];

  it('always offers the nine South African provinces', () => {
    const options = getSimulationProvinceOptions([], 'South Africa');
    expect(options).toEqual([...SA_PROVINCES]);
  });

  it('filters a run to one province and a typed city or suburb', () => {
    const gauteng = filterMapMarkers(markers, {
      selectedCountry: 'South Africa',
      selectedProvince: 'Gauteng',
    });
    expect(gauteng.map((item) => item.id)).toEqual(['sandton']);

    const sandton = filterMapMarkers(markers, {
      selectedCountry: 'South Africa',
      selectedProvince: 'Gauteng',
      selectedCity: 'sandton',
    });
    expect(sandton.map((item) => item.id)).toEqual(['sandton']);
    expect(markerMatchesCity(markers[1]!, 'Durban')).toBe(true);
  });

  it('suggests cities and suburbs inside the current province', () => {
    expect(
      getSortedUniqueCitiesFromMarkers(markers, {
        selectedCountry: 'South Africa',
        selectedProvince: 'Gauteng',
      }),
    ).toEqual(['Johannesburg', 'Sandton']);
  });

  it('matches a typed province or country, not only cities on the data', () => {
    expect(filterMarkersByArea(markers, 'KwaZulu-Natal').map((item) => item.id)).toEqual([
      'durban',
    ]);
    expect(filterMarkersByArea(markers, 'South Africa').map((item) => item.id)).toEqual([
      'sandton',
      'durban',
    ]);
    expect(getAreaSuggestions(markers)).toEqual(
      expect.arrayContaining(['Sandton', 'Gauteng', 'South Africa', 'Durban']),
    );
  });

  it('keeps stores within 30 km of a geocoded point', () => {
    const far = marker(
      'polokwane',
      { city: 'Polokwane', state: 'Limpopo', country: 'South Africa' },
      { latitude: -23.9, longitude: 29.45 },
    );
    const near = filterMarkersNearPoint(
      [...markers, far],
      { lat: -26.2, lng: 28.04 },
      30,
    );
    expect(near.map((item) => item.id)).toEqual(['sandton', 'durban']);
  });

  it('scopes branch markers strictly to the typed area by suburb, city, or branch name', () => {
    const edenvaleBranch: MapMarkerBase = {
      id: 'branch-1',
      name: 'BitEdenvale',
      alias: 'Edenvale',
      position: [-26.14, 28.15],
      latitude: -26.14,
      longitude: 28.15,
      markerType: 'branch',
      address: { suburb: 'Edenvale', city: 'Ekurhuleni', state: 'Gauteng', country: 'South Africa' },
    };
    const sandtonBranch: MapMarkerBase = {
      id: 'branch-2',
      name: 'BitSandton',
      alias: 'Sandton',
      position: [-26.107, 28.056],
      latitude: -26.107,
      longitude: 28.056,
      markerType: 'branch',
      address: { suburb: 'Sandton', city: 'Johannesburg', state: 'Gauteng', country: 'South Africa' },
    };

    const scoped = filterMarkersByArea([edenvaleBranch, sandtonBranch, ...markers], 'edenvale');
    expect(scoped.map((m) => m.id)).toEqual(['branch-1']);
  });

  it('filters computed zones strictly within the configured area radius', () => {
    const edenvaleCenter = { lat: -26.141, lng: 28.152 };
    const zones = [
      { id: 'in-area', lat: -26.15, lng: 28.16 }, // ~1.3 km away
      { id: 'outside-area', lat: -26.0, lng: 28.0 }, // ~21.8 km away
    ];

    const kept = filterZonesNearPoint(zones, edenvaleCenter, 10_000);
    expect(kept.map((z) => z.id)).toEqual(['in-area']);
  });
});
