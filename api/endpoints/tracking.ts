import type { AxiosInstance } from 'axios';
import type {
  FuelPriceRefreshResponse,
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
  customRange?: RepJourneyCustomRangeParams,
  options?: { refresh?: boolean }
): Promise<RepJourneyResponse> {
  const search = new URLSearchParams();
  search.set('range', range);
  if (range === 'custom' && customRange) {
    search.set('startDate', customRange.startDate);
    search.set('endDate', customRange.endDate);
  }
  // Bypass the server's short response cache (e.g. right after a fuel refresh).
  if (options?.refresh) search.set('refresh', 'true');
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

function isFuelPriceRefreshResponse(
  value: unknown
): value is FuelPriceRefreshResponse {
  return (
    typeof value === 'object' &&
    value != null &&
    'message' in value &&
    'data' in value &&
    typeof (value as FuelPriceRefreshResponse).data === 'object' &&
    (value as FuelPriceRefreshResponse).data != null &&
    'status' in (value as FuelPriceRefreshResponse).data
  );
}

/**
 * POST /gps/fuel-prices/refresh — force a GlobalPetrolPrices fetch (staff only).
 */
export async function refreshFuelPrices(
  client: AxiosInstance
): Promise<FuelPriceRefreshResponse> {
  const { data } = await client.post<
    FuelPriceRefreshResponse | { data: FuelPriceRefreshResponse }
  >('/gps/fuel-prices/refresh');

  if (isFuelPriceRefreshResponse(data)) return data;
  if (
    data &&
    typeof data === 'object' &&
    'data' in data &&
    isFuelPriceRefreshResponse((data as { data: FuelPriceRefreshResponse }).data)
  ) {
    return (data as { data: FuelPriceRefreshResponse }).data;
  }
  throw new Error('Invalid fuel price refresh response');
}
