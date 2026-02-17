import type { AxiosInstance } from 'axios';
import type {
  CheckInsListResponse,
  DomainReportResponse,
} from '@/api/types/reports';

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
  const { data } = await client.get<CheckInsListResponse>(
    `/check-ins${qs ? `?${qs}` : ''}`
  );
  console.log('[check-ins] GET /check-ins response', {
    params: { userUid: params.userUid, startDate: params.startDate, endDate: params.endDate },
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
  const { data } = await client.get<DomainReportResponse>(
    `/check-ins/report?${search.toString()}`
  );
  console.log('[check-ins] GET /check-ins/report response', {
    params: { from: params.from, to: params.to },
    total: data?.total,
    byDayLength: Array.isArray(data?.byDay) ? data.byDay.length : 0,
    response: data,
  });
  return data;
}
