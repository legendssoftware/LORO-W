import type { AxiosInstance } from 'axios';
import type { MapDataResponse } from '@/api/types/map';

export interface GetMapReportParams {
  orgId?: number;
  branchId?: number;
  userId?: number;
}

/** Server returns { data: MapDataResponse, summary?: {...} }. */
interface MapReportApiResponse {
  data: MapDataResponse;
  summary?: { totalWorkers?: number; totalClients?: number; totalCompetitors?: number; totalQuotations?: number; totalEvents?: number };
}

/**
 * GET /reports/map - map data for visualization (Leaflet-ready).
 * Auth: Bearer token; org defaults to user's org. Optional branchId/userId filter.
 */
export async function getMapReport(
  client: AxiosInstance,
  params?: GetMapReportParams
): Promise<MapDataResponse> {
  const search = new URLSearchParams();
  if (params?.orgId != null) search.set('orgId', String(params.orgId));
  if (params?.branchId != null) search.set('branchId', String(params.branchId));
  if (params?.userId != null) search.set('userId', String(params.userId));
  const qs = search.toString();
  const { data } = await client.get<MapReportApiResponse>(
    `/reports/map${qs ? `?${qs}` : ''}`
  );
  return data.data;
}
