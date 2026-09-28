import { describe, expect, it } from 'vitest';
import type { MapMarkerBase } from '@/api/types/map';
import {
  filterMapMarkers,
  getSimulationProvinceOptions,
  getSortedUniqueCitiesFromMarkers,
  markerMatchesCity,
} from '@/lib/site-opportunity/map-marker-filters';
import { SA_PROVINCES } from '@/lib/utils/marker-geo-resolve';

function marker(
  id: string,
  address: { city?: string; suburb?: string; state?: string; country?: string },
): MapMarkerBase {
  return {
    id,
    name: id,
    position: [-26.2, 28.04],
    latitude: -26.2,
    longitude: 28.04,
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
});
