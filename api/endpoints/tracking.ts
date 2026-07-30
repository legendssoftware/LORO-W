import type { AxiosInstance } from 'axios';
import type {
  LatestRepLocationsResponse,
  RepJourneyCustomRangeParams,
  RepJourneyRange,
  RepJourneyResponse,
} from '@/api/types/tracking';

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

function isRepJourneyResponse(value: unknown): value is RepJourneyResponse {
  return (
    typeof value === 'object' &&
    value != null &&
    'message' in value &&
    'data' in value
  );
}

/**
 * GET /gps/user/:userId/journey — ordered GPS trail for map route plotting.
 */
export async function getRepJourney(
  client: AxiosInstance,
  userId: number,
  range: RepJourneyRange,
  customRange?: RepJourneyCustomRangeParams
): Promise<RepJourneyResponse> {
  const search = new URLSearchParams();
  search.set('range', range);
  if (range === 'custom' && customRange) {
    search.set('startDate', customRange.startDate);
    search.set('endDate', customRange.endDate);
  }
  const { data } = await client.get<
    RepJourneyResponse | { data: RepJourneyResponse }
  >(`/gps/user/${userId}/journey?${search.toString()}`);

  if (isRepJourneyResponse(data)) return data;
  if (
    data &&
    typeof data === 'object' &&
    'data' in data &&
    isRepJourneyResponse((data as { data: RepJourneyResponse }).data)
  ) {
    return (data as { data: RepJourneyResponse }).data;
  }
  throw new Error('Invalid rep journey response');
}
