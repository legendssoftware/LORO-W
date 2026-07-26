import type { AxiosInstance } from 'axios';
import type {
  CheckInsDispatchSummary,
  CheckInsListResponse,
  CheckInsReportResponse,
} from '@/api/types/reports';
import type { UpdateVisitDetailsPayload } from '@/api/types/visits';

export interface GetCheckInsParams {
  userUid?: string;
  startDate?: string;
  endDate?: string;
}

export interface GetCheckInsReportParams {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
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
  return data;
}

/**
 * GET /check-ins/report - aggregated visit chart series for date range.
 */
export async function getCheckInsReport(
  client: AxiosInstance,
  params: GetCheckInsReportParams
): Promise<CheckInsReportResponse> {
  const search = new URLSearchParams({
    from: params.from,
    to: params.to,
  });
  const { data } = await client.get<CheckInsReportResponse>(
    `/check-ins/report?${search.toString()}`
  );
  return data;
}

/**
 * GET /check-ins/dispatch-summary - planned vs completed visit_plan_batch tasks.
 */
export async function getCheckInsDispatchSummary(
  client: AxiosInstance,
  params: GetCheckInsReportParams
): Promise<CheckInsDispatchSummary> {
  const search = new URLSearchParams({
    from: params.from,
    to: params.to,
  });
  const { data } = await client.get<CheckInsDispatchSummary>(
    `/check-ins/dispatch-summary?${search.toString()}`
  );
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
