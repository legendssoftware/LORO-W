import type { AxiosInstance } from 'axios';

export type GeocodePlaceResponse = {
  latitude: number;
  longitude: number;
  formattedAddress: string;
};

/** POST /reports/map/geocode-place — coordinates for a typed simulation area. */
export async function geocodePlace(
  client: AxiosInstance,
  query: string,
): Promise<GeocodePlaceResponse> {
  const { data } = await client.post<GeocodePlaceResponse>(
    '/reports/map/geocode-place',
    { query },
  );
  return data;
}
