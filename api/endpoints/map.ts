import type { AxiosInstance } from 'axios';
import type { MapDataResponse } from '@/api/types/map';

export interface GetMapReportParams {
  orgId?: number;
  branchId?: number;
  userId?: number;
  /** ISO date string (inclusive) */
  startDate?: string;
  /** ISO date string (inclusive) */
  endDate?: string;
  /** Wide historical window on the server */
  allTime?: boolean;
  /**
   * Backwards compatible; server no longer reverse-geocodes map markers.
   * When both start/end omitted and not allTime, check-in window defaults to **today** (org TZ).
   */
  resolveMarkerAddresses?: boolean;
}

/** Backend returns the map payload directly (no wrapper). Axios response body is MapDataResponse. */
function isMapDataResponse(value: unknown): value is MapDataResponse {
  return (
    typeof value === 'object' &&
    value != null &&
    'allMarkers' in value &&
    'mapConfig' in value
  );
}

/**
 * GET /reports/map - map data for visualization (Leaflet-ready).
 * Auth: Bearer token; org defaults to user's org. Optional branchId/userId filter.
 * Elevated users omit branchId for org-wide markers; when branchId is set, server includes rows with no branch.
 * If startDate/endDate are omitted and allTime is false, the server uses **today in the organisation timezone**.
 * Normalizes response: backend returns payload directly; accept that or a wrapped { data }.
 */
export async function getMapReport(
  client: AxiosInstance,
  params?: GetMapReportParams
): Promise<MapDataResponse> {
  const search = new URLSearchParams();
  if (params?.orgId != null) search.set('orgId', String(params.orgId));
  if (params?.branchId != null) search.set('branchId', String(params.branchId));
  if (params?.userId != null) search.set('userId', String(params.userId));
  if (params?.startDate) search.set('startDate', params.startDate);
  if (params?.endDate) search.set('endDate', params.endDate);
  if (params?.allTime === true) search.set('allTime', 'true');
  if (params?.resolveMarkerAddresses === false) search.set('resolveMarkerAddresses', 'false');
  const qs = search.toString();
  const { data } = await client.get<MapDataResponse | { data: MapDataResponse }>(
    `/reports/map${qs ? `?${qs}` : ''}`
  );
  if (isMapDataResponse(data)) return data;
  if (data && typeof data === 'object' && 'data' in data && isMapDataResponse((data as { data: MapDataResponse }).data)) {
    return (data as { data: MapDataResponse }).data;
  }
  throw new Error('Invalid map report response');
}

export type MapGeocodeBackfillScope = 'all' | 'competitors,branches';

export interface MapGeocodeBackfillParams {
  orgId?: number;
  maxGeocodesPerRound?: number;
  maxRounds?: number;
  resetExhausted?: boolean;
  bypassCache?: boolean;
  scope?: MapGeocodeBackfillScope;
}

export interface MapGeocodeBackfillResponse {
  message: string;
  rounds: number;
  complete: boolean;
  summaries: MapDataResponse['geocodingSummary'];
}

/**
 * POST /reports/map/geocode-backfill — persist lat/lng for all map entities missing coordinates.
 */
export async function postMapGeocodeBackfill(
  client: AxiosInstance,
  params?: MapGeocodeBackfillParams
): Promise<MapGeocodeBackfillResponse> {
  const search = new URLSearchParams();
  if (params?.orgId != null) search.set('orgId', String(params.orgId));
  if (params?.maxGeocodesPerRound != null) {
    search.set('maxGeocodesPerRound', String(params.maxGeocodesPerRound));
  }
  if (params?.maxRounds != null) search.set('maxRounds', String(params.maxRounds));
  if (params?.resetExhausted === false) search.set('resetExhausted', 'false');
  if (params?.bypassCache === false) search.set('bypassCache', 'false');
  if (params?.scope != null) search.set('scope', params.scope);
  const qs = search.toString();
  const { data } = await client.post<MapGeocodeBackfillResponse>(
    `/reports/map/geocode-backfill${qs ? `?${qs}` : ''}`
  );
  return data;
}
