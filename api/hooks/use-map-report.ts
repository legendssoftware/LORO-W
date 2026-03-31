'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import { getMapReport, type GetMapReportParams } from '@/api/endpoints/map';
import type { MapDataResponse } from '@/api/types/map';

const MAP_REPORT_QUERY_KEY = ['reports', 'map'] as const;

function getMapReportQueryKey(params: GetMapReportParams | undefined) {
  return [
    ...MAP_REPORT_QUERY_KEY,
    params?.orgId ?? null,
    params?.branchId ?? null,
    params?.userId ?? null,
    params?.startDate ?? null,
    params?.endDate ?? null,
    params?.allTime ?? null,
    params?.resolveMarkerAddresses ?? null,
  ] as const;
}

/**
 * Fetches map report (GET /reports/map) for the Overview map.
 * Pass branchId/userId when user selects a filter; omit for "All".
 */
export function useMapReport(
  params?: GetMapReportParams,
  options?: { enabled?: boolean }
) {
  const client = useApiClient();

  return useQuery({
    queryKey: getMapReportQueryKey(params),
    queryFn: async (): Promise<MapDataResponse> => {
      return getMapReport(client, params);
    },
    enabled: options?.enabled !== false,
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/** Reports Visualiser: same as useMapReport (GET /reports/map with date / all-time options). */
export function useReportsMapData(
  params?: GetMapReportParams,
  options?: { enabled?: boolean }
) {
  return useMapReport(params, options);
}
