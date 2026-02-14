import type { AxiosInstance } from 'axios';
import type {
  AttStatusResponse,
  AttendanceMetricsResponse,
  CheckInBody,
  CheckOutBody,
  MonthlyAttendanceResponse,
} from '@/api/types';

/**
 * GET /att/status - current attendance status for the authenticated user.
 */
export async function getAttStatus(client: AxiosInstance): Promise<AttStatusResponse> {
  const { data } = await client.get<AttStatusResponse>('/att/status');
  return data;
}

/**
 * GET /att/metrics - attendance metrics for the authenticated user (self).
 */
export async function getAttMetrics(client: AxiosInstance): Promise<AttendanceMetricsResponse> {
  const { data } = await client.get<AttendanceMetricsResponse>('/att/metrics');
  return data;
}

/**
 * GET /att/user/:ref/monthly - monthly attendance calendar (attended/missed/future per day).
 */
export async function getMonthlyAttendance(
  client: AxiosInstance,
  ref: string | number,
  params?: { year?: number; month?: number }
): Promise<MonthlyAttendanceResponse> {
  const search = new URLSearchParams();
  if (params?.year != null) search.set('year', String(params.year));
  if (params?.month != null) search.set('month', String(params.month));
  const qs = search.toString();
  const { data } = await client.get<MonthlyAttendanceResponse>(
    `/att/user/${ref}/monthly${qs ? `?${qs}` : ''}`
  );
  return data;
}

/**
 * POST /att/in - check in.
 */
export async function checkIn(client: AxiosInstance, body: CheckInBody): Promise<unknown> {
  const { data } = await client.post('/att/in', body);
  return data;
}

/**
 * POST /att/out - check out.
 */
export async function checkOut(client: AxiosInstance, body: CheckOutBody): Promise<unknown> {
  const { data } = await client.post('/att/out', body);
  return data;
}
