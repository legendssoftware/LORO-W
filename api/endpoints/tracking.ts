import type { AxiosInstance } from 'axios';
import type { LatestRepLocationsResponse } from '@/api/types/tracking';

export interface GetLatestRepLocationsParams {
  maxAgeHours?: number;
}

function isLatestRepLocationsResponse(
  value: unknown
): value is LatestRepLocationsResponse {
  return (
    typeof value === 'object' &&
    value != null &&
    'message' in value &&
    'data' in value
  );
}

/**
 * GET /gps/locations/latest — latest mobile GPS point per active rep.
 */
export async function getLatestRepLocations(
  client: AxiosInstance,
  params?: GetLatestRepLocationsParams
): Promise<LatestRepLocationsResponse> {
  const search = new URLSearchParams();
  if (params?.maxAgeHours != null) {
    search.set('maxAgeHours', String(params.maxAgeHours));
  }
  const qs = search.toString();
  const { data } = await client.get<
    LatestRepLocationsResponse | { data: LatestRepLocationsResponse }
  >(`/gps/locations/latest${qs ? `?${qs}` : ''}`);

  if (isLatestRepLocationsResponse(data)) return data;
  if (
    data &&
    typeof data === 'object' &&
    'data' in data &&
    isLatestRepLocationsResponse((data as { data: LatestRepLocationsResponse }).data)
  ) {
    return (data as { data: LatestRepLocationsResponse }).data;
  }
  throw new Error('Invalid latest rep locations response');
}
