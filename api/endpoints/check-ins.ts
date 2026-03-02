import type { AxiosInstance } from 'axios';
import type {
  CheckInsListResponse,
  DomainReportResponse,
} from '@/api/types/reports';
import type { UpdateVisitDetailsPayload } from '@/api/types/visits';

export interface GetCheckInsParams {
  userUid?: string;
  startDate?: string;
  endDate?: string;
}

export interface GetCheckInsReportParams {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
}

/**
 * GET /check-ins - list check-ins with optional user and date range.
 */
export async function getCheckIns(
  client: AxiosInstance,
  params: GetCheckInsParams = {}
): Promise<CheckInsListResponse> {
  const search = new URLSearchParams();
  if (params.userUid) search.set('userUid', params.userUid);
  if (params.startDate) search.set('startDate', params.startDate);
  if (params.endDate) search.set('endDate', params.endDate);
  const qs = search.toString();
  console.log('[check-ins] GET /check-ins request (fetch data)', {
    params: { userUid: params.userUid, startDate: params.startDate, endDate: params.endDate },
    queryString: qs || '(none – all time)',
  });
  const { data } = await client.get<CheckInsListResponse>(
    `/check-ins${qs ? `?${qs}` : ''}`
  );
  console.log('[check-ins] GET /check-ins response', {
    message: data?.message,
    checkInsCount: Array.isArray(data?.checkIns) ? data.checkIns.length : 0,
    response: data,
  });
  return data;
}

/**
 * GET /check-ins/report - aggregated report (total, byDay) for date range.
 */
export async function getCheckInsReport(
  client: AxiosInstance,
  params: GetCheckInsReportParams
): Promise<DomainReportResponse> {
  const search = new URLSearchParams({
    from: params.from,
    to: params.to,
  });
  console.log('[check-ins] GET /check-ins/report request (fetch data)', {
    params: { from: params.from, to: params.to },
  });
  const { data } = await client.get<DomainReportResponse>(
    `/check-ins/report?${search.toString()}`
  );
  console.log('[check-ins] GET /check-ins/report response', {
    total: data?.total,
    byDayLength: Array.isArray(data?.byDay) ? data.byDay.length : 0,
    response: data,
  });
  return data;
}

/**
 * PATCH /check-ins/visit-details - update visit details after check-out.
 */
export async function updateVisitDetails(
  client: AxiosInstance,
  payload: UpdateVisitDetailsPayload
): Promise<{ message: string }> {
  const { data } = await client.patch<{ message: string }>(
    '/check-ins/visit-details',
    payload
  );
  return data;
}
